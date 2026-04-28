import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const netSql = `
            SELECT
                EXTRACT(YEAR FROM date)::int AS yr,
                EXTRACT(MONTH FROM date)::int AS mo,
                COALESCE(NULLIF(project, ''), '(empty)') AS project,
                SUM(usd_equal)::float8 AS amount
            FROM public.cash_flow
            WHERE date IS NOT NULL
              AND COALESCE(counter_party, '') NOT IN ('ANK', 'BAG')
            GROUP BY yr, mo, project
            ORDER BY yr, mo, project
        `;

        const spentSql = `
            SELECT
                EXTRACT(YEAR FROM date)::int AS yr,
                EXTRACT(MONTH FROM date)::int AS mo,
                projekodu AS project,
                SUM(CASE WHEN COALESCE(islemturu, '') != 'TAH-CA' THEN -1 * usd_degeri ELSE 0 END)::float8 AS amount
            FROM public.view_muhasebe_konsolide
            WHERE date IS NOT NULL
              AND partner = 'GORKEM'
              AND source != 'ERB'
              AND cost > 0
            GROUP BY yr, mo, projekodu
            ORDER BY yr, mo, projekodu
        `;

        const [netResult, spentResult] = await Promise.all([
            query(netSql),
            query(spentSql),
        ]);

        return NextResponse.json({
            netPosition: netResult.rows,
            spent: spentResult.rows,
        });
    } catch (error) {
        console.error("balance GET error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
