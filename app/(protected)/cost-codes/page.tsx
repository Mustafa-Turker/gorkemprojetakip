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
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    AlertCircle,
    Download,
    Loader2,
    Search,
    ChevronLeft,
    ChevronRight,
    FilterX,
    AlertTriangle,
    Sparkles,
    ChevronDown,
    ChevronUp,
    Check,
    X,
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

interface AiClassifyResult {
    uniquecode: string;
    suggestion: string | null;
    reasoning: string | null;
    request: { systemMessage: string; userMessage: string; model: string };
    response: unknown;
    listUsed: "old" | "new";
    error?: string;
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
        action: "Action",
        classify: "Classify",
        classifyAll: "Classify All Missing",
        classifying: "Classifying...",
        aiSuggestion: "AI Suggestion",
        aiDebugPanel: "AI Classification Debug",
        systemMessage: "System Message",
        userMessage: "User Message",
        rawResponse: "Raw Response",
        reasoning: "AI Reasoning",
        suggestedCode: "Suggested Code",
        accept: "Accept",
        dismiss: "Dismiss",
        record: "Record",
        listUsed: "Cost Code List",
        noSuggestion: "No suggestion returned",
        batchProgress: "Classifying {current} of {total}...",
        batchDone: "Classification complete: {done} of {total} classified",
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
        action: "Islem",
        classify: "Siniflandir",
        classifyAll: "Tum Eksikleri Siniflandir",
        classifying: "Siniflandiriliyor...",
        aiSuggestion: "AI Onerisi",
        aiDebugPanel: "AI Siniflandirma Detaylari",
        systemMessage: "Sistem Mesaji",
        userMessage: "Kullanici Mesaji",
        rawResponse: "Ham Yanit",
        reasoning: "AI Mantigi",
        suggestedCode: "Onerilen Kod",
        accept: "Kabul Et",
        dismiss: "Kapat",
        record: "Kayit",
        listUsed: "Masraf Merkezi Listesi",
        noSuggestion: "Oneri donmedi",
        batchProgress: "{current} / {total} siniflandiriliyor...",
        batchDone: "Siniflandirma tamamlandi: {done} / {total} siniflandirildi",
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

    // AI classification state
    const [aiResults, setAiResults] = useState<Record<string, AiClassifyResult>>({});
    const [acceptedCodes, setAcceptedCodes] = useState<Record<string, string>>({});
    const [classifying, setClassifying] = useState<string | null>(null);
    const [classifyingAll, setClassifyingAll] = useState(false);
    const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
    const [aiPanelRecord, setAiPanelRecord] = useState<string | null>(null);
    const abortRef = useRef(false);

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
        setAiResults({});
        setAcceptedCodes({});

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

    // Classify a single record
    const classifyRecord = useCallback(async (record: DocumentRecord) => {
        setClassifying(record.uniquecode);
        try {
            const resp = await fetch("/api/cost-codes/classify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    records: [{
                        uniquecode: record.uniquecode,
                        aciklama: record.aciklama,
                        carifirma: record.carifirma,
                        islemturu: record.islemturu,
                        date: record.date,
                        projekodu: record.projekodu,
                        source: record.source,
                    }],
                }),
            });
            const data = await resp.json();
            if (data.results?.[0]) {
                setAiResults((prev) => ({
                    ...prev,
                    [record.uniquecode]: data.results[0],
                }));
                setAiPanelRecord(record.uniquecode);
            }
        } catch (err) {
            setAiResults((prev) => ({
                ...prev,
                [record.uniquecode]: {
                    uniquecode: record.uniquecode,
                    suggestion: null,
                    reasoning: null,
                    request: { systemMessage: "", userMessage: "", model: "deepseek-reasoner" },
                    response: null,
                    listUsed: "new",
                    error: (err as Error).message,
                },
            }));
        } finally {
            setClassifying(null);
        }
    }, []);

    // Batch classify all visible missing records
    const classifyAllMissing = useCallback(async () => {
        if (!records) return;
        abortRef.current = false;
        setClassifyingAll(true);

        const missingRecords = filteredRecords.filter(
            (r) =>
                REQUIRES_COST_CODE.includes(r.islemturu) &&
                (!r.masrafmerkezi || r.masrafmerkezi.trim() === "") &&
                !aiResults[r.uniquecode] &&
                !acceptedCodes[r.uniquecode]
        );

        setBatchProgress({ current: 0, total: missingRecords.length });

        for (let i = 0; i < missingRecords.length; i++) {
            if (abortRef.current) break;
            const record = missingRecords[i];
            setBatchProgress({ current: i + 1, total: missingRecords.length });
            setClassifying(record.uniquecode);

            try {
                const resp = await fetch("/api/cost-codes/classify", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        records: [{
                            uniquecode: record.uniquecode,
                            aciklama: record.aciklama,
                            carifirma: record.carifirma,
                            islemturu: record.islemturu,
                            date: record.date,
                            projekodu: record.projekodu,
                            source: record.source,
                        }],
                    }),
                });
                const data = await resp.json();
                if (data.results?.[0]) {
                    setAiResults((prev) => ({
                        ...prev,
                        [record.uniquecode]: data.results[0],
                    }));
                }
            } catch (err) {
                setAiResults((prev) => ({
                    ...prev,
                    [record.uniquecode]: {
                        uniquecode: record.uniquecode,
                        suggestion: null,
                        reasoning: null,
                        request: { systemMessage: "", userMessage: "", model: "deepseek-reasoner" },
                        response: null,
                        listUsed: "new",
                        error: (err as Error).message,
                    },
                }));
            }
        }

        setClassifying(null);
        setClassifyingAll(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [records, aiResults, acceptedCodes]);

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

    // Current AI debug panel result
    const aiPanelResult = aiPanelRecord ? aiResults[aiPanelRecord] : null;
    const aiPanelRecordData = aiPanelRecord ? records?.find((r) => r.uniquecode === aiPanelRecord) : null;

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

                    {/* Classify All Missing button */}
                    {records && (
                        <Button
                            onClick={classifyingAll ? () => { abortRef.current = true; } : classifyAllMissing}
                            disabled={classifying !== null && !classifyingAll}
                            variant={classifyingAll ? "destructive" : "outline"}
                            className={`flex-1 sm:flex-none sm:min-w-[200px] h-10 ${!classifyingAll ? "border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/30" : ""}`}
                        >
                            {classifyingAll ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    {t.batchProgress
                                        .replace("{current}", String(batchProgress.current))
                                        .replace("{total}", String(batchProgress.total))}
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    {t.classifyAll}
                                </>
                            )}
                        </Button>
                    )}
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
                            {/* AI classified count */}
                            {Object.keys(aiResults).length > 0 && (
                                <Badge variant="outline" className="text-xs px-3 py-1.5 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/20">
                                    <Sparkles className="h-3 w-3 mr-1" />
                                    AI: <span className="font-bold ml-1">{Object.values(aiResults).filter((r) => r.suggestion).length}</span>
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
                        <table className="w-full text-sm" style={{ minWidth: 1500 }}>
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
                                    <th className="px-4 py-3 text-center font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap w-16">{t.action}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pagedRecords.map((record, i) => {
                                    const rowNum = page * PAGE_SIZE + i + 1;
                                    const needsCostCode = REQUIRES_COST_CODE.includes(record.islemturu);
                                    const hasCostCode = record.masrafmerkezi && record.masrafmerkezi.trim() !== "";
                                    const isMissing = needsCostCode && !hasCostCode;
                                    const aiResult = aiResults[record.uniquecode];
                                    const accepted = acceptedCodes[record.uniquecode];
                                    const isClassifying = classifying === record.uniquecode;

                                    // Display code: accepted AI suggestion > DB value > empty
                                    const displayCode = accepted || (hasCostCode ? record.masrafmerkezi : null);
                                    const isAiSuggested = !!(accepted || (aiResult?.suggestion && !hasCostCode));

                                    return (
                                        <tr
                                            key={record.uniquecode}
                                            className={`border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors ${
                                                isMissing && !accepted ? "bg-rose-50/50 dark:bg-rose-950/10" : ""
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
                                                    <span className="text-zinc-300 dark:text-zinc-700">&mdash;</span>
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
                                                    <span className="text-zinc-300 dark:text-zinc-700">&mdash;</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {displayCode ? (
                                                    <button
                                                        onClick={() => { if (aiResult) setAiPanelRecord(record.uniquecode); }}
                                                        className={`font-mono text-xs inline-flex items-center gap-1 ${
                                                            isAiSuggested
                                                                ? "text-violet-600 dark:text-violet-400 font-semibold cursor-pointer hover:underline"
                                                                : "text-emerald-600 dark:text-emerald-400"
                                                        }`}
                                                    >
                                                        {isAiSuggested && <Sparkles className="h-3 w-3" />}
                                                        {displayCode}
                                                    </button>
                                                ) : aiResult?.suggestion ? (
                                                    <button
                                                        onClick={() => setAiPanelRecord(record.uniquecode)}
                                                        className="font-mono text-xs inline-flex items-center gap-1 text-violet-600 dark:text-violet-400 font-semibold cursor-pointer hover:underline"
                                                    >
                                                        <Sparkles className="h-3 w-3" />
                                                        {aiResult.suggestion}
                                                    </button>
                                                ) : isMissing ? (
                                                    <span className="text-rose-600 dark:text-rose-400 font-semibold">&mdash;</span>
                                                ) : (
                                                    <span className="text-zinc-300 dark:text-zinc-700">&mdash;</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap text-emerald-600 dark:text-emerald-400">
                                                {Math.abs(Number(record.giris_tutar) || 0) > 0
                                                    ? Math.abs(Number(record.giris_tutar) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                                    : <span className="text-zinc-300 dark:text-zinc-700">&mdash;</span>
                                                }
                                            </td>
                                            <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap text-rose-600 dark:text-rose-400">
                                                {Math.abs(Number(record.cikis_tutar) || 0) > 0
                                                    ? Math.abs(Number(record.cikis_tutar) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                                    : <span className="text-zinc-300 dark:text-zinc-700">&mdash;</span>
                                                }
                                            </td>
                                            <td className="px-4 py-3 text-center text-xs whitespace-nowrap">
                                                {record.parabirimi || <span className="text-zinc-300 dark:text-zinc-700">&mdash;</span>}
                                            </td>
                                            <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                                                {Number(record.cost) || 0}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {isMissing && !accepted && (
                                                    <button
                                                        onClick={() => classifyRecord(record)}
                                                        disabled={isClassifying || classifyingAll}
                                                        className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                        title={t.classify}
                                                    >
                                                        {isClassifying ? (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        ) : aiResult ? (
                                                            <Search className="h-3.5 w-3.5" />
                                                        ) : (
                                                            <Sparkles className="h-3.5 w-3.5" />
                                                        )}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {pagedRecords.length === 0 && (
                                    <tr>
                                        <td colSpan={15} className="px-4 py-12 text-center text-zinc-400">
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

                {/* AI Debug Panel Dialog */}
                <Dialog open={!!aiPanelRecord} onOpenChange={(open) => { if (!open) setAiPanelRecord(null); }}>
                    <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-violet-600" />
                                {t.aiDebugPanel}
                            </DialogTitle>
                            <DialogDescription>
                                {aiPanelRecordData?.uniquecode} &mdash; {aiPanelRecordData?.aciklama}
                            </DialogDescription>
                        </DialogHeader>

                        {aiPanelResult && (
                            <div className="space-y-4">
                                {/* Record info */}
                                <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 bg-zinc-50 dark:bg-zinc-900 space-y-1">
                                    <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t.record}</div>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                        <div><span className="text-zinc-500">{t.code}:</span> <span className="font-mono">{aiPanelRecordData?.uniquecode}</span></div>
                                        <div><span className="text-zinc-500">{t.date}:</span> {aiPanelRecordData?.date ? formatDate(aiPanelRecordData.date) : ""}</div>
                                        <div><span className="text-zinc-500">{t.vendor}:</span> {aiPanelRecordData?.carifirma}</div>
                                        <div><span className="text-zinc-500">{t.transType}:</span> {aiPanelRecordData?.islemturu}</div>
                                        <div className="col-span-2"><span className="text-zinc-500">{t.description}:</span> {aiPanelRecordData?.aciklama}</div>
                                    </div>
                                </div>

                                {/* Suggestion */}
                                <div className={`rounded-lg border p-3 ${
                                    aiPanelResult.suggestion
                                        ? "border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-950/20"
                                        : aiPanelResult.error
                                            ? "border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/20"
                                            : "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900"
                                }`}>
                                    <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">{t.suggestedCode}</div>
                                    {aiPanelResult.suggestion ? (
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono text-lg font-bold text-violet-700 dark:text-violet-300">
                                                {aiPanelResult.suggestion}
                                            </span>
                                            <Badge variant="outline" className="text-xs">
                                                {t.listUsed}: {aiPanelResult.listUsed === "old" ? "GIDER GRUPLARI 2022" : "IQ COST CODES"}
                                            </Badge>
                                        </div>
                                    ) : (
                                        <span className="text-rose-600 dark:text-rose-400 text-sm">
                                            {aiPanelResult.error || t.noSuggestion}
                                        </span>
                                    )}

                                    {/* Accept / Dismiss */}
                                    {aiPanelResult.suggestion && !acceptedCodes[aiPanelResult.uniquecode] && (
                                        <div className="flex gap-2 mt-3">
                                            <Button
                                                size="sm"
                                                onClick={() => {
                                                    setAcceptedCodes((prev) => ({ ...prev, [aiPanelResult.uniquecode]: aiPanelResult.suggestion! }));
                                                    setAiPanelRecord(null);
                                                }}
                                                className="bg-violet-600 hover:bg-violet-700 text-white"
                                            >
                                                <Check className="h-4 w-4 mr-1" />
                                                {t.accept}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setAiPanelRecord(null)}
                                            >
                                                <X className="h-4 w-4 mr-1" />
                                                {t.dismiss}
                                            </Button>
                                        </div>
                                    )}
                                    {acceptedCodes[aiPanelResult.uniquecode] && (
                                        <div className="mt-2">
                                            <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700">
                                                <Check className="h-3 w-3 mr-1" />
                                                Accepted
                                            </Badge>
                                        </div>
                                    )}
                                </div>

                                {/* AI Reasoning */}
                                {aiPanelResult.reasoning && (
                                    <CollapsibleSection title={t.reasoning} defaultOpen>
                                        <pre className="text-xs whitespace-pre-wrap font-mono text-zinc-600 dark:text-zinc-400 max-h-[300px] overflow-y-auto p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                                            {aiPanelResult.reasoning}
                                        </pre>
                                    </CollapsibleSection>
                                )}

                                {/* User Message */}
                                <CollapsibleSection title={t.userMessage}>
                                    <pre className="text-xs whitespace-pre-wrap font-mono text-zinc-600 dark:text-zinc-400 max-h-[200px] overflow-y-auto p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                                        {aiPanelResult.request.userMessage}
                                    </pre>
                                </CollapsibleSection>

                                {/* System Message */}
                                <CollapsibleSection title={t.systemMessage}>
                                    <pre className="text-xs whitespace-pre-wrap font-mono text-zinc-600 dark:text-zinc-400 max-h-[300px] overflow-y-auto p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                                        {aiPanelResult.request.systemMessage}
                                    </pre>
                                </CollapsibleSection>

                                {/* Raw Response */}
                                <CollapsibleSection title={t.rawResponse}>
                                    <pre className="text-xs whitespace-pre-wrap font-mono text-zinc-600 dark:text-zinc-400 max-h-[300px] overflow-y-auto p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                                        {JSON.stringify(aiPanelResult.response, null, 2)}
                                    </pre>
                                </CollapsibleSection>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </main>
        </div>
    );
}

function CollapsibleSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
                {title}
                {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {open && <div className="px-3 pb-3">{children}</div>}
        </div>
    );
}
