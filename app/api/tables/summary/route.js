import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        // Cost details from view_proje_maliyet_ozeti — categorize subcontractor as its own bucket
        // pulled out of LABOUR COST so LABOUR ends up clean.
        const costSql = `
            SELECT
                rapor_yili::int AS yr,
                proje_kodu AS project,
                source,
                CASE
                    WHEN kategori_lvl_2 IN (
                        '22.01 - Turkish Sub Contractor',
                        '22.02 - Local Sub Contractor'
                    ) THEN 'SUBCONTRACTOR'
                    ELSE kategori_lvl_1
                END AS category,
                SUM(-1 * toplam_tutar)::float8 AS amount
            FROM public.view_proje_maliyet_ozeti
            GROUP BY yr, project, source, category
        `;

        // Spent — same formula used on /balances
        const spentSql = `
            SELECT
                EXTRACT(YEAR FROM date)::int AS yr,
                projekodu AS project,
                source,
                SUM(CASE WHEN COALESCE(islemturu, '') != 'TAH-CA'
                         THEN -1 * usd_degeri ELSE 0 END)::float8 AS amount
            FROM public.view_muhasebe_konsolide
            WHERE date IS NOT NULL
              AND partner = 'GORKEM'
              AND source != 'ERB'
              AND cost > 0
            GROUP BY yr, projekodu, source
        `;

        // Received — same project-level net used on /received and /balances
        const receivedSql = `
            SELECT
                EXTRACT(YEAR FROM date)::int AS yr,
                COALESCE(NULLIF(project, ''), '(empty)') AS project,
                SUM(usd_equal)::float8 AS amount
            FROM public.cash_flow
            WHERE date IS NOT NULL
              AND COALESCE(counter_party, '') NOT IN ('ANK', 'BAG')
            GROUP BY yr, project
        `;

        // Cost detail at kategori_lvl_2 granularity for the deep-breakdown table.
        const costDetailSql = `
            SELECT
                rapor_yili::int AS yr,
                proje_kodu AS project,
                source,
                kategori_lvl_1 AS l1,
                kategori_lvl_2 AS l2,
                SUM(-1 * toplam_tutar)::float8 AS amount
            FROM public.view_proje_maliyet_ozeti
            GROUP BY yr, project, source, l1, l2
        `;

        // Individual cash_flow rows for the chronological received-items table.
        // Internal ANK<->BAG transfers are excluded (neutral, project-irrelevant).
        const receivedItemsSql = `
            SELECT
                id::text AS id,
                date,
                description,
                COALESCE(counter_party, '') AS counter_party,
                type,
                category,
                is_exchange,
                COALESCE(NULLIF(project, ''), '(empty)') AS project,
                usd_equal::float8 AS amount,
                EXTRACT(YEAR FROM date)::int AS yr
            FROM public.cash_flow
            WHERE date IS NOT NULL
              AND COALESCE(counter_party, '') NOT IN ('ANK', 'BAG')
            ORDER BY date ASC, id ASC
        `;

        const [cost, spent, received, costDetail, receivedItems] = await Promise.all([
            query(costSql),
            query(spentSql),
            query(receivedSql),
            query(costDetailSql),
            query(receivedItemsSql),
        ]);

        return NextResponse.json({
            cost: cost.rows,
            spent: spent.rows,
            received: received.rows,
            costDetail: costDetail.rows,
            receivedItems: receivedItems.rows,
        });
    } catch (error) {
        console.error("tables/summary GET error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
