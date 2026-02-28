"use client";

import { useState, useMemo, useCallback } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatCurrency } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
    AlertCircle,
    CheckCircle2,
    XCircle,
    Upload,
    FileText,
    Search,
    Loader2,
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    Info,
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
}

interface ScopeStats {
    scope: string;
    apiCalls: number;
    filesInScope: number;
    checked: number;
    found: number;
    missing: number;
    folderExists: boolean;
}

interface CheckStats {
    totalUrls: number;
    unparseable: number;
    totalScopes: number;
    totalApiCalls: number;
    totalFilesFound: number;
    found: number;
    missing: number;
    perScope: ScopeStats[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const PAGE_SIZE = 50;

export default function IssuesPage() {
    const [year, setYear] = useState("2024");
    const [monthFilter, setMonthFilter] = useState("all");
    const [sourceFilter, setSourceFilter] = useState("all");
    const [projectFilter, setProjectFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState<"all" | "missing" | "uploaded">("all");
    const [amountFilter, setAmountFilter] = useState<"all" | "above10k" | "5k-10k" | "below5k">("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(0);

    // Upload dialog state
    const [uploadRecord, setUploadRecord] = useState<DocumentRecord | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(null);

    // Checking state
    const [fileStatuses, setFileStatuses] = useState<Record<string, boolean>>({});
    const [checking, setChecking] = useState(false);
    const [checkedAll, setCheckedAll] = useState(false);
    const [checkStats, setCheckStats] = useState<CheckStats | null>(null);

    // Fetch records from DB
    const apiUrl = useMemo(() => {
        let url = `/api/documents?year=${year}`;
        if (sourceFilter !== "all") url += `&source=${sourceFilter}`;
        if (projectFilter !== "all") url += `&project=${projectFilter}`;
        return url;
    }, [year, sourceFilter, projectFilter]);

    const { data: records, error, isLoading, mutate } = useSWR<DocumentRecord[]>(apiUrl, fetcher, {
        revalidateOnFocus: false,
        dedupingInterval: 60000,
    });

    // Get unique sources and projects for filters
    const { sources, projects } = useMemo(() => {
        if (!records) return { sources: [], projects: [] };
        const s = [...new Set(records.map((r) => r.source))].filter(Boolean).sort();
        const p = [...new Set(records.map((r) => r.projekodu))].filter(Boolean).sort();
        return { sources: s, projects: p };
    }, [records]);

    // Filter pipeline: records → month filter → status filter → text search
    const filteredRecords = useMemo(() => {
        if (!records) return [];
        let filtered = records;

        // Month filter (client-side, from date field)
        if (monthFilter !== "all") {
            filtered = filtered.filter((r) => {
                try {
                    const d = new Date(r.date);
                    const m = String(d.getMonth() + 1).padStart(2, "0");
                    return m === monthFilter;
                } catch {
                    return false;
                }
            });
        }

        // Status filter
        if (statusFilter !== "all") {
            filtered = filtered.filter((r) => {
                const exists = fileStatuses[r.doc];
                if (statusFilter === "missing") return exists === false;
                if (statusFilter === "uploaded") return exists === true;
                return true;
            });
        }

        // Amount filter (values are negative: more negative = higher amount)
        if (amountFilter !== "all") {
            filtered = filtered.filter((r) => {
                const v = Number(r.usd_degeri) || 0;
                if (amountFilter === "above10k") return v <= -10000;
                if (amountFilter === "5k-10k") return v > -10000 && v <= -5000;
                if (amountFilter === "below5k") return v > -5000 && v <= 0;
                return true;
            });
        }

        // Text search (uniquecode, carifirma, aciklama)
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            filtered = filtered.filter((r) =>
                r.uniquecode?.toLowerCase().includes(q) ||
                r.carifirma?.toLowerCase().includes(q) ||
                r.aciklama?.toLowerCase().includes(q)
            );
        }

        return filtered;
    }, [records, monthFilter, statusFilter, fileStatuses, amountFilter, searchQuery]);

    // Pagination
    const totalPages = Math.ceil(filteredRecords.length / PAGE_SIZE);
    const pagedRecords = filteredRecords.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    // Metrics
    const metrics = useMemo(() => {
        if (!records) return { total: 0, checked: 0, missing: 0, uploaded: 0 };
        const checked = Object.keys(fileStatuses).length;
        const uploaded = Object.values(fileStatuses).filter(Boolean).length;
        const missing = checked - uploaded;
        return { total: records.length, checked, missing, uploaded };
    }, [records, fileStatuses]);

    // Check documents on SharePoint (single request, server groups by folder scope)
    const checkDocuments = useCallback(async () => {
        if (!filteredRecords || filteredRecords.length === 0) return;
        setChecking(true);
        setCheckedAll(false);
        setCheckStats(null);

        try {
            const docUrls = filteredRecords.map((r) => r.doc);

            const resp = await fetch("/api/documents/check", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ docUrls }),
            });

            if (resp.ok) {
                const { results, stats } = await resp.json();
                setFileStatuses(results);
                setCheckStats(stats);
            }
            setCheckedAll(true);
        } catch (err) {
            console.error("Check failed:", err);
        } finally {
            setChecking(false);
        }
    }, [filteredRecords]);

    // File selection handler
    const handleFileSelect = (file: File) => {
        setSelectedFile(file);
        setUploadResult(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(URL.createObjectURL(file));
    };

    // Upload handler
    const handleUpload = async () => {
        if (!uploadRecord || !selectedFile) return;
        setUploading(true);
        setUploadResult(null);

        try {
            const formData = new FormData();
            formData.append("file", selectedFile);
            formData.append("docUrl", uploadRecord.doc);

            const resp = await fetch("/api/documents/upload", {
                method: "POST",
                body: formData,
            });

            const result = await resp.json();

            if (resp.ok && result.success) {
                setUploadResult({ success: true, message: `Uploaded: ${result.name}` });
                // Update local status
                setFileStatuses((prev) => ({ ...prev, [uploadRecord.doc]: true }));
            } else {
                setUploadResult({ success: false, message: result.error || "Upload failed" });
            }
        } catch (err) {
            setUploadResult({ success: false, message: "Network error" });
        } finally {
            setUploading(false);
        }
    };

    // Close dialog cleanup
    const closeDialog = () => {
        setUploadRecord(null);
        setSelectedFile(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setUploadResult(null);
    };

    // Extract filename from doc URL
    const getFilename = (docUrl: string) => {
        try {
            const parts = docUrl.split("/");
            return parts[parts.length - 1];
        } catch {
            return docUrl;
        }
    };

    // Format date
    const formatDate = (dateStr: string) => {
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
        } catch {
            return dateStr;
        }
    };

    if (error) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
                <main className="p-6 max-w-[1600px] mx-auto">
                    <Alert variant="destructive" className="max-w-md mx-auto mt-20">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>Failed to load documents data.</AlertDescription>
                    </Alert>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
            <main className="p-6 space-y-6 max-w-[1600px] mx-auto">
                {/* Page header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Document Management</h1>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                            Upload missing accounting documents to SharePoint
                        </p>
                    </div>
                    <Button
                        onClick={checkDocuments}
                        disabled={checking || isLoading || !filteredRecords.length}
                        className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-lg shadow-indigo-500/25"
                    >
                        {checking ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Checking...
                            </>
                        ) : (
                            <>
                                <Search className="h-4 w-4 mr-2" />
                                Check Documents
                            </>
                        )}
                    </Button>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3">
                    <Select value={year} onValueChange={(v) => { setYear(v); setMonthFilter("all"); setPage(0); setFileStatuses({}); setCheckedAll(false); setCheckStats(null); }}>
                        <SelectTrigger className="w-[120px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="2026">2026</SelectItem>
                            <SelectItem value="2025">2025</SelectItem>
                            <SelectItem value="2024">2024</SelectItem>
                            <SelectItem value="2023">2023</SelectItem>
                            <SelectItem value="2022">2022</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={monthFilter} onValueChange={(v) => { setMonthFilter(v); setPage(0); setFileStatuses({}); setCheckedAll(false); setCheckStats(null); }}>
                        <SelectTrigger className="w-[140px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                            <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Months</SelectItem>
                            <SelectItem value="01">January</SelectItem>
                            <SelectItem value="02">February</SelectItem>
                            <SelectItem value="03">March</SelectItem>
                            <SelectItem value="04">April</SelectItem>
                            <SelectItem value="05">May</SelectItem>
                            <SelectItem value="06">June</SelectItem>
                            <SelectItem value="07">July</SelectItem>
                            <SelectItem value="08">August</SelectItem>
                            <SelectItem value="09">September</SelectItem>
                            <SelectItem value="10">October</SelectItem>
                            <SelectItem value="11">November</SelectItem>
                            <SelectItem value="12">December</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setPage(0); setFileStatuses({}); setCheckedAll(false); setCheckStats(null); }}>
                        <SelectTrigger className="w-[140px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                            <SelectValue placeholder="Source" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Sources</SelectItem>
                            {sources.map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={projectFilter} onValueChange={(v) => { setProjectFilter(v); setPage(0); setFileStatuses({}); setCheckedAll(false); setCheckStats(null); }}>
                        <SelectTrigger className="w-[140px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                            <SelectValue placeholder="Project" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Projects</SelectItem>
                            {projects.map((p) => (
                                <SelectItem key={p} value={p}>{p}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {checkedAll && (
                        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as typeof statusFilter); setPage(0); }}>
                            <SelectTrigger className="w-[150px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="missing">Missing</SelectItem>
                                <SelectItem value="uploaded">Uploaded</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                </div>

                {/* Quick filters */}
                <div className="flex flex-wrap gap-2">
                    {checkedAll && (
                        <button
                            onClick={() => { setStatusFilter(statusFilter === "missing" ? "all" : "missing"); setPage(0); }}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                statusFilter === "missing"
                                    ? "bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300"
                                    : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-rose-300 dark:hover:border-rose-700"
                            }`}
                        >
                            <XCircle className="h-3.5 w-3.5" />
                            Show Missing
                        </button>
                    )}
                    {([
                        { key: "above10k" as const, label: "Above $10K" },
                        { key: "5k-10k" as const, label: "$5K - $10K" },
                        { key: "below5k" as const, label: "Below $5K" },
                    ]).map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => { setAmountFilter(amountFilter === key ? "all" : key); setPage(0); }}
                            className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                amountFilter === key
                                    ? "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300"
                                    : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-indigo-300 dark:hover:border-indigo-700"
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <SummaryCard
                        label="Total Records"
                        value={isLoading ? "-" : metrics.total.toLocaleString()}
                        color="indigo"
                    />
                    <SummaryCard
                        label="Checked"
                        value={metrics.checked.toLocaleString()}
                        color="amber"
                    />
                    <SummaryCard
                        label="Uploaded"
                        value={metrics.uploaded.toLocaleString()}
                        color="emerald"
                    />
                    <SummaryCard
                        label="Missing"
                        value={metrics.missing.toLocaleString()}
                        color="rose"
                    />
                </div>

                {/* Text search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input
                        placeholder="Search by code, vendor, or description..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                        className="pl-9 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                    />
                </div>

                {/* Activity log */}
                {checkStats && (
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
                        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex items-center gap-2">
                            <Info className="h-4 w-4 text-indigo-500" />
                            <h3 className="text-sm font-semibold">Check Activity Log</h3>
                        </div>
                        <div className="p-4 space-y-3">
                            {/* Summary row */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                                <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg px-3 py-2">
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Scopes Searched</p>
                                    <p className="font-semibold">{checkStats.totalScopes}</p>
                                </div>
                                <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg px-3 py-2">
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">API Calls</p>
                                    <p className="font-semibold">{checkStats.totalApiCalls}</p>
                                </div>
                                <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg px-3 py-2">
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Files in SharePoint</p>
                                    <p className="font-semibold">{checkStats.totalFilesFound}</p>
                                </div>
                                <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg px-3 py-2">
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Checked / Found / Missing</p>
                                    <p className="font-semibold">
                                        {checkStats.totalUrls} / <span className="text-emerald-600 dark:text-emerald-400">{checkStats.found}</span> / <span className="text-rose-600 dark:text-rose-400">{checkStats.missing}</span>
                                    </p>
                                </div>
                            </div>
                            {/* Per-scope breakdown */}
                            <div className="max-h-48 overflow-y-auto space-y-1 text-xs font-mono">
                                {checkStats.perScope.map((s) => (
                                    <div key={s.scope} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                                        <Badge
                                            variant={s.folderExists ? "secondary" : "destructive"}
                                            className="text-[10px] px-1.5 py-0 min-w-[32px] justify-center"
                                        >
                                            {s.folderExists ? "OK" : "404"}
                                        </Badge>
                                        <span className="truncate flex-1 text-zinc-600 dark:text-zinc-400">{s.scope}</span>
                                        <span className="text-zinc-400 dark:text-zinc-500 whitespace-nowrap">
                                            {s.apiCalls}req &middot; {s.filesInScope}files &middot; {s.found}/{s.checked}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Records table */}
                {isLoading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 10 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full rounded-lg" />
                        ))}
                    </div>
                ) : (
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                                        <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400 w-12">#</th>
                                        <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Date</th>
                                        <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Code</th>
                                        <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Project</th>
                                        <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Source</th>
                                        <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400 hidden lg:table-cell">Vendor</th>
                                        <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400 hidden xl:table-cell">Description</th>
                                        <th className="px-4 py-3 text-right font-medium text-zinc-500 dark:text-zinc-400">Amount</th>
                                        <th className="px-4 py-3 text-center font-medium text-zinc-500 dark:text-zinc-400 w-20">Status</th>
                                        <th className="px-4 py-3 text-center font-medium text-zinc-500 dark:text-zinc-400 w-32">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pagedRecords.map((record, i) => {
                                        const status = fileStatuses[record.doc];
                                        const rowNum = page * PAGE_SIZE + i + 1;
                                        return (
                                            <tr
                                                key={record.uniquecode}
                                                className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                                            >
                                                <td className="px-4 py-3 text-zinc-400 dark:text-zinc-500 tabular-nums">{rowNum}</td>
                                                <td className="px-4 py-3 tabular-nums whitespace-nowrap">{formatDate(record.date)}</td>
                                                <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{record.uniquecode}</td>
                                                <td className="px-4 py-3">
                                                    <Badge variant="outline" className="font-mono text-xs">{record.projekodu}</Badge>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge variant="secondary" className="text-xs">{record.source}</Badge>
                                                </td>
                                                <td className="px-4 py-3 hidden lg:table-cell max-w-[200px] truncate text-zinc-600 dark:text-zinc-400">
                                                    {record.carifirma}
                                                </td>
                                                <td className="px-4 py-3 hidden xl:table-cell max-w-[250px] truncate text-zinc-500 dark:text-zinc-500">
                                                    {record.aciklama}
                                                </td>
                                                <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                                                    {formatCurrency(Number(record.usd_degeri) || 0)}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {status === undefined ? (
                                                        <span className="text-zinc-300 dark:text-zinc-700">-</span>
                                                    ) : status ? (
                                                        <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto" />
                                                    ) : (
                                                        <XCircle className="h-5 w-5 text-rose-500 mx-auto" />
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <a
                                                            href={record.doc}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-indigo-600 hover:border-indigo-300 dark:hover:text-indigo-400 dark:hover:border-indigo-700 transition-colors"
                                                            title="View document"
                                                        >
                                                            <ExternalLink className="h-3.5 w-3.5" />
                                                        </a>
                                                        {status === false && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => { setUploadRecord(record); setUploadResult(null); setSelectedFile(null); if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }}
                                                                className="h-7 px-2 text-xs border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                                            >
                                                                <Upload className="h-3 w-3 mr-1" />
                                                                Upload
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {pagedRecords.length === 0 && (
                                        <tr>
                                            <td colSpan={10} className="px-4 py-12 text-center text-zinc-400">
                                                No records found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-200 dark:border-zinc-800">
                                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                                    Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, filteredRecords.length)} of {filteredRecords.length}
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
                )}

                {/* Upload Dialog */}
                <Dialog open={!!uploadRecord} onOpenChange={(open) => { if (!open) closeDialog(); }}>
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-indigo-500" />
                                Upload Document
                            </DialogTitle>
                            <DialogDescription>
                                Upload the PDF for record <span className="font-mono font-semibold">{uploadRecord?.uniquecode}</span>
                            </DialogDescription>
                        </DialogHeader>

                        {uploadRecord && (
                            <div className="space-y-4">
                                {/* Record details */}
                                <div className="grid grid-cols-2 gap-3 text-sm rounded-lg bg-zinc-50 dark:bg-zinc-800/50 p-4">
                                    <div>
                                        <span className="text-zinc-500 dark:text-zinc-400">Vendor:</span>
                                        <p className="font-medium truncate">{uploadRecord.carifirma}</p>
                                    </div>
                                    <div>
                                        <span className="text-zinc-500 dark:text-zinc-400">Amount:</span>
                                        <p className="font-medium">{formatCurrency(Number(uploadRecord.usd_degeri) || 0)}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="text-zinc-500 dark:text-zinc-400">Description:</span>
                                        <p className="font-medium">{uploadRecord.aciklama}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="text-zinc-500 dark:text-zinc-400">Target filename:</span>
                                        <p className="font-mono text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded mt-1">{getFilename(uploadRecord.doc)}</p>
                                    </div>
                                </div>

                                {/* Drop zone */}
                                <div
                                    className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg p-8 text-center cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors"
                                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-indigo-500", "bg-indigo-50", "dark:bg-indigo-950/20"); }}
                                    onDragLeave={(e) => { e.currentTarget.classList.remove("border-indigo-500", "bg-indigo-50", "dark:bg-indigo-950/20"); }}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        e.currentTarget.classList.remove("border-indigo-500", "bg-indigo-50", "dark:bg-indigo-950/20");
                                        const file = e.dataTransfer.files[0];
                                        if (file && file.type === "application/pdf") handleFileSelect(file);
                                    }}
                                    onClick={() => {
                                        const input = document.createElement("input");
                                        input.type = "file";
                                        input.accept = ".pdf";
                                        input.onchange = (e) => {
                                            const file = (e.target as HTMLInputElement).files?.[0];
                                            if (file) handleFileSelect(file);
                                        };
                                        input.click();
                                    }}
                                >
                                    {selectedFile ? (
                                        <div className="space-y-1">
                                            <FileText className="h-8 w-8 text-indigo-500 mx-auto" />
                                            <p className="font-medium">{selectedFile.name}</p>
                                            <p className="text-xs text-zinc-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <Upload className="h-8 w-8 text-zinc-400 mx-auto" />
                                            <p className="text-zinc-500 dark:text-zinc-400">Drag & drop a PDF here, or click to browse</p>
                                            <p className="text-xs text-zinc-400">Only PDF files are accepted</p>
                                        </div>
                                    )}
                                </div>

                                {/* PDF Preview */}
                                {previewUrl && (
                                    <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
                                        <object
                                            data={previewUrl}
                                            type="application/pdf"
                                            className="w-full h-[300px]"
                                        >
                                            <p className="p-4 text-center text-zinc-500">PDF preview not available in this browser</p>
                                        </object>
                                    </div>
                                )}

                                {/* Upload result */}
                                {uploadResult && (
                                    <Alert variant={uploadResult.success ? "default" : "destructive"}>
                                        {uploadResult.success ? (
                                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                        ) : (
                                            <AlertCircle className="h-4 w-4" />
                                        )}
                                        <AlertTitle>{uploadResult.success ? "Success" : "Error"}</AlertTitle>
                                        <AlertDescription>{uploadResult.message}</AlertDescription>
                                    </Alert>
                                )}
                            </div>
                        )}

                        <DialogFooter>
                            <Button variant="outline" onClick={closeDialog}>
                                {uploadResult?.success ? "Close" : "Cancel"}
                            </Button>
                            {!uploadResult?.success && (
                                <Button
                                    onClick={handleUpload}
                                    disabled={!selectedFile || uploading}
                                    className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white"
                                >
                                    {uploading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="h-4 w-4 mr-2" />
                                            Upload to SharePoint
                                        </>
                                    )}
                                </Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </main>
        </div>
    );
}

// Simple summary card component
function SummaryCard({ label, value, color }: { label: string; value: string; color: "indigo" | "emerald" | "amber" | "rose" }) {
    const gradients = {
        indigo: "from-indigo-500 to-violet-600",
        emerald: "from-emerald-500 to-teal-600",
        amber: "from-amber-500 to-orange-600",
        rose: "from-rose-500 to-pink-600",
    };

    return (
        <div className="relative overflow-hidden rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm p-4">
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradients[color]}`} />
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">{label}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
        </div>
    );
}
