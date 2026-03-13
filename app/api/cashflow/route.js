import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const project = searchParams.get("project");

        if (!project) {
            return NextResponse.json(
                { error: "project parameter is required" },
                { status: 400 }
            );
        }

        let sql = `
            SELECT
                EXTRACT(YEAR FROM date)::int AS yr,
                EXTRACT(MONTH FROM date)::int AS mo,
                SUM(-1 * usd_degeri) AS total_cost,
                SUM(CASE WHEN COALESCE(islemturu, '') != 'TAH-CA' THEN -1 * usd_degeri ELSE 0 END) AS total_spent
            FROM public.view_muhasebe_konsolide
            WHERE projekodu = $1
                AND date IS NOT NULL
                AND partner = 'GORKEM'
                AND source != 'ERB'
                AND cost > 0
        `;
        const params = [project];

        const source = searchParams.get("source");
        if (source) {
            params.push(source);
            sql += ` AND source = $${params.length}`;
        }

        sql += ` GROUP BY yr, mo ORDER BY yr ASC, mo ASC`;

        const result = await query(sql, params);

        return NextResponse.json(result.rows);
    } catch (error) {
        console.error("Cashflow API Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
