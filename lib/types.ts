export interface CostRecord {
    rapor_yili: string;
    proje_kodu: string;
    source: string;
    kategori_lvl_1: string;
    kategori_lvl_2: string;
    toplam_tutar: number | string;
    [key: string]: any;
}

export interface ChartDataPoint {
    name: string;
    value: number;
    [key: string]: any;
}

export interface YearlyDataPoint {
    year: string;
    amount: number;
    [key: string]: any;
}
