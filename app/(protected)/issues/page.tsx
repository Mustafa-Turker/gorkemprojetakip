"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
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
import { CompactMultiSelect } from "@/components/ui/compact-multi-select";
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
    ChevronDown,
    ChevronUp,
    Download,
    FilterX,
    Eye,
    Clock,
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
        title: "Document Management",
        subtitle: "Upload missing accounting documents to SharePoint",
        checking: "Checking...",
        checkDocuments: "Check Documents",
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
        status: "Status",
        allStatus: "All Status",
        missing: "Missing",
        uploaded: "Uploaded",
        showMissing: "Show Missing",
        above10k: "Above $10K",
        range5k10k: "$5K - $10K",
        below5k: "Below $5K",
        totalRecords: "Total Records",
        checked: "Checked",
        searchPlaceholder: "Search by code, vendor, or description...",
        activityLog: "Check Activity Log",
        scopesSearched: "Scopes Searched",
        apiCalls: "API Calls",
        filesInSharePoint: "Files in SharePoint",
        checkedFoundMissing: "Checked / Found / Missing",
        date: "Date",
        code: "Code",
        vendor: "Vendor",
        description: "Description",
        amount: "Amount",
        action: "Action",
        viewDocument: "View document",
        upload: "Upload",
        noRecords: "No records found",
        showing: "Showing",
        of: "of",
        uploadDocument: "Upload Document",
        uploadPdfFor: "Upload the PDF for record",
        vendorLabel: "Vendor:",
        amountLabel: "Amount:",
        descriptionLabel: "Description:",
        targetFilename: "Target filename:",
        dragDrop: "Drag & drop a PDF here, or click to browse",
        onlyPdf: "Only PDF files are accepted",
        pdfNotAvailable: "PDF preview not available in this browser",
        success: "Success",
        error: "Error",
        close: "Close",
        cancel: "Cancel",
        uploading: "Uploading...",
        uploadToSharePoint: "Upload to SharePoint",
        uploadFailed: "Upload failed",
        networkError: "Network error",
        partner: "Partner",
        allPartners: "All Partners",
        others: "Others",
        urgent1: "Urgent 1",
        urgent2: "Urgent 2",
        costPaymentOnly: "Show only Cost & Payment Related",
        showAsTotalAmounts: "Show as Total Amounts",
        totalAmount: "Total Amount",
        downloadPdf: "Download PDF",
        hq: "Head Office",
        bag: "BAG",
        transType: "Trans. Type",
        allTransTypes: "All Types",
        cost: "Cost",
        allCosts: "All Costs",
        costPositive: "Cost > 0",
        costZeroOrNeg: "Cost <= 0",
        total: "Total",
        errorTitle: "Error",
        errorLoadFailed: "Failed to load documents data.",
        dateFrom: "From",
        dateTo: "To",
        noCheckYet: "Check will run automatically after loading data",
        filtered: "Filtered",
        noData: "Select year and month, then press Bring Data",
        clearFilters: "Clear Filters",
        fileDetails: "File Details",
        created: "Created",
        modified: "Modified",
        uploadedBy: "Uploaded By",
        fileSize: "File Size",
        noPreview: "No preview available",
        openInSharePoint: "Open in SharePoint",
        recentUploads: "Recently Uploaded Documents",
        noUploadsYet: "No uploaded documents found yet",
    },
    tr: {
        title: "Belge Yonetimi",
        subtitle: "Eksik muhasebe belgelerini SharePoint'e yukleyin",
        checking: "Kontrol ediliyor...",
        checkDocuments: "Belgeleri Kontrol Et",
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
        status: "Durum",
        allStatus: "Tum Durumlar",
        missing: "Eksik",
        uploaded: "Yuklu",
        showMissing: "Eksikleri Goster",
        above10k: "$10K Ustu",
        range5k10k: "$5K - $10K",
        below5k: "$5K Alti",
        totalRecords: "Toplam Kayit",
        checked: "Kontrol Edilen",
        searchPlaceholder: "Kod, firma veya aciklama ile ara...",
        activityLog: "Kontrol Aktivite Gunlugu",
        scopesSearched: "Aranan Kapsam",
        apiCalls: "API Cagrisi",
        filesInSharePoint: "SharePoint'teki Dosyalar",
        checkedFoundMissing: "Kontrol / Bulunan / Eksik",
        date: "Tarih",
        code: "Kod",
        vendor: "Firma",
        description: "Aciklama",
        amount: "Tutar",
        action: "Islem",
        viewDocument: "Belgeyi goruntule",
        upload: "Yukle",
        noRecords: "Kayit bulunamadi",
        showing: "Gosterilen",
        of: "/",
        uploadDocument: "Belge Yukle",
        uploadPdfFor: "Kayit icin PDF yukleyin",
        vendorLabel: "Firma:",
        amountLabel: "Tutar:",
        descriptionLabel: "Aciklama:",
        targetFilename: "Hedef dosya adi:",
        dragDrop: "PDF dosyasini surukleyip birakin veya tiklayarak secin",
        onlyPdf: "Sadece PDF dosyalari kabul edilir",
        pdfNotAvailable: "PDF onizleme bu tarayicide kullanilmiyor",
        success: "Basarili",
        error: "Hata",
        close: "Kapat",
        cancel: "Iptal",
        uploading: "Yukleniyor...",
        uploadToSharePoint: "SharePoint'e Yukle",
        uploadFailed: "Yukleme basarisiz",
        networkError: "Ag hatasi",
        partner: "Ortak",
        allPartners: "Tum Ortaklar",
        others: "Diger",
        urgent1: "Acil 1",
        urgent2: "Acil 2",
        costPaymentOnly: "Sadece Maliyet & Odeme ile Ilgili",
        showAsTotalAmounts: "Toplam Tutar Olarak Goster",
        totalAmount: "Toplam Tutar",
        downloadPdf: "PDF Indir",
        hq: "Merkez",
        bag: "BAG",
        transType: "Islem Turu",
        allTransTypes: "Tum Turler",
        cost: "Maliyet",
        allCosts: "Tum Maliyetler",
        costPositive: "Maliyet > 0",
        costZeroOrNeg: "Maliyet <= 0",
        total: "Toplam",
        errorTitle: "Hata",
        errorLoadFailed: "Belge verileri yuklenemedi.",
        dateFrom: "Baslangic",
        dateTo: "Bitis",
        noCheckYet: "Veri yuklendikten sonra kontrol otomatik calisacak",
        filtered: "Filtrelenmis",
        noData: "Yil ve ay secin, ardindan Veri Getir'e basin",
        clearFilters: "Filtreleri Temizle",
        fileDetails: "Dosya Detaylari",
        created: "Olusturulma",
        modified: "Degistirilme",
        uploadedBy: "Yukleyen",
        fileSize: "Dosya Boyutu",
        noPreview: "Onizleme mevcut degil",
        openInSharePoint: "SharePoint'te Ac",
        recentUploads: "Son Yuklenen Belgeler",
        noUploadsYet: "Henuz yuklenmis belge bulunamadi",
    },
} as const;

type Lang = keyof typeof translations;

const PAGE_SIZE = 50;
const BATCH_SIZE = 10000;

function fmtCompact(v: number): string {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
    return `$${v.toFixed(0)}`;
}

export default function IssuesPage() {
    const [lang, setLang] = useState<Lang>("tr");
    const t = translations[lang];

    // Fetch-level filters
    const [year, setYear] = useState("2024");
    const [monthFilter, setMonthFilter] = useState("all");

    // Table-level filters (arrays = multi-select, empty = all)
    const [tableSourceFilter, setTableSourceFilter] = useState<string[]>([]);
    const [tableProjectFilter, setTableProjectFilter] = useState<string[]>([]);
    const [tablePartnerFilter, setTablePartnerFilter] = useState<string[]>([]);
    const [statusFilter, setStatusFilter] = useState<string[]>([]);
    const [amountFilter, setAmountFilter] = useState<"all" | "above10k" | "5k-10k" | "below5k">("all");
    const [transTypeFilter, setTransTypeFilter] = useState<string[]>([]);
    const [costFilter, setCostFilter] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [page, setPage] = useState(0);

    // Data state (manual fetch, no SWR)
    const [records, setRecords] = useState<DocumentRecord[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
    const [checkProgress, setCheckProgress] = useState("");

    // Card-level cost filter
    const [cardCostOnly, setCardCostOnly] = useState(false);
    const [cardShowAmounts, setCardShowAmounts] = useState(false);

    // File metadata from SharePoint check
    const [fileMetadata, setFileMetadata] = useState<Record<string, FileMetadata>>({});

    // View file details dialog
    const [viewRecord, setViewRecord] = useState<DocumentRecord | null>(null);
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const [thumbnailLoading, setThumbnailLoading] = useState(false);

    // Activity log
    const [activityLogOpen, setActivityLogOpen] = useState(false);

    // Recent uploads
    const [recentUploadsOpen, setRecentUploadsOpen] = useState(false);

    // Sticky filter bar ref
    const filterBarRef = useRef<HTMLDivElement>(null);
    const [filterBarHeight, setFilterBarHeight] = useState(0);

    useEffect(() => {
        if (filterBarRef.current) {
            const observer = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    setFilterBarHeight((entry.target as HTMLElement).offsetHeight);
                }
            });
            observer.observe(filterBarRef.current);
            return () => observer.disconnect();
        }
    }, [records]);

    // Bring Data: fetch records, auto-check SharePoint (batched)
    const bringData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        // Reset everything
        setFileStatuses({});
        setFileMetadata({});
        setCheckedAll(false);
        setCheckStats(null);
        setTableSourceFilter([]);
        setTableProjectFilter([]);
        setTablePartnerFilter([]);
        setStatusFilter([]);
        setAmountFilter("all");
        setTransTypeFilter([]);
        setCostFilter([]);
        setSearchQuery("");
        setDateFrom("");
        setDateTo("");
        setPage(0);
        setActivityLogOpen(false);

        try {
            let url = `/api/documents?year=${year}`;
            if (monthFilter !== "all") url += `&month=${monthFilter}`;
            const resp = await fetch(url);
            if (!resp.ok) throw new Error("Failed to fetch documents");
            const data: DocumentRecord[] = await resp.json();
            setRecords(data);
            setIsLoading(false);

            // Auto-check SharePoint (batched to avoid Worker timeout)
            if (data.length > 0) {
                await runCheck(data.map((r) => r.doc));
            }
        } catch (err) {
            setError((err as Error).message);
            setIsLoading(false);
        }
    }, [year, monthFilter]);

    // Check documents on SharePoint (batched in BATCH_SIZE chunks)
    // Results are accumulated locally and only pushed to state after ALL batches finish
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
                if (totalBatches > 1) {
                    setCheckProgress(`(${batchNum}/${totalBatches})`);
                } else {
                    setCheckProgress("");
                }

                const checkResp = await fetch("/api/documents/check", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ docUrls: batch }),
                });

                if (!checkResp.ok) {
                    const errBody = await checkResp.text().catch(() => "");
                    console.error("Check failed:", checkResp.status, errBody);
                    setError(`SharePoint check failed (${checkResp.status})`);
                    break;
                }

                const { results, metadata, stats } = await checkResp.json();

                // Accumulate results and metadata locally — don't update state yet
                Object.assign(allResults, results);
                if (metadata) Object.assign(allMetadata, metadata);

                // Merge stats
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
            // Push all results to state at once after all batches complete
            setFileStatuses(prev => ({ ...prev, ...allResults }));
            setFileMetadata(prev => ({ ...prev, ...allMetadata }));
            if (mergedStats) setCheckStats(mergedStats);
        } catch (checkErr) {
            console.error("Check error:", checkErr);
            setError(`SharePoint check error: ${(checkErr as Error).message}`);
            // Still push whatever we collected so far
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

    // Context subtitle for summary cards
    const contextLabel = useMemo(() => {
        if (!records) return "";
        const monthName = monthFilter !== "all" ? t.months[parseInt(monthFilter) - 1] : t.allMonths;
        return `${year} — ${monthName}`;
    }, [year, monthFilter, records, t]);

    // Get unique sources, projects, and partners from fetched records for table-level filters
    const { sources, projects, partners, transTypes } = useMemo(() => {
        if (!records) return { sources: [], projects: [], partners: [], transTypes: [] };
        const s = [...new Set(records.map((r) => r.source))].filter(Boolean).sort();
        const p = [...new Set(records.map((r) => r.projekodu))].filter(Boolean).sort();
        const pt = [...new Set(records.map((r) => r.partner || ""))].sort();
        const tt = [...new Set(records.map((r) => r.islemturu || ""))].sort();
        return { sources: s, projects: p, partners: pt, transTypes: tt };
    }, [records]);

    // Filter pipeline: records → table-level filters
    const filteredRecords = useMemo(() => {
        if (!records) return [];
        let filtered = records;

        // Source filter (multi-select)
        if (tableSourceFilter.length > 0) {
            filtered = filtered.filter((r) => tableSourceFilter.includes(r.source));
        }

        // Project filter (multi-select)
        if (tableProjectFilter.length > 0) {
            filtered = filtered.filter((r) => tableProjectFilter.includes(r.projekodu));
        }

        // Partner filter (multi-select, "__blank" sentinel for empty)
        if (tablePartnerFilter.length > 0) {
            filtered = filtered.filter((r) => {
                const pv = r.partner || "__blank";
                return tablePartnerFilter.includes(pv);
            });
        }

        // Status filter (multi-select)
        if (statusFilter.length > 0) {
            filtered = filtered.filter((r) => {
                const exists = fileStatuses[r.doc];
                if (statusFilter.includes("missing") && exists === false) return true;
                if (statusFilter.includes("uploaded") && exists === true) return true;
                return false;
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

        // Transaction type filter (multi-select, "__blank" sentinel for empty)
        if (transTypeFilter.length > 0) {
            filtered = filtered.filter((r) => {
                const tv = r.islemturu || "__blank";
                return transTypeFilter.includes(tv);
            });
        }

        // Cost filter (multi-select)
        if (costFilter.length > 0) {
            filtered = filtered.filter((r) => {
                const c = Number(r.cost) || 0;
                if (costFilter.includes("positive") && c > 0) return true;
                if (costFilter.includes("zeroOrNeg") && c <= 0) return true;
                return false;
            });
        }

        // Date range filter
        if (dateFrom) {
            filtered = filtered.filter((r) => r.date >= dateFrom);
        }
        if (dateTo) {
            filtered = filtered.filter((r) => r.date <= dateTo);
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
    }, [records, tableSourceFilter, tableProjectFilter, tablePartnerFilter, statusFilter, fileStatuses, amountFilter, transTypeFilter, costFilter, dateFrom, dateTo, searchQuery]);

    // Pagination
    const totalPages = Math.ceil(filteredRecords.length / PAGE_SIZE);
    const pagedRecords = filteredRecords.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    // Recent uploads — last 100 documents sorted by creation date desc
    const recentUploads = useMemo(() => {
        if (!records || !Object.keys(fileMetadata).length) return [];
        return records
            .filter(r => fileStatuses[r.doc] === true && fileMetadata[r.doc]?.createdDateTime)
            .sort((a, b) => (fileMetadata[b.doc].createdDateTime || "").localeCompare(fileMetadata[a.doc].createdDateTime || ""))
            .slice(0, 100)
            .map(r => ({ record: r, meta: fileMetadata[r.doc] }));
    }, [records, fileMetadata, fileStatuses]);

    // Helper to classify partner into group
    const getPartnerGroup = (partner: string) => {
        const p = (partner || "").toUpperCase();
        if (p === "GORKEM") return "GORKEM";
        if (p === "RSCC") return "RSCC";
        return "OTHERS";
    };

    // Metrics split by partner group and source — based on ALL fetched records (not filtered)
    const metrics = useMemo(() => {
        const empty = { total: 0, checked: 0, missing: 0, uploaded: 0, totalAmt: 0, checkedAmt: 0, missingAmt: 0, uploadedAmt: 0 };
        const makeGroup = () => ({ hq: { ...empty }, bag: { ...empty }, all: { ...empty } });
        if (!records) return { GORKEM: makeGroup(), RSCC: makeGroup(), OTHERS: makeGroup() };

        const groups: Record<string, ReturnType<typeof makeGroup>> = {
            GORKEM: makeGroup(),
            RSCC: makeGroup(),
            OTHERS: makeGroup(),
        };

        for (const r of records) {
            if (cardCostOnly && (Number(r.cost) || 0) <= 0) continue;
            const g = getPartnerGroup(r.partner);
            // HQ source: ANK for GORKEM, ERB for RSCC, either for OTHERS
            const src = r.source?.toUpperCase();
            const isHQ = (g === "GORKEM" && src === "ANK") || (g === "RSCC" && src === "ERB") || (g === "OTHERS" && (src === "ANK" || src === "ERB"));
            const isBAG = src === "BAG";
            const bucket = isHQ ? "hq" : isBAG ? "bag" : "hq"; // default to hq for unknown

            const amt = Math.abs(Number(r.usd_degeri) || 0);
            groups[g][bucket].total++;
            groups[g].all.total++;
            groups[g][bucket].totalAmt += amt;
            groups[g].all.totalAmt += amt;
            const status = fileStatuses[r.doc];
            if (status !== undefined) {
                groups[g][bucket].checked++;
                groups[g].all.checked++;
                groups[g][bucket].checkedAmt += amt;
                groups[g].all.checkedAmt += amt;
                if (status) {
                    groups[g][bucket].uploaded++;
                    groups[g].all.uploaded++;
                    groups[g][bucket].uploadedAmt += amt;
                    groups[g].all.uploadedAmt += amt;
                } else {
                    groups[g][bucket].missing++;
                    groups[g].all.missing++;
                    groups[g][bucket].missingAmt += amt;
                    groups[g].all.missingAmt += amt;
                }
            }
        }

        return groups;
    }, [records, fileStatuses, cardCostOnly]);

    // PDF download handler
    const handleDownloadPdf = async () => {
        if (!filteredRecords.length) return;
        const { default: jsPDF } = await import("jspdf");
        const autoTable = (await import("jspdf-autotable")).default;
        const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

        // Load a Unicode-compatible font for Turkish characters
        try {
            const fontResp = await fetch("https://cdn.jsdelivr.net/fontsource/fonts/noto-sans@latest/latin-ext-400-normal.ttf");
            if (fontResp.ok) {
                const fontBuf = await fontResp.arrayBuffer();
                const fontBase64 = btoa(String.fromCharCode(...new Uint8Array(fontBuf)));
                doc.addFileToVFS("NotoSans-Regular.ttf", fontBase64);
                doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
                doc.addFileToVFS("NotoSans-Bold.ttf", fontBase64);
                doc.addFont("NotoSans-Bold.ttf", "NotoSans", "bold");
                doc.setFont("NotoSans");
            }
        } catch { /* fallback to default font */ }

        // Status labels
        const statusUploaded = lang === "tr" ? "Yuklu" : "Uploaded";
        const statusMissing = lang === "tr" ? "Eksik" : "Missing";

        // Header
        doc.setFontSize(14);
        doc.text(t.title, 14, 15);
        doc.setFontSize(10);
        if (contextLabel) doc.text(contextLabel, 14, 22);

        // Table
        const head = [["#", t.date, t.code, t.project, t.source, t.partner, t.vendor, t.description, t.amount, t.transType, t.cost, t.status]];
        const body = filteredRecords.map((r, i) => [
            i + 1,
            formatDate(r.date),
            r.uniquecode,
            r.projekodu,
            r.source,
            r.partner || "-",
            r.carifirma || "",
            r.aciklama || "",
            formatCurrency(Number(r.usd_degeri) || 0),
            r.islemturu || "-",
            Number(r.cost) || 0,
            fileStatuses[r.doc] === undefined ? "-" : fileStatuses[r.doc] ? statusUploaded : statusMissing,
        ]);

        const totalAmt = filteredRecords.reduce((s, r) => s + Math.abs(Number(r.usd_degeri) || 0), 0);
        body.push(["", "", "", "", "", "", "", t.totalAmount, formatCurrency(totalAmt), "", "", ""]);

        autoTable(doc, {
            head,
            body,
            startY: contextLabel ? 27 : 20,
            styles: { fontSize: 7, cellPadding: 1.5, font: "NotoSans" },
            headStyles: { fillColor: [63, 63, 70], fontSize: 7 },
            columnStyles: {
                0: { cellWidth: 8 },
                7: { cellWidth: 40 },
                8: { halign: "right" },
                10: { halign: "right" },
            },
            didParseCell: (data: any) => {
                // Bold the total row
                if (data.row.index === body.length - 1) {
                    data.cell.styles.fontStyle = "bold";
                }
                // Color the status column
                if (data.column.index === 11 && data.section === "body" && data.row.index < body.length - 1) {
                    const val = data.cell.raw;
                    if (val === statusMissing) {
                        data.cell.styles.textColor = [220, 38, 38];
                    } else if (val === statusUploaded) {
                        data.cell.styles.textColor = [22, 163, 74];
                    }
                }
            },
        });

        const filename = `documents-${year}${monthFilter !== "all" ? `-${monthFilter.padStart(2, "0")}` : ""}.pdf`;
        doc.save(filename);
    };

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
                setUploadResult({ success: true, message: `${t.uploaded}: ${result.name}` });
                setFileStatuses((prev) => ({ ...prev, [uploadRecord.doc]: true }));
            } else {
                setUploadResult({ success: false, message: result.error || t.uploadFailed });
            }
        } catch (err) {
            setUploadResult({ success: false, message: t.networkError });
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

    const hasTableFilters = tableSourceFilter.length > 0 || tableProjectFilter.length > 0 || tablePartnerFilter.length > 0 || statusFilter.length > 0 || amountFilter !== "all" || transTypeFilter.length > 0 || costFilter.length > 0 || dateFrom || dateTo || searchQuery.trim();

    // Clear all table-level filters
    const clearAllFilters = useCallback(() => {
        setTableSourceFilter([]);
        setTableProjectFilter([]);
        setTablePartnerFilter([]);
        setStatusFilter([]);
        setAmountFilter("all");
        setTransTypeFilter([]);
        setCostFilter([]);
        setSearchQuery("");
        setDateFrom("");
        setDateTo("");
        setPage(0);
    }, []);

    // Handle view file details
    const handleViewFile = useCallback(async (record: DocumentRecord) => {
        setViewRecord(record);
        setThumbnailUrl(null);
        setThumbnailLoading(true);

        const meta = fileMetadata[record.doc];
        if (meta?.id) {
            try {
                const resp = await fetch(`/api/documents/thumbnail?itemId=${encodeURIComponent(meta.id)}`);
                if (resp.ok) {
                    const data = await resp.json();
                    setThumbnailUrl(data.large || data.medium || data.small || null);
                }
            } catch {
                // Silently fail — thumbnail is optional
            }
        }
        setThumbnailLoading(false);
    }, [fileMetadata]);

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
                        disabled={isLoading || checking}
                        className="flex-1 sm:flex-none sm:min-w-[180px] bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-lg shadow-indigo-500/25 h-10"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                {t.loading}
                            </>
                        ) : checking ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                {t.checking} {checkProgress}
                            </>
                        ) : (
                            <>
                                <Download className="h-4 w-4 mr-2" />
                                {t.bringData}
                            </>
                        )}
                    </Button>

                    {checking && !isLoading && (
                        <div className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {t.checking} {checkProgress}
                        </div>
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

                {/* Summary cards — based on ALL fetched records */}
                {records && (
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            {contextLabel && (
                                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                                    {contextLabel}
                                </p>
                            )}
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={cardCostOnly}
                                        onChange={(e) => setCardCostOnly(e.target.checked)}
                                        className="rounded border-zinc-300 dark:border-zinc-600 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                                    />
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400">{t.costPaymentOnly}</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={cardShowAmounts}
                                        onChange={(e) => setCardShowAmounts(e.target.checked)}
                                        className="rounded border-zinc-300 dark:border-zinc-600 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                                    />
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400">{t.showAsTotalAmounts}</span>
                                </label>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {([
                                { label: t.totalRecords, key: "total" as const, amtKey: "totalAmt" as const, color: "indigo" as const },
                                { label: t.checked, key: "checked" as const, amtKey: "checkedAmt" as const, color: "amber" as const },
                                { label: t.uploaded, key: "uploaded" as const, amtKey: "uploadedAmt" as const, color: "emerald" as const },
                            ]).map(({ label, key, amtKey, color }) => {
                                const cols = [t.hq, t.bag, t.total];
                                const gk = metrics.GORKEM;
                                const rs = metrics.RSCC;
                                const ot = metrics.OTHERS;
                                const k = cardShowAmounts ? amtKey : key;
                                const totalHQ = gk.hq[k] + rs.hq[k] + ot.hq[k];
                                const totalBAG = gk.bag[k] + rs.bag[k] + ot.bag[k];
                                const totalAll = gk.all[k] + rs.all[k] + ot.all[k];
                                const fmt = cardShowAmounts ? fmtCompact : (v: number) => v.toLocaleString();
                                return (
                                    <SummaryCard
                                        key={key}
                                        label={label}
                                        color={color}
                                        columns={cols}
                                        rows={[
                                            { name: "GORKEM", values: [fmt(gk.hq[k]), fmt(gk.bag[k]), fmt(gk.all[k])] },
                                            { name: "RSCC", values: [fmt(rs.hq[k]), fmt(rs.bag[k]), fmt(rs.all[k])] },
                                            { name: t.others, values: [fmt(ot.hq[k]), fmt(ot.bag[k]), fmt(ot.all[k])] },
                                            { name: t.total, values: [fmt(totalHQ), fmt(totalBAG), fmt(totalAll)], bold: true },
                                        ]}
                                    />
                                );
                            })}
                            {(() => {
                                const pct = (m: number, tot: number) => tot > 0 ? `${Math.round((m / tot) * 100)}%` : "—";
                                const gk = metrics.GORKEM;
                                const rs = metrics.RSCC;
                                const ot = metrics.OTHERS;
                                const mk = cardShowAmounts ? "missingAmt" as const : "missing" as const;
                                const tk = cardShowAmounts ? "totalAmt" as const : "total" as const;
                                const fmt = cardShowAmounts ? fmtCompact : (v: number) => v.toLocaleString();
                                const totalHQ = gk.hq[mk] + rs.hq[mk] + ot.hq[mk];
                                const totalBAG = gk.bag[mk] + rs.bag[mk] + ot.bag[mk];
                                const totalAll = gk.all[mk] + rs.all[mk] + ot.all[mk];
                                const totalHQT = gk.hq[tk] + rs.hq[tk] + ot.hq[tk];
                                const totalBAGT = gk.bag[tk] + rs.bag[tk] + ot.bag[tk];
                                const totalAllT = gk.all[tk] + rs.all[tk] + ot.all[tk];
                                return (
                                    <SummaryCard
                                        label={t.missing}
                                        color="rose"
                                        columns={[t.hq, t.bag, t.total]}
                                        rows={[
                                            { name: "GORKEM", values: [fmt(gk.hq[mk]), fmt(gk.bag[mk]), fmt(gk.all[mk])], suffixes: [pct(gk.hq[mk], gk.hq[tk]), pct(gk.bag[mk], gk.bag[tk]), pct(gk.all[mk], gk.all[tk])] },
                                            { name: "RSCC", values: [fmt(rs.hq[mk]), fmt(rs.bag[mk]), fmt(rs.all[mk])], suffixes: [pct(rs.hq[mk], rs.hq[tk]), pct(rs.bag[mk], rs.bag[tk]), pct(rs.all[mk], rs.all[tk])] },
                                            { name: t.others, values: [fmt(ot.hq[mk]), fmt(ot.bag[mk]), fmt(ot.all[mk])], suffixes: [pct(ot.hq[mk], ot.hq[tk]), pct(ot.bag[mk], ot.bag[tk]), pct(ot.all[mk], ot.all[tk])] },
                                            { name: t.total, values: [fmt(totalHQ), fmt(totalBAG), fmt(totalAll)], bold: true, suffixes: [pct(totalHQ, totalHQT), pct(totalBAG, totalBAGT), pct(totalAll, totalAllT)] },
                                        ]}
                                    />
                                );
                            })()}
                        </div>
                    </div>
                )}

                {/* Activity log — always visible, collapsible */}
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
                        {activityLogOpen ? (
                            <ChevronUp className="h-4 w-4 text-zinc-400" />
                        ) : (
                            <ChevronDown className="h-4 w-4 text-zinc-400" />
                        )}
                    </button>
                    {activityLogOpen && (
                        <div className="p-4 space-y-3">
                            {checkStats ? (
                                <>
                                    {/* Summary row */}
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
                                </>
                            ) : (
                                <p className="text-sm text-zinc-400 dark:text-zinc-500 text-center py-4">
                                    {t.noCheckYet}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Recently uploaded documents — collapsible */}
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
                    <button
                        onClick={() => setRecentUploadsOpen(!recentUploadsOpen)}
                        className="w-full px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-emerald-500" />
                            <h3 className="text-sm font-semibold">{t.recentUploads}</h3>
                            {recentUploads.length > 0 && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                    {recentUploads.length}
                                </Badge>
                            )}
                        </div>
                        {recentUploadsOpen ? (
                            <ChevronUp className="h-4 w-4 text-zinc-400" />
                        ) : (
                            <ChevronDown className="h-4 w-4 text-zinc-400" />
                        )}
                    </button>
                    {recentUploadsOpen && (
                        <div className="p-0">
                            {recentUploads.length > 0 ? (
                                <div className="max-h-80 overflow-y-auto overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-800/50">
                                            <tr className="border-b border-zinc-200 dark:border-zinc-800">
                                                <th className="px-3 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400 w-8">#</th>
                                                <th className="px-3 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">{t.created}</th>
                                                <th className="px-3 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">{t.code}</th>
                                                <th className="px-3 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">{t.project}</th>
                                                <th className="px-3 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">{t.source}</th>
                                                <th className="px-3 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">{t.partner}</th>
                                                <th className="px-3 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">{t.vendor}</th>
                                                <th className="px-3 py-2 text-right font-medium text-zinc-500 dark:text-zinc-400">{t.amount}</th>
                                                <th className="px-3 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">{t.uploadedBy}</th>
                                                <th className="px-3 py-2 text-center font-medium text-zinc-500 dark:text-zinc-400 w-10">{t.action}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recentUploads.map((item, idx) => (
                                                <tr key={item.record.doc} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                                                    <td className="px-3 py-2 text-zinc-400 dark:text-zinc-500 tabular-nums">{idx + 1}</td>
                                                    <td className="px-3 py-2 tabular-nums whitespace-nowrap text-zinc-600 dark:text-zinc-400">{formatDate(item.meta.createdDateTime)}</td>
                                                    <td className="px-3 py-2 font-mono whitespace-nowrap font-medium">{item.record.uniquecode}</td>
                                                    <td className="px-3 py-2"><Badge variant="outline" className="font-mono text-[10px]">{item.record.projekodu}</Badge></td>
                                                    <td className="px-3 py-2"><Badge variant="secondary" className="text-[10px]">{item.record.source}</Badge></td>
                                                    <td className="px-3 py-2">
                                                        {item.record.partner ? (
                                                            <Badge variant="outline" className="text-[10px]">{item.record.partner}</Badge>
                                                        ) : (
                                                            <span className="text-zinc-300 dark:text-zinc-700">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2 max-w-[180px] truncate text-zinc-600 dark:text-zinc-400">{item.record.carifirma}</td>
                                                    <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">{formatCurrency(Math.abs(item.record.usd_degeri))}</td>
                                                    <td className="px-3 py-2 text-emerald-600 dark:text-emerald-400 max-w-[120px] truncate">{item.meta.createdBy || "—"}</td>
                                                    <td className="px-3 py-2 text-center">
                                                        <button
                                                            onClick={() => handleViewFile(item.record)}
                                                            className="inline-flex items-center justify-center h-6 w-6 rounded-md border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-indigo-600 hover:border-indigo-300 dark:hover:text-indigo-400 dark:hover:border-indigo-700 transition-colors"
                                                            title={t.fileDetails}
                                                        >
                                                            <Eye className="h-3 w-3" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-sm text-zinc-400 dark:text-zinc-500 text-center py-4">
                                    {t.noUploadsYet}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Table section with sticky filters + header */}
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
                    {/* Sticky table filters — outside the card so sticky works */}
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

                                {checkedAll && (
                                    <CompactMultiSelect
                                        options={[
                                            { label: t.missing, value: "missing" },
                                            { label: t.uploaded, value: "uploaded" },
                                        ]}
                                        selected={statusFilter}
                                        onChange={(v) => { setStatusFilter(v); setPage(0); }}
                                        placeholder={t.allStatus}
                                        className="w-[140px]"
                                    />
                                )}
                            </div>

                            {/* Filter row 2: quick toggles + date range + search */}
                            <div className="flex flex-wrap items-center gap-2">
                                {checkedAll && ([
                                    { key: "urgent1" as const, label: t.urgent1, amount: "above10k" as const },
                                    { key: "urgent2" as const, label: t.urgent2, amount: "5k-10k" as const },
                                ].map(({ key, label, amount }) => {
                                    const isActive = tablePartnerFilter.length === 1 && tablePartnerFilter[0] === "GORKEM" && costFilter.length === 1 && costFilter[0] === "positive" && statusFilter.length === 1 && statusFilter[0] === "missing" && amountFilter === amount;
                                    return (
                                        <button
                                            key={key}
                                            onClick={() => {
                                                if (isActive) {
                                                    setTablePartnerFilter([]);
                                                    setCostFilter([]);
                                                    setStatusFilter([]);
                                                    setAmountFilter("all");
                                                } else {
                                                    setTablePartnerFilter(["GORKEM"]);
                                                    setCostFilter(["positive"]);
                                                    setStatusFilter(["missing"]);
                                                    setAmountFilter(amount);
                                                }
                                                setPage(0);
                                            }}
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                                                isActive
                                                    ? "bg-amber-50 dark:bg-amber-950/30 border-amber-400 dark:border-amber-700 text-amber-700 dark:text-amber-300"
                                                    : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-amber-400 dark:hover:border-amber-600"
                                            }`}
                                        >
                                            <AlertCircle className="h-3 w-3" />
                                            {label}
                                        </button>
                                    );
                                }))}

                                {checkedAll && (
                                    <button
                                        onClick={() => { setStatusFilter(statusFilter.length === 1 && statusFilter[0] === "missing" ? [] : ["missing"]); setPage(0); }}
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                                            statusFilter.length === 1 && statusFilter[0] === "missing"
                                                ? "bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300"
                                                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-rose-300 dark:hover:border-rose-700"
                                        }`}
                                    >
                                        <XCircle className="h-3 w-3" />
                                        {t.showMissing}
                                    </button>
                                )}
                                {([
                                    { key: "above10k" as const, label: t.above10k },
                                    { key: "5k-10k" as const, label: t.range5k10k },
                                    { key: "below5k" as const, label: t.below5k },
                                ]).map(({ key, label }) => (
                                    <button
                                        key={key}
                                        onClick={() => { setAmountFilter(amountFilter === key ? "all" : key); setPage(0); }}
                                        className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                                            amountFilter === key
                                                ? "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300"
                                                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-indigo-300 dark:hover:border-indigo-700"
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}

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

                                {/* Clear filters button */}
                                {hasTableFilters && (
                                    <button
                                        onClick={clearAllFilters}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                    >
                                        <FilterX className="h-3 w-3" />
                                        {t.clearFilters}
                                    </button>
                                )}

                                {/* Filtered count */}
                                {hasTableFilters && records && (
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

                                {/* PDF download */}
                                {records && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 px-2 text-xs gap-1"
                                        onClick={handleDownloadPdf}
                                    >
                                        <Download className="h-3.5 w-3.5" />
                                        {t.downloadPdf}
                                    </Button>
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

                    {/* Table card — rounded bottom only, connects to filter bar above */}
                    <div className="rounded-b-xl border border-zinc-200 dark:border-zinc-800 border-t-0 bg-white dark:bg-zinc-900 shadow-sm overflow-x-clip">
                            <table className="w-full min-w-[1100px] text-sm">
                                <thead className="sticky z-10 bg-zinc-50 dark:bg-zinc-900/50" style={{ top: filterBarHeight + 64 }}>
                                    <tr
                                        className="border-b border-zinc-200 dark:border-zinc-800"
                                    >
                                        <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400 w-12">#</th>
                                        <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">{t.date}</th>
                                        <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">{t.code}</th>
                                        <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">{t.project}</th>
                                        <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">{t.source}</th>
                                        <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">{t.partner}</th>
                                        <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400 hidden lg:table-cell">{t.vendor}</th>
                                        <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400 hidden xl:table-cell">{t.description}</th>
                                        <th className="px-4 py-3 text-right font-medium text-zinc-500 dark:text-zinc-400">{t.amount}</th>
                                        <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400 hidden lg:table-cell">{t.transType}</th>
                                        <th className="px-4 py-3 text-right font-medium text-zinc-500 dark:text-zinc-400 hidden lg:table-cell">{t.cost}</th>
                                        <th className="px-4 py-3 text-center font-medium text-zinc-500 dark:text-zinc-400 w-20">{t.status}</th>
                                        <th className="px-4 py-3 text-center font-medium text-zinc-500 dark:text-zinc-400 w-32">{t.action}</th>
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
                                                <td className="px-4 py-3">
                                                    {record.partner ? (
                                                        <Badge variant="outline" className="text-xs">{record.partner}</Badge>
                                                    ) : (
                                                        <span className="text-zinc-300 dark:text-zinc-700">—</span>
                                                    )}
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
                                                <td className="px-4 py-3 hidden lg:table-cell">
                                                    {record.islemturu ? (
                                                        <Badge variant="outline" className="text-xs font-mono">{record.islemturu}</Badge>
                                                    ) : (
                                                        <span className="text-zinc-300 dark:text-zinc-700">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap hidden lg:table-cell">
                                                    {Number(record.cost) || 0}
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
                                                        {status === true && fileMetadata[record.doc]?.id ? (
                                                            <button
                                                                onClick={() => handleViewFile(record)}
                                                                className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-indigo-600 hover:border-indigo-300 dark:hover:text-indigo-400 dark:hover:border-indigo-700 transition-colors"
                                                                title={t.fileDetails}
                                                            >
                                                                <Eye className="h-3.5 w-3.5" />
                                                            </button>
                                                        ) : (
                                                            <a
                                                                href={record.doc}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-indigo-600 hover:border-indigo-300 dark:hover:text-indigo-400 dark:hover:border-indigo-700 transition-colors"
                                                                title={t.viewDocument}
                                                            >
                                                                <ExternalLink className="h-3.5 w-3.5" />
                                                            </a>
                                                        )}
                                                        {status === false && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => { setUploadRecord(record); setUploadResult(null); setSelectedFile(null); if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }}
                                                                className="h-7 px-2 text-xs border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                                            >
                                                                <Upload className="h-3 w-3 mr-1" />
                                                                {t.upload}
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {pagedRecords.length === 0 && (
                                        <tr>
                                            <td colSpan={13} className="px-4 py-12 text-center text-zinc-400">
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

                {/* Upload Dialog */}
                <Dialog open={!!uploadRecord} onOpenChange={(open) => { if (!open) closeDialog(); }}>
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-indigo-500" />
                                {t.uploadDocument}
                            </DialogTitle>
                            <DialogDescription>
                                {t.uploadPdfFor} <span className="font-mono font-semibold">{uploadRecord?.uniquecode}</span>
                            </DialogDescription>
                        </DialogHeader>

                        {uploadRecord && (
                            <div className="space-y-4">
                                {/* Record details */}
                                <div className="grid grid-cols-2 gap-3 text-sm rounded-lg bg-zinc-50 dark:bg-zinc-800/50 p-4">
                                    <div>
                                        <span className="text-zinc-500 dark:text-zinc-400">{t.vendorLabel}</span>
                                        <p className="font-medium truncate">{uploadRecord.carifirma}</p>
                                    </div>
                                    <div>
                                        <span className="text-zinc-500 dark:text-zinc-400">{t.amountLabel}</span>
                                        <p className="font-medium">{formatCurrency(Number(uploadRecord.usd_degeri) || 0)}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="text-zinc-500 dark:text-zinc-400">{t.descriptionLabel}</span>
                                        <p className="font-medium">{uploadRecord.aciklama}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="text-zinc-500 dark:text-zinc-400">{t.targetFilename}</span>
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
                                            <p className="text-zinc-500 dark:text-zinc-400">{t.dragDrop}</p>
                                            <p className="text-xs text-zinc-400">{t.onlyPdf}</p>
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
                                            <p className="p-4 text-center text-zinc-500">{t.pdfNotAvailable}</p>
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
                                        <AlertTitle>{uploadResult.success ? t.success : t.error}</AlertTitle>
                                        <AlertDescription>{uploadResult.message}</AlertDescription>
                                    </Alert>
                                )}
                            </div>
                        )}

                        <DialogFooter>
                            <Button variant="outline" onClick={closeDialog}>
                                {uploadResult?.success ? t.close : t.cancel}
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
                                            {t.uploading}
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="h-4 w-4 mr-2" />
                                            {t.uploadToSharePoint}
                                        </>
                                    )}
                                </Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* View File Details Dialog */}
                <Dialog open={!!viewRecord} onOpenChange={(open) => { if (!open) { setViewRecord(null); setThumbnailUrl(null); } }}>
                    <DialogContent className="sm:max-w-3xl">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Eye className="h-5 w-5 text-indigo-500" />
                                {t.fileDetails}
                            </DialogTitle>
                            <DialogDescription>
                                <span className="font-mono font-semibold">{viewRecord?.uniquecode}</span>
                            </DialogDescription>
                        </DialogHeader>

                        {viewRecord && (() => {
                            const meta = fileMetadata[viewRecord.doc];
                            return (
                                <div className="flex flex-col sm:flex-row gap-4">
                                    {/* Left column — record data + metadata */}
                                    <div className="flex-1 min-w-0 space-y-4">
                                        {/* Record data */}
                                        <div className="grid grid-cols-2 gap-3 text-sm rounded-lg bg-zinc-50 dark:bg-zinc-800/50 p-4">
                                            <div>
                                                <span className="text-zinc-500 dark:text-zinc-400">{t.date}</span>
                                                <p className="font-medium">{formatDate(viewRecord.date)}</p>
                                            </div>
                                            <div>
                                                <span className="text-zinc-500 dark:text-zinc-400">{t.code}</span>
                                                <p className="font-medium font-mono">{viewRecord.uniquecode}</p>
                                            </div>
                                            <div>
                                                <span className="text-zinc-500 dark:text-zinc-400">{t.project}</span>
                                                <p className="font-medium">{viewRecord.projekodu}</p>
                                            </div>
                                            <div>
                                                <span className="text-zinc-500 dark:text-zinc-400">{t.source}</span>
                                                <p className="font-medium">{viewRecord.source}</p>
                                            </div>
                                            <div>
                                                <span className="text-zinc-500 dark:text-zinc-400">{t.vendor}</span>
                                                <p className="font-medium truncate">{viewRecord.carifirma || "\u2014"}</p>
                                            </div>
                                            <div>
                                                <span className="text-zinc-500 dark:text-zinc-400">{t.amount}</span>
                                                <p className="font-medium">{formatCurrency(Number(viewRecord.usd_degeri) || 0)}</p>
                                            </div>
                                            <div className="col-span-2">
                                                <span className="text-zinc-500 dark:text-zinc-400">{t.description}</span>
                                                <p className="font-medium">{viewRecord.aciklama || "\u2014"}</p>
                                            </div>
                                        </div>

                                        {/* SharePoint metadata */}
                                        {meta && (
                                            <div className="grid grid-cols-2 gap-3 text-sm rounded-lg bg-zinc-50 dark:bg-zinc-800/50 p-4">
                                                <div>
                                                    <span className="text-zinc-500 dark:text-zinc-400">{t.created}</span>
                                                    <p className="font-medium">{meta.createdDateTime ? new Date(meta.createdDateTime).toLocaleString() : "\u2014"}</p>
                                                </div>
                                                <div>
                                                    <span className="text-zinc-500 dark:text-zinc-400">{t.modified}</span>
                                                    <p className="font-medium">{meta.lastModifiedDateTime ? new Date(meta.lastModifiedDateTime).toLocaleString() : "\u2014"}</p>
                                                </div>
                                                <div>
                                                    <span className="text-zinc-500 dark:text-zinc-400">{t.uploadedBy}</span>
                                                    <p className="font-medium">{meta.createdBy || "\u2014"}</p>
                                                </div>
                                                <div>
                                                    <span className="text-zinc-500 dark:text-zinc-400">{t.fileSize}</span>
                                                    <p className="font-medium">{meta.size ? `${(meta.size / 1024).toFixed(1)} KB` : "\u2014"}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right column — thumbnail */}
                                    <div className="sm:w-[45%] shrink-0">
                                        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-center min-h-[200px] h-full">
                                            {thumbnailLoading ? (
                                                <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
                                            ) : thumbnailUrl ? (
                                                <img src={thumbnailUrl} alt={getFilename(viewRecord.doc)} className="max-w-full max-h-[400px] object-contain" />
                                            ) : (
                                                <div className="text-center py-8 text-zinc-400">
                                                    <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                                    <p className="text-sm">{t.noPreview}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        <DialogFooter>
                            <a
                                href={viewRecord?.doc}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white transition-colors"
                            >
                                <ExternalLink className="h-4 w-4" />
                                {t.openInSharePoint}
                            </a>
                            <Button variant="outline" onClick={() => { setViewRecord(null); setThumbnailUrl(null); }}>
                                {t.close}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </main>
        </div>
    );
}

// Summary card with partner breakdown rows
function SummaryCard({ label, color, columns, rows }: {
    label: string;
    color: "indigo" | "emerald" | "amber" | "rose";
    columns: string[];
    rows: { name: string; values: string[]; bold?: boolean; suffixes?: string[] }[];
}) {
    const gradients = {
        indigo: "from-indigo-500 to-violet-600",
        emerald: "from-emerald-500 to-teal-600",
        amber: "from-amber-500 to-orange-600",
        rose: "from-rose-500 to-pink-600",
    };

    return (
        <div className="relative overflow-hidden rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm p-4">
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradients[color]}`} />
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">{label}</p>
            {/* Column headers */}
            <div className="flex items-center gap-1 mb-1">
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 w-16 shrink-0" />
                {columns.map((col) => (
                    <span key={col} className="text-[10px] text-zinc-400 dark:text-zinc-500 flex-1 text-right">{col}</span>
                ))}
            </div>
            <div className="space-y-0.5">
                {rows.map((row) => (
                    <div key={row.name} className={`flex items-center gap-1 ${row.bold ? "border-t border-zinc-200 dark:border-zinc-800 pt-1 mt-1" : ""}`}>
                        <span className={`text-xs w-16 shrink-0 ${row.bold ? "font-semibold text-zinc-700 dark:text-zinc-300" : "text-zinc-500 dark:text-zinc-400"}`}>{row.name}</span>
                        {row.values.map((val, i) => (
                            <span key={i} className={`flex-1 text-right tabular-nums ${row.bold ? "text-sm font-bold" : "text-xs font-medium"}`}>
                                {val}
                                {row.suffixes?.[i] && <span className="text-[10px] font-normal text-zinc-400 dark:text-zinc-500 ml-0.5">({row.suffixes[i]})</span>}
                            </span>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
