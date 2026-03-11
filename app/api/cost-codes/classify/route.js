import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/sharepoint";

const SP_SITE_ID = "gorkem.sharepoint.com,a16ee5d5-798f-41f0-9bf4-79e7401c77d0,94f7370c-3990-4c58-951a-766976013138";
const OLD_LIST_ID = "b021ff2d-4637-43a7-9478-cf7a480703c6";
const NEW_LIST_ID = "2b31da96-91de-43b3-a0b5-6cf0efa2948e";
const DATE_CUTOFF = "2024-10-01";

// DeepSeek pricing (per 1M tokens)
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

// In-memory cache for cost code lists
let cachedOldList = null;
let cachedNewList = null;

async function fetchListItems(listId, token) {
    const items = [];
    let url = `https://graph.microsoft.com/v1.0/sites/${SP_SITE_ID}/lists/${listId}/items?expand=fields&$top=200`;

    while (url) {
        const resp = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) {
            const err = await resp.text();
            throw new Error(`Failed to fetch list items (${resp.status}): ${err}`);
        }
        const data = await resp.json();
        if (data.value) {
            items.push(...data.value);
        }
        url = data["@odata.nextLink"] || null;
    }
    return items;
}

function formatOldList(items) {
    return items.map((item) => {
        const f = item.fields || {};
        return {
            kisaKod: f.KisaKod || "",
            title: f.Title || "",
            mainGroup: f.Ana_x0020_Grup || "",
            costGroup: f.CostGroup || "",
            enTitle: f.EN_Basl_x0131_k || "",
            enMainGroup: f.EN_AnaGrup || "",
        };
    }).filter((c) => c.kisaKod);
}

function formatNewList(items) {
    return items.map((item) => {
        const f = item.fields || {};
        return {
            kisaKod: f.KisaKod || "",
            title: f.Title || "",
            mainGroup: f.Ana_x0020_Grup || "",
            subGroup: f.SubGroup || "",
            childGroup: f.ChildGroup || "",
        };
    }).filter((c) => c.kisaKod);
}

function buildCostCodeTable(codes, isOld) {
    if (isOld) {
        const header = "KisaKod | Title (TR) | Main Group | Cost Group (EN) | EN Title";
        const rows = codes.map((c) =>
            `${c.kisaKod} | ${c.title} | ${c.mainGroup} | ${c.costGroup} | ${c.enTitle}`
        );
        return [header, ...rows].join("\n");
    } else {
        const header = "KisaKod | Title | MainGroup | SubGroup | ChildGroup";
        const rows = codes.map((c) =>
            `${c.kisaKod} | ${c.title} | ${c.mainGroup} | ${c.subGroup} | ${c.childGroup}`
        );
        return [header, ...rows].join("\n");
    }
}

function buildSystemMessage(costCodeTable) {
    return `You are a cost code classifier for GORKEM, a construction company operating in Turkey and Iraq. Given a transaction description and vendor name, assign the most appropriate cost code from the list below.

COST CODE LIST:
${costCodeTable}

MANDATORY RULES (these override your judgment — always apply these first):
- All fuel/benzin/mazot/yakit expenses for vehicles → 21.09.02.00
- All handtools/el aleti purchases → 00.05.01.00
- All local transportation/nakliye/tasima → 21.10.03.00
- All personnel plane tickets/ucak bileti → 21.11.01.00
- All camp repair/maintenance/kamp tamirat → 21.08.01.00
- All otopark/car park/parking expenses → 21.12.01.00
- All Controller Office/kontrolor ofisi expenses → 01.03.16.00
- All KONTOR/mobile kontor/cep telefonu kontor expenses → 21.05.02.00
- All eating/drinking at outside restaurants/disarida yemek → 21.04.02.00

Return ONLY valid JSON: {"costCode": "XX.XX.XX.XX"}
The costCode MUST be one of the KisaKod values from the list above. Do not invent new codes.`;
}

function buildUserMessage(record) {
    const parts = [];
    if (record.aciklama) parts.push(`Description: ${record.aciklama}`);
    if (record.carifirma) parts.push(`Vendor: ${record.carifirma}`);
    if (record.islemturu) parts.push(`Transaction Type: ${record.islemturu}`);
    if (record.projekodu) parts.push(`Project: ${record.projekodu}`);
    if (record.source) parts.push(`Source: ${record.source}`);
    if (record.additionalInfo) parts.push(`\nAdditional context from the user: ${record.additionalInfo}`);
    return parts.join("\n");
}

/** Look up a cost code in the list and return its hierarchical description */
function lookupCodeDescription(codes, kisaKod, isOld) {
    if (!kisaKod) return null;
    const match = codes.find((c) => c.kisaKod === kisaKod);
    if (!match) return null;
    if (isOld) {
        return { mainGroup: match.enMainGroup || "", costGroup: match.costGroup || "", title: match.enTitle || "" };
    }
    return { mainGroup: match.mainGroup || "", subGroup: match.subGroup || "", childGroup: match.childGroup || "", title: match.title || "" };
}

function parseSuggestion(content) {
    if (!content) return null;
    try {
        const jsonMatch = content.match(/\{[^}]*"costCode"\s*:\s*"([^"]+)"[^}]*\}/);
        if (jsonMatch) return jsonMatch[1];
        const parsed = JSON.parse(content);
        return parsed.costCode || null;
    } catch {
        const codeMatch = content.match(/\d{2}\.\d{2}\.\d{2}\.\d{2}/);
        return codeMatch ? codeMatch[0] : null;
    }
}

async function callDeepSeek(apiKey, model, systemMessage, userMessage) {
    const body = {
        model,
        messages: [
            { role: "system", content: systemMessage },
            { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" },
    };

    const start = Date.now();
    const resp = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
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
        const { records } = body;
        if (!records || !Array.isArray(records) || records.length === 0) {
            return NextResponse.json({ error: "No records provided" }, { status: 400 });
        }

        const token = await getAccessToken();

        const firstDate = records[0].date || "";
        const useOld = firstDate < DATE_CUTOFF;
        const listId = useOld ? OLD_LIST_ID : NEW_LIST_ID;
        const listName = useOld ? "GIDER GRUPLARI 2022" : "IQ COST CODES";

        let codes;
        if (useOld) {
            if (!cachedOldList) cachedOldList = formatOldList(await fetchListItems(listId, token));
            codes = cachedOldList;
        } else {
            if (!cachedNewList) cachedNewList = formatNewList(await fetchListItems(listId, token));
            codes = cachedNewList;
        }

        const costCodeTable = buildCostCodeTable(codes, useOld);
        const systemMessage = buildSystemMessage(costCodeTable);

        const results = [];
        for (const record of records) {
            const userMessage = buildUserMessage(record);

            try {
                // Try deepseek-reasoner first
                let res = await callDeepSeek(apiKey, "deepseek-reasoner", systemMessage, userMessage);
                let model = "deepseek-reasoner";
                let fallbackUsed = false;
                let fallbackReason = null;

                // Fallback to deepseek-chat if reasoner fails
                if (!res.ok) {
                    fallbackReason = res.data?.error?.message || `API error ${res.status}`;
                    const fallbackRes = await callDeepSeek(apiKey, "deepseek-chat", systemMessage, userMessage);
                    if (fallbackRes.ok) {
                        res = fallbackRes;
                        model = "deepseek-chat";
                        fallbackUsed = true;
                    }
                    // If fallback also fails, we'll use the original error below
                }

                if (!res.ok) {
                    results.push({
                        uniquecode: record.uniquecode,
                        suggestion: null,
                        reasoning: null,
                        request: { systemMessage, userMessage, model },
                        response: res.data,
                        listUsed: useOld ? "old" : "new",
                        durationMs: res.durationMs,
                        error: res.data?.error?.message || `API error ${res.status}`,
                    });
                    continue;
                }

                const choice = res.data.choices?.[0]?.message;
                const reasoning = choice?.reasoning_content || null;
                const content = choice?.content || "";
                const suggestion = parseSuggestion(content);
                const usage = res.data.usage || {};
                const cost = calcCost(usage, model);
                const codeDescription = lookupCodeDescription(codes, suggestion, useOld);

                results.push({
                    uniquecode: record.uniquecode,
                    suggestion,
                    codeDescription,
                    reasoning,
                    request: { systemMessage, userMessage, model },
                    response: res.data,
                    listUsed: useOld ? "old" : "new",
                    usage,
                    cost,
                    durationMs: res.durationMs,
                    fallbackUsed,
                    fallbackReason,
                });
            } catch (err) {
                results.push({
                    uniquecode: record.uniquecode,
                    suggestion: null,
                    reasoning: null,
                    request: { systemMessage, userMessage: buildUserMessage(record), model: "deepseek-reasoner" },
                    response: null,
                    listUsed: useOld ? "old" : "new",
                    error: err.message,
                });
            }
        }

        return NextResponse.json({
            results,
            costCodeList: { name: listName, itemCount: codes.length, codes, isOld: useOld },
        });
    } catch (error) {
        console.error("Cost code classify error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
