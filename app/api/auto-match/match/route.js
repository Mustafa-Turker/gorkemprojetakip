import { NextResponse } from "next/server";

const PRICING = {
    "deepseek-reasoner": { cacheHit: 0.028, cacheMiss: 0.28, output: 0.42 },
    "deepseek-chat": { cacheHit: 0.007, cacheMiss: 0.07, output: 0.28 },
};

function calcCost(usage, model) {
    if (!usage) return null;
    const prices = PRICING[model] || PRICING["deepseek-reasoner"];
    const cacheHit = usage.prompt_cache_hit_tokens || 0;
    const cacheMiss = usage.prompt_cache_miss_tokens || 0;
    const output = usage.completion_tokens || 0;
    const inputCost = (cacheHit / 1_000_000) * prices.cacheHit + (cacheMiss / 1_000_000) * prices.cacheMiss;
    const outputCost = (output / 1_000_000) * prices.output;
    return {
        inputCacheHit: cacheHit,
        inputCacheMiss: cacheMiss,
        outputTokens: output,
        inputCost: Math.round(inputCost * 1_000_000) / 1_000_000,
        outputCost: Math.round(outputCost * 1_000_000) / 1_000_000,
        totalCost: Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000,
    };
}

function buildSystemMessage() {
    return `You are a document-to-record matcher for GORKEM, a construction company operating in Iraq.

You receive:
1. OCR text from scanned PDF pages (each page numbered, 1-indexed)
2. A list of accounting records for the same day

Match each record to the PDF page(s) containing its source document (invoice, receipt, payment slip, etc.).

MATCHING STRATEGY (in order of reliability):
1. PRIMARY: Match by amounts — look for numbers on the page that match giris_tutar (incoming) or cikis_tutar (outgoing). This is the MOST RELIABLE signal.
2. SECONDARY: Match by vendor name — look for text matching the vendor (carifirma) field
3. TERTIARY: Match by description keywords — look for words from aciklama on the page

SKIP ADMINISTRATIVE PAGES:
The first several pages of each PDF are administrative and must be COMPLETELY IGNORED. Never match any record to these pages. They fall into two categories:
1. Cash Report Summary pages — identifiable by headers/keywords: CASH REPORT SUMMARY, PROJE KASASI, BANK ACCOUNT, TOTAL IN, TOTAL OUT, NET
2. Daily Accounting Report pages — may span multiple pages. Identify by EITHER:
   - The header "GÜNLÜK MUHASEBE RAPORU", OR
   - Dense tabular row data containing columns like: Sira, Firma/Cari Ad, Firma/Cari Kod, Malzeme/Hizmet, Proje Kodu, Islem Turu, Kasa, Cikis Tutari, Giris Tutari, Para Br., USD Karsiligi (even if column headers are not visible on that page)
All consecutive pages matching either pattern are administrative — skip them ALL.
Start processing only from the first page where you detect a standalone voucher/document such as: GİDER PUSULASI, VİRMAN DEKONTU, bank receipts, Arabic-written company invoices, or any other standalone document.

RULES:
- One page CAN match multiple records (one document covering several transactions)
- One record CAN require multiple consecutive pages (multi-page invoice)
- If no good match exists for a record, mark it as "unmatched" with empty pages array
- Pages may be blank, cover sheets, or unrelated — do NOT force matches
- Amounts may appear in different formats (with/without decimals, thousand separators, or currency symbols)
- The scanned documents may contain Turkish, Arabic, Kurdish, or English text
- Currency codes: IQD (Iraqi Dinar), USD, TRY (Turkish Lira)
- Page numbers in your output must be 1-indexed (matching the page numbers shown)

IMPORTANT: Every record from the input list MUST appear exactly once in the output matches array.

Return ONLY valid JSON:
{
  "matches": [
    {"uniquecode": "BAG.ADM.240115.005", "pages": [3], "confidence": "high", "reason": "Amount 15,000 IQD matches cikis_tutar"},
    {"uniquecode": "BAG.ADM.240115.012", "pages": [8, 9], "confidence": "medium", "reason": "Vendor name partially matches"},
    {"uniquecode": "BAG.ADM.240115.018", "pages": [], "confidence": "unmatched", "reason": "No matching page found"}
  ]
}

Confidence levels:
- "high": Amount AND vendor/description match
- "medium": Amount OR vendor match, but not both confirmed
- "low": Only vague textual similarity
- "unmatched": No matching page found (pages array must be empty)`;
}

function buildUserMessage(ocrPages, records) {
    let msg = "## PDF PAGE CONTENTS\n\n";
    for (const page of ocrPages) {
        msg += `### Page ${page.index + 1}\n${page.markdown || "(empty or unreadable page)"}\n\n`;
    }

    msg += "## ACCOUNTING RECORDS\n\n";
    msg += "| UniqueCode | Vendor (carifirma) | Description (aciklama) | In (giris_tutar) | Out (cikis_tutar) | Currency | Project | Trans.Type |\n";
    msg += "|---|---|---|---|---|---|---|---|\n";
    for (const r of records) {
        const giris = Math.abs(Number(r.giris_tutar) || 0);
        const cikis = Math.abs(Number(r.cikis_tutar) || 0);
        msg += `| ${r.uniquecode} | ${r.carifirma || "-"} | ${r.aciklama || "-"} | ${giris > 0 ? giris.toFixed(2) : "-"} | ${cikis > 0 ? cikis.toFixed(2) : "-"} | ${r.parabirimi || "-"} | ${r.projekodu || "-"} | ${r.islemturu || "-"} |\n`;
    }

    return msg;
}

function parseMatches(content) {
    if (!content) return null;
    try {
        const jsonMatch = content.match(/\{[\s\S]*"matches"[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return JSON.parse(content);
    } catch {
        return null;
    }
}

async function callDeepSeek(apiKey, model, systemMessage, userMessage) {
    const start = Date.now();
    const resp = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: "system", content: systemMessage },
                { role: "user", content: userMessage },
            ],
            response_format: { type: "json_object" },
        }),
    });
    const durationMs = Date.now() - start;
    const data = await resp.json();
    return { ok: resp.ok, status: resp.status, data, durationMs };
}

async function getEnv() {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext();
    return env;
}

export async function POST(request) {
    try {
        const env = await getEnv();
        const apiKey = env.DEEPSEEK_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "DEEPSEEK_API_KEY not configured" }, { status: 500 });
        }

        const body = await request.json();
        const { ocrPages, records } = body;

        if (!ocrPages || !Array.isArray(ocrPages) || ocrPages.length === 0) {
            return NextResponse.json({ error: "No OCR pages provided" }, { status: 400 });
        }
        if (!records || !Array.isArray(records) || records.length === 0) {
            return NextResponse.json({ error: "No records provided" }, { status: 400 });
        }

        const systemMessage = buildSystemMessage();
        const userMessage = buildUserMessage(ocrPages, records);

        // Try deepseek-reasoner first
        let res = await callDeepSeek(apiKey, "deepseek-reasoner", systemMessage, userMessage);
        let model = "deepseek-reasoner";
        let fallbackUsed = false;
        let fallbackReason = null;

        if (!res.ok) {
            fallbackReason = res.data?.error?.message || `API error ${res.status}`;
            const fallbackRes = await callDeepSeek(apiKey, "deepseek-chat", systemMessage, userMessage);
            if (fallbackRes.ok) {
                res = fallbackRes;
                model = "deepseek-chat";
                fallbackUsed = true;
            }
        }

        if (!res.ok) {
            return NextResponse.json({
                error: res.data?.error?.message || `DeepSeek API error (${res.status})`,
                response: res.data,
            }, { status: 500 });
        }

        const choice = res.data.choices?.[0]?.message;
        const reasoning = choice?.reasoning_content || null;
        const content = choice?.content || "";
        const parsed = parseMatches(content);
        const usage = res.data.usage || {};
        const cost = calcCost(usage, model);

        return NextResponse.json({
            matches: parsed?.matches || [],
            reasoning,
            model,
            fallbackUsed,
            fallbackReason,
            usage,
            cost,
            durationMs: res.durationMs,
            request: { systemMessage, userMessage },
            rawContent: content,
        });
    } catch (error) {
        console.error("Auto-match match error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
