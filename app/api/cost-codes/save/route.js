import { getAccessToken } from "@/lib/sharepoint";
import { NextResponse } from "next/server";

const DATE_CUTOFF = "2024-10-01";
const SHEET_NAME = "KASAHAREKETLERI";
const TABLE_NAME = "Table_KasaHareketleri";
const DESC_COL_INDEX = 6; // 7th column (0-based) — LongDescription / Açıklama
const COST_CODE_COL_INDEX = 4; // 5th column (0-based) — CostCode / Malz./Hiz. Kodu

async function getEnv() {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext();
    return env;
}

/** Convert 0-based column index to Excel column letter(s): 0→A, 25→Z, 26→AA */
function columnToLetter(index) {
    let result = "";
    let n = index;
    while (n >= 0) {
        result = String.fromCharCode((n % 26) + 65) + result;
        n = Math.floor(n / 26) - 1;
    }
    return result;
}

/** Parse date string and return { year, month, day, yyyymmdd } */
function parseDate(dateStr) {
    // Handle both "2026-02-28" and "2026-02-28T00:00:00.000Z" formats
    const d = dateStr.substring(0, 10);
    const [year, month, day] = d.split("-");
    return { year, month, day, yyyymmdd: `${year}${month}${day}` };
}

/** Resolve the SharePoint path for the Excel file */
function resolveExcelPath(dateStr, source) {
    const { year, month, day, yyyymmdd } = parseDate(dateStr);
    const isNew = dateStr.substring(0, 10) >= DATE_CUTOFF;

    if (isNew) {
        return `SUBELER/GRJV/COMMON/06.ACCOUNTING/01.CASH-REPORTS/${year}/${month}/${day}/${source}/GRJV_CashReport_${source}_${yyyymmdd}.xlsm`;
    }

    // Old format
    if (source === "ANK") {
        return `MERKEZ/02.MUHASEBE/PROJE-HARCAMALARI/IQ/INFO CENTER/${year}/${month}/${day}/CashReport_TR_IC_${yyyymmdd}.xlsm`;
    }
    if (source === "BAG") {
        return `SUBELER/IQ/INFO CENTER/06.ACCOUNTING/01.CASH-REPORTS/${year}/${month}/${day}/CashReport_IQ_IC_${yyyymmdd}.xlsm`;
    }

    throw new Error(`Source "${source}" not supported for dates before ${DATE_CUTOFF}`);
}

/** Make a Graph API request with workbook session */
async function graphFetch(url, token, sessionId, options = {}) {
    const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(sessionId ? { "workbook-session-id": sessionId } : {}),
    };
    const resp = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });
    const text = await resp.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        data = { rawText: text };
    }
    return { status: resp.status, ok: resp.ok, data };
}

export async function POST(request) {
    let uniquecode = null;
    try {
        const body = await request.json();
        const { date, source, aciklama, costCode } = body;
        uniquecode = body.uniquecode;

        // Validate required fields
        if (!date || !source || !aciklama || !costCode || !uniquecode) {
            return NextResponse.json(
                { success: false, uniquecode, error: "Missing required fields: date, source, aciklama, costCode, uniquecode" },
                { status: 400 }
            );
        }

        const token = await getAccessToken();
        const env = await getEnv();
        const driveId = env.SP_DRIVE_ID;
        const filePath = resolveExcelPath(date, source);
        const base = `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(driveId)}`;

        // Step 1: Get file item ID
        const fileResp = await graphFetch(`${base}/root:/${encodeURI(filePath)}:`, token);
        if (!fileResp.ok) {
            return NextResponse.json(
                { success: false, uniquecode, error: `Excel file not found: ${filePath}`, filePath },
                { status: 404 }
            );
        }
        const itemId = fileResp.data.id;
        const wbBase = `${base}/items/${itemId}/workbook`;

        // Step 2: Create persistent workbook session
        const sessionResp = await graphFetch(`${wbBase}/createSession`, token, null, {
            method: "POST",
            body: JSON.stringify({ persistChanges: true }),
        });
        if (!sessionResp.ok) {
            return NextResponse.json(
                { success: false, uniquecode, error: `Failed to create workbook session: ${sessionResp.data?.error?.message || sessionResp.status}`, filePath },
                { status: 500 }
            );
        }
        const sessionId = sessionResp.data.id;

        try {
            // Step 3: Unprotect sheet (try no password, then Gorkem.2020)
            const unprotectResp = await graphFetch(
                `${wbBase}/worksheets/${SHEET_NAME}/protection/unprotect`,
                token, sessionId, { method: "POST", body: JSON.stringify({}) }
            );
            if (!unprotectResp.ok) {
                const unprotectRetry = await graphFetch(
                    `${wbBase}/worksheets/${SHEET_NAME}/protection/unprotect`,
                    token, sessionId, { method: "POST", body: JSON.stringify({ password: "Gorkem.2020" }) }
                );
                if (!unprotectRetry.ok) {
                    throw new Error("Cannot unprotect sheet (password mismatch)");
                }
            }

            // Step 4: Get table rows
            const rowsResp = await graphFetch(
                `${wbBase}/tables/${TABLE_NAME}/rows?$top=5000`,
                token, sessionId
            );
            if (!rowsResp.ok) {
                throw new Error(`Failed to get table rows: ${rowsResp.data?.error?.message || rowsResp.status}`);
            }

            // Find matching row by description (column index 6)
            const rows = rowsResp.data.value || [];
            const normalizedAciklama = aciklama.trim().toLowerCase();
            let matchedRowIndex = -1;

            for (let i = 0; i < rows.length; i++) {
                const rowValues = rows[i].values?.[0] || [];
                const excelDesc = String(rowValues[DESC_COL_INDEX] || "").trim().toLowerCase();
                if (excelDesc === normalizedAciklama) {
                    matchedRowIndex = i;
                    break;
                }
            }

            if (matchedRowIndex === -1) {
                throw new Error(`Row not found: no matching description in Excel file (searched ${rows.length} rows)`);
            }

            // Step 5: Get data body range to compute cell address
            const rangeResp = await graphFetch(
                `${wbBase}/tables/${TABLE_NAME}/dataBodyRange`,
                token, sessionId
            );
            if (!rangeResp.ok) {
                throw new Error(`Failed to get data body range: ${rangeResp.data?.error?.message || rangeResp.status}`);
            }

            // Parse range address like "KASAHAREKETLERI!B5:AE100"
            const rangeAddress = rangeResp.data.address;
            const match = rangeAddress.match(/!([A-Z]+)(\d+)/);
            if (!match) {
                throw new Error(`Could not parse range address: ${rangeAddress}`);
            }

            const startColStr = match[1];
            const startRow = parseInt(match[2]);

            // Convert start column letter to index, add cost code offset, convert back
            let startColIndex = 0;
            for (let i = 0; i < startColStr.length; i++) {
                startColIndex = startColIndex * 26 + (startColStr.charCodeAt(i) - 64);
            }
            startColIndex -= 1; // Convert to 0-based

            const targetColIndex = startColIndex + COST_CODE_COL_INDEX;
            const targetCol = columnToLetter(targetColIndex);
            const targetRow = startRow + matchedRowIndex;
            const cellAddress = `${SHEET_NAME}!${targetCol}${targetRow}`;

            // Step 6: Write cost code
            const writeResp = await graphFetch(
                `${wbBase}/worksheets/${SHEET_NAME}/range(address='${cellAddress}')`,
                token, sessionId,
                { method: "PATCH", body: JSON.stringify({ values: [[costCode]] }) }
            );
            if (!writeResp.ok) {
                throw new Error(`Write failed: ${writeResp.data?.error?.message || writeResp.status}`);
            }

            // Step 7: Verify — read back the cell value
            let verified = false;
            let readBackValue = null;
            try {
                const verifyResp = await graphFetch(
                    `${wbBase}/worksheets/${SHEET_NAME}/range(address='${cellAddress}')`,
                    token, sessionId
                );
                if (verifyResp.ok) {
                    readBackValue = verifyResp.data?.values?.[0]?.[0];
                    verified = String(readBackValue || "").trim() === costCode.trim();
                }
            } catch {
                // Verification read failed — write may still have succeeded
            }

            return NextResponse.json({
                success: true,
                verified,
                uniquecode,
                filePath,
                cellAddress,
                rowIndex: matchedRowIndex,
                writtenValue: costCode,
                readBackValue,
            });
        } finally {
            // Step 7: Always close session
            try {
                await graphFetch(`${wbBase}/closeSession`, token, sessionId, { method: "POST" });
            } catch {
                // Best-effort session cleanup
            }
        }
    } catch (error) {
        console.error("Cost code save error:", error);
        return NextResponse.json(
            { success: false, uniquecode, error: error.message },
            { status: 500 }
        );
    }
}
