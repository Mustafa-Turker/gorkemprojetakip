import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/sharepoint";

const MISTRAL_OCR_PRICE_PER_PAGE = 0.002;

function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    const chunks = [];
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        chunks.push(String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize)));
    }
    return btoa(chunks.join(""));
}

async function getEnv() {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext();
    return env;
}

export async function POST(request) {
    try {
        const env = await getEnv();
        const mistralKey = env.MISTRAL_API_KEY;
        if (!mistralKey) {
            return NextResponse.json({ error: "MISTRAL_API_KEY not configured" }, { status: 500 });
        }

        const body = await request.json();
        const { year, month, day } = body;
        if (!year || !month || !day) {
            return NextResponse.json({ error: "year, month, day required" }, { status: 400 });
        }

        // Step 1: Download PDF from SharePoint
        const token = await getAccessToken();
        const driveId = env.SP_DRIVE_ID;
        const mm = String(month).padStart(2, "0");
        const pdfPath = `SUBELER/GRJV/COMMON/06.ACCOUNTING/02.REPORTS/${year} Attachments/${mm}-${year}/${day}.pdf`;

        const spUrl = `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(driveId)}/root:/${encodeURI(pdfPath)}:/content`;
        const spResp = await fetch(spUrl, {
            headers: { Authorization: `Bearer ${token}` },
            redirect: "follow",
        });

        if (!spResp.ok) {
            if (spResp.status === 404) {
                return NextResponse.json({ error: `PDF not found: ${pdfPath}`, pdfPath }, { status: 404 });
            }
            return NextResponse.json({ error: `SharePoint download failed (${spResp.status})` }, { status: 500 });
        }

        const pdfBuffer = await spResp.arrayBuffer();
        const pdfBase64 = arrayBufferToBase64(pdfBuffer);

        // Step 2: Send to Mistral OCR
        const ocrStart = Date.now();
        const ocrResp = await fetch("https://api.mistral.ai/v1/ocr", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${mistralKey}`,
            },
            body: JSON.stringify({
                model: "mistral-ocr-latest",
                document: {
                    type: "document_url",
                    document_url: `data:application/pdf;base64,${pdfBase64}`,
                },
            }),
        });
        const ocrDurationMs = Date.now() - ocrStart;

        if (!ocrResp.ok) {
            const err = await ocrResp.text();
            return NextResponse.json({
                error: `Mistral OCR failed (${ocrResp.status}): ${err}`,
                pdfPath,
            }, { status: 500 });
        }

        const ocrResult = await ocrResp.json();
        const ocrPages = (ocrResult.pages || []).map(p => ({
            index: p.index,
            markdown: p.markdown || "",
        }));
        const totalPages = ocrPages.length;
        const ocrCost = totalPages * MISTRAL_OCR_PRICE_PER_PAGE;

        return NextResponse.json({
            ocrPages,
            totalPages,
            pdfPath,
            pdfSizeBytes: pdfBuffer.byteLength,
            cost: { pages: totalPages, totalCost: ocrCost, pricePerPage: MISTRAL_OCR_PRICE_PER_PAGE },
            durationMs: ocrDurationMs,
        });
    } catch (error) {
        console.error("Auto-match OCR error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
