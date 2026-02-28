import { query } from "@/lib/db";
import { renameFile } from "@/lib/sharepoint";
import { NextResponse } from "next/server";

const SQL = `
    SELECT uniquecode, doc
    FROM public.view_muhasebe_konsolide
    WHERE uniquecode LIKE 'ANK.%'
      AND doc IS NOT NULL AND doc != ''
    GROUP BY uniquecode, doc
`;

function getFilenames(docUrl, uniquecode) {
    // Current filename in SharePoint has TR. prefix (the bug)
    const oldFilename = docUrl.split("/").pop();
    // Correct filename should use ANK. prefix (matching uniquecode)
    const newFilename = uniquecode + ".pdf";
    return { oldFilename, newFilename };
}

// GET = dry run / preview
export async function GET() {
    try {
        const result = await query(SQL);
        const records = result.rows.map((row) => {
            const { oldFilename, newFilename } = getFilenames(row.doc, row.uniquecode);
            return {
                uniquecode: row.uniquecode,
                oldFilename,
                newFilename,
                docUrl: row.doc,
            };
        });

        return NextResponse.json({ total: records.length, records });
    } catch (error) {
        console.error("Fix-filenames preview error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST = execute renames
export async function POST() {
    try {
        const result = await query(SQL);
        const rows = result.rows;
        const details = [];
        let renamed = 0;
        let notFound = 0;
        let errors = 0;

        // Process 5 at a time
        const concurrency = 5;
        for (let i = 0; i < rows.length; i += concurrency) {
            const batch = rows.slice(i, i + concurrency);
            await Promise.all(
                batch.map(async (row) => {
                    const { newFilename } = getFilenames(row.doc, row.uniquecode);
                    try {
                        await renameFile(row.doc, newFilename);
                        renamed++;
                        details.push({ uniquecode: row.uniquecode, status: "renamed" });
                    } catch (err) {
                        const msg = err.message || String(err);
                        if (msg.includes("404")) {
                            notFound++;
                            details.push({ uniquecode: row.uniquecode, status: "not_found" });
                        } else {
                            errors++;
                            details.push({ uniquecode: row.uniquecode, status: "error", error: msg });
                        }
                    }
                })
            );
        }

        return NextResponse.json({ total: rows.length, renamed, notFound, errors, details });
    } catch (error) {
        console.error("Fix-filenames execute error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
