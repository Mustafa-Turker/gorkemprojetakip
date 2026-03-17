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
    DialogFooter,
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
    ExternalLink,
    Wand2,
    Save,
    CalendarDays,
    Square,
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

interface AutoMatchEntry {
    uniquecode: string;
    pages: number[];
    confidence: "high" | "medium" | "low" | "unmatched";
    reason: string;
}

interface AutoMatchResult {
    matches: AutoMatchEntry[];
    reasoning: string | null;
    model: string;
    fallbackUsed: boolean;
    ocrCost: { pages: number; totalCost: number };
    deepseekCost: { totalCost: number } | null;
    totalCost: number;
    ocrDurationMs: number;
    deepseekDurationMs: number;
    totalDurationMs: number;
}

interface MonthlyMatchDayResult {
    matches: AutoMatchEntry[];
    model: string;
    fallbackUsed: boolean;
    ocrCost: number;
    deepseekCost: number;
    reasoning: string | null;
}

interface MonthlyMatchData {
    year: number;
    month: number;
    startedAt: string;
    completedAt: string | null;
    dayResults: Record<number, MonthlyMatchDayResult>;
    errors: { day: number; phase: string; error: string }[];
    totalOcrCost: number;
    totalDeepseekCost: number;
    totalOcrPages: number;
}

interface MonthlyLogEntry {
    time: string;
    message: string;
    type: "info" | "error" | "success" | "warn";
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
        viewDocument: "View Document",
        noPreview: "No preview available",
        openInSharePoint: "Open in SharePoint",
        close: "Close",
        autoMatch: "Auto-Match",
        autoMatchOcr: "Running OCR...",
        autoMatchAi: "AI Matching...",
        autoMatchDone: "Auto-match complete",
        autoMatchNoPdf: "No PDF found for this date on SharePoint",
        saveAllMatches: "Save All Matches",
        saveHighOnly: "Save High Only",
        savingMatches: "Saving...",
        edited: "edited",
        matchedPages: "Matched Pages",
        matchHigh: "High",
        matchMedium: "Medium",
        matchLow: "Low",
        matchUnmatched: "Unmatched",
        matchResults: "Match Results",
        matchedCount: "Matched",
        ocrCost: "OCR Cost",
        aiCost: "AI Cost",
        duration: "Duration",
        months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
        autoMatchMonth: "Auto-Match Month",
        autoMatchMonthCancel: "Cancel",
        autoMatchMonthProgress: "Monthly Auto-Match Progress",
        showStoredMatches: "Show Matched Records",
        noStoredMatchesDay: "No stored match results for this day",
        monthlyPhaseInit: "Initializing...",
        monthlyPhaseChecking: "Checking SharePoint...",
        monthlyPhaseOcr: "OCR Processing",
        monthlyPhaseDeepseek: "AI Matching",
        monthlyPhaseDone: "Complete",
        monthlyPhaseCancelled: "Cancelled",
        monthlyErrors: "errors",
        monthlyTotalCost: "Total Cost",
        monthlyOcrPages: "Pages OCR'd",
        monthlyDaysProcessed: "Days Processed",
        monthlyRecordsMatched: "Records Matched",
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
        viewDocument: "Belgeyi Goruntule",
        noPreview: "Onizleme mevcut degil",
        openInSharePoint: "SharePoint'te Ac",
        close: "Kapat",
        autoMatch: "Otomatik Eslestir",
        autoMatchOcr: "OCR calisiyor...",
        autoMatchAi: "AI eslestiriyor...",
        autoMatchDone: "Otomatik eslestirme tamamlandi",
        autoMatchNoPdf: "Bu tarih icin SharePoint'te PDF bulunamadi",
        saveAllMatches: "Tum Eslesmeleri Kaydet",
        saveHighOnly: "Sadece Yuksek Guvenli",
        savingMatches: "Kaydediliyor...",
        edited: "duzenlendi",
        matchedPages: "Eslesen Sayfalar",
        matchHigh: "Yuksek",
        matchMedium: "Orta",
        matchLow: "Dusuk",
        matchUnmatched: "Eslestirilmedi",
        matchResults: "Eslestirme Sonuclari",
        matchedCount: "Eslesen",
        ocrCost: "OCR Maliyet",
        aiCost: "AI Maliyet",
        duration: "Sure",
        months: ["Ocak", "Subat", "Mart", "Nisan", "Mayis", "Haziran", "Temmuz", "Agustos", "Eylul", "Ekim", "Kasim", "Aralik"],
        autoMatchMonth: "Aylik Eslestir",
        autoMatchMonthCancel: "Iptal",
        autoMatchMonthProgress: "Aylik Otomatik Eslestirme",
        showStoredMatches: "Kayitli Eslesmeleri Goster",
        noStoredMatchesDay: "Bu gun icin kayitli eslestirme sonucu yok",
        monthlyPhaseInit: "Baslatiliyor...",
        monthlyPhaseChecking: "SharePoint kontrol ediliyor...",
        monthlyPhaseOcr: "OCR Isleniyor",
        monthlyPhaseDeepseek: "AI Eslestiriyor",
        monthlyPhaseDone: "Tamamlandi",
        monthlyPhaseCancelled: "Iptal Edildi",
        monthlyErrors: "hata",
        monthlyTotalCost: "Toplam Maliyet",
        monthlyOcrPages: "OCR Sayfa",
        monthlyDaysProcessed: "Islenen Gun",
        monthlyRecordsMatched: "Eslesen Kayit",
    },
} as const;

type Lang = keyof typeof translations;

const BATCH_SIZE = 10000;

const MONTHLY_MATCH_KEY = (year: string, month: string) =>
    `monthlyAutoMatch_${year}_${String(parseInt(month)).padStart(2, "0")}`;

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

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

function pagesToRangeString(pages: number[]): string {
    const sorted = [...pages].sort((a, b) => a - b);
    const ranges: string[] = [];
    let i = 0;
    while (i < sorted.length) {
        const start = sorted[i];
        let end = start;
        while (i + 1 < sorted.length && sorted[i + 1] === end + 1) { end = sorted[++i]; }
        ranges.push(start === end ? String(start) : `${start}-${end}`);
        i++;
    }
    return ranges.join(", ");
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
    const [lang, setLang] = useState<Lang>("tr");
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
    const [usedPages, setUsedPages] = useState<Map<number, string[]>>(new Map()); // pageIdx → order numbers

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
    const [docPreviewRecord, setDocPreviewRecord] = useState<DocumentRecord | null>(null);
    const [docThumbnailUrl, setDocThumbnailUrl] = useState<string | null>(null);
    const [docThumbnailLoading, setDocThumbnailLoading] = useState(false);

    // Auto-match state
    const [autoMatching, setAutoMatching] = useState(false);
    const [autoMatchStep, setAutoMatchStep] = useState<"ocr" | "match" | "">("");
    const [autoMatchResults, setAutoMatchResults] = useState<AutoMatchResult | null>(null);
    const [autoMatchError, setAutoMatchError] = useState<string | null>(null);
    const [savingAllMatches, setSavingAllMatches] = useState(false);
    const [saveAllProgress, setSaveAllProgress] = useState({ current: 0, total: 0 });
    const [autoMatchDebugOpen, setAutoMatchDebugOpen] = useState(false);
    const [matchOverrides, setMatchOverrides] = useState<Map<string, number[]>>(new Map());

    // Monthly auto-match state
    const [monthlyAutoMatching, setMonthlyAutoMatching] = useState(false);
    const [monthlyProgress, setMonthlyProgress] = useState<{
        phase: "init" | "checking" | "ocr" | "deepseek" | "done" | "cancelled";
        totalDays: number;
        ocrCompleted: number;
        ocrErrors: number;
        deepseekCompleted: number;
        deepseekErrors: number;
        logs: MonthlyLogEntry[];
        calYear: number;
        calMonth: number;
        dayStatuses: Record<number, "no-records" | "no-missing" | "queued" | "ocr" | "ocr-retry" | "ocr-done" | "no-pdf" | "deepseek" | "done" | "error">;
        missingCounts: Record<number, number>; // day → count of missing BAG records
    } | null>(null);
    const monthlyAbortRef = useRef(false);
    const monthlyLogsRef = useRef<MonthlyLogEntry[]>([]);
    const [hasStoredMonthlyData, setHasStoredMonthlyData] = useState(false);
    const monthlyLogRef = useRef<HTMLDivElement>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Days in selected month
    const daysInMonth = useMemo(() => getDaysInMonth(parseInt(year), parseInt(month)), [year, month]);

    // Reset day if exceeds new month's max
    useEffect(() => {
        if (parseInt(day) > daysInMonth) setDay("1");
    }, [daysInMonth, day]);

    // Check localStorage for stored monthly match data
    useEffect(() => {
        try {
            const stored = localStorage.getItem(MONTHLY_MATCH_KEY(year, month));
            if (stored) {
                const data: MonthlyMatchData = JSON.parse(stored);
                setHasStoredMonthlyData(!!data.dayResults?.[parseInt(day)]);
            } else {
                setHasStoredMonthlyData(false);
            }
        } catch {
            setHasStoredMonthlyData(false);
        }
    }, [year, month, day]);

    // Auto-scroll monthly log panel
    useEffect(() => {
        if (monthlyLogRef.current) {
            monthlyLogRef.current.scrollTop = monthlyLogRef.current.scrollHeight;
        }
    }, [monthlyProgress?.logs.length]);

    // Warn user before closing tab during monthly auto-match
    useEffect(() => {
        if (!monthlyAutoMatching) return;
        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [monthlyAutoMatching]);

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
            // Keep activity log collapsed — user can expand manually
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
        setAutoMatchResults(null);
        setAutoMatchError(null);
        setMatchOverrides(new Map());

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
        setUsedPages(new Map());
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
                if (result.id) {
                    setFileMetadata(prev => ({ ...prev, [selectedRecord.doc]: {
                        id: result.id,
                        createdDateTime: result.createdDateTime || new Date().toISOString(),
                        lastModifiedDateTime: result.lastModifiedDateTime || new Date().toISOString(),
                        createdBy: result.createdBy || null,
                        size: result.size || 0,
                    }}));
                }
                // Mark pages as used with the order number from uniquecode
                const orderNum = selectedRecord.uniquecode.split(".").pop() || "";
                setUsedPages(prev => {
                    const next = new Map(prev);
                    for (const p of selectedPages) {
                        const existing = next.get(p) || [];
                        if (!existing.includes(orderNum)) {
                            next.set(p, [...existing, orderNum]);
                        }
                    }
                    return next;
                });
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

    // View existing document from SharePoint
    const handleViewDocument = useCallback(async (record: DocumentRecord) => {
        setDocPreviewRecord(record);
        setDocThumbnailUrl(null);
        setDocThumbnailLoading(true);
        const meta = fileMetadata[record.doc];
        if (meta?.id) {
            try {
                const resp = await fetch(`/api/documents/thumbnail?itemId=${encodeURIComponent(meta.id)}`);
                if (resp.ok) {
                    const data = await resp.json();
                    setDocThumbnailUrl(data.large || data.medium || data.small || null);
                }
            } catch { /* thumbnail is optional */ }
        }
        setDocThumbnailLoading(false);
    }, [fileMetadata]);

    // Get auto-match result for a specific record
    const getMatchForRecord = useCallback((uniquecode: string): AutoMatchEntry | null => {
        return autoMatchResults?.matches.find(m => m.uniquecode === uniquecode) || null;
    }, [autoMatchResults]);

    // Get effective pages for a record (override > AI match)
    const getEffectivePages = useCallback((uniquecode: string): number[] => {
        const override = matchOverrides.get(uniquecode);
        if (override) return override;
        const match = autoMatchResults?.matches.find(m => m.uniquecode === uniquecode);
        return match?.pages || [];
    }, [matchOverrides, autoMatchResults]);

    // Select a record — save override for previous, load pages for new
    const handleRecordSelect = useCallback((record: DocumentRecord) => {
        // Save current page selection as override for the leaving record
        if (selectedRecord && autoMatchResults) {
            const prevMatch = getMatchForRecord(selectedRecord.uniquecode);
            if (prevMatch && prevMatch.pages.length > 0 && selectedPages.length > 0) {
                const currentPages = selectedPages.map(p => p + 1).sort((a, b) => a - b);
                setMatchOverrides(prev => {
                    const next = new Map(prev);
                    next.set(selectedRecord.uniquecode, currentPages);
                    return next;
                });
            }
        }

        setSelectedRecord(record);

        // Load pages: override > AI match
        const override = matchOverrides.get(record.uniquecode);
        const match = getMatchForRecord(record.uniquecode);
        const pages = override || match?.pages || [];
        if (pages.length > 0) {
            setPageRangeInput(pagesToRangeString(pages));
        } else {
            setPageRangeInput("");
        }
    }, [selectedRecord, autoMatchResults, getMatchForRecord, selectedPages, matchOverrides]);

    // Auto-match: OCR + AI matching
    const handleAutoMatch = useCallback(async () => {
        if (!records || records.length === 0) return;
        setAutoMatching(true);
        setAutoMatchError(null);
        setAutoMatchResults(null);
        setMatchOverrides(new Map());
        setAutoMatchStep("ocr");

        try {
            // Start PDF download in background for thumbnails
            const pdfPromise = fetch(`/api/auto-match/pdf?year=${year}&month=${month}&day=${day}`);

            // Step 1: OCR
            const ocrResp = await fetch("/api/auto-match/ocr", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ year: parseInt(year), month: parseInt(month), day: parseInt(day) }),
            });

            if (!ocrResp.ok) {
                const err = await ocrResp.json();
                if (ocrResp.status === 404) {
                    setAutoMatchError(t.autoMatchNoPdf);
                } else {
                    setAutoMatchError(err.error || "OCR failed");
                }
                setAutoMatching(false);
                setAutoMatchStep("");
                return;
            }

            const ocrData = await ocrResp.json();

            // Load PDF for thumbnails (should be ready by now)
            try {
                const pdfResp = await pdfPromise;
                if (pdfResp.ok) {
                    const buffer = await pdfResp.arrayBuffer();
                    setPdfArrayBuffer(buffer);
                    setPdfFile(null);
                    setPageRangeInput("");
                    setSelectedPages([]);
                    setRenderingThumbnails(true);

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
                    setRenderingThumbnails(false);
                }
            } catch (pdfErr) {
                console.error("PDF load for thumbnails failed:", pdfErr);
            }

            // Step 2: AI Matching
            setAutoMatchStep("match");
            const matchResp = await fetch("/api/auto-match/match", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ocrPages: ocrData.ocrPages,
                    records: records.map(r => ({
                        uniquecode: r.uniquecode,
                        carifirma: r.carifirma,
                        aciklama: r.aciklama,
                        giris_tutar: r.giris_tutar,
                        cikis_tutar: r.cikis_tutar,
                        parabirimi: r.parabirimi,
                        projekodu: r.projekodu,
                        islemturu: r.islemturu,
                    })),
                }),
            });

            if (!matchResp.ok) {
                const err = await matchResp.json();
                setAutoMatchError(err.error || "Matching failed");
                setAutoMatching(false);
                setAutoMatchStep("");
                return;
            }

            const matchData = await matchResp.json();
            setAutoMatchResults({
                matches: matchData.matches || [],
                reasoning: matchData.reasoning,
                model: matchData.model,
                fallbackUsed: matchData.fallbackUsed,
                ocrCost: ocrData.cost,
                deepseekCost: matchData.cost,
                totalCost: (ocrData.cost?.totalCost || 0) + (matchData.cost?.totalCost || 0),
                ocrDurationMs: ocrData.durationMs,
                deepseekDurationMs: matchData.durationMs,
                totalDurationMs: (ocrData.durationMs || 0) + (matchData.durationMs || 0),
            });
        } catch (err) {
            setAutoMatchError((err as Error).message);
        } finally {
            setAutoMatching(false);
            setAutoMatchStep("");
        }
    }, [records, year, month, day, t.autoMatchNoPdf]);

    // Core save function — processes a list of {uniquecode, pages} pairs
    const saveMatches = useCallback(async (itemsToSave: { uniquecode: string; pages: number[] }[]) => {
        if (!pdfArrayBuffer || !records || itemsToSave.length === 0) return;

        // Save override for currently selected record before batch processing
        if (selectedRecord && autoMatchResults) {
            const prevMatch = getMatchForRecord(selectedRecord.uniquecode);
            if (prevMatch && prevMatch.pages.length > 0 && selectedPages.length > 0) {
                const currentPages = selectedPages.map(p => p + 1).sort((a, b) => a - b);
                setMatchOverrides(prev => {
                    const next = new Map(prev);
                    next.set(selectedRecord.uniquecode, currentPages);
                    return next;
                });
            }
        }

        setSavingAllMatches(true);
        setSaveAllProgress({ current: 0, total: itemsToSave.length });

        const { PDFDocument } = await import("pdf-lib");

        for (let i = 0; i < itemsToSave.length; i++) {
            const item = itemsToSave[i];
            const record = records.find(r => r.uniquecode === item.uniquecode);
            if (!record) continue;

            // Use effective pages (override > AI match)
            const effectivePages = matchOverrides.get(item.uniquecode) || item.pages;
            if (effectivePages.length === 0) continue;

            setSaveAllProgress({ current: i + 1, total: itemsToSave.length });

            try {
                const src = await PDFDocument.load(pdfArrayBuffer, { ignoreEncryption: true });
                const doc = await PDFDocument.create();
                const pageIndices = effectivePages.map(p => p - 1);
                const pages = await doc.copyPages(src, pageIndices);
                pages.forEach(p => doc.addPage(p));
                const bytes = await doc.save();
                const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });

                const formData = new FormData();
                formData.append("file", blob, getFilename(record.doc));
                formData.append("docUrl", record.doc);

                const resp = await fetch("/api/documents/upload", {
                    method: "POST",
                    body: formData,
                });
                const result = await resp.json();

                if (resp.ok && result.success) {
                    setFileStatuses(prev => ({ ...prev, [record.doc]: true }));
                    if (result.id) {
                        setFileMetadata(prev => ({ ...prev, [record.doc]: {
                            id: result.id,
                            createdDateTime: result.createdDateTime || new Date().toISOString(),
                            lastModifiedDateTime: result.lastModifiedDateTime || new Date().toISOString(),
                            createdBy: result.createdBy || null,
                            size: result.size || 0,
                        }}));
                    }
                    const orderNum = record.uniquecode.split(".").pop() || "";
                    setUsedPages(prev => {
                        const next = new Map(prev);
                        for (const p of effectivePages.map(pg => pg - 1)) {
                            const existing = next.get(p) || [];
                            if (!existing.includes(orderNum)) {
                                next.set(p, [...existing, orderNum]);
                            }
                        }
                        return next;
                    });
                }
            } catch (err) {
                console.error(`Failed to save ${item.uniquecode}:`, err);
            }
        }

        setSavingAllMatches(false);
    }, [pdfArrayBuffer, records, matchOverrides, selectedRecord, autoMatchResults, getMatchForRecord, selectedPages]);

    // Save all matched records
    const handleSaveAllMatches = useCallback(async () => {
        if (!autoMatchResults || !records) return;
        const items = autoMatchResults.matches.filter(m => {
            if (m.confidence === "unmatched") return false;
            const effectivePages = matchOverrides.get(m.uniquecode) || m.pages;
            if (effectivePages.length === 0) return false;
            const record = records.find(r => r.uniquecode === m.uniquecode);
            return record ? fileStatuses[record.doc] !== true : false;
        });
        await saveMatches(items);
    }, [autoMatchResults, records, fileStatuses, matchOverrides, saveMatches]);

    // Save only high confidence matches
    const handleSaveHighConfidence = useCallback(async () => {
        if (!autoMatchResults || !records) return;
        const items = autoMatchResults.matches.filter(m => {
            if (m.confidence !== "high") return false;
            const effectivePages = matchOverrides.get(m.uniquecode) || m.pages;
            if (effectivePages.length === 0) return false;
            const record = records.find(r => r.uniquecode === m.uniquecode);
            return record ? fileStatuses[record.doc] !== true : false;
        });
        await saveMatches(items);
    }, [autoMatchResults, records, fileStatuses, matchOverrides, saveMatches]);

    // Monthly auto-match: process entire month
    const handleAutoMatchMonth = useCallback(async () => {
        const y = parseInt(year);
        const m = parseInt(month);
        monthlyAbortRef.current = false;
        monthlyLogsRef.current = [];

        setMonthlyAutoMatching(true);
        setMonthlyProgress({
            phase: "init", totalDays: 0,
            ocrCompleted: 0, ocrErrors: 0,
            deepseekCompleted: 0, deepseekErrors: 0,
            logs: [],
            calYear: y, calMonth: m,
            dayStatuses: {}, missingCounts: {},
        });

        const addLog = (type: MonthlyLogEntry["type"], message: string) => {
            const entry: MonthlyLogEntry = { time: new Date().toLocaleTimeString(), message, type };
            monthlyLogsRef.current = [...monthlyLogsRef.current, entry];
            setMonthlyProgress(prev => prev ? { ...prev, logs: monthlyLogsRef.current } : null);
        };

        try {
            // Step 1: Fetch all month records
            addLog("info", `Fetching records for ${y}-${String(m).padStart(2, "0")}...`);
            const resp = await fetch(`/api/documents?year=${y}&month=${m}`);
            if (!resp.ok) throw new Error("Failed to fetch documents");
            const allRecords: DocumentRecord[] = await resp.json();
            addLog("info", `Found ${allRecords.length} total records for the month`);
            if (monthlyAbortRef.current) { addLog("warn", "Cancelled"); return; }

            // Step 2: SharePoint check
            addLog("info", "Checking SharePoint for existing documents...");
            setMonthlyProgress(prev => prev ? { ...prev, phase: "checking" } : null);

            const docUrls = allRecords.map(r => r.doc);
            const allCheckResults: Record<string, boolean> = {};
            const totalBatches = Math.ceil(docUrls.length / BATCH_SIZE);

            for (let i = 0; i < docUrls.length; i += BATCH_SIZE) {
                const batch = docUrls.slice(i, i + BATCH_SIZE);
                const batchNum = Math.floor(i / BATCH_SIZE) + 1;
                if (totalBatches > 1) addLog("info", `SP check batch ${batchNum}/${totalBatches}...`);

                try {
                    const checkResp = await fetch("/api/documents/check", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ docUrls: batch }),
                    });
                    if (checkResp.ok) {
                        const { results } = await checkResp.json();
                        Object.assign(allCheckResults, results);
                    } else {
                        addLog("error", `SP check batch ${batchNum} failed (${checkResp.status})`);
                    }
                } catch (err) {
                    addLog("error", `SP check batch ${batchNum} error: ${(err as Error).message}`);
                }
                if (monthlyAbortRef.current) { addLog("warn", "Cancelled"); return; }
            }

            const totalMissing = Object.values(allCheckResults).filter(v => !v).length;
            addLog("info", `SP check done: ${Object.keys(allCheckResults).length} checked, ${totalMissing} missing`);

            // Step 3: Filter BAG records with missing docs, group by day
            const allDayMap = new Map<number, DocumentRecord[]>();
            for (const r of allRecords) {
                const d = new Date(r.date).getDate();
                if (!allDayMap.has(d)) allDayMap.set(d, []);
                allDayMap.get(d)!.push(r);
            }

            const daysWithMissingBag = new Set<number>();
            const missingCountPerDay: Record<number, number> = {};
            for (const r of allRecords) {
                if (r.source === "BAG" && allCheckResults[r.doc] === false) {
                    const d = new Date(r.date).getDate();
                    daysWithMissingBag.add(d);
                    missingCountPerDay[d] = (missingCountPerDay[d] || 0) + 1;
                }
            }

            const daysToProcess = [...daysWithMissingBag].sort((a, b) => a - b);
            const bagMissingCount = allRecords.filter(r => r.source === "BAG" && allCheckResults[r.doc] === false).length;
            addLog("info", `BAG missing: ${bagMissingCount} records across ${daysToProcess.length} days (${daysToProcess.join(", ")})`);

            // Build calendar day statuses
            const totalDaysInMonth = getDaysInMonth(y, m);
            const calStatuses: Record<number, "no-records" | "no-missing" | "queued" | "ocr" | "ocr-retry" | "ocr-done" | "no-pdf" | "deepseek" | "done" | "error"> = {};
            for (let d = 1; d <= totalDaysInMonth; d++) {
                if (!allDayMap.has(d)) {
                    calStatuses[d] = "no-records";
                } else if (!daysWithMissingBag.has(d)) {
                    calStatuses[d] = "no-missing";
                } else {
                    calStatuses[d] = "queued";
                }
            }

            setMonthlyProgress(prev => prev ? {
                ...prev,
                dayStatuses: calStatuses,
                missingCounts: missingCountPerDay,
            } : null);

            if (daysToProcess.length === 0) {
                addLog("success", "No days need processing — all BAG documents are uploaded!");
                setMonthlyProgress(prev => prev ? { ...prev, phase: "done" } : null);
                return;
            }

            setMonthlyProgress(prev => prev ? { ...prev, totalDays: daysToProcess.length, phase: "ocr" } : null);

            // Step 4: OCR phase (sequential, 1s gap, retry 2x with 10s wait)
            addLog("info", `Starting OCR phase (${daysToProcess.length} days, 1 req/sec)...`);
            const ocrResults: Record<number, { ocrPages: { index: number; markdown: string }[]; totalPages: number; cost: { totalCost: number } }> = {};
            const monthlyData: MonthlyMatchData = {
                year: y, month: m,
                startedAt: new Date().toISOString(),
                completedAt: null,
                dayResults: {},
                errors: [],
                totalOcrCost: 0, totalDeepseekCost: 0, totalOcrPages: 0,
            };

            for (let di = 0; di < daysToProcess.length; di++) {
                const d = daysToProcess[di];
                if (monthlyAbortRef.current) { addLog("warn", "Cancelled during OCR"); break; }

                addLog("info", `OCR day ${d} (${di + 1}/${daysToProcess.length})...`);
                let ocrSuccess = false;
                const setDayStatus = (day: number, status: typeof calStatuses[number]) => {
                    setMonthlyProgress(prev => prev ? { ...prev, dayStatuses: { ...prev.dayStatuses, [day]: status } } : null);
                };

                setDayStatus(d, "ocr");
                for (let attempt = 1; attempt <= 3; attempt++) {
                    try {
                        const ocrResp = await fetch("/api/auto-match/ocr", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ year: y, month: m, day: d }),
                        });

                        if (ocrResp.status === 404) {
                            addLog("warn", `Day ${d}: PDF not found in SharePoint, skipping`);
                            monthlyData.errors.push({ day: d, phase: "ocr", error: "PDF not found" });
                            setDayStatus(d, "no-pdf");
                            break;
                        }

                        if (!ocrResp.ok) {
                            const err = await ocrResp.json();
                            throw new Error(err.error || `OCR failed (${ocrResp.status})`);
                        }

                        const ocrData = await ocrResp.json();
                        ocrResults[d] = ocrData;
                        monthlyData.totalOcrCost += ocrData.cost?.totalCost || 0;
                        monthlyData.totalOcrPages += ocrData.totalPages || 0;
                        addLog("success", `Day ${d}: OCR done — ${ocrData.totalPages} pages ($${(ocrData.cost?.totalCost || 0).toFixed(3)})`);
                        ocrSuccess = true;
                        setDayStatus(d, "ocr-done");
                        break;
                    } catch (err) {
                        addLog("error", `Day ${d}: OCR attempt ${attempt}/3 failed — ${(err as Error).message}`);
                        if (attempt < 3) {
                            setDayStatus(d, "ocr-retry");
                            addLog("info", `Day ${d}: Retrying in 10s...`);
                            await sleep(10000);
                            setDayStatus(d, "ocr");
                        } else {
                            setDayStatus(d, "error");
                            monthlyData.errors.push({ day: d, phase: "ocr", error: (err as Error).message });
                        }
                    }
                }

                setMonthlyProgress(prev => prev ? {
                    ...prev,
                    ocrCompleted: prev.ocrCompleted + (ocrSuccess ? 1 : 0),
                    ocrErrors: prev.ocrErrors + (ocrSuccess ? 0 : 1),
                } : null);

                // 1s gap between Mistral calls (rate limit)
                if (di < daysToProcess.length - 1) await sleep(1000);
            }

            if (monthlyAbortRef.current) {
                addLog("warn", "Process cancelled during OCR phase");
                setMonthlyProgress(prev => prev ? { ...prev, phase: "cancelled" } : null);
                // Save partial data
                localStorage.setItem(MONTHLY_MATCH_KEY(year, month), JSON.stringify(monthlyData));
                return;
            }

            // Step 5: DeepSeek phase (all concurrent)
            const daysWithOcr = Object.keys(ocrResults).map(Number);
            if (daysWithOcr.length === 0) {
                addLog("error", "No OCR results available. Cannot proceed to AI matching.");
                setMonthlyProgress(prev => prev ? { ...prev, phase: "done" } : null);
                localStorage.setItem(MONTHLY_MATCH_KEY(year, month), JSON.stringify(monthlyData));
                return;
            }

            addLog("info", `Starting AI matching (${daysWithOcr.length} days, all concurrent)...`);
            setMonthlyProgress(prev => prev ? { ...prev, phase: "deepseek" } : null);

            // Helper to update a single day's calendar status
            const setDayStatusDS = (dayNum: number, status: typeof calStatuses[number]) => {
                setMonthlyProgress(prev => prev ? { ...prev, dayStatuses: { ...prev.dayStatuses, [dayNum]: status } } : null);
            };

            const deepseekPromises = daysWithOcr.map(async (d) => {
                if (monthlyAbortRef.current) return;

                setDayStatusDS(d, "deepseek");
                try {
                    const dayRecords = allDayMap.get(d) || [];
                    addLog("info", `Day ${d}: Sending ${dayRecords.length} records + ${ocrResults[d].totalPages} pages to AI...`);

                    const matchResp = await fetch("/api/auto-match/match", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            ocrPages: ocrResults[d].ocrPages,
                            records: dayRecords.map(r => ({
                                uniquecode: r.uniquecode,
                                carifirma: r.carifirma,
                                aciklama: r.aciklama,
                                giris_tutar: r.giris_tutar,
                                cikis_tutar: r.cikis_tutar,
                                parabirimi: r.parabirimi,
                                projekodu: r.projekodu,
                                islemturu: r.islemturu,
                            })),
                        }),
                    });

                    if (!matchResp.ok) {
                        const err = await matchResp.json();
                        throw new Error(err.error || `DeepSeek failed (${matchResp.status})`);
                    }

                    const matchData = await matchResp.json();
                    monthlyData.dayResults[d] = {
                        matches: matchData.matches || [],
                        model: matchData.model,
                        fallbackUsed: matchData.fallbackUsed,
                        ocrCost: ocrResults[d].cost?.totalCost || 0,
                        deepseekCost: matchData.cost?.totalCost || 0,
                        reasoning: matchData.reasoning,
                    };
                    monthlyData.totalDeepseekCost += matchData.cost?.totalCost || 0;

                    // Save progressively
                    localStorage.setItem(MONTHLY_MATCH_KEY(year, month), JSON.stringify(monthlyData));

                    const matched = (matchData.matches || []).filter((mt: AutoMatchEntry) => mt.pages?.length > 0).length;
                    addLog("success", `Day ${d}: AI done — ${matched}/${dayRecords.length} matched (${matchData.model}${matchData.fallbackUsed ? " fb" : ""}) $${(matchData.cost?.totalCost || 0).toFixed(4)}`);
                    setDayStatusDS(d, "done");
                    setMonthlyProgress(prev => prev ? { ...prev, deepseekCompleted: prev.deepseekCompleted + 1 } : null);
                } catch (err) {
                    monthlyData.errors.push({ day: d, phase: "deepseek", error: (err as Error).message });
                    addLog("error", `Day ${d}: AI failed — ${(err as Error).message}`);
                    setDayStatusDS(d, "error");
                    setMonthlyProgress(prev => prev ? { ...prev, deepseekErrors: prev.deepseekErrors + 1 } : null);
                }
            });

            await Promise.allSettled(deepseekPromises);

            // Finalize
            monthlyData.completedAt = new Date().toISOString();
            localStorage.setItem(MONTHLY_MATCH_KEY(year, month), JSON.stringify(monthlyData));

            const totalDayResults = Object.keys(monthlyData.dayResults).length;
            const totalMatched = Object.values(monthlyData.dayResults)
                .flatMap(dr => dr.matches)
                .filter(mt => mt.pages.length > 0).length;

            addLog("success", "Monthly auto-match complete!");
            addLog("info", `${totalDayResults} days processed, ${totalMatched} records matched`);
            addLog("info", `Cost: OCR $${monthlyData.totalOcrCost.toFixed(3)} + AI $${monthlyData.totalDeepseekCost.toFixed(4)} = $${(monthlyData.totalOcrCost + monthlyData.totalDeepseekCost).toFixed(4)}`);
            addLog("info", `Pages OCR'd: ${monthlyData.totalOcrPages}`);
            if (monthlyData.errors.length > 0) {
                addLog("warn", `${monthlyData.errors.length} errors occurred (see log)`);
            }

            setMonthlyProgress(prev => prev ? { ...prev, phase: "done" } : null);
            setHasStoredMonthlyData(true);
        } catch (err) {
            addLog("error", `Fatal error: ${(err as Error).message}`);
            setMonthlyProgress(prev => prev ? { ...prev, phase: "done" } : null);
        } finally {
            setMonthlyAutoMatching(false);
        }
    }, [year, month]);

    // Show stored monthly match results for current day
    const handleShowMonthlyMatches = useCallback(async () => {
        try {
            const stored = localStorage.getItem(MONTHLY_MATCH_KEY(year, month));
            if (!stored) {
                setAutoMatchError(t.noStoredMatchesDay);
                return;
            }
            const data: MonthlyMatchData = JSON.parse(stored);
            const dayResult = data.dayResults[parseInt(day)];
            if (!dayResult) {
                setAutoMatchError(t.noStoredMatchesDay);
                return;
            }

            setAutoMatchResults({
                matches: dayResult.matches,
                reasoning: dayResult.reasoning,
                model: dayResult.model,
                fallbackUsed: dayResult.fallbackUsed,
                ocrCost: { pages: 0, totalCost: dayResult.ocrCost },
                deepseekCost: { totalCost: dayResult.deepseekCost },
                totalCost: dayResult.ocrCost + dayResult.deepseekCost,
                ocrDurationMs: 0,
                deepseekDurationMs: 0,
                totalDurationMs: 0,
            });
            setAutoMatchError(null);
            setMatchOverrides(new Map());

            // Always load the correct day's PDF from SharePoint
            {
                // Clear previous day's PDF
                setPdfArrayBuffer(null);
                setPdfFile(null);
                setPageThumbnails([]);
                setTotalPages(0);
                setUsedPages(new Map());
                try {
                    const pdfResp = await fetch(`/api/auto-match/pdf?year=${year}&month=${month}&day=${day}`);
                    if (pdfResp.ok) {
                        const buffer = await pdfResp.arrayBuffer();
                        setPdfArrayBuffer(buffer);
                        setPdfFile(null);
                        setPageRangeInput("");
                        setSelectedPages([]);
                        setRenderingThumbnails(true);

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
                        setRenderingThumbnails(false);
                    }
                } catch (pdfErr) {
                    console.error("PDF load for thumbnails failed:", pdfErr);
                }
            }
        } catch (err) {
            console.error("Failed to load monthly match data:", err);
            setAutoMatchError(t.noStoredMatchesDay);
        }
    }, [year, month, day, t.noStoredMatchesDay]);

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

    const canUpload = (!!pdfFile || !!pdfArrayBuffer) && selectedPages.length > 0 && !!selectedRecord && !uploading;

    // Auto-match summary
    const matchedCount = autoMatchResults ? autoMatchResults.matches.filter(m => m.pages.length > 0).length : 0;
    const savableCount = autoMatchResults && records ? autoMatchResults.matches.filter(m => {
        if (m.confidence === "unmatched") return false;
        const ep = matchOverrides.get(m.uniquecode) || m.pages;
        if (ep.length === 0) return false;
        const record = records.find(r => r.uniquecode === m.uniquecode);
        return record ? fileStatuses[record.doc] !== true : false;
    }).length : 0;
    const highSavableCount = autoMatchResults && records ? autoMatchResults.matches.filter(m => {
        if (m.confidence !== "high") return false;
        const ep = matchOverrides.get(m.uniquecode) || m.pages;
        if (ep.length === 0) return false;
        const record = records.find(r => r.uniquecode === m.uniquecode);
        return record ? fileStatuses[record.doc] !== true : false;
    }).length : 0;

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

                    {records && records.length > 0 && !isLoading && (
                        <Button
                            onClick={handleAutoMatch}
                            disabled={autoMatching || savingAllMatches || monthlyAutoMatching}
                            variant="outline"
                            className="h-9 gap-2 border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/20"
                        >
                            {autoMatching ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Wand2 className="h-4 w-4" />
                            )}
                            {autoMatching
                                ? (autoMatchStep === "ocr" ? t.autoMatchOcr : t.autoMatchAi)
                                : t.autoMatch
                            }
                        </Button>
                    )}

                    {/* Auto-Match Month button */}
                    {!isLoading && (
                        <Button
                            onClick={monthlyAutoMatching ? () => { monthlyAbortRef.current = true; } : handleAutoMatchMonth}
                            disabled={autoMatching || savingAllMatches}
                            variant="outline"
                            className={cn("h-9 gap-2", monthlyAutoMatching
                                ? "border-rose-300 dark:border-rose-700 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                                : "border-teal-300 dark:border-teal-700 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/20"
                            )}
                        >
                            {monthlyAutoMatching ? (
                                <Square className="h-4 w-4" />
                            ) : (
                                <CalendarDays className="h-4 w-4" />
                            )}
                            {monthlyAutoMatching ? t.autoMatchMonthCancel : t.autoMatchMonth}
                        </Button>
                    )}

                    {/* Show stored monthly matches */}
                    {records && records.length > 0 && !isLoading && hasStoredMonthlyData && !autoMatchResults && (
                        <Button
                            onClick={handleShowMonthlyMatches}
                            variant="outline"
                            className="h-9 gap-2 border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                        >
                            <Wand2 className="h-4 w-4" />
                            {t.showStoredMatches}
                        </Button>
                    )}

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

                {/* Auto-match error */}
                {autoMatchError && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>{t.error}</AlertTitle>
                        <AlertDescription>{autoMatchError}</AlertDescription>
                    </Alert>
                )}

                {/* Monthly auto-match progress panel */}
                {monthlyProgress && (
                    <div className="rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/20 shadow-sm p-3 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <CalendarDays className="h-4 w-4 text-teal-500" />
                                <span className="text-sm font-semibold text-teal-700 dark:text-teal-300">{t.autoMatchMonthProgress}</span>
                                {monthlyAutoMatching && <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-500" />}
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", {
                                    "text-zinc-500 border-zinc-300": monthlyProgress.phase === "init",
                                    "text-blue-600 border-blue-300": monthlyProgress.phase === "checking",
                                    "text-amber-600 border-amber-300": monthlyProgress.phase === "ocr",
                                    "text-violet-600 border-violet-300": monthlyProgress.phase === "deepseek",
                                    "text-emerald-600 border-emerald-300": monthlyProgress.phase === "done",
                                    "text-rose-600 border-rose-300": monthlyProgress.phase === "cancelled",
                                })}>
                                    {monthlyProgress.phase === "init" ? t.monthlyPhaseInit
                                        : monthlyProgress.phase === "checking" ? t.monthlyPhaseChecking
                                        : monthlyProgress.phase === "ocr" ? `${t.monthlyPhaseOcr} (${monthlyProgress.ocrCompleted}/${monthlyProgress.totalDays})`
                                        : monthlyProgress.phase === "deepseek" ? `${t.monthlyPhaseDeepseek} (${monthlyProgress.deepseekCompleted}/${monthlyProgress.totalDays - monthlyProgress.ocrErrors})`
                                        : monthlyProgress.phase === "done" ? t.monthlyPhaseDone
                                        : t.monthlyPhaseCancelled}
                                </Badge>
                                {!monthlyAutoMatching && (
                                    <button
                                        onClick={() => setMonthlyProgress(null)}
                                        className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 underline"
                                    >
                                        {t.close}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Calendar grid */}
                        {Object.keys(monthlyProgress.dayStatuses).length > 0 && (() => {
                            const y = monthlyProgress.calYear;
                            const m = monthlyProgress.calMonth;
                            const totalDaysInCal = getDaysInMonth(y, m);
                            // 0=Sun,1=Mon...6=Sat → shift to Mon=0
                            const firstDow = new Date(y, m - 1, 1).getDay();
                            const startOffset = firstDow === 0 ? 6 : firstDow - 1; // Mon-based offset
                            const dayNames = lang === "en"
                                ? ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]
                                : ["Pt", "Sa", "Ca", "Pe", "Cu", "Ct", "Pa"];

                            return (
                                <div>
                                    {/* Day name headers */}
                                    <div className="grid grid-cols-7 gap-1 mb-1">
                                        {dayNames.map(dn => (
                                            <div key={dn} className="text-[9px] text-center text-zinc-400 font-medium">{dn}</div>
                                        ))}
                                    </div>
                                    {/* Day cells */}
                                    <div className="grid grid-cols-7 gap-1">
                                        {/* Empty offset cells */}
                                        {Array.from({ length: startOffset }).map((_, i) => (
                                            <div key={`empty-${i}`} className="h-9" />
                                        ))}
                                        {Array.from({ length: totalDaysInCal }, (_, i) => {
                                            const d = i + 1;
                                            const status = monthlyProgress.dayStatuses[d];
                                            const missingCount = monthlyProgress.missingCounts[d] || 0;
                                            const isAnimating = status === "ocr" || status === "deepseek";
                                            const isRetrying = status === "ocr-retry";

                                            let bg = "bg-zinc-100 dark:bg-zinc-800/50 text-zinc-300 dark:text-zinc-600"; // no-records
                                            let ring = "";
                                            if (status === "no-missing") bg = "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400";
                                            else if (status === "queued") bg = "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300";
                                            else if (status === "ocr" || status === "ocr-retry") { bg = "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"; ring = "ring-2 ring-amber-400"; }
                                            else if (status === "ocr-done") bg = "bg-amber-200 dark:bg-amber-800/40 text-amber-700 dark:text-amber-300";
                                            else if (status === "no-pdf") bg = "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400";
                                            else if (status === "deepseek") { bg = "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300"; ring = "ring-2 ring-violet-400"; }
                                            else if (status === "done") bg = "bg-emerald-200 dark:bg-emerald-800/50 text-emerald-700 dark:text-emerald-300";
                                            else if (status === "error") bg = "bg-rose-200 dark:bg-rose-800/50 text-rose-700 dark:text-rose-300";

                                            const statusLabel = status === "no-records" ? "-"
                                                : status === "no-missing" ? "✓"
                                                : status === "queued" ? "…"
                                                : status === "ocr" ? "OCR"
                                                : status === "ocr-retry" ? "⟳"
                                                : status === "ocr-done" ? "✓O"
                                                : status === "no-pdf" ? "!P"
                                                : status === "deepseek" ? "AI"
                                                : status === "done" ? "✓"
                                                : status === "error" ? "✗"
                                                : "";

                                            return (
                                                <div
                                                    key={d}
                                                    className={cn(
                                                        "h-9 rounded-md flex flex-col items-center justify-center relative transition-all",
                                                        bg, ring,
                                                        isAnimating && "animate-pulse",
                                                        isRetrying && "animate-pulse [animation-duration:2s]",
                                                    )}
                                                    title={`Day ${d}: ${status}${missingCount > 0 ? ` (${missingCount} missing)` : ""}`}
                                                >
                                                    <span className="text-[11px] font-bold leading-none">{d}</span>
                                                    <span className="text-[8px] leading-none mt-0.5 font-medium">{statusLabel}</span>
                                                    {missingCount > 0 && status !== "no-missing" && status !== "no-records" && (
                                                        <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[7px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5">
                                                            {missingCount}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Progress bars */}
                        {monthlyProgress.totalDays > 0 && (
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2 text-xs">
                                    <span className="text-zinc-500 w-12">OCR</span>
                                    <div className="flex-1 h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-amber-500 transition-all duration-300 rounded-full"
                                            style={{ width: `${((monthlyProgress.ocrCompleted + monthlyProgress.ocrErrors) / monthlyProgress.totalDays) * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-zinc-500 tabular-nums w-16 text-right">
                                        {monthlyProgress.ocrCompleted}/{monthlyProgress.totalDays}
                                        {monthlyProgress.ocrErrors > 0 && <span className="text-rose-500"> ({monthlyProgress.ocrErrors} err)</span>}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    <span className="text-zinc-500 w-12">AI</span>
                                    <div className="flex-1 h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-violet-500 transition-all duration-300 rounded-full"
                                            style={{ width: `${monthlyProgress.ocrCompleted > 0 ? ((monthlyProgress.deepseekCompleted + monthlyProgress.deepseekErrors) / (monthlyProgress.totalDays - monthlyProgress.ocrErrors || 1)) * 100 : 0}%` }}
                                        />
                                    </div>
                                    <span className="text-zinc-500 tabular-nums w-16 text-right">
                                        {monthlyProgress.deepseekCompleted}/{monthlyProgress.totalDays - monthlyProgress.ocrErrors}
                                        {monthlyProgress.deepseekErrors > 0 && <span className="text-rose-500"> ({monthlyProgress.deepseekErrors} err)</span>}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Log panel */}
                        <div ref={monthlyLogRef} className="max-h-48 overflow-y-auto space-y-0.5 text-[11px] font-mono bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-2">
                            {monthlyProgress.logs.length === 0 ? (
                                <p className="text-zinc-400 text-center py-2">{t.monthlyPhaseInit}</p>
                            ) : monthlyProgress.logs.map((log, i) => (
                                <div key={i} className={cn("flex gap-2", {
                                    "text-zinc-500": log.type === "info",
                                    "text-rose-600 dark:text-rose-400": log.type === "error",
                                    "text-emerald-600 dark:text-emerald-400": log.type === "success",
                                    "text-amber-600 dark:text-amber-400": log.type === "warn",
                                })}>
                                    <span className="text-zinc-400 shrink-0">{log.time}</span>
                                    <span>{log.message}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Auto-match results summary */}
                {autoMatchResults && (
                    <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20 shadow-sm p-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5">
                                    <Wand2 className="h-4 w-4 text-violet-500" />
                                    <span className="text-sm font-semibold text-violet-700 dark:text-violet-300">{t.matchResults}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                        {t.matchedCount}: {matchedCount}/{autoMatchResults.matches.length}
                                    </span>
                                    <span className="text-zinc-400">|</span>
                                    <span className="text-zinc-500">
                                        {t.ocrCost}: ${autoMatchResults.ocrCost?.totalCost?.toFixed(3) || "0"}
                                    </span>
                                    <span className="text-zinc-500">
                                        {t.aiCost}: ${autoMatchResults.deepseekCost?.totalCost?.toFixed(4) || "0"}
                                    </span>
                                    <span className="text-zinc-500">
                                        {t.duration}: {((autoMatchResults.totalDurationMs || 0) / 1000).toFixed(1)}s
                                    </span>
                                    <span className="text-zinc-400 text-[10px]">({autoMatchResults.model}{autoMatchResults.fallbackUsed ? " fallback" : ""})</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {highSavableCount > 0 && (
                                    <Button
                                        onClick={handleSaveHighConfidence}
                                        disabled={savingAllMatches}
                                        size="sm"
                                        className="h-8 gap-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white"
                                    >
                                        {savingAllMatches ? (
                                            <>
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                {t.savingMatches} ({saveAllProgress.current}/{saveAllProgress.total})
                                            </>
                                        ) : (
                                            <>
                                                <Save className="h-3.5 w-3.5" />
                                                {t.saveHighOnly} ({highSavableCount})
                                            </>
                                        )}
                                    </Button>
                                )}
                                {savableCount > 0 && (
                                    <Button
                                        onClick={handleSaveAllMatches}
                                        disabled={savingAllMatches}
                                        size="sm"
                                        variant="outline"
                                        className="h-8 gap-1.5 border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400"
                                    >
                                        {!savingAllMatches && (
                                            <>
                                                <Save className="h-3.5 w-3.5" />
                                                {t.saveAllMatches} ({savableCount})
                                            </>
                                        )}
                                    </Button>
                                )}
                                <button
                                    onClick={() => setAutoMatchDebugOpen(!autoMatchDebugOpen)}
                                    className="text-[10px] text-violet-500 hover:text-violet-700 dark:hover:text-violet-300 underline"
                                >
                                    {autoMatchDebugOpen ? "Hide" : "Debug"}
                                </button>
                            </div>
                        </div>
                        {autoMatchDebugOpen && autoMatchResults.reasoning && (
                            <div className="mt-3 pt-3 border-t border-violet-200 dark:border-violet-800">
                                <p className="text-xs font-medium text-violet-600 dark:text-violet-400 mb-1">AI Reasoning:</p>
                                <pre className="text-[10px] text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap max-h-60 overflow-y-auto bg-white dark:bg-zinc-900 rounded p-2 border border-zinc-200 dark:border-zinc-800">
                                    {autoMatchResults.reasoning}
                                </pre>
                            </div>
                        )}
                    </div>
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
                    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-280px)]">
                        {/* LEFT PANEL: Record cards */}
                        <div className="lg:w-[40%] flex flex-col min-h-0">
                            <div className="flex items-center justify-between mb-2 shrink-0">
                                <h3 className="text-sm font-semibold">
                                    {t.records} ({records.length})
                                </h3>
                            </div>
                            <div className="space-y-2 overflow-y-auto pr-1 flex-1 min-h-0">
                                {records.length === 0 ? (
                                    <div className="text-center py-12 text-zinc-400 dark:text-zinc-500">
                                        <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                                        <p className="text-sm">{t.noRecords}</p>
                                    </div>
                                ) : records.map((record) => {
                                    const status = fileStatuses[record.doc];
                                    const isSelected = selectedRecord?.uniquecode === record.uniquecode;
                                    const giris = Math.abs(Number(record.giris_tutar) || 0);
                                    const cikis = Math.abs(Number(record.cikis_tutar) || 0);
                                    const currency = record.parabirimi || "";
                                    const match = getMatchForRecord(record.uniquecode);
                                    return (
                                        <div
                                            key={record.uniquecode}
                                            onClick={() => handleRecordSelect(record)}
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
                                                {/* Auto-match badge */}
                                                {match && (() => {
                                                    const override = matchOverrides.get(record.uniquecode);
                                                    const effectivePages = override || match.pages;
                                                    const isEdited = !!override && JSON.stringify(override) !== JSON.stringify(match.pages);
                                                    return (
                                                        <div className="shrink-0" title={match.reason || ""}>
                                                            {match.confidence === "unmatched" && !override ? (
                                                                <Badge variant="outline" className="text-[9px] px-1 py-0 text-zinc-400 border-zinc-300 dark:border-zinc-700">
                                                                    {t.matchUnmatched}
                                                                </Badge>
                                                            ) : effectivePages.length > 0 ? (
                                                                <Badge variant="outline" className={cn("text-[9px] px-1 py-0", {
                                                                    "text-emerald-600 border-emerald-300 dark:text-emerald-400 dark:border-emerald-700": match.confidence === "high" && !isEdited,
                                                                    "text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-700": match.confidence === "medium" && !isEdited,
                                                                    "text-rose-600 border-rose-300 dark:text-rose-400 dark:border-rose-700": match.confidence === "low" && !isEdited,
                                                                    "text-blue-600 border-blue-300 dark:text-blue-400 dark:border-blue-700": isEdited,
                                                                })}>
                                                                    p.{effectivePages.join(",")} {isEdited ? t.edited : match.confidence === "high" ? t.matchHigh : match.confidence === "medium" ? t.matchMedium : t.matchLow}
                                                                </Badge>
                                                            ) : null}
                                                        </div>
                                                    );
                                                })()}
                                                {/* View details button */}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setViewDetailRecord(record); }}
                                                    className="shrink-0 p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                                                    title={t.recordDetails}
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                </button>
                                                {/* View existing document button */}
                                                {status === true && fileMetadata[record.doc]?.id && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleViewDocument(record); }}
                                                        className="shrink-0 p-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                                                        title={t.viewDocument}
                                                    >
                                                        <FileText className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* RIGHT PANEL: PDF Operations */}
                        <div className="lg:w-[60%] flex flex-col min-h-0">
                            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm flex flex-col flex-1 min-h-0">
                            <div className="p-4 space-y-4 flex-1 min-h-0 overflow-y-auto">

                                {/* PDF drop zone — compact when file loaded */}
                                <div
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={cn(
                                        "border-2 border-dashed rounded-lg text-center cursor-pointer transition-all",
                                        pdfFile ? "px-3 py-2" : "p-8",
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
                                        <div className="flex items-center gap-3">
                                            <FileText className="h-5 w-5 text-emerald-500 shrink-0" />
                                            <div className="flex-1 min-w-0 text-left">
                                                <p className="text-sm font-medium truncate">{pdfFile.name}</p>
                                                <p className="text-xs text-zinc-500">
                                                    {(pdfFile.size / 1024 / 1024).toFixed(1)} MB — {totalPages} {t.pages}
                                                </p>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); clearPdf(); }}
                                                className="shrink-0 p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-900/30 text-zinc-400 hover:text-rose-500 transition-colors"
                                                title={t.clearPdf}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ) : !pdfFile && pdfArrayBuffer && totalPages > 0 ? (
                                        <div className="flex items-center gap-3">
                                            <Wand2 className="h-5 w-5 text-violet-500 shrink-0" />
                                            <div className="flex-1 min-w-0 text-left">
                                                <p className="text-sm font-medium">SharePoint PDF</p>
                                                <p className="text-xs text-zinc-500">{totalPages} {t.pages}</p>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); clearPdf(); }}
                                                className="shrink-0 p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-900/30 text-zinc-400 hover:text-rose-500 transition-colors"
                                                title={t.clearPdf}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <Upload className="h-8 w-8 mx-auto text-zinc-400" />
                                            <p className="text-sm text-zinc-600 dark:text-zinc-400">{t.dropZone}</p>
                                            <p className="text-xs text-zinc-400 dark:text-zinc-500">{t.dropZoneHint}</p>
                                        </div>
                                    )}
                                </div>

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
                                        <p className="text-sm text-zinc-600 dark:text-zinc-400 truncate">{selectedRecord.carifirma}</p>
                                        <div className="flex items-center gap-3 mt-1">
                                            {Math.abs(Number(selectedRecord.giris_tutar) || 0) > 0 && (
                                                <span className="text-xs font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                                                    {t.giris}: {Math.abs(Number(selectedRecord.giris_tutar) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {selectedRecord.parabirimi || ""}
                                                </span>
                                            )}
                                            {Math.abs(Number(selectedRecord.cikis_tutar) || 0) > 0 && (
                                                <span className="text-xs font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                                                    {t.cikis}: {Math.abs(Number(selectedRecord.cikis_tutar) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {selectedRecord.parabirimi || ""}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-zinc-500 mt-1">{t.target} {getFilename(selectedRecord.doc)}</p>
                                        {fileStatuses[selectedRecord.doc] === true && (
                                            <div className="flex items-center gap-1.5 mt-2 text-emerald-600 dark:text-emerald-400">
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                <span className="text-xs font-medium">{t.alreadyUploaded}</span>
                                            </div>
                                        )}
                                        {/* Matched page thumbnails preview */}
                                        {(() => {
                                            const ep = getEffectivePages(selectedRecord.uniquecode);
                                            if (ep.length === 0 || pageThumbnails.length === 0) return null;
                                            return (
                                                <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                                                    <p className="text-[10px] font-medium text-violet-600 dark:text-violet-400 mb-1.5">{t.matchedPages}</p>
                                                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                                                        {ep.map(pageNum => {
                                                            const idx = pageNum - 1;
                                                            return pageThumbnails[idx] ? (
                                                                <div
                                                                    key={idx}
                                                                    className="shrink-0 w-14 rounded border border-violet-300 dark:border-violet-700 overflow-hidden cursor-pointer hover:ring-2 hover:ring-violet-400 transition-all"
                                                                    onClick={() => openPagePreview(idx)}
                                                                >
                                                                    <img src={pageThumbnails[idx]} alt={`p.${pageNum}`} className="w-full h-auto" draggable={false} />
                                                                    <div className="text-[8px] text-center font-bold bg-violet-500 text-white py-0.5">{pageNum}</div>
                                                                </div>
                                                            ) : null;
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                ) : (
                                    <div className="rounded-lg border-2 border-dashed border-zinc-200 dark:border-zinc-700 p-4 text-center">
                                        <p className="text-sm text-zinc-400 dark:text-zinc-500">{t.selectRecord}</p>
                                    </div>
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
                                            <div className="grid grid-cols-4 gap-2 p-1">
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
                                                            {usedPages.has(idx) && (
                                                                <div className="absolute top-0 left-0 right-0 bg-emerald-600/85 text-white text-[9px] font-bold text-center py-0.5 tracking-wide">
                                                                    USED ({usedPages.get(idx)!.join(", ")})
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

                            </div>

                                {/* Upload button — pinned at bottom */}
                                <div className="border-t border-zinc-200 dark:border-zinc-800 p-4 space-y-2">
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
                    </div>
                )}
                {/* Record Details Dialog */}
                <Dialog open={!!viewDetailRecord} onOpenChange={(open) => { if (!open) setViewDetailRecord(null); }}>
                    <DialogContent className="max-w-[90vw] sm:max-w-[85vw]">
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
                                        {Math.abs(Number(viewDetailRecord.giris_tutar) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {viewDetailRecord.parabirimi || ""}
                                    </span>

                                    <span className="text-zinc-500 font-medium">{t.cikis}</span>
                                    <span className="font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                                        {Math.abs(Number(viewDetailRecord.cikis_tutar) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {viewDetailRecord.parabirimi || ""}
                                    </span>
                                </div>
                                {/* Auto-match info */}
                                {(() => {
                                    const m = viewDetailRecord ? getMatchForRecord(viewDetailRecord.uniquecode) : null;
                                    if (!m) return null;
                                    return (
                                        <div className={cn("pt-2 border-t rounded-lg p-2.5", {
                                            "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20": m.confidence === "high",
                                            "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20": m.confidence === "medium",
                                            "border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/20": m.confidence === "low",
                                            "border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50": m.confidence === "unmatched",
                                        })}>
                                            <div className="flex items-center gap-2 mb-1">
                                                <Wand2 className="h-3.5 w-3.5 text-violet-500" />
                                                <span className="text-xs font-semibold">Auto-Match</span>
                                                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", {
                                                    "text-emerald-600 border-emerald-300": m.confidence === "high",
                                                    "text-amber-600 border-amber-300": m.confidence === "medium",
                                                    "text-rose-600 border-rose-300": m.confidence === "low",
                                                    "text-zinc-400 border-zinc-300": m.confidence === "unmatched",
                                                })}>
                                                    {m.confidence === "high" ? t.matchHigh : m.confidence === "medium" ? t.matchMedium : m.confidence === "low" ? t.matchLow : t.matchUnmatched}
                                                </Badge>
                                                {m.pages.length > 0 && (
                                                    <span className="text-xs text-zinc-500">
                                                        {lang === "en" ? "Pages" : "Sayfalar"}: {m.pages.join(", ")}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-zinc-600 dark:text-zinc-400">{m.reason}</p>
                                        </div>
                                    );
                                })()}
                                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2">
                                    <p className="text-xs text-zinc-400 truncate flex-1">Doc: {viewDetailRecord.doc}</p>
                                    {fileStatuses[viewDetailRecord.doc] === true && fileMetadata[viewDetailRecord.doc]?.id && (
                                        <button
                                            onClick={() => { setViewDetailRecord(null); handleViewDocument(viewDetailRecord); }}
                                            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                                        >
                                            <FileText className="h-3.5 w-3.5" />
                                            {t.viewDocument}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Page Preview Dialog */}
                <Dialog open={previewPageIdx !== null} onOpenChange={(open) => { if (!open) { setPreviewPageIdx(null); setPreviewPageDataUrl(null); } }}>
                    <DialogContent className="max-w-[95vw] sm:max-w-[95vw] max-h-[90vh] overflow-auto">
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

                {/* Document Preview Dialog */}
                <Dialog open={!!docPreviewRecord} onOpenChange={(open) => { if (!open) { setDocPreviewRecord(null); setDocThumbnailUrl(null); } }}>
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-indigo-500" />
                                {t.viewDocument}
                            </DialogTitle>
                        </DialogHeader>
                        {docPreviewRecord && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-sm">
                                    <span className="font-mono font-semibold">{docPreviewRecord.uniquecode}</span>
                                    <span className="text-zinc-500 truncate">{docPreviewRecord.carifirma}</span>
                                </div>
                                <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-center min-h-[300px]">
                                    {docThumbnailLoading ? (
                                        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
                                    ) : docThumbnailUrl ? (
                                        <img src={docThumbnailUrl} alt={getFilename(docPreviewRecord.doc)} className="max-w-full max-h-[500px] object-contain" />
                                    ) : (
                                        <div className="text-center py-8 text-zinc-400">
                                            <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                            <p className="text-sm">{t.noPreview}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        <DialogFooter>
                            <a
                                href={docPreviewRecord?.doc}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white transition-colors"
                            >
                                <ExternalLink className="h-4 w-4" />
                                {t.openInSharePoint}
                            </a>
                            <Button variant="outline" onClick={() => { setDocPreviewRecord(null); setDocThumbnailUrl(null); }}>
                                {t.close}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </main>
        </div>
    );
}
