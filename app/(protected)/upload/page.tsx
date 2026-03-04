"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { formatCurrency, cn } from "@/lib/utils";
import {
    AlertCircle,
    CheckCircle2,
    XCircle,
    Upload,
    FileText,
    Loader2,
    Download,
    Info,
    ChevronDown,
    ChevronUp,
    Trash2,
    Eye,
    Maximize2,
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

interface FileMetadata {
    id: string;
    createdDateTime: string;
    lastModifiedDateTime: string;
    createdBy: string | null;
    size: number;
}

const translations = {
    en: {
        title: "Upload Documents",
        subtitle: "Upload PDF pages to SharePoint for specific records",
        year: "Year",
        month: "Month",
        day: "Day",
        bringData: "Bring Data",
        loading: "Loading...",
        checking: "Checking...",
        records: "Records",
        noData: "Select a date, then press Bring Data",
        noRecords: "No records found for this date",
        selectRecord: "Select a record from the left panel",
        selectedRecord: "Selected Record",
        target: "Target:",
        dropZone: "Drag & drop a PDF here, or click to browse",
        dropZoneHint: "Upload a multi-page PDF, then select which pages to extract",
        pageRange: "Page Range",
        pageRangeHint: "e.g., 1-3, 5, 7-9",
        pagesSelected: "pages selected",
        of: "of",
        uploadPages: "Upload to SharePoint",
        uploading: "Uploading...",
        success: "Success",
        error: "Error",
        uploaded: "Uploaded",
        missing: "Missing",
        found: "Found",
        total: "Total",
        activityLog: "Check Activity Log",
        scopesSearched: "Scopes Searched",
        apiCalls: "API Calls",
        filesInSharePoint: "Files in SharePoint",
        checkedFoundMissing: "Checked / Found / Missing",
        noCheckYet: "Check will run automatically after loading data",
        alreadyUploaded: "Already uploaded",
        onlyPdf: "Only PDF files are accepted",
        clearPdf: "Clear PDF",
        pages: "pages",
        giris: "In",
        cikis: "Out",
        recordDetails: "Record Details",
        vendor: "Vendor",
        description: "Description",
        date: "Date",
        project: "Project",
        source: "Source",
        partner: "Partner",
        transType: "Trans. Type",
        cost: "Cost",
        pagePreview: "Page Preview",
        months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    },
    tr: {
        title: "Belge Yukle",
        subtitle: "Belirli kayitlar icin PDF sayfalarini SharePoint'e yukleyin",
        year: "Yil",
        month: "Ay",
        day: "Gun",
        bringData: "Veri Getir",
        loading: "Yukleniyor...",
        checking: "Kontrol ediliyor...",
        records: "Kayitlar",
        noData: "Bir tarih secin, ardindan Veri Getir'e basin",
        noRecords: "Bu tarih icin kayit bulunamadi",
        selectRecord: "Sol panelden bir kayit secin",
        selectedRecord: "Secili Kayit",
        target: "Hedef:",
        dropZone: "PDF dosyasini surukleyip birakin veya tiklayarak secin",
        dropZoneHint: "Cok sayfalik bir PDF yukleyin, cikarilacak sayfalari secin",
        pageRange: "Sayfa Araligi",
        pageRangeHint: "orn., 1-3, 5, 7-9",
        pagesSelected: "sayfa secildi",
        of: "/",
        uploadPages: "SharePoint'e Yukle",
        uploading: "Yukleniyor...",
        success: "Basarili",
        error: "Hata",
        uploaded: "Yuklu",
        missing: "Eksik",
        found: "Bulunan",
        total: "Toplam",
        activityLog: "Kontrol Aktivite Gunlugu",
        scopesSearched: "Aranan Kapsam",
        apiCalls: "API Cagrisi",
        filesInSharePoint: "SharePoint'teki Dosyalar",
        checkedFoundMissing: "Kontrol / Bulunan / Eksik",
        noCheckYet: "Veri yuklendikten sonra kontrol otomatik calisacak",
        alreadyUploaded: "Zaten yuklu",
        onlyPdf: "Sadece PDF dosyalari kabul edilir",
        clearPdf: "PDF'i Temizle",
        pages: "sayfa",
        giris: "Giris",
        cikis: "Cikis",
        recordDetails: "Kayit Detaylari",
        vendor: "Firma",
        description: "Aciklama",
        date: "Tarih",
        project: "Proje",
        source: "Kaynak",
        partner: "Ortak",
        transType: "Islem Turu",
        cost: "Maliyet",
        pagePreview: "Sayfa Onizleme",
        months: ["Ocak", "Subat", "Mart", "Nisan", "Mayis", "Haziran", "Temmuz", "Agustos", "Eylul", "Ekim", "Kasim", "Aralik"],
    },
} as const;

type Lang = keyof typeof translations;

const BATCH_SIZE = 10000;

function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
}

function parsePageRange(input: string, maxPage: number): number[] {
    const pages = new Set<number>();
    const parts = input.split(",").map(s => s.trim()).filter(Boolean);
    for (const part of parts) {
        if (part.includes("-")) {
            const [startStr, endStr] = part.split("-").map(s => s.trim());
            const start = parseInt(startStr);
            const end = parseInt(endStr);
            if (!isNaN(start) && !isNaN(end)) {
                for (let i = Math.max(1, start); i <= Math.min(maxPage, end); i++) {
                    pages.add(i - 1);
                }
            }
        } else {
            const p = parseInt(part);
            if (!isNaN(p) && p >= 1 && p <= maxPage) {
                pages.add(p - 1);
            }
        }
    }
    return [...pages].sort((a, b) => a - b);
}

function formatDate(dateStr: string) {
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
        return dateStr;
    }
}

function getFilename(docUrl: string) {
    try {
        const parts = docUrl.split("/");
        return parts[parts.length - 1];
    } catch {
        return docUrl;
    }
}

export default function UploadPage() {
    const [lang, setLang] = useState<Lang>("en");
    const t = translations[lang];

    // Date selection
    const [year, setYear] = useState("2024");
    const [month, setMonth] = useState("01");
    const [day, setDay] = useState("1");

    // Data state
    const [records, setRecords] = useState<DocumentRecord[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // SharePoint check state
    const [fileStatuses, setFileStatuses] = useState<Record<string, boolean>>({});
    const [checking, setChecking] = useState(false);
    const [checkedAll, setCheckedAll] = useState(false);
    const [checkStats, setCheckStats] = useState<CheckStats | null>(null);
    const [checkProgress, setCheckProgress] = useState("");
    const [fileMetadata, setFileMetadata] = useState<Record<string, FileMetadata>>({});

    // Card selection
    const [selectedRecord, setSelectedRecord] = useState<DocumentRecord | null>(null);

    // PDF state
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [pdfArrayBuffer, setPdfArrayBuffer] = useState<ArrayBuffer | null>(null);
    const [totalPages, setTotalPages] = useState(0);
    const [pageRangeInput, setPageRangeInput] = useState("");
    const [selectedPages, setSelectedPages] = useState<number[]>([]);
    const [pageThumbnails, setPageThumbnails] = useState<string[]>([]);
    const [renderingThumbnails, setRenderingThumbnails] = useState(false);

    // Upload state
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(null);

    // UI state
    const [activityLogOpen, setActivityLogOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [viewDetailRecord, setViewDetailRecord] = useState<DocumentRecord | null>(null);
    const [previewPageIdx, setPreviewPageIdx] = useState<number | null>(null);
    const [previewPageDataUrl, setPreviewPageDataUrl] = useState<string | null>(null);
    const [renderingPreview, setRenderingPreview] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Days in selected month
    const daysInMonth = useMemo(() => getDaysInMonth(parseInt(year), parseInt(month)), [year, month]);

    // Reset day if exceeds new month's max
    useEffect(() => {
        if (parseInt(day) > daysInMonth) setDay("1");
    }, [daysInMonth, day]);

    // Parse page range on input change
    useEffect(() => {
        if (totalPages > 0 && pageRangeInput.trim()) {
            setSelectedPages(parsePageRange(pageRangeInput, totalPages));
        } else {
            setSelectedPages([]);
        }
    }, [pageRangeInput, totalPages]);

    // Check documents on SharePoint (batched)
    const runCheck = useCallback(async (docUrls: string[]) => {
        setChecking(true);
        setError(null);
        const totalBatches = Math.ceil(docUrls.length / BATCH_SIZE);
        let mergedStats: CheckStats | null = null;
        const allResults: Record<string, boolean> = {};
        const allMetadata: Record<string, FileMetadata> = {};

        try {
            for (let i = 0; i < docUrls.length; i += BATCH_SIZE) {
                const batchNum = Math.floor(i / BATCH_SIZE) + 1;
                const batch = docUrls.slice(i, i + BATCH_SIZE);

                if (totalBatches > 1) setCheckProgress(`(${batchNum}/${totalBatches})`);

                const checkResp = await fetch("/api/documents/check", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ docUrls: batch }),
                });

                if (!checkResp.ok) {
                    setError(`SharePoint check failed (${checkResp.status})`);
                    break;
                }

                const { results, metadata, stats } = await checkResp.json();
                Object.assign(allResults, results);
                if (metadata) Object.assign(allMetadata, metadata);

                if (!mergedStats) {
                    mergedStats = stats;
                } else {
                    mergedStats.totalUrls += stats.totalUrls;
                    mergedStats.unparseable += stats.unparseable;
                    mergedStats.totalScopes += stats.totalScopes;
                    mergedStats.totalApiCalls += stats.totalApiCalls;
                    mergedStats.totalFilesFound += stats.totalFilesFound;
                    mergedStats.found += stats.found;
                    mergedStats.missing += stats.missing;
                    mergedStats.perScope.push(...stats.perScope);
                }
            }

            setFileStatuses(prev => ({ ...prev, ...allResults }));
            setFileMetadata(prev => ({ ...prev, ...allMetadata }));
            if (mergedStats) setCheckStats(mergedStats);
        } catch (checkErr) {
            setError(`SharePoint check error: ${(checkErr as Error).message}`);
            if (Object.keys(allResults).length > 0) {
                setFileStatuses(prev => ({ ...prev, ...allResults }));
                setFileMetadata(prev => ({ ...prev, ...allMetadata }));
            }
        } finally {
            setCheckedAll(true);
            setChecking(false);
            setCheckProgress("");
            setActivityLogOpen(true);
        }
    }, []);

    // Bring Data
    const bringData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setFileStatuses({});
        setFileMetadata({});
        setCheckedAll(false);
        setCheckStats(null);
        setSelectedRecord(null);
        setActivityLogOpen(false);
        setUploadResult(null);

        try {
            const url = `/api/documents?year=${year}&month=${month}&day=${day}`;
            const resp = await fetch(url);
            if (!resp.ok) throw new Error("Failed to fetch documents");
            const data: DocumentRecord[] = await resp.json();
            setRecords(data);
            setIsLoading(false);

            if (data.length > 0) {
                await runCheck(data.map(r => r.doc));
            }
        } catch (err) {
            setError((err as Error).message);
            setIsLoading(false);
        }
    }, [year, month, day, runCheck]);

    // Handle PDF load — use pdfjs-dist for page count + thumbnails (more tolerant parser)
    // pdf-lib is only used at upload time for page extraction
    const handlePdfLoad = useCallback(async (file: File) => {
        setPdfFile(file);
        setPageRangeInput("");
        setSelectedPages([]);
        setUploadResult(null);
        setPageThumbnails([]);
        setRenderingThumbnails(true);

        const buffer = await file.arrayBuffer();
        setPdfArrayBuffer(buffer);

        try {
            const pdfjsLib = await import("pdfjs-dist");
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
            const pdfDoc = await pdfjsLib.getDocument({ data: buffer.slice(0) }).promise;
            const count = pdfDoc.numPages;
            setTotalPages(count);

            const thumbs: string[] = [];
            for (let i = 1; i <= count; i++) {
                const page = await pdfDoc.getPage(i);
                const viewport = page.getViewport({ scale: 0.4 });
                const canvas = document.createElement("canvas");
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext("2d")!;
                await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
                thumbs.push(canvas.toDataURL("image/jpeg", 0.7));
            }
            setPageThumbnails(thumbs);
        } catch (err) {
            console.error("PDF load error:", err);
            setError("Failed to read PDF file");
            setPdfFile(null);
            setPdfArrayBuffer(null);
            setTotalPages(0);
        } finally {
            setRenderingThumbnails(false);
        }
    }, []);

    // Clear PDF
    const clearPdf = useCallback(() => {
        setPdfFile(null);
        setPdfArrayBuffer(null);
        setTotalPages(0);
        setPageRangeInput("");
        setSelectedPages([]);
        setPageThumbnails([]);
        setRenderingThumbnails(false);
        setUploadResult(null);
    }, []);

    // Handle upload
    const handleUpload = useCallback(async () => {
        if (!selectedRecord || !pdfArrayBuffer || selectedPages.length === 0) return;
        setUploading(true);
        setUploadResult(null);

        try {
            const { PDFDocument } = await import("pdf-lib");
            const src = await PDFDocument.load(pdfArrayBuffer, { ignoreEncryption: true });
            const doc = await PDFDocument.create();
            const pages = await doc.copyPages(src, selectedPages);
            pages.forEach(p => doc.addPage(p));
            const bytes = await doc.save();
            const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });

            const formData = new FormData();
            formData.append("file", blob, getFilename(selectedRecord.doc));
            formData.append("docUrl", selectedRecord.doc);

            const resp = await fetch("/api/documents/upload", {
                method: "POST",
                body: formData,
            });
            const result = await resp.json();

            if (resp.ok && result.success) {
                setUploadResult({ success: true, message: `${t.uploaded}: ${result.name}` });
                setFileStatuses(prev => ({ ...prev, [selectedRecord.doc]: true }));
                setSelectedRecord(null);
                setPageRangeInput("");
                setSelectedPages([]);
            } else {
                setUploadResult({ success: false, message: result.error || "Upload failed" });
            }
        } catch (err) {
            setUploadResult({ success: false, message: (err as Error).message });
        } finally {
            setUploading(false);
        }
    }, [selectedRecord, pdfArrayBuffer, selectedPages, t.uploaded]);

    // Toggle a page from thumbnail click (updates text input to stay synced)
    const togglePage = useCallback((pageIdx: number) => {
        setSelectedPages(prev => {
            const next = prev.includes(pageIdx)
                ? prev.filter(p => p !== pageIdx)
                : [...prev, pageIdx].sort((a, b) => a - b);
            // Build compact range string from the new selection
            const ranges: string[] = [];
            let i = 0;
            while (i < next.length) {
                const start = next[i];
                let end = start;
                while (i + 1 < next.length && next[i + 1] === end + 1) { end = next[++i]; }
                ranges.push(start === end ? String(start + 1) : `${start + 1}-${end + 1}`);
                i++;
            }
            setPageRangeInput(ranges.join(", "));
            return next;
        });
    }, []);

    // Render high-res page preview
    const openPagePreview = useCallback(async (pageIdx: number) => {
        setPreviewPageIdx(pageIdx);
        setPreviewPageDataUrl(null);
        if (!pdfArrayBuffer) return;
        setRenderingPreview(true);
        try {
            const pdfjsLib = await import("pdfjs-dist");
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
            const pdfDoc = await pdfjsLib.getDocument({ data: pdfArrayBuffer.slice(0) }).promise;
            const page = await pdfDoc.getPage(pageIdx + 1);
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext("2d")!;
            await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
            setPreviewPageDataUrl(canvas.toDataURL("image/png"));
        } catch (err) {
            console.error("Preview render error:", err);
        } finally {
            setRenderingPreview(false);
        }
    }, [pdfArrayBuffer]);

    // Drop handlers
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);
    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && file.type === "application/pdf") handlePdfLoad(file);
    }, [handlePdfLoad]);
    const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type === "application/pdf") handlePdfLoad(file);
        e.target.value = "";
    }, [handlePdfLoad]);

    // Summary counts
    const missingCount = records ? records.filter(r => fileStatuses[r.doc] === false).length : 0;
    const foundCount = records ? records.filter(r => fileStatuses[r.doc] === true).length : 0;

    const canUpload = !!pdfFile && selectedPages.length > 0 && !!selectedRecord && !uploading && fileStatuses[selectedRecord?.doc ?? ""] !== true;

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
            <main className="p-4 md:p-6 space-y-4 max-w-[1600px] mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.subtitle}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setLang("en")} className={cn("px-2 py-1 rounded text-xs font-medium transition-colors", lang === "en" ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white")}>EN</button>
                        <button onClick={() => setLang("tr")} className={cn("px-2 py-1 rounded text-xs font-medium transition-colors", lang === "tr" ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white")}>TR</button>
                    </div>
                </div>

                {/* Date selection bar */}
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-3">
                    <Select value={year} onValueChange={setYear}>
                        <SelectTrigger className="w-[100px] h-9">
                            <SelectValue placeholder={t.year} />
                        </SelectTrigger>
                        <SelectContent>
                            {["2022", "2023", "2024", "2025", "2026"].map(y => (
                                <SelectItem key={y} value={y}>{y}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={month} onValueChange={(v) => { setMonth(v); setDay("1"); }}>
                        <SelectTrigger className="w-[140px] h-9">
                            <SelectValue placeholder={t.month} />
                        </SelectTrigger>
                        <SelectContent>
                            {t.months.map((m, i) => (
                                <SelectItem key={i} value={String(i + 1).padStart(2, "0")}>{m}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={day} onValueChange={setDay}>
                        <SelectTrigger className="w-[80px] h-9">
                            <SelectValue placeholder={t.day} />
                        </SelectTrigger>
                        <SelectContent>
                            {Array.from({ length: daysInMonth }, (_, i) => (
                                <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button onClick={bringData} disabled={isLoading || checking} className="h-9 gap-2">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        {isLoading ? t.loading : checking ? `${t.checking} ${checkProgress}` : t.bringData}
                    </Button>

                    {checkedAll && records && (
                        <div className="flex items-center gap-3 ml-auto text-xs">
                            <span className="text-zinc-500">{t.total}: <strong>{records.length}</strong></span>
                            <span className="text-emerald-600 dark:text-emerald-400">{t.found}: <strong>{foundCount}</strong></span>
                            <span className="text-rose-600 dark:text-rose-400">{t.missing}: <strong>{missingCount}</strong></span>
                        </div>
                    )}
                </div>

                {/* Error alert */}
                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>{t.error}</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {/* Activity log */}
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
                    <button
                        onClick={() => setActivityLogOpen(!activityLogOpen)}
                        className="w-full px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <Info className="h-4 w-4 text-indigo-500" />
                            <h3 className="text-sm font-semibold">{t.activityLog}</h3>
                            {checking && <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />}
                        </div>
                        {activityLogOpen ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
                    </button>
                    {activityLogOpen && (
                        <div className="p-4 space-y-3">
                            {checkStats ? (
                                <>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                                        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg px-3 py-2">
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.scopesSearched}</p>
                                            <p className="font-semibold">{checkStats.totalScopes}</p>
                                        </div>
                                        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg px-3 py-2">
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.apiCalls}</p>
                                            <p className="font-semibold">{checkStats.totalApiCalls}</p>
                                        </div>
                                        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg px-3 py-2">
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.filesInSharePoint}</p>
                                            <p className="font-semibold">{checkStats.totalFilesFound}</p>
                                        </div>
                                        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg px-3 py-2">
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.checkedFoundMissing}</p>
                                            <p className="font-semibold">
                                                {checkStats.totalUrls} / <span className="text-emerald-600 dark:text-emerald-400">{checkStats.found}</span> / <span className="text-rose-600 dark:text-rose-400">{checkStats.missing}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="max-h-48 overflow-y-auto space-y-1 text-xs font-mono">
                                        {checkStats.perScope.map((s) => (
                                            <div key={s.scope} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                                                <Badge variant={s.folderExists ? "secondary" : "destructive"} className="text-[10px] px-1.5 py-0 min-w-[32px] justify-center">
                                                    {s.folderExists ? "OK" : "404"}
                                                </Badge>
                                                <span className="truncate flex-1 text-zinc-600 dark:text-zinc-400">{s.scope}</span>
                                                <span className="text-zinc-400 dark:text-zinc-500 whitespace-nowrap">
                                                    {s.apiCalls}req &middot; {s.filesInScope}files &middot; {s.found}/{s.checked}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <p className="text-sm text-zinc-400 dark:text-zinc-500 text-center py-4">{t.noCheckYet}</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Main content: split pane */}
                {records === null && !isLoading ? (
                    <div className="text-center py-20 text-zinc-400 dark:text-zinc-500">
                        <Download className="h-12 w-12 mx-auto mb-4 opacity-30" />
                        <p className="text-sm">{t.noData}</p>
                    </div>
                ) : isLoading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-20 w-full rounded-lg bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
                        ))}
                    </div>
                ) : records && (
                    <div className="flex flex-col lg:flex-row gap-6">
                        {/* LEFT PANEL: Record cards */}
                        <div className="lg:w-[40%] space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold">
                                    {t.records} ({records.length})
                                </h3>
                            </div>
                            <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                                {records.length === 0 ? (
                                    <div className="text-center py-12 text-zinc-400 dark:text-zinc-500">
                                        <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                                        <p className="text-sm">{t.noRecords}</p>
                                    </div>
                                ) : records.map((record) => {
                                    const status = fileStatuses[record.doc];
                                    const isSelected = selectedRecord?.uniquecode === record.uniquecode;
                                    const giris = Number(record.giris_tutar) || 0;
                                    const cikis = Number(record.cikis_tutar) || 0;
                                    const currency = record.parabirimi || "";
                                    return (
                                        <div
                                            key={record.uniquecode}
                                            onClick={() => setSelectedRecord(record)}
                                            className={cn(
                                                "rounded-lg border px-3 py-2 cursor-pointer transition-all duration-150 hover:shadow-md",
                                                isSelected
                                                    ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 ring-1 ring-indigo-500/30"
                                                    : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700"
                                            )}
                                        >
                                            <div className="flex items-center gap-2">
                                                {/* Status icon */}
                                                <div className="shrink-0">
                                                    {status === undefined ? (
                                                        <span className="text-zinc-300 dark:text-zinc-700 text-xs">-</span>
                                                    ) : status ? (
                                                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                                    ) : (
                                                        <XCircle className="h-4 w-4 text-rose-500" />
                                                    )}
                                                </div>
                                                {/* Code + badges */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="font-mono text-xs font-semibold">{record.uniquecode}</span>
                                                        <Badge variant="outline" className="text-[10px] px-1 py-0">{record.projekodu}</Badge>
                                                        <Badge variant="secondary" className="text-[10px] px-1 py-0">{record.source}</Badge>
                                                        {record.islemturu && <Badge variant="outline" className="text-[10px] px-1 py-0 text-violet-600 dark:text-violet-400 border-violet-300 dark:border-violet-700">{record.islemturu}</Badge>}
                                                    </div>
                                                    <p className="text-xs truncate text-zinc-500 dark:text-zinc-400">{record.carifirma}</p>
                                                </div>
                                                {/* Giris / Cikis amounts */}
                                                <div className="text-right shrink-0 space-y-0.5">
                                                    {giris > 0 && (
                                                        <div className="flex items-center gap-1 justify-end">
                                                            <span className="text-[10px] font-medium px-1 py-0 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">{t.giris}</span>
                                                            <span className="text-xs font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                                                                {giris.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {cikis > 0 && (
                                                        <div className="flex items-center gap-1 justify-end">
                                                            <span className="text-[10px] font-medium px-1 py-0 rounded bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">{t.cikis}</span>
                                                            <span className="text-xs font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                                                                {cikis.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {giris === 0 && cikis === 0 && (
                                                        <span className="text-xs text-zinc-400">-</span>
                                                    )}
                                                </div>
                                                {/* View details button */}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setViewDetailRecord(record); }}
                                                    className="shrink-0 p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                                                    title={t.recordDetails}
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* RIGHT PANEL: PDF Operations */}
                        <div className="lg:w-[60%] lg:sticky lg:top-20 lg:self-start space-y-4">
                            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-5 space-y-5">

                                {/* Selected record indicator */}
                                {selectedRecord ? (
                                    <div className={cn(
                                        "rounded-lg border p-3",
                                        fileStatuses[selectedRecord.doc] === true
                                            ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
                                            : "bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800"
                                    )}>
                                        <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mb-1">{t.selectedRecord}</p>
                                        <p className="font-mono text-sm font-semibold">{selectedRecord.uniquecode}</p>
                                        <p className="text-sm text-zinc-600 dark:text-zinc-400 truncate">{selectedRecord.carifirma} — {formatCurrency(Math.abs(Number(selectedRecord.usd_degeri) || 0))}</p>
                                        <p className="text-xs text-zinc-500 mt-1">{t.target} {getFilename(selectedRecord.doc)}</p>
                                        {fileStatuses[selectedRecord.doc] === true && (
                                            <div className="flex items-center gap-1.5 mt-2 text-emerald-600 dark:text-emerald-400">
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                <span className="text-xs font-medium">{t.alreadyUploaded}</span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="rounded-lg border-2 border-dashed border-zinc-200 dark:border-zinc-700 p-4 text-center">
                                        <p className="text-sm text-zinc-400 dark:text-zinc-500">{t.selectRecord}</p>
                                    </div>
                                )}

                                {/* PDF drop zone */}
                                <div
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={cn(
                                        "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all",
                                        isDragging
                                            ? "border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20"
                                            : pdfFile
                                                ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-950/10"
                                                : "border-zinc-300 dark:border-zinc-700 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
                                    )}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".pdf"
                                        className="hidden"
                                        onChange={handleFileInputChange}
                                    />
                                    {pdfFile ? (
                                        <div className="space-y-1">
                                            <FileText className="h-8 w-8 mx-auto text-emerald-500" />
                                            <p className="text-sm font-medium">{pdfFile.name}</p>
                                            <p className="text-xs text-zinc-500">
                                                {(pdfFile.size / 1024 / 1024).toFixed(1)} MB — {totalPages} {t.pages}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <Upload className="h-8 w-8 mx-auto text-zinc-400" />
                                            <p className="text-sm text-zinc-600 dark:text-zinc-400">{t.dropZone}</p>
                                            <p className="text-xs text-zinc-400 dark:text-zinc-500">{t.dropZoneHint}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Clear PDF button */}
                                {pdfFile && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); clearPdf(); }}
                                        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-rose-500 transition-colors"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                        {t.clearPdf}
                                    </button>
                                )}

                                {/* Page thumbnails grid */}
                                {totalPages > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-medium">{t.pageRange}</label>
                                            <p className="text-xs text-zinc-500">
                                                {selectedPages.length > 0
                                                    ? `${selectedPages.length} ${t.of} ${totalPages} ${t.pagesSelected}`
                                                    : `0 ${t.of} ${totalPages} ${t.pagesSelected}`
                                                }
                                            </p>
                                        </div>
                                        <Input
                                            value={pageRangeInput}
                                            onChange={e => setPageRangeInput(e.target.value)}
                                            placeholder={t.pageRangeHint}
                                            className="h-9"
                                        />
                                        {renderingThumbnails ? (
                                            <div className="flex items-center justify-center gap-2 py-8 text-zinc-400">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                <span className="text-xs">Rendering pages...</span>
                                            </div>
                                        ) : pageThumbnails.length > 0 && (
                                            <div className="grid grid-cols-4 gap-2 max-h-[450px] overflow-y-auto p-1">
                                                {pageThumbnails.map((thumb, idx) => {
                                                    const isPageSelected = selectedPages.includes(idx);
                                                    return (
                                                        <div
                                                            key={idx}
                                                            onClick={() => togglePage(idx)}
                                                            className={cn(
                                                                "group relative cursor-pointer rounded-md border-2 overflow-hidden transition-all hover:shadow-md",
                                                                isPageSelected
                                                                    ? "border-indigo-500 ring-2 ring-indigo-500/30 shadow-md"
                                                                    : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500"
                                                            )}
                                                        >
                                                            <img
                                                                src={thumb}
                                                                alt={`Page ${idx + 1}`}
                                                                className="w-full h-auto"
                                                                draggable={false}
                                                            />
                                                            <div className={cn(
                                                                "absolute bottom-0 left-0 right-0 text-center text-[10px] font-semibold py-0.5",
                                                                isPageSelected
                                                                    ? "bg-indigo-500 text-white"
                                                                    : "bg-zinc-900/60 text-white"
                                                            )}>
                                                                {idx + 1}
                                                            </div>
                                                            {isPageSelected && (
                                                                <div className="absolute top-1 right-1">
                                                                    <CheckCircle2 className="h-4 w-4 text-indigo-500 drop-shadow-md" />
                                                                </div>
                                                            )}
                                                            {/* Full-page preview button */}
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); openPagePreview(idx); }}
                                                                className="absolute top-1 left-1 p-1 rounded bg-zinc-900/70 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-900/90"
                                                                title={t.pagePreview}
                                                            >
                                                                <Maximize2 className="h-3 w-3" />
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Upload button */}
                                <Button
                                    onClick={handleUpload}
                                    disabled={!canUpload}
                                    className="w-full h-10 gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-md"
                                >
                                    {uploading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Upload className="h-4 w-4" />
                                    )}
                                    {uploading ? t.uploading : `${t.uploadPages} (${selectedPages.length} ${t.pages})`}
                                </Button>

                                {/* Upload result */}
                                {uploadResult && (
                                    <Alert variant={uploadResult.success ? "default" : "destructive"}>
                                        {uploadResult.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                                        <AlertTitle>{uploadResult.success ? t.success : t.error}</AlertTitle>
                                        <AlertDescription>{uploadResult.message}</AlertDescription>
                                    </Alert>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                {/* Record Details Dialog */}
                <Dialog open={!!viewDetailRecord} onOpenChange={(open) => { if (!open) setViewDetailRecord(null); }}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>{t.recordDetails}</DialogTitle>
                        </DialogHeader>
                        {viewDetailRecord && (
                            <div className="space-y-3 text-sm">
                                <div className="grid grid-cols-[100px_1fr] gap-y-2 gap-x-3">
                                    <span className="text-zinc-500 font-medium">Code</span>
                                    <span className="font-mono font-semibold">{viewDetailRecord.uniquecode}</span>

                                    <span className="text-zinc-500 font-medium">{t.date}</span>
                                    <span>{formatDate(viewDetailRecord.date)}</span>

                                    <span className="text-zinc-500 font-medium">{t.project}</span>
                                    <span>{viewDetailRecord.projekodu}</span>

                                    <span className="text-zinc-500 font-medium">{t.source}</span>
                                    <span>{viewDetailRecord.source}</span>

                                    <span className="text-zinc-500 font-medium">{t.partner}</span>
                                    <span>{viewDetailRecord.partner || "-"}</span>

                                    <span className="text-zinc-500 font-medium">{t.vendor}</span>
                                    <span>{viewDetailRecord.carifirma || "-"}</span>

                                    <span className="text-zinc-500 font-medium">{t.description}</span>
                                    <span className="break-words">{viewDetailRecord.aciklama || "-"}</span>

                                    <span className="text-zinc-500 font-medium">{t.transType}</span>
                                    <span>{viewDetailRecord.islemturu || "-"}</span>

                                    <span className="text-zinc-500 font-medium">{t.cost}</span>
                                    <span>{viewDetailRecord.cost}</span>

                                    <span className="text-zinc-500 font-medium">{t.giris}</span>
                                    <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                                        {(Number(viewDetailRecord.giris_tutar) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {viewDetailRecord.parabirimi || ""}
                                    </span>

                                    <span className="text-zinc-500 font-medium">{t.cikis}</span>
                                    <span className="font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                                        {(Number(viewDetailRecord.cikis_tutar) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {viewDetailRecord.parabirimi || ""}
                                    </span>
                                </div>
                                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                                    <p className="text-xs text-zinc-400 truncate">Doc: {viewDetailRecord.doc}</p>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Page Preview Dialog */}
                <Dialog open={previewPageIdx !== null} onOpenChange={(open) => { if (!open) { setPreviewPageIdx(null); setPreviewPageDataUrl(null); } }}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                        <DialogHeader>
                            <DialogTitle>{t.pagePreview} — {lang === "en" ? "Page" : "Sayfa"} {previewPageIdx !== null ? previewPageIdx + 1 : ""}</DialogTitle>
                        </DialogHeader>
                        {previewPageIdx !== null && (
                            <div className="flex justify-center">
                                {renderingPreview ? (
                                    <div className="flex items-center gap-2 py-20 text-zinc-400">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        <span className="text-sm">Rendering...</span>
                                    </div>
                                ) : previewPageDataUrl ? (
                                    <img
                                        src={previewPageDataUrl}
                                        alt={`Page ${previewPageIdx + 1}`}
                                        className="max-w-full h-auto rounded-lg border border-zinc-200 dark:border-zinc-700"
                                    />
                                ) : pageThumbnails[previewPageIdx] ? (
                                    <img
                                        src={pageThumbnails[previewPageIdx]}
                                        alt={`Page ${previewPageIdx + 1}`}
                                        className="max-w-full h-auto rounded-lg border border-zinc-200 dark:border-zinc-700"
                                    />
                                ) : null}
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </main>
        </div>
    );
}
