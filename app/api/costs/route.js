import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const year = searchParams.get('year');
        const project = searchParams.get('project');
        const source = searchParams.get('source');

        // Note: User requested all data to be positive.
        // We will handle this in the SELECT or post-processing.
        // SQL way: ABS(toplam_tutar)

        let sql = 'SELECT rapor_yili, proje_kodu, source, kategori_lvl_1, kategori_lvl_2, ABS(toplam_tutar) as toplam_tutar FROM public.view_proje_maliyet_ozeti WHERE 1=1';
        const params = [];

        // Note: We are fetching all data mostly as requested, but adding optional filtering logic here.
        // Ideally, for a dashboard, fetching all and filtering on client is fine for small datasets (< 10k rows).
        // If dataset is huge, server-side filtering is better.
        // Given the request description "fetch all and filter on frontend" is an option, 
        // but having server filtering readiness is good practice.

        if (year && year !== 'all') {
            params.push(year);
            sql += ` AND rapor_yili = $${params.length}`;
        }

        if (project && project !== 'all') {
            params.push(project);
            sql += ` AND proje_kodu = $${params.length}`;
        }

        if (source && source !== 'all') {
            params.push(source);
            sql += ` AND source = $${params.length}`;
        }

        // Default sorting
        sql += ' ORDER BY rapor_yili DESC, total_amount DESC'; // Assuming 'toplam_tutar' is what we want to sort by? 
        // Wait, the column name is 'toplam_tutar'. I should check the schema in the prompt.
        // Schema: rapor_yili, proje_kodu, source, kategori_lvl_1, kategori_lvl_2, toplam_tutar

        // Let's correct the sort
        sql = sql.replace('total_amount', 'toplam_tutar');

        const result = await query(sql, params);

        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Database Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
