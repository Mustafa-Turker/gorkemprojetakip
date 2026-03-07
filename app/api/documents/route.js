import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const year = searchParams.get("year") || "2024";
        const source = searchParams.get("source");
        const project = searchParams.get("project");

        const includeMissingDocs = searchParams.get("includeMissingDocs") === "true";

        let sql = `
            SELECT uniquecode, doc, date, projekodu, source, carifirma, aciklama, usd_degeri, partner, islemturu, cost, giris_tutar, cikis_tutar, parabirimi, masrafmerkezi
            FROM public.view_muhasebe_konsolide
            WHERE year = $1
        `;
        if (!includeMissingDocs) {
            sql += ` AND doc IS NOT NULL AND doc != ''`;
        }
        const params = [year];

        if (source) {
            params.push(source);
            sql += ` AND source = $${params.length}`;
        }

        if (project) {
            params.push(project);
            sql += ` AND projekodu = $${params.length}`;
        }

        const month = searchParams.get("month");
        if (month) {
            params.push(parseInt(month));
            sql += ` AND EXTRACT(MONTH FROM date) = $${params.length}`;
        }

        const day = searchParams.get("day");
        if (day) {
            params.push(parseInt(day));
            sql += ` AND EXTRACT(DAY FROM date) = $${params.length}`;
        }

        sql += " ORDER BY date DESC, uniquecode ASC";

        const result = await query(sql, params);

        return NextResponse.json(result.rows);
    } catch (error) {
        console.error("Documents API Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
