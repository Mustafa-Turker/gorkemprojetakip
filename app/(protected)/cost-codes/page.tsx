"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { CompactMultiSelect } from "@/components/ui/compact-multi-select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatCurrency } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
    AlertCircle,
    Download,
    Loader2,
    Search,
    ChevronLeft,
    ChevronRight,
    FilterX,
    AlertTriangle,
} from "lucide-react";

interface DocumentRecord {
    uniquecode: string;
    doc: string;
    date: string;
    projekodu: string;
    source: string;
    carifirma: string;
    aciklama: string;
    usd_degeri: number;
    partner: string;
    islemturu: string;
    cost: number;
    giris_tutar: number;
    cikis_tutar: number;
    parabirimi: string;
    masrafmerkezi: string;
}

const REQUIRES_COST_CODE = ["TAH-CA", "KS-CZ", "BN-CZ"];

const translations = {
    en: {
        title: "Cost Codes",
        subtitle: "Track and manage missing cost codes (masraf merkezi)",
        bringData: "Bring Data",
        loading: "Loading...",
        year: "Year",
        month: "Month",
        allMonths: "All Months",
        months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
        source: "Source",
        allSources: "All Sources",
        project: "Project",
        allProjects: "All Projects",
        partner: "Partner",
        allPartners: "All Partners",
        transType: "Trans. Type",
        allTransTypes: "All Types",
        cost: "Cost",
        allCosts: "All Costs",
        costPositive: "Cost > 0",
        costZeroOrNeg: "Cost <= 0",
        costCode: "Cost Code",
        showMissingOnly: "Show Missing Cost Codes",
        date: "Date",
        code: "Code",
        vendor: "Vendor",
        description: "Description",
        amount: "Amount",
        incoming: "Incoming",
        outgoing: "Outgoing",
        currency: "Currency",
        totalRecords: "Total Records",
        requiresCostCode: "Requires Cost Code",
        missingCostCode: "Missing",
        filledCostCode: "Filled",
        completion: "Completion",
        noRecords: "No records found",
        noData: "Select year and month, then press Bring Data",
        showing: "Showing",
        of: "of",
        searchPlaceholder: "Search by code, vendor, description or cost code...",
        dateFrom: "From",
        dateTo: "To",
        clearFilters: "Clear Filters",
        filtered: "Filtered",
        totalAmount: "Total Amount",
        errorTitle: "Error",
        errorLoadFailed: "Failed to load documents data.",
        others: "Others",
        total: "Total",
    },
    tr: {
        title: "Masraf Merkezi",
        subtitle: "Eksik masraf merkezi kodlarini takip edin ve yonetin",
        bringData: "Veri Getir",
        loading: "Yukleniyor...",
        year: "Yil",
        month: "Ay",
        allMonths: "Tum Aylar",
        months: ["Ocak", "Subat", "Mart", "Nisan", "Mayis", "Haziran", "Temmuz", "Agustos", "Eylul", "Ekim", "Kasim", "Aralik"],
        source: "Kaynak",
        allSources: "Tum Kaynaklar",
        project: "Proje",
        allProjects: "Tum Projeler",
        partner: "Ortak",
        allPartners: "Tum Ortaklar",
        transType: "Islem Turu",
        allTransTypes: "Tum Turler",
        cost: "Maliyet",
        allCosts: "Tum Maliyetler",
        costPositive: "Maliyet > 0",
        costZeroOrNeg: "Maliyet <= 0",
        costCode: "Masraf Merkezi",
        showMissingOnly: "Eksik Masraf Merkezlerini Goster",
        date: "Tarih",
        code: "Kod",
        vendor: "Firma",
        description: "Aciklama",
        amount: "Tutar",
        incoming: "Giris",
        outgoing: "Cikis",
        currency: "Para Birimi",
        totalRecords: "Toplam Kayit",
        requiresCostCode: "MM Gerektiren",
        missingCostCode: "Eksik",
        filledCostCode: "Dolu",
        completion: "Tamamlanma",
        noRecords: "Kayit bulunamadi",
        noData: "Yil ve ay secin, ardindan Veri Getir'e basin",
        showing: "Gosterilen",
        of: "/",
        searchPlaceholder: "Kod, firma, aciklama veya masraf merkezi ile ara...",
        dateFrom: "Baslangic",
        dateTo: "Bitis",
        clearFilters: "Filtreleri Temizle",
        filtered: "Filtrelenmis",
        totalAmount: "Toplam Tutar",
        errorTitle: "Hata",
        errorLoadFailed: "Belge verileri yuklenemedi.",
        others: "Diger",
        total: "Toplam",
    },
} as const;

type Lang = keyof typeof translations;

const PAGE_SIZE = 50;

function formatDate(dateStr: string) {
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
        return dateStr;
    }
}

export default function CostCodesPage() {
    const [lang, setLang] = useState<Lang>("tr");
    const t = translations[lang];

    // Fetch-level filters
    const [year, setYear] = useState("2024");
    const [monthFilter, setMonthFilter] = useState("all");

    // Table-level filters
    const [tableSourceFilter, setTableSourceFilter] = useState<string[]>([]);
    const [tableProjectFilter, setTableProjectFilter] = useState<string[]>([]);
    const [tablePartnerFilter, setTablePartnerFilter] = useState<string[]>([]);
    const [transTypeFilter, setTransTypeFilter] = useState<string[]>([]);
    const [costFilter, setCostFilter] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [page, setPage] = useState(0);

    // Quick filter: show only records that REQUIRE cost codes but are MISSING them
    const [showMissingOnly, setShowMissingOnly] = useState(false);

    // Data state
    const [records, setRecords] = useState<DocumentRecord[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Sticky filter bar ref
    const filterBarRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (filterBarRef.current) {
            const observer = new ResizeObserver(() => {});
            observer.observe(filterBarRef.current);
            return () => observer.disconnect();
        }
    }, [records]);

    // Bring Data
    const bringData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setTableSourceFilter([]);
        setTableProjectFilter([]);
        setTablePartnerFilter([]);
        setTransTypeFilter([]);
        setCostFilter([]);
        setSearchQuery("");
        setDateFrom("");
        setDateTo("");
        setPage(0);
        setShowMissingOnly(false);

        try {
            let url = `/api/documents?year=${year}&includeMissingDocs=true`;
            if (monthFilter !== "all") url += `&month=${monthFilter}`;
            const resp = await fetch(url);
            if (!resp.ok) throw new Error("Failed to fetch documents");
            const data: DocumentRecord[] = await resp.json();
            setRecords(data);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsLoading(false);
        }
    }, [year, monthFilter]);

    // Context subtitle
    const contextLabel = useMemo(() => {
        if (!records) return "";
        const monthName = monthFilter !== "all" ? t.months[parseInt(monthFilter) - 1] : t.allMonths;
        return `${year} — ${monthName}`;
    }, [year, monthFilter, records, t]);

    // Get unique values for filter dropdowns
    const { sources, projects, partners, transTypes } = useMemo(() => {
        if (!records) return { sources: [], projects: [], partners: [], transTypes: [] };
        const s = [...new Set(records.map((r) => r.source))].filter(Boolean).sort();
        const p = [...new Set(records.map((r) => r.projekodu))].filter(Boolean).sort();
        const pt = [...new Set(records.map((r) => r.partner || ""))].sort();
        const tt = [...new Set(records.map((r) => r.islemturu || ""))].sort();
        return { sources: s, projects: p, partners: pt, transTypes: tt };
    }, [records]);

    // Summary metrics
    const metrics = useMemo(() => {
        if (!records) return { total: 0, requires: 0, missing: 0, filled: 0 };
        const requires = records.filter((r) => REQUIRES_COST_CODE.includes(r.islemturu));
        const missing = requires.filter((r) => !r.masrafmerkezi || r.masrafmerkezi.trim() === "");
        return {
            total: records.length,
            requires: requires.length,
            missing: missing.length,
            filled: requires.length - missing.length,
        };
    }, [records]);

    // Filter pipeline
    const filteredRecords = useMemo(() => {
        if (!records) return [];
        let filtered = records;

        // Quick filter: show only records missing cost codes
        if (showMissingOnly) {
            filtered = filtered.filter((r) =>
                REQUIRES_COST_CODE.includes(r.islemturu) &&
                (!r.masrafmerkezi || r.masrafmerkezi.trim() === "")
            );
        }

        if (tableSourceFilter.length > 0) {
            filtered = filtered.filter((r) => tableSourceFilter.includes(r.source));
        }
        if (tableProjectFilter.length > 0) {
            filtered = filtered.filter((r) => tableProjectFilter.includes(r.projekodu));
        }
        if (tablePartnerFilter.length > 0) {
            filtered = filtered.filter((r) => {
                const pv = r.partner || "__blank";
                return tablePartnerFilter.includes(pv);
            });
        }
        if (transTypeFilter.length > 0) {
            filtered = filtered.filter((r) => {
                const tv = r.islemturu || "__blank";
                return transTypeFilter.includes(tv);
            });
        }
        if (costFilter.length > 0) {
            filtered = filtered.filter((r) => {
                const c = Number(r.cost) || 0;
                if (costFilter.includes("positive") && c > 0) return true;
                if (costFilter.includes("zeroOrNeg") && c <= 0) return true;
                return false;
            });
        }
        if (dateFrom) {
            filtered = filtered.filter((r) => r.date >= dateFrom);
        }
        if (dateTo) {
            filtered = filtered.filter((r) => r.date <= dateTo);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            filtered = filtered.filter((r) =>
                r.uniquecode?.toLowerCase().includes(q) ||
                r.carifirma?.toLowerCase().includes(q) ||
                r.aciklama?.toLowerCase().includes(q) ||
                r.masrafmerkezi?.toLowerCase().includes(q)
            );
        }

        return filtered;
    }, [records, showMissingOnly, tableSourceFilter, tableProjectFilter, tablePartnerFilter, transTypeFilter, costFilter, dateFrom, dateTo, searchQuery]);

    // Pagination
    const totalPages = Math.ceil(filteredRecords.length / PAGE_SIZE);
    const pagedRecords = filteredRecords.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    const hasTableFilters = tableSourceFilter.length > 0 || tableProjectFilter.length > 0 || tablePartnerFilter.length > 0 || transTypeFilter.length > 0 || costFilter.length > 0 || dateFrom || dateTo || searchQuery.trim();

    const clearAllFilters = useCallback(() => {
        setTableSourceFilter([]);
        setTableProjectFilter([]);
        setTablePartnerFilter([]);
        setTransTypeFilter([]);
        setCostFilter([]);
        setSearchQuery("");
        setDateFrom("");
        setDateTo("");
        setPage(0);
    }, []);

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
            <main className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
                {/* Page header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                            {t.subtitle}
                        </p>
                    </div>
                    {/* Language switch */}
                    <div className="flex items-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-0.5">
                        <button
                            onClick={() => setLang("en")}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                                lang === "en"
                                    ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                            }`}
                        >
                            EN
                        </button>
                        <button
                            onClick={() => setLang("tr")}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                                lang === "tr"
                                    ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                            }`}
                        >
                            TR
                        </button>
                    </div>
                </div>

                {/* Top bar: Year + Month + Bring Data */}
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-4">
                    <Select value={year} onValueChange={setYear}>
                        <SelectTrigger className="w-[120px] bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
                            <SelectValue placeholder={t.year} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="2026">2026</SelectItem>
                            <SelectItem value="2025">2025</SelectItem>
                            <SelectItem value="2024">2024</SelectItem>
                            <SelectItem value="2023">2023</SelectItem>
                            <SelectItem value="2022">2022</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={monthFilter} onValueChange={setMonthFilter}>
                        <SelectTrigger className="w-[140px] bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
                            <SelectValue placeholder={t.month} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t.allMonths}</SelectItem>
                            {t.months.map((name, i) => (
                                <SelectItem key={i} value={String(i + 1).padStart(2, "0")}>{name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button
                        onClick={bringData}
                        disabled={isLoading}
                        className="flex-1 sm:flex-none sm:min-w-[180px] bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-lg shadow-indigo-500/25 h-10"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                {t.loading}
                            </>
                        ) : (
                            <>
                                <Download className="h-4 w-4 mr-2" />
                                {t.bringData}
                            </>
                        )}
                    </Button>
                </div>

                {/* Error */}
                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>{t.errorTitle}</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {/* Summary stats */}
                {records && (
                    <div className="flex flex-wrap items-center gap-3">
                        {contextLabel && (
                            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mr-2">
                                {contextLabel}
                            </span>
                        )}
                        <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary" className="text-xs px-3 py-1.5">
                                {t.totalRecords}: <span className="font-bold ml-1">{metrics.total.toLocaleString()}</span>
                            </Badge>
                            <Badge variant="outline" className="text-xs px-3 py-1.5 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/20">
                                {t.requiresCostCode}: <span className="font-bold ml-1">{metrics.requires.toLocaleString()}</span>
                            </Badge>
                            <Badge variant="outline" className="text-xs px-3 py-1.5 border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/20">
                                {t.missingCostCode}: <span className="font-bold ml-1">{metrics.missing.toLocaleString()}</span>
                            </Badge>
                            <Badge variant="outline" className="text-xs px-3 py-1.5 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/20">
                                {t.filledCostCode}: <span className="font-bold ml-1">{metrics.filled.toLocaleString()}</span>
                            </Badge>
                            {metrics.requires > 0 && (
                                <Badge variant="outline" className="text-xs px-3 py-1.5">
                                    {t.completion}: <span className="font-bold ml-1">{Math.round((metrics.filled / metrics.requires) * 100)}%</span>
                                </Badge>
                            )}
                        </div>
                    </div>
                )}

                {/* Table section */}
                {records === null && !isLoading ? (
                    <div className="text-center py-20 text-zinc-400 dark:text-zinc-500">
                        <Download className="h-12 w-12 mx-auto mb-4 opacity-30" />
                        <p className="text-sm">{t.noData}</p>
                    </div>
                ) : isLoading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 10 }).map((_, i) => (
                            <div key={i} className="h-12 w-full rounded-lg bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
                        ))}
                    </div>
                ) : records && (
                    <>
                    {/* Sticky table filters */}
                    <div
                        ref={filterBarRef}
                        className="sticky top-16 z-20 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 border-b-0 rounded-t-xl shadow-sm p-3 space-y-2 -mb-px"
                    >
                        {/* Filter row 1: dropdowns */}
                        <div className="flex flex-wrap gap-2">
                            <CompactMultiSelect
                                options={sources.map((s) => ({ label: s, value: s }))}
                                selected={tableSourceFilter}
                                onChange={(v) => { setTableSourceFilter(v); setPage(0); }}
                                placeholder={t.allSources}
                                className="w-[140px]"
                            />

                            <CompactMultiSelect
                                options={projects.map((p) => ({ label: p, value: p }))}
                                selected={tableProjectFilter}
                                onChange={(v) => { setTableProjectFilter(v); setPage(0); }}
                                placeholder={t.allProjects}
                                className="w-[140px]"
                            />

                            <CompactMultiSelect
                                options={partners.map((p) => ({ label: p || "\u2014", value: p || "__blank" }))}
                                selected={tablePartnerFilter}
                                onChange={(v) => { setTablePartnerFilter(v); setPage(0); }}
                                placeholder={t.allPartners}
                                className="w-[140px]"
                            />

                            <CompactMultiSelect
                                options={transTypes.map((tt) => ({ label: tt || "\u2014", value: tt || "__blank" }))}
                                selected={transTypeFilter}
                                onChange={(v) => { setTransTypeFilter(v); setPage(0); }}
                                placeholder={t.allTransTypes}
                                className="w-[140px]"
                            />

                            <CompactMultiSelect
                                options={[
                                    { label: t.costPositive, value: "positive" },
                                    { label: t.costZeroOrNeg, value: "zeroOrNeg" },
                                ]}
                                selected={costFilter}
                                onChange={(v) => { setCostFilter(v); setPage(0); }}
                                placeholder={t.allCosts}
                                className="w-[140px]"
                            />
                        </div>

                        {/* Filter row 2: quick filter + date range + search */}
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Show Missing Cost Codes toggle */}
                            <button
                                onClick={() => { setShowMissingOnly(!showMissingOnly); setPage(0); }}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                                    showMissingOnly
                                        ? "bg-rose-50 dark:bg-rose-950/30 border-rose-400 dark:border-rose-700 text-rose-700 dark:text-rose-300"
                                        : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-rose-400 dark:hover:border-rose-600"
                                }`}
                            >
                                <AlertTriangle className="h-3 w-3" />
                                {t.showMissingOnly}
                            </button>

                            <div className="hidden sm:block w-px h-5 bg-zinc-200 dark:bg-zinc-700 mx-1" />

                            {/* Date range */}
                            <div className="flex items-center gap-1.5">
                                <label className="text-xs text-zinc-500 dark:text-zinc-400">{t.dateFrom}</label>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
                                    className="h-7 px-2 text-xs rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                                />
                            </div>
                            <div className="flex items-center gap-1.5">
                                <label className="text-xs text-zinc-500 dark:text-zinc-400">{t.dateTo}</label>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
                                    className="h-7 px-2 text-xs rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                                />
                            </div>

                            <div className="hidden sm:block w-px h-5 bg-zinc-200 dark:bg-zinc-700 mx-1" />

                            {/* Clear filters */}
                            {(hasTableFilters || showMissingOnly) && (
                                <button
                                    onClick={() => { clearAllFilters(); setShowMissingOnly(false); }}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                >
                                    <FilterX className="h-3 w-3" />
                                    {t.clearFilters}
                                </button>
                            )}

                            {/* Filtered count */}
                            {(hasTableFilters || showMissingOnly) && records && (
                                <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                                    {t.filtered}: {filteredRecords.length} / {records.length}
                                </span>
                            )}

                            {/* Total amount */}
                            {records && (
                                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 whitespace-nowrap tabular-nums">
                                    {t.totalAmount}: {formatCurrency(filteredRecords.reduce((s, r) => s + Math.abs(Number(r.usd_degeri) || 0), 0))}
                                </span>
                            )}

                            {/* Search */}
                            <div className="relative flex-1 min-w-[200px]">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                                <Input
                                    placeholder={t.searchPlaceholder}
                                    value={searchQuery}
                                    onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                                    className="pl-7 h-7 text-xs bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="rounded-b-xl border border-zinc-200 dark:border-zinc-800 border-t-0 bg-white dark:bg-zinc-900 shadow-sm overflow-auto max-h-[calc(100vh-200px)]">
                        <table className="w-full text-sm" style={{ minWidth: 1400 }}>
                            <thead className="sticky top-0 z-30 bg-zinc-50 dark:bg-zinc-900">
                                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                                    <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400 w-12 sticky left-0 z-40 bg-zinc-50 dark:bg-zinc-900">#</th>
                                    <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400 sticky left-[48px] z-40 bg-zinc-50 dark:bg-zinc-900 whitespace-nowrap">{t.date}</th>
                                    <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400 sticky left-[148px] z-40 bg-zinc-50 dark:bg-zinc-900 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] whitespace-nowrap">{t.code}</th>
                                    <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{t.project}</th>
                                    <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{t.source}</th>
                                    <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{t.partner}</th>
                                    <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{t.vendor}</th>
                                    <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{t.description}</th>
                                    <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{t.transType}</th>
                                    <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{t.costCode}</th>
                                    <th className="px-4 py-3 text-right font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{t.incoming}</th>
                                    <th className="px-4 py-3 text-right font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{t.outgoing}</th>
                                    <th className="px-4 py-3 text-center font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{t.currency}</th>
                                    <th className="px-4 py-3 text-right font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{t.cost}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pagedRecords.map((record, i) => {
                                    const rowNum = page * PAGE_SIZE + i + 1;
                                    const needsCostCode = REQUIRES_COST_CODE.includes(record.islemturu);
                                    const hasCostCode = record.masrafmerkezi && record.masrafmerkezi.trim() !== "";
                                    const isMissing = needsCostCode && !hasCostCode;
                                    return (
                                        <tr
                                            key={record.uniquecode}
                                            className={`border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors ${
                                                isMissing ? "bg-rose-50/50 dark:bg-rose-950/10" : ""
                                            }`}
                                        >
                                            <td className="px-4 py-3 text-zinc-400 dark:text-zinc-500 tabular-nums sticky left-0 z-20 bg-inherit">{rowNum}</td>
                                            <td className="px-4 py-3 tabular-nums whitespace-nowrap sticky left-[48px] z-20 bg-inherit">{formatDate(record.date)}</td>
                                            <td className="px-4 py-3 font-mono text-xs whitespace-nowrap sticky left-[148px] z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] bg-inherit">{record.uniquecode}</td>
                                            <td className="px-4 py-3">
                                                <Badge variant="outline" className="font-mono text-xs">{record.projekodu}</Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant="secondary" className="text-xs">{record.source}</Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                {record.partner ? (
                                                    <Badge variant="outline" className="text-xs">{record.partner}</Badge>
                                                ) : (
                                                    <span className="text-zinc-300 dark:text-zinc-700">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 max-w-[200px] truncate text-zinc-600 dark:text-zinc-400">
                                                {record.carifirma}
                                            </td>
                                            <td className="px-4 py-3 max-w-[250px] truncate text-zinc-500 dark:text-zinc-500">
                                                {record.aciklama}
                                            </td>
                                            <td className="px-4 py-3">
                                                {record.islemturu ? (
                                                    <Badge
                                                        variant="outline"
                                                        className={`text-xs font-mono ${
                                                            needsCostCode
                                                                ? "border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300"
                                                                : ""
                                                        }`}
                                                    >
                                                        {record.islemturu}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-zinc-300 dark:text-zinc-700">—</span>
                                                )}
                                            </td>
                                            <td className={`px-4 py-3 font-mono text-xs ${
                                                isMissing
                                                    ? "text-rose-600 dark:text-rose-400 font-semibold"
                                                    : hasCostCode
                                                        ? "text-emerald-600 dark:text-emerald-400"
                                                        : "text-zinc-300 dark:text-zinc-700"
                                            }`}>
                                                {hasCostCode ? record.masrafmerkezi : isMissing ? "—" : "—"}
                                            </td>
                                            <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap text-emerald-600 dark:text-emerald-400">
                                                {Math.abs(Number(record.giris_tutar) || 0) > 0
                                                    ? Math.abs(Number(record.giris_tutar) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                                    : <span className="text-zinc-300 dark:text-zinc-700">—</span>
                                                }
                                            </td>
                                            <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap text-rose-600 dark:text-rose-400">
                                                {Math.abs(Number(record.cikis_tutar) || 0) > 0
                                                    ? Math.abs(Number(record.cikis_tutar) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                                    : <span className="text-zinc-300 dark:text-zinc-700">—</span>
                                                }
                                            </td>
                                            <td className="px-4 py-3 text-center text-xs whitespace-nowrap">
                                                {record.parabirimi || <span className="text-zinc-300 dark:text-zinc-700">—</span>}
                                            </td>
                                            <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                                                {Number(record.cost) || 0}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {pagedRecords.length === 0 && (
                                    <tr>
                                        <td colSpan={14} className="px-4 py-12 text-center text-zinc-400">
                                            {t.noRecords}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-200 dark:border-zinc-800">
                                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                                    {t.showing} {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, filteredRecords.length)} {t.of} {filteredRecords.length}
                                </span>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                                        disabled={page === 0}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                                        disabled={page >= totalPages - 1}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                    </>
                )}
            </main>
        </div>
    );
}
