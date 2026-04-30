"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { AlertCircle, FileSpreadsheet, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CompactMultiSelect } from "@/components/ui/compact-multi-select";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const PROJECT_META: Record<string, { desc: string; order: number }> = {
    HQ: { desc: "INFO CENTER HQ", order: 1 },
    ADM: { desc: "INFO CENTER ADMIN", order: 2 },
    HQAUX: { desc: "INFO CENTER AUX", order: 3 },
    SRY2: { desc: "PALACE-PH-2", order: 4 },
    OBGH: { desc: "GUEST HOUSE REN. PH 1", order: 5 },
    SRY: { desc: "PALACE-PH-1", order: 6 },
    THR: { desc: "TAHRIR", order: 7 },
    GAC: { desc: "GENERAL ADMINSTRATIVE", order: 8 },
    DLH: { desc: "DREAMLINE HANGAR", order: 9 },
    ZBS: { desc: "ZIRAAT BAGHDAD BRANCH OFFICE", order: 10 },
    WHP: { desc: "WAITING HALL PALACE", order: 11 },
    NBGH: { desc: "GUEST HOUSE EXTENSION", order: 12 },
    VLL: { desc: "BAKANIN VİLLASI", order: 13 },
    PMO: { desc: "PMO SARAY DIŞINDAKİ BİNA", order: 14 },
    FSC: { desc: "FEDERAL SUPREME COURT", order: 15 },
    DIC: { desc: "DICLE PALACE", order: 16 },
    VLL3: { desc: "RAWAND'IN YAPTIR. VILLA", order: 17 },
    ANG: { desc: "TCBBE", order: 18 },
    MLK: { desc: "KADININ VİLLASI", order: 19 },
    PMO2: { desc: "NAFIZ BEYIN YAPTIGI", order: 20 },
    VBATH: { desc: "LEVENTİN YAPTIĞI VİLLA", order: 21 },
    OGHF: { desc: "OLD GUEST HOUSE FURN.", order: 22 },
};

type Source = "ANK" | "BAG";

interface CostRow {
    yr: number;
    project: string;
    source: string;
    category: string;
    amount: number;
}
interface SpentRow {
    yr: number;
    project: string;
    source: string;
    amount: number;
}
interface ReceivedRow {
    yr: number;
    project: string;
    amount: number;
}
interface CostDetailRow {
    yr: number;
    project: string;
    source: string;
    l1: string;
    l2: string;
    amount: number;
}

interface ReceivedItemRow {
    id: string;
    date: string;
    description: string | null;
    counter_party: string;
    type: string;
    category: string | null;
    is_exchange: boolean;
    project: string;
    original_amount: number;
    currency: string;
    currency_rate: number;
    amount: number; // usd_equal
    yr: number;
}

interface ApiResponse {
    cost: CostRow[];
    spent: SpentRow[];
    received: ReceivedRow[];
    costDetail: CostDetailRow[];
    receivedItems: ReceivedItemRow[];
}

function fmt(n: number): string {
    if (!isFinite(n) || n === 0) return "-";
    return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

interface PerSourceTotals {
    material: number;
    labour: number;
    subcontractor: number;
    unclassified: number;
    common: number;
    general: number;
    totalCost: number;
    totalSpent: number;
}

interface ProjectRow {
    project: string;
    desc: string;
    bySource: Record<Source, PerSourceTotals>;
    received: number;
    totalCostProject: number;
    totalSpentProject: number;
    balanceVsCost: number;
    balanceVsSpent: number;
}

const EMPTY_TOTALS = (): PerSourceTotals => ({
    material: 0,
    labour: 0,
    subcontractor: 0,
    unclassified: 0,
    common: 0,
    general: 0,
    totalCost: 0,
    totalSpent: 0,
});

export default function TablesPage() {
    const { data, error, isLoading } = useSWR<ApiResponse>("/api/tables/summary", fetcher, {
        revalidateOnFocus: false,
        dedupingInterval: 60000,
    });

    const allYears = useMemo(() => {
        if (!data) return [] as number[];
        const set = new Set<number>();
        data.cost.forEach((r) => set.add(r.yr));
        data.spent.forEach((r) => set.add(r.yr));
        data.received.forEach((r) => set.add(r.yr));
        return [...set].sort();
    }, [data]);

    // Empty selection = ALL years.
    const [selectedYears, setSelectedYears] = useState<number[]>([]);
    const isAllYears = selectedYears.length === 0;
    const [downloading, setDownloading] = useState(false);

    // Table 2 — project cost breakdown by year
    const [selectedProject2, setSelectedProject2] = useState<string>("HQ");
    const [selectedYears2, setSelectedYears2] = useState<number[]>([]);
    const isAllYears2 = selectedYears2.length === 0;
    const yearAllowed2 = useMemo(
        () => (isAllYears2 ? null : new Set(selectedYears2)),
        [isAllYears2, selectedYears2]
    );

    // Years to render as columns in tables 2/3/4 — derived from the global year
    // list so 2026 (or any year that exists anywhere in the data) shows up even
    // when the current table has no rows for it. Reversed so newest is first.
    const effectiveYears2 = useMemo(() => {
        const list = isAllYears2 ? allYears : allYears.filter((y) => yearAllowed2!.has(y));
        return [...list].reverse();
    }, [allYears, isAllYears2, yearAllowed2]);
    const yearAllowed = useMemo(() => {
        if (isAllYears) return null;
        return new Set(selectedYears);
    }, [isAllYears, selectedYears]);

    const tableRows = useMemo<ProjectRow[]>(() => {
        if (!data) return [];

        // Aggregate cost into per-project, per-source, per-category buckets
        const projectMap: Record<string, Record<Source, PerSourceTotals>> = {};
        const ensure = (project: string, source: Source) => {
            if (!projectMap[project]) projectMap[project] = { ANK: EMPTY_TOTALS(), BAG: EMPTY_TOTALS() };
            return projectMap[project][source];
        };

        data.cost.forEach((r) => {
            if (yearAllowed && !yearAllowed.has(r.yr)) return;
            if (r.source !== "ANK" && r.source !== "BAG") return;
            const t = ensure(r.project, r.source as Source);
            switch (r.category) {
                case "MATERIAL COST":
                    t.material += r.amount;
                    break;
                case "LABOUR COST":
                    t.labour += r.amount;
                    break;
                case "SUBCONTRACTOR":
                    t.subcontractor += r.amount;
                    break;
                case "UNCLASSIFIED COST":
                    t.unclassified += r.amount;
                    break;
                case "COMMON EXPENSES":
                    t.common += r.amount;
                    break;
                case "GENERAL EXPENSES":
                    t.general += r.amount;
                    break;
            }
        });

        data.spent.forEach((r) => {
            if (yearAllowed && !yearAllowed.has(r.yr)) return;
            if (r.source !== "ANK" && r.source !== "BAG") return;
            const t = ensure(r.project, r.source as Source);
            t.totalSpent += r.amount;
        });

        // Compute per-source totalCost
        Object.values(projectMap).forEach((sources) => {
            (Object.values(sources) as PerSourceTotals[]).forEach((t) => {
                t.totalCost = t.material + t.labour + t.subcontractor + t.unclassified + t.common + t.general;
            });
        });

        // Received — per-project (year-filtered)
        const receivedByProject: Record<string, number> = {};
        data.received.forEach((r) => {
            if (yearAllowed && !yearAllowed.has(r.yr)) return;
            receivedByProject[r.project] = (receivedByProject[r.project] || 0) + r.amount;
        });

        const projects = Object.keys(projectMap).sort((a, b) => {
            const oa = PROJECT_META[a]?.order ?? 999;
            const ob = PROJECT_META[b]?.order ?? 999;
            return oa - ob;
        });

        return projects.map((project) => {
            const bySource = projectMap[project];
            const totalCostProject = bySource.ANK.totalCost + bySource.BAG.totalCost;
            const totalSpentProject = bySource.ANK.totalSpent + bySource.BAG.totalSpent;
            const received = receivedByProject[project] || 0;
            return {
                project,
                desc: PROJECT_META[project]?.desc || project,
                bySource,
                received,
                totalCostProject,
                totalSpentProject,
                balanceVsCost: received - totalCostProject,
                balanceVsSpent: received - totalSpentProject,
            };
        });
    }, [data, yearAllowed]);

    // Table 2 — per-(year, source) cost breakdown for the selected project (or ALL)
    const projectBreakdown = useMemo(() => {
        if (!data) return null;
        const allProjects = selectedProject2 === "__ALL__";
        type CatTotals = {
            material: number;
            labour: number;
            subcontractor: number;
            unclassified: number;
            common: number;
            general: number;
        };
        type YearBlock = { ANK: CatTotals; BAG: CatTotals };
        const empty = (): CatTotals => ({
            material: 0,
            labour: 0,
            subcontractor: 0,
            unclassified: 0,
            common: 0,
            general: 0,
        });

        const yearMap: Record<number, YearBlock> = {};
        const ensure = (yr: number, src: Source) => {
            if (!yearMap[yr]) yearMap[yr] = { ANK: empty(), BAG: empty() };
            return yearMap[yr][src];
        };

        data.cost.forEach((r) => {
            if (!allProjects && r.project !== selectedProject2) return;
            if (yearAllowed2 && !yearAllowed2.has(r.yr)) return;
            if (r.source !== "ANK" && r.source !== "BAG") return;
            const t = ensure(r.yr, r.source as Source);
            switch (r.category) {
                case "MATERIAL COST":
                    t.material += r.amount;
                    break;
                case "LABOUR COST":
                    t.labour += r.amount;
                    break;
                case "SUBCONTRACTOR":
                    t.subcontractor += r.amount;
                    break;
                case "UNCLASSIFIED COST":
                    t.unclassified += r.amount;
                    break;
                case "COMMON EXPENSES":
                    t.common += r.amount;
                    break;
                case "GENERAL EXPENSES":
                    t.general += r.amount;
                    break;
            }
        });

        const years = Object.keys(yearMap).map(Number).sort((a, b) => a - b);

        // TOTAL across (selected) years
        const total: YearBlock = { ANK: empty(), BAG: empty() };
        years.forEach((yr) => {
            (Object.keys(total.ANK) as (keyof CatTotals)[]).forEach((k) => {
                total.ANK[k] += yearMap[yr].ANK[k];
                total.BAG[k] += yearMap[yr].BAG[k];
            });
        });

        return { yearMap, years, total };
    }, [data, selectedProject2, yearAllowed2]);

    // Table 3 — detailed lvl_2 cost breakdown for the selected project (or ALL),
    // shares project + year selectors with table 2.
    const projectCostDetail = useMemo(() => {
        if (!data || !data.costDetail) return null;
        const allProjects = selectedProject2 === "__ALL__";

        type SrcAmts = { ANK: number; BAG: number };
        type YearAmts = Record<number, SrcAmts>; // yr -> SrcAmts
        // l1 -> l2 -> { yr -> {ANK,BAG}, total: {ANK,BAG} }
        const map: Record<string, Record<string, { perYear: YearAmts; total: SrcAmts }>> = {};
        const yearsSet = new Set<number>();

        data.costDetail.forEach((r) => {
            if (!allProjects && r.project !== selectedProject2) return;
            if (yearAllowed2 && !yearAllowed2.has(r.yr)) return;
            if (r.source !== "ANK" && r.source !== "BAG") return;
            yearsSet.add(r.yr);
            const l1 = r.l1 || "(empty)";
            const l2 = r.l2 || "(empty)";
            if (!map[l1]) map[l1] = {};
            if (!map[l1][l2]) map[l1][l2] = { perYear: {}, total: { ANK: 0, BAG: 0 } };
            const node = map[l1][l2];
            if (!node.perYear[r.yr]) node.perYear[r.yr] = { ANK: 0, BAG: 0 };
            node.perYear[r.yr][r.source as Source] += r.amount;
            node.total[r.source as Source] += r.amount;
        });

        const years = [...yearsSet].sort((a, b) => a - b);

        // Order lvl_1 sections like the source image: MATERIAL, LABOUR, COMMON, GENERAL, UNCLASSIFIED
        const L1_ORDER = ["MATERIAL COST", "LABOUR COST", "COMMON EXPENSES", "GENERAL EXPENSES", "UNCLASSIFIED COST"];
        const sections = L1_ORDER.filter((l1) => map[l1]).concat(
            Object.keys(map).filter((l1) => !L1_ORDER.includes(l1)).sort()
        );

        const result = sections.map((l1) => {
            const items = Object.entries(map[l1])
                .map(([l2, v]) => ({ l2, ...v }))
                .sort((a, b) => a.l2.localeCompare(b.l2));
            // Section subtotal across all l2 entries
            const subtotal = {
                perYear: {} as YearAmts,
                total: { ANK: 0, BAG: 0 } as SrcAmts,
            };
            items.forEach((it) => {
                subtotal.total.ANK += it.total.ANK;
                subtotal.total.BAG += it.total.BAG;
                Object.entries(it.perYear).forEach(([yrStr, sa]) => {
                    const yr = Number(yrStr);
                    if (!subtotal.perYear[yr]) subtotal.perYear[yr] = { ANK: 0, BAG: 0 };
                    subtotal.perYear[yr].ANK += sa.ANK;
                    subtotal.perYear[yr].BAG += sa.BAG;
                });
            });
            return { l1, items, subtotal };
        });

        return { sections: result, years };
    }, [data, selectedProject2, yearAllowed2]);

    // Table 4 — chronological received-items list, sharing table 2's selectors
    const receivedList = useMemo(() => {
        if (!data || !data.receivedItems) return null;
        const allProjects = selectedProject2 === "__ALL__";
        const items = data.receivedItems
            .filter((r) => {
                if (!allProjects && r.project !== selectedProject2) return false;
                if (yearAllowed2 && !yearAllowed2.has(r.yr)) return false;
                return true;
            })
            .slice()
            .sort((a, b) => {
                // Reverse chronological — latest first.
                const da = a.date ? new Date(a.date).getTime() : 0;
                const db = b.date ? new Date(b.date).getTime() : 0;
                if (db !== da) return db - da;
                return b.id.localeCompare(a.id);
            });
        const yearsSet = new Set<number>();
        items.forEach((r) => yearsSet.add(r.yr));
        const years = [...yearsSet].sort((a, b) => a - b);
        const total = items.reduce((s, r) => s + Number(r.amount || 0), 0);
        const totalsByYear: Record<number, number> = {};
        years.forEach((y) => (totalsByYear[y] = 0));
        items.forEach((r) => {
            totalsByYear[r.yr] = (totalsByYear[r.yr] || 0) + Number(r.amount || 0);
        });
        return { items, years, total, totalsByYear };
    }, [data, selectedProject2, yearAllowed2]);

    // Grand totals row
    const grand = useMemo(() => {
        const acc = {
            ANK: EMPTY_TOTALS(),
            BAG: EMPTY_TOTALS(),
            received: 0,
            totalCostProject: 0,
            totalSpentProject: 0,
            balanceVsCost: 0,
            balanceVsSpent: 0,
        };
        tableRows.forEach((r) => {
            (Object.keys(acc.ANK) as (keyof PerSourceTotals)[]).forEach((k) => {
                acc.ANK[k] += r.bySource.ANK[k];
                acc.BAG[k] += r.bySource.BAG[k];
            });
            acc.received += r.received;
            acc.totalCostProject += r.totalCostProject;
            acc.totalSpentProject += r.totalSpentProject;
            acc.balanceVsCost += r.balanceVsCost;
            acc.balanceVsSpent += r.balanceVsSpent;
        });
        return acc;
    }, [tableRows]);

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans">
            <main className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Tables</h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        Reference and reporting tables.
                    </p>
                </div>

                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="w-4 h-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>Failed to load summary table data.</AlertDescription>
                    </Alert>
                )}

                {isLoading && <Skeleton className="h-[400px] w-full rounded-2xl" />}

                {!isLoading && !error && data && (
                    <section className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 shadow-sm overflow-hidden">
                        <div className="px-4 py-3 border-b border-zinc-200/60 dark:border-zinc-800/60 flex flex-wrap items-center gap-3 justify-between">
                            <div>
                                <h2 className="text-base font-semibold">Summary — Cost / Spent / Received / Balance</h2>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                    Per project (ANK + BAG), with per-project Total Received and Balance columns.
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">Year</span>
                                <div className="w-[180px]">
                                    <CompactMultiSelect
                                        options={allYears.map((y) => ({ label: String(y), value: String(y) }))}
                                        selected={selectedYears.map((y) => String(y))}
                                        onChange={(vals) => setSelectedYears(vals.map(Number))}
                                        placeholder="ALL Years"
                                    />
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={async () => {
                                        if (downloading || tableRows.length === 0) return;
                                        setDownloading(true);
                                        try {
                                            const { downloadSummaryExcel } = await import("./summary-excel");
                                            const yearLabel = isAllYears
                                                ? "All Years"
                                                : selectedYears.slice().sort().join(", ");
                                            await downloadSummaryExcel({ rows: tableRows, grand, yearLabel });
                                        } catch (e) {
                                            console.error("Excel export failed:", e);
                                            alert("Excel export failed");
                                        } finally {
                                            setDownloading(false);
                                        }
                                    }}
                                    disabled={downloading || tableRows.length === 0}
                                    className="gap-1.5"
                                >
                                    {downloading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                                    )}
                                    Excel
                                </Button>
                            </div>
                        </div>

                        <div className="overflow-auto max-h-[520px]">
                            <table className="w-full text-[11px] tabular-nums leading-tight border-separate border-spacing-0">
                                <thead>
                                    <tr>
                                        <th rowSpan={2} className="text-left px-2 h-[28px] font-medium text-zinc-700 dark:text-zinc-200 sticky left-0 top-0 z-50 w-[140px] min-w-[140px] max-w-[140px] bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-800 dark:to-zinc-900 border-r border-b border-zinc-300 dark:border-zinc-700">Project</th>
                                        <th rowSpan={2} className="text-center px-1.5 h-[28px] font-medium text-zinc-700 dark:text-zinc-200 sticky left-[140px] top-0 z-50 w-[44px] min-w-[44px] max-w-[44px] bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-800 dark:to-zinc-900 border-r border-b border-zinc-300 dark:border-zinc-700">Src</th>
                                        <th colSpan={6} className="text-center px-2 h-[28px] font-medium text-indigo-700 dark:text-indigo-200 tracking-wide bg-gradient-to-b from-indigo-50 to-indigo-100 dark:from-indigo-950 dark:to-indigo-900 sticky top-0 z-40 border-r border-b border-zinc-300 dark:border-zinc-700">COST DETAILS</th>
                                        <th rowSpan={2} className="text-right px-1.5 h-[28px] font-medium text-zinc-700 dark:text-zinc-200 bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-800 dark:to-zinc-900 sticky top-0 z-40 border-r border-b border-zinc-300 dark:border-zinc-700">Total Cost</th>
                                        <th rowSpan={2} className="text-right px-1.5 h-[28px] font-medium text-zinc-700 dark:text-zinc-200 bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-800 dark:to-zinc-900 sticky top-0 z-40 border-r border-b border-zinc-300 dark:border-zinc-700">Total Spent</th>
                                        <th rowSpan={2} className="text-right px-1.5 h-[28px] font-medium text-emerald-700 dark:text-emerald-200 bg-gradient-to-b from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 sticky top-0 z-40 border-r border-b border-zinc-300 dark:border-zinc-700">Total Received</th>
                                        <th colSpan={2} className="text-center px-2 h-[28px] font-medium text-violet-700 dark:text-violet-200 tracking-wide bg-gradient-to-b from-violet-50 to-violet-100 dark:from-violet-950 dark:to-violet-900 sticky top-0 z-40 border-b border-zinc-300 dark:border-zinc-700">BALANCE</th>
                                    </tr>
                                    <tr className="text-[10px]">
                                        <th className="text-right px-1.5 h-[24px] font-medium text-indigo-700 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-950 sticky top-[28px] z-40 border-r border-b border-zinc-300 dark:border-zinc-700">Material</th>
                                        <th className="text-right px-1.5 h-[24px] font-medium text-indigo-700 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-950 sticky top-[28px] z-40 border-r border-b border-zinc-300 dark:border-zinc-700">Labour</th>
                                        <th className="text-right px-1.5 h-[24px] font-medium text-indigo-700 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-950 sticky top-[28px] z-40 border-r border-b border-zinc-300 dark:border-zinc-700">Subcontr.</th>
                                        <th className="text-right px-1.5 h-[24px] font-medium text-indigo-700 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-950 sticky top-[28px] z-40 border-r border-b border-zinc-300 dark:border-zinc-700">Unclass.</th>
                                        <th className="text-right px-1.5 h-[24px] font-medium text-indigo-700 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-950 sticky top-[28px] z-40 border-r border-b border-zinc-300 dark:border-zinc-700">Common</th>
                                        <th className="text-right px-1.5 h-[24px] font-medium text-indigo-700 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-950 sticky top-[28px] z-40 border-r border-b border-zinc-300 dark:border-zinc-700">General</th>
                                        <th className="text-right px-1.5 h-[24px] font-medium text-violet-700 dark:text-violet-200 bg-violet-50 dark:bg-violet-950 sticky top-[28px] z-40 border-r border-b border-zinc-300 dark:border-zinc-700">vs Cost</th>
                                        <th className="text-right px-1.5 h-[24px] font-medium text-violet-700 dark:text-violet-200 bg-violet-50 dark:bg-violet-950 sticky top-[28px] z-40 border-b border-zinc-300 dark:border-zinc-700">vs Spent</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tableRows.map((row, idx) => (
                                        <ProjectRows key={row.project} row={row} projIdx={idx} />
                                    ))}
                                    {tableRows.length === 0 && (
                                        <tr>
                                            <td colSpan={13} className="text-center py-12 text-zinc-500">No data for the selected years</td>
                                        </tr>
                                    )}
                                </tbody>
                                {tableRows.length > 0 && (
                                    <tfoot>
                                        <tr className="font-semibold text-zinc-700 dark:text-zinc-200">
                                            <td rowSpan={2} className="px-2 align-middle sticky left-0 bottom-0 z-50 w-[140px] min-w-[140px] max-w-[140px] bg-gradient-to-t from-zinc-100 to-zinc-50 dark:from-zinc-900 dark:to-zinc-800 border-r border-t border-zinc-300 dark:border-zinc-700">GRAND TOTAL</td>
                                            <td className="px-1.5 h-[24px] text-center sticky left-[140px] bottom-[24px] z-50 w-[44px] min-w-[44px] max-w-[44px] bg-gradient-to-t from-zinc-100 to-zinc-50 dark:from-zinc-900 dark:to-zinc-800 border-r border-t border-zinc-300 dark:border-zinc-700">ANK</td>
                                            <td className="text-right px-1.5 h-[24px] sticky bottom-[24px] z-40 bg-gradient-to-t from-zinc-100 to-zinc-50 dark:from-zinc-900 dark:to-zinc-800 border-r border-t border-zinc-300 dark:border-zinc-700">{fmt(grand.ANK.material)}</td>
                                            <td className="text-right px-1.5 h-[24px] sticky bottom-[24px] z-40 bg-gradient-to-t from-zinc-100 to-zinc-50 dark:from-zinc-900 dark:to-zinc-800 border-r border-t border-zinc-300 dark:border-zinc-700">{fmt(grand.ANK.labour)}</td>
                                            <td className="text-right px-1.5 h-[24px] sticky bottom-[24px] z-40 bg-gradient-to-t from-zinc-100 to-zinc-50 dark:from-zinc-900 dark:to-zinc-800 border-r border-t border-zinc-300 dark:border-zinc-700">{fmt(grand.ANK.subcontractor)}</td>
                                            <td className="text-right px-1.5 h-[24px] sticky bottom-[24px] z-40 bg-gradient-to-t from-zinc-100 to-zinc-50 dark:from-zinc-900 dark:to-zinc-800 border-r border-t border-zinc-300 dark:border-zinc-700">{fmt(grand.ANK.unclassified)}</td>
                                            <td className="text-right px-1.5 h-[24px] sticky bottom-[24px] z-40 bg-gradient-to-t from-zinc-100 to-zinc-50 dark:from-zinc-900 dark:to-zinc-800 border-r border-t border-zinc-300 dark:border-zinc-700">{fmt(grand.ANK.common)}</td>
                                            <td className="text-right px-1.5 h-[24px] sticky bottom-[24px] z-40 bg-gradient-to-t from-zinc-100 to-zinc-50 dark:from-zinc-900 dark:to-zinc-800 border-r border-t border-zinc-300 dark:border-zinc-700">{fmt(grand.ANK.general)}</td>
                                            <td className="text-right px-1.5 h-[24px] sticky bottom-[24px] z-40 bg-gradient-to-t from-zinc-200 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 border-r border-t border-zinc-300 dark:border-zinc-700">{fmt(grand.ANK.totalCost)}</td>
                                            <td className="text-right px-1.5 h-[24px] sticky bottom-[24px] z-40 bg-gradient-to-t from-zinc-200 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 border-r border-t border-zinc-300 dark:border-zinc-700">{fmt(grand.ANK.totalSpent)}</td>
                                            <td rowSpan={2} className="text-right px-1.5 sticky bottom-0 z-40 bg-emerald-50 dark:bg-emerald-950 align-middle font-bold text-emerald-700 dark:text-emerald-300 border-r border-t border-zinc-300 dark:border-zinc-700">{fmt(grand.received)}</td>
                                            <td rowSpan={2} className={`text-right px-1.5 sticky bottom-0 z-40 align-middle font-bold bg-violet-50 dark:bg-violet-950 border-r border-t border-zinc-300 dark:border-zinc-700 ${grand.balanceVsCost < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"}`}>{fmt(grand.balanceVsCost)}</td>
                                            <td rowSpan={2} className={`text-right px-1.5 sticky bottom-0 z-40 align-middle font-bold bg-violet-50 dark:bg-violet-950 border-t border-zinc-300 dark:border-zinc-700 ${grand.balanceVsSpent < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"}`}>{fmt(grand.balanceVsSpent)}</td>
                                        </tr>
                                        <tr className="font-semibold text-zinc-700 dark:text-zinc-200">
                                            <td className="px-1.5 h-[24px] text-center sticky left-[140px] bottom-0 z-50 w-[44px] min-w-[44px] max-w-[44px] bg-gradient-to-t from-zinc-100 to-zinc-50 dark:from-zinc-900 dark:to-zinc-800 border-r border-zinc-300 dark:border-zinc-700">BAG</td>
                                            <td className="text-right px-1.5 h-[24px] sticky bottom-0 z-40 bg-gradient-to-t from-zinc-100 to-zinc-50 dark:from-zinc-900 dark:to-zinc-800 border-r border-zinc-300 dark:border-zinc-700">{fmt(grand.BAG.material)}</td>
                                            <td className="text-right px-1.5 h-[24px] sticky bottom-0 z-40 bg-gradient-to-t from-zinc-100 to-zinc-50 dark:from-zinc-900 dark:to-zinc-800 border-r border-zinc-300 dark:border-zinc-700">{fmt(grand.BAG.labour)}</td>
                                            <td className="text-right px-1.5 h-[24px] sticky bottom-0 z-40 bg-gradient-to-t from-zinc-100 to-zinc-50 dark:from-zinc-900 dark:to-zinc-800 border-r border-zinc-300 dark:border-zinc-700">{fmt(grand.BAG.subcontractor)}</td>
                                            <td className="text-right px-1.5 h-[24px] sticky bottom-0 z-40 bg-gradient-to-t from-zinc-100 to-zinc-50 dark:from-zinc-900 dark:to-zinc-800 border-r border-zinc-300 dark:border-zinc-700">{fmt(grand.BAG.unclassified)}</td>
                                            <td className="text-right px-1.5 h-[24px] sticky bottom-0 z-40 bg-gradient-to-t from-zinc-100 to-zinc-50 dark:from-zinc-900 dark:to-zinc-800 border-r border-zinc-300 dark:border-zinc-700">{fmt(grand.BAG.common)}</td>
                                            <td className="text-right px-1.5 h-[24px] sticky bottom-0 z-40 bg-gradient-to-t from-zinc-100 to-zinc-50 dark:from-zinc-900 dark:to-zinc-800 border-r border-zinc-300 dark:border-zinc-700">{fmt(grand.BAG.general)}</td>
                                            <td className="text-right px-1.5 h-[24px] sticky bottom-0 z-40 bg-gradient-to-t from-zinc-200 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 border-r border-zinc-300 dark:border-zinc-700">{fmt(grand.BAG.totalCost)}</td>
                                            <td className="text-right px-1.5 h-[24px] sticky bottom-0 z-40 bg-gradient-to-t from-zinc-200 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 border-r border-zinc-300 dark:border-zinc-700">{fmt(grand.BAG.totalSpent)}</td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </section>
                )}

                {!isLoading && !error && data && projectBreakdown && (
                    <ProjectCostBreakdownTable
                        projectCode={selectedProject2}
                        projectDesc={
                            selectedProject2 === "__ALL__"
                                ? "All Projects Combined"
                                : PROJECT_META[selectedProject2]?.desc || selectedProject2
                        }
                        projectOptions={Object.keys(PROJECT_META)}
                        onProjectChange={setSelectedProject2}
                        yearOptions={allYears}
                        selectedYears={selectedYears2}
                        onYearsChange={setSelectedYears2}
                        breakdown={projectBreakdown}
                        years={effectiveYears2}
                    />
                )}

                {!isLoading && !error && data && projectCostDetail && (
                    <DetailedCostBreakdownTable
                        projectCode={selectedProject2}
                        projectDesc={
                            selectedProject2 === "__ALL__"
                                ? "All Projects Combined"
                                : PROJECT_META[selectedProject2]?.desc || selectedProject2
                        }
                        detail={projectCostDetail}
                        years={effectiveYears2}
                        projectOptions={Object.keys(PROJECT_META)}
                        onProjectChange={setSelectedProject2}
                        yearOptions={allYears}
                        selectedYears={selectedYears2}
                        onYearsChange={setSelectedYears2}
                    />
                )}

                {!isLoading && !error && data && receivedList && (
                    <ReceivedItemsTable
                        projectCode={selectedProject2}
                        projectDesc={
                            selectedProject2 === "__ALL__"
                                ? "All Projects Combined"
                                : PROJECT_META[selectedProject2]?.desc || selectedProject2
                        }
                        list={receivedList}
                        years={effectiveYears2}
                        projectOptions={Object.keys(PROJECT_META)}
                        onProjectChange={setSelectedProject2}
                        yearOptions={allYears}
                        selectedYears={selectedYears2}
                        onYearsChange={setSelectedYears2}
                    />
                )}
            </main>
        </div>
    );
}

function ProjectRows({ row, projIdx }: { row: ProjectRow; projIdx: number }) {
    const isAlt = projIdx % 2 === 1;
    // Each project occupies 2 body rows. Cells need explicit backgrounds because
    // border-separate is in effect and sticky cells must cover scrolling content.
    const cellBg = isAlt ? "bg-zinc-50 dark:bg-zinc-900/40" : "bg-white dark:bg-zinc-900";
    const cellRecvBg = isAlt ? "bg-emerald-50 dark:bg-emerald-950/40" : "bg-emerald-50/60 dark:bg-emerald-950/30";
    const cellBalBg = isAlt ? "bg-violet-50 dark:bg-violet-950/40" : "bg-violet-50/60 dark:bg-violet-950/30";
    const borderB = "border-b border-zinc-200 dark:border-zinc-800";
    const borderL = "border-l border-zinc-200 dark:border-zinc-800";

    const renderRow = (src: Source, isFirst: boolean) => {
        const t = row.bySource[src];
        return (
            <tr>
                {isFirst ? (
                    <td rowSpan={2} className={`px-2 align-middle font-semibold text-zinc-800 dark:text-zinc-100 sticky left-0 z-20 w-[140px] min-w-[140px] max-w-[140px] border-r border-zinc-200 dark:border-zinc-800 ${cellBg} ${borderB}`}>
                        <div className="leading-tight truncate">{row.desc}</div>
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-normal leading-tight">{row.project}</div>
                    </td>
                ) : null}
                <td className={`px-1.5 h-[24px] text-center text-zinc-600 dark:text-zinc-400 font-medium sticky left-[140px] z-20 w-[44px] min-w-[44px] max-w-[44px] border-r border-zinc-200 dark:border-zinc-800 ${cellBg} ${isFirst ? "" : borderB}`}>{src}</td>
                <td className={`text-right px-1.5 h-[24px] ${cellBg} ${isFirst ? "" : borderB}`}>{fmt(t.material)}</td>
                <td className={`text-right px-1.5 h-[24px] ${cellBg} ${isFirst ? "" : borderB}`}>{fmt(t.labour)}</td>
                <td className={`text-right px-1.5 h-[24px] ${cellBg} ${isFirst ? "" : borderB}`}>{fmt(t.subcontractor)}</td>
                <td className={`text-right px-1.5 h-[24px] ${cellBg} ${isFirst ? "" : borderB}`}>{fmt(t.unclassified)}</td>
                <td className={`text-right px-1.5 h-[24px] ${cellBg} ${isFirst ? "" : borderB}`}>{fmt(t.common)}</td>
                <td className={`text-right px-1.5 h-[24px] ${cellBg} ${isFirst ? "" : borderB}`}>{fmt(t.general)}</td>
                <td className={`text-right px-1.5 h-[24px] font-semibold ${borderL} ${cellBg} ${isFirst ? "" : borderB}`}>{fmt(t.totalCost)}</td>
                <td className={`text-right px-1.5 h-[24px] font-semibold ${cellBg} ${isFirst ? "" : borderB}`}>{fmt(t.totalSpent)}</td>
                {isFirst ? (
                    <>
                        <td rowSpan={2} className={`text-right px-1.5 align-middle font-bold ${borderL} ${cellRecvBg} ${borderB}`}>{fmt(row.received)}</td>
                        <td rowSpan={2} className={`text-right px-1.5 align-middle font-bold ${borderL} ${cellBalBg} ${borderB} ${row.balanceVsCost < 0 ? "text-rose-600" : "text-emerald-700 dark:text-emerald-400"}`}>{fmt(row.balanceVsCost)}</td>
                        <td rowSpan={2} className={`text-right px-1.5 align-middle font-bold ${borderL} ${cellBalBg} ${borderB} ${row.balanceVsSpent < 0 ? "text-rose-600" : "text-emerald-700 dark:text-emerald-400"}`}>{fmt(row.balanceVsSpent)}</td>
                    </>
                ) : null}
            </tr>
        );
    };

    return (
        <>
            {renderRow("ANK", true)}
            {renderRow("BAG", false)}
        </>
    );
}

interface CatTotals {
    material: number;
    labour: number;
    subcontractor: number;
    unclassified: number;
    common: number;
    general: number;
}
interface YearBlock {
    ANK: CatTotals;
    BAG: CatTotals;
}

const subTotalDirect = (b: CatTotals) =>
    b.material + b.labour + b.subcontractor + b.unclassified;
const totalCost = (b: CatTotals) => subTotalDirect(b) + b.common + b.general;

function fmtPct(num: number, den: number): string {
    if (!den) return "-";
    const p = (num / den) * 100;
    if (!isFinite(p)) return "-";
    return `${p.toFixed(1)}%`;
}

interface ProjectCostBreakdownTableProps {
    projectCode: string;
    projectDesc: string;
    projectOptions: string[];
    onProjectChange: (code: string) => void;
    yearOptions: number[];
    selectedYears: number[];
    onYearsChange: (years: number[]) => void;
    breakdown: { yearMap: Record<number, YearBlock>; years: number[]; total: YearBlock };
    years: number[];
}

const EMPTY_YEAR_BLOCK: YearBlock = {
    ANK: { material: 0, labour: 0, subcontractor: 0, unclassified: 0, common: 0, general: 0 },
    BAG: { material: 0, labour: 0, subcontractor: 0, unclassified: 0, common: 0, general: 0 },
};

function ProjectCostBreakdownTable({
    projectCode,
    projectDesc,
    projectOptions,
    onProjectChange,
    yearOptions,
    selectedYears,
    onYearsChange,
    breakdown,
    years: displayYears,
}: ProjectCostBreakdownTableProps) {
    const { yearMap, total } = breakdown;
    // Column groups: TOTAL + each year (driven by displayYears, with empty
    // fallback when the project has no data for a given year).
    const groups: { label: string; block: YearBlock }[] = [
        { label: "TOTAL", block: total },
        ...displayYears.map((y) => ({ label: String(y), block: yearMap[y] || EMPTY_YEAR_BLOCK })),
    ];

    // Each row of body: { label, getValue: (block) -> {ank: number; bag: number}, kind }
    type RowKind = "category" | "subtotal" | "total" | "ratio" | "spacer";
    interface BodyRow {
        label: string;
        kind: RowKind;
        get?: (b: YearBlock) => { ank: number | string; bag: number | string };
    }
    const bodyRows: BodyRow[] = [
        { label: "TOTAL MATERIAL COST", kind: "category", get: (b) => ({ ank: b.ANK.material, bag: b.BAG.material }) },
        { label: "TOTAL LABOUR COST", kind: "category", get: (b) => ({ ank: b.ANK.labour, bag: b.BAG.labour }) },
        { label: "TOTAL SUB-CONTRACTOR COST", kind: "category", get: (b) => ({ ank: b.ANK.subcontractor, bag: b.BAG.subcontractor }) },
        { label: "TOTAL UNCLASSIFIED COST", kind: "category", get: (b) => ({ ank: b.ANK.unclassified, bag: b.BAG.unclassified }) },
        { label: "SUB TOTAL DIRECT COST", kind: "subtotal", get: (b) => ({ ank: subTotalDirect(b.ANK), bag: subTotalDirect(b.BAG) }) },
        { label: "TOTAL COMMON EXPENSES", kind: "category", get: (b) => ({ ank: b.ANK.common, bag: b.BAG.common }) },
        { label: "TOTAL GENERAL EXPENSES", kind: "category", get: (b) => ({ ank: b.ANK.general, bag: b.BAG.general }) },
        { label: "TOTAL COST", kind: "total", get: (b) => ({ ank: totalCost(b.ANK), bag: totalCost(b.BAG) }) },
        {
            label: "(COMMON EXPENSES) / TOTAL COST",
            kind: "ratio",
            get: (b) => ({
                ank: fmtPct(b.ANK.common, totalCost(b.ANK)),
                bag: fmtPct(b.BAG.common, totalCost(b.BAG)),
            }),
        },
        {
            label: "(GENERAL EXPENSES) / TOTAL COST",
            kind: "ratio",
            get: (b) => ({
                ank: fmtPct(b.ANK.general, totalCost(b.ANK)),
                bag: fmtPct(b.BAG.general, totalCost(b.BAG)),
            }),
        },
    ];

    const rowBgFor = (kind: RowKind, isSticky: boolean) => {
        if (kind === "subtotal") return isSticky ? "bg-zinc-100 dark:bg-zinc-800" : "bg-zinc-50 dark:bg-zinc-900/40";
        if (kind === "total") return isSticky ? "bg-emerald-100 dark:bg-emerald-950" : "bg-emerald-50 dark:bg-emerald-950/40";
        if (kind === "ratio") return isSticky ? "bg-zinc-50 dark:bg-zinc-900/30" : "bg-white dark:bg-zinc-900";
        return isSticky ? "bg-white dark:bg-zinc-900" : "bg-white dark:bg-zinc-900";
    };

    const rowFontFor = (kind: RowKind) => {
        if (kind === "subtotal") return "font-semibold text-zinc-700 dark:text-zinc-200";
        if (kind === "total") return "font-bold text-emerald-700 dark:text-emerald-300";
        if (kind === "ratio") return "italic text-zinc-600 dark:text-zinc-400";
        return "text-zinc-700 dark:text-zinc-300";
    };

    const labelText = (kind: RowKind) => {
        if (kind === "subtotal") return "font-semibold text-zinc-700 dark:text-zinc-200";
        if (kind === "total") return "font-bold text-emerald-700 dark:text-emerald-300";
        if (kind === "ratio") return "italic text-zinc-600 dark:text-zinc-400";
        return "text-zinc-700 dark:text-zinc-300";
    };

    const formatCell = (v: number | string) => {
        if (typeof v === "string") return v;
        return fmt(v);
    };

    const cellBorder = "border-r border-zinc-200 dark:border-zinc-800";
    const cellGroupBorder = "border-r border-zinc-300 dark:border-zinc-700";
    const headerBorder = "border-r border-b border-zinc-300 dark:border-zinc-700";

    return (
        <section className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-200/60 dark:border-zinc-800/60 flex flex-wrap items-center gap-3 justify-between">
                <div>
                    <h2 className="text-base font-semibold">Project Cost Breakdown by Year</h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {projectDesc}
                        {projectCode !== "__ALL__" && <span className="text-zinc-400"> ({projectCode})</span>}
                        {" — direct costs, indirect costs, and ratios"}
                    </p>
                </div>
                <ProjectYearFilters
                    projectCode={projectCode}
                    projectOptions={projectOptions}
                    onProjectChange={onProjectChange}
                    yearOptions={yearOptions}
                    selectedYears={selectedYears}
                    onYearsChange={onYearsChange}
                />
            </div>

            <TopScrollSync maxHeight="560px">
                <table className="w-full text-[11px] tabular-nums leading-tight border-separate border-spacing-0">
                    <thead>
                        <tr>
                            <th rowSpan={2} className="text-left px-2 h-[28px] font-medium text-zinc-700 dark:text-zinc-200 sticky left-0 top-0 z-50 w-[260px] min-w-[260px] bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-800 dark:to-zinc-900 border-r border-b border-zinc-300 dark:border-zinc-700">
                                SUMMARY OF TOTALS
                            </th>
                            {groups.map((g) => (
                                <th
                                    key={g.label}
                                    colSpan={2}
                                    className={`text-center px-2 h-[28px] font-medium tracking-wide bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-800 dark:to-zinc-900 ${
                                        g.label === "TOTAL"
                                            ? "text-zinc-800 dark:text-zinc-100"
                                            : "text-zinc-700 dark:text-zinc-200"
                                    } ${headerBorder}`}
                                >
                                    {g.label}
                                </th>
                            ))}
                        </tr>
                        <tr className="text-[10px]">
                            {groups.map((g) => (
                                <Fragment key={g.label}>
                                    <th className={`text-right px-1.5 h-[24px] font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 ${cellBorder} border-b border-zinc-300 dark:border-zinc-700`}>
                                        HEAD OFFICE
                                    </th>
                                    <th className={`text-right px-1.5 h-[24px] font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 ${cellGroupBorder} border-b border-zinc-300 dark:border-zinc-700`}>
                                        BAGHDAD SITE
                                    </th>
                                </Fragment>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {bodyRows.map((row, idx) => {
                            const labelClass = labelText(row.kind);
                            const fontClass = rowFontFor(row.kind);
                            const labelBg = rowBgFor(row.kind, true);
                            const cellBg = rowBgFor(row.kind, false);
                            const topBorder =
                                row.kind === "subtotal" || row.kind === "total"
                                    ? "border-t border-zinc-300 dark:border-zinc-700"
                                    : "";
                            return (
                                <tr key={idx}>
                                    <td className={`px-2 h-[24px] sticky left-0 z-10 ${labelBg} ${labelClass} border-r border-b border-zinc-200 dark:border-zinc-800 ${topBorder}`}>
                                        {row.label}
                                    </td>
                                    {groups.map((g, gi) => {
                                        const v = row.get!(g.block);
                                        const isLastGroup = gi === groups.length - 1;
                                        return (
                                            <Fragment key={g.label}>
                                                <td className={`text-right px-1.5 h-[24px] ${cellBg} ${fontClass} border-b border-zinc-200 dark:border-zinc-800 ${topBorder} ${cellBorder}`}>
                                                    {formatCell(v.ank)}
                                                </td>
                                                <td className={`text-right px-1.5 h-[24px] ${cellBg} ${fontClass} border-b border-zinc-200 dark:border-zinc-800 ${topBorder} ${isLastGroup ? "" : cellGroupBorder}`}>
                                                    {formatCell(v.bag)}
                                                </td>
                                            </Fragment>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </TopScrollSync>
        </section>
    );
}

interface DetailedCostBreakdownTableProps {
    projectCode: string;
    projectDesc: string;
    detail: {
        sections: {
            l1: string;
            items: { l2: string; perYear: Record<number, { ANK: number; BAG: number }>; total: { ANK: number; BAG: number } }[];
            subtotal: { perYear: Record<number, { ANK: number; BAG: number }>; total: { ANK: number; BAG: number } };
        }[];
        years: number[];
    };
    years: number[];
    projectOptions: string[];
    onProjectChange: (code: string) => void;
    yearOptions: number[];
    selectedYears: number[];
    onYearsChange: (years: number[]) => void;
}

const SECTION_TOTAL_LABEL: Record<string, string> = {
    "MATERIAL COST": "MATERIALS TOTAL",
    "LABOUR COST": "PERSONNEL TOTAL",
    "COMMON EXPENSES": "COMMON EXPENSES TOTAL",
    "GENERAL EXPENSES": "GENERAL EXPENSES TOTAL",
    "UNCLASSIFIED COST": "UNCLASSIFIED TOTAL",
};

function DetailedCostBreakdownTable({
    projectCode,
    projectDesc,
    detail,
    years: displayYears,
    projectOptions,
    onProjectChange,
    yearOptions,
    selectedYears,
    onYearsChange,
}: DetailedCostBreakdownTableProps) {
    const { sections } = detail;
    const years = displayYears;
    // Column groups: TOTAL + each year (each is HEAD/BAG pair)
    const groups = [
        { label: "TOTAL", isTotal: true },
        ...years.map((y) => ({ label: String(y), isTotal: false })),
    ];

    const cellBorder = "border-r border-zinc-200 dark:border-zinc-800";
    const cellGroupBorder = "border-r border-zinc-300 dark:border-zinc-700";
    const headerBorder = "border-r border-b border-zinc-300 dark:border-zinc-700";

    const cellsForRow = (
        getValue: (groupIdx: number) => { ank: number; bag: number },
        opts: { kind: "item" | "subtotal" }
    ) => {
        const baseFont =
            opts.kind === "subtotal"
                ? "font-bold text-emerald-700 dark:text-emerald-300"
                : "text-zinc-700 dark:text-zinc-300";
        const baseBg =
            opts.kind === "subtotal"
                ? "bg-emerald-50 dark:bg-emerald-950/40"
                : "bg-white dark:bg-zinc-900";
        const topBorder =
            opts.kind === "subtotal"
                ? "border-t border-zinc-300 dark:border-zinc-700"
                : "";

        return groups.map((g, gi) => {
            const v = getValue(gi);
            const isLastGroup = gi === groups.length - 1;
            return (
                <Fragment key={g.label}>
                    <td className={`text-right px-1.5 h-[24px] ${baseBg} ${baseFont} border-b border-zinc-200 dark:border-zinc-800 ${topBorder} ${cellBorder}`}>
                        {fmt(v.ank)}
                    </td>
                    <td className={`text-right px-1.5 h-[24px] ${baseBg} ${baseFont} border-b border-zinc-200 dark:border-zinc-800 ${topBorder} ${isLastGroup ? "" : cellGroupBorder}`}>
                        {fmt(v.bag)}
                    </td>
                </Fragment>
            );
        });
    };

    return (
        <section className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-200/60 dark:border-zinc-800/60 flex flex-wrap items-center gap-3 justify-between">
                <div>
                    <h2 className="text-base font-semibold">Detailed Breakdown of Costs</h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {projectDesc}
                        {projectCode !== "__ALL__" && <span className="text-zinc-400"> ({projectCode})</span>}
                        {" — every kategori_lvl_2 grouped by main category, with section totals."}
                    </p>
                </div>
                <ProjectYearFilters
                    projectCode={projectCode}
                    projectOptions={projectOptions}
                    onProjectChange={onProjectChange}
                    yearOptions={yearOptions}
                    selectedYears={selectedYears}
                    onYearsChange={onYearsChange}
                />
            </div>

            <TopScrollSync maxHeight="680px">
                <table className="w-full text-[11px] tabular-nums leading-tight border-separate border-spacing-0">
                    <thead>
                        <tr>
                            <th rowSpan={2} className="text-left px-2 h-[28px] font-medium text-zinc-700 dark:text-zinc-200 sticky left-0 top-0 z-50 w-[280px] min-w-[280px] bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-800 dark:to-zinc-900 border-r border-b border-zinc-300 dark:border-zinc-700">
                                DETAILED BREAKDOWN OF COSTS
                            </th>
                            {groups.map((g) => (
                                <th
                                    key={g.label}
                                    colSpan={2}
                                    className={`text-center px-2 h-[28px] font-medium tracking-wide bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-800 dark:to-zinc-900 text-zinc-700 dark:text-zinc-200 sticky top-0 z-40 ${headerBorder}`}
                                >
                                    {g.label}
                                </th>
                            ))}
                        </tr>
                        <tr className="text-[10px]">
                            {groups.map((g, gi) => (
                                <Fragment key={g.label}>
                                    <th className={`text-right px-1.5 h-[24px] font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 sticky top-[28px] z-40 ${cellBorder} border-b border-zinc-300 dark:border-zinc-700`}>
                                        HEAD OFFICE
                                    </th>
                                    <th className={`text-right px-1.5 h-[24px] font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 sticky top-[28px] z-40 ${gi === groups.length - 1 ? "" : cellGroupBorder} border-b border-zinc-300 dark:border-zinc-700`}>
                                        BAGHDAD SITE
                                    </th>
                                </Fragment>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {sections.map((section) => (
                            <Fragment key={section.l1}>
                                {/* Section banner row */}
                                <tr>
                                    <td
                                        colSpan={1 + groups.length * 2}
                                        className="px-2 h-[26px] font-bold tracking-wide text-amber-900 dark:text-amber-200 bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-y border-zinc-300 dark:border-zinc-700 sticky left-0"
                                    >
                                        {section.l1}
                                    </td>
                                </tr>
                                {/* Detail rows */}
                                {section.items.map((item) => (
                                    <tr key={item.l2}>
                                        <td className="px-2 h-[24px] sticky left-0 z-10 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-r border-b border-zinc-200 dark:border-zinc-800 truncate max-w-[280px]" title={item.l2}>
                                            {item.l2}
                                        </td>
                                        {cellsForRow(
                                            (gi) => {
                                                if (groups[gi].isTotal) return { ank: item.total.ANK, bag: item.total.BAG };
                                                const yr = years[gi - 1];
                                                const py = item.perYear[yr];
                                                return { ank: py?.ANK || 0, bag: py?.BAG || 0 };
                                            },
                                            { kind: "item" }
                                        )}
                                    </tr>
                                ))}
                                {/* Section subtotal */}
                                <tr>
                                    <td className="px-2 h-[24px] sticky left-0 z-10 bg-emerald-50 dark:bg-emerald-950/40 font-bold text-emerald-700 dark:text-emerald-300 border-r border-b border-zinc-200 dark:border-zinc-800 border-t border-zinc-300 dark:border-zinc-700">
                                        {SECTION_TOTAL_LABEL[section.l1] || `${section.l1} TOTAL`}
                                    </td>
                                    {cellsForRow(
                                        (gi) => {
                                            if (groups[gi].isTotal) return { ank: section.subtotal.total.ANK, bag: section.subtotal.total.BAG };
                                            const yr = years[gi - 1];
                                            const py = section.subtotal.perYear[yr];
                                            return { ank: py?.ANK || 0, bag: py?.BAG || 0 };
                                        },
                                        { kind: "subtotal" }
                                    )}
                                </tr>
                            </Fragment>
                        ))}
                        {sections.length === 0 && (
                            <tr>
                                <td colSpan={1 + groups.length * 2} className="text-center py-12 text-zinc-500">
                                    No data for the selected project and years
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </TopScrollSync>
        </section>
    );
}

interface ReceivedItemsTableProps {
    projectCode: string;
    projectDesc: string;
    list: {
        items: ReceivedItemRow[];
        years: number[];
        total: number;
        totalsByYear: Record<number, number>;
    };
    years: number[];
    projectOptions: string[];
    onProjectChange: (code: string) => void;
    yearOptions: number[];
    selectedYears: number[];
    onYearsChange: (years: number[]) => void;
}

function ReceivedItemsTable({
    projectCode,
    projectDesc,
    list,
    years: displayYears,
    projectOptions,
    onProjectChange,
    yearOptions,
    selectedYears,
    onYearsChange,
}: ReceivedItemsTableProps) {
    const { items, total, totalsByYear } = list;
    const years = displayYears;
    const isAll = projectCode === "__ALL__";
    const cellGroupBorder = "border-r border-zinc-300 dark:border-zinc-700";

    // Cumulative left offsets for sticky non-year columns. All non-year columns
    // are frozen — only year columns scroll horizontally.
    const COLS = [
        { key: "date", width: 80 },
        { key: "description", width: 200 },
        { key: "counter_party", width: 90 },
        { key: "type", width: 72 },
        ...(isAll ? [{ key: "project", width: 64 }] : []),
        { key: "amount", width: 96 },
        { key: "currency", width: 44 },
        { key: "rate", width: 64 },
        { key: "total", width: 100 },
    ];
    const offsets = COLS.reduce<number[]>((acc, _c, i) => {
        acc.push(i === 0 ? 0 : acc[i - 1] + COLS[i - 1].width);
        return acc;
    }, []);
    const colByKey = (key: string) => {
        const idx = COLS.findIndex((c) => c.key === key);
        return { idx, left: offsets[idx], width: COLS[idx].width };
    };
    const fixedCols = COLS.length;
    const totalFixedWidth = offsets[offsets.length - 1] + COLS[COLS.length - 1].width;

    return (
        <section className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-200/60 dark:border-zinc-800/60 flex flex-wrap items-center gap-3 justify-between">
                <div>
                    <h2 className="text-base font-semibold">Received Amounts (Chronological)</h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {projectDesc}
                        {!isAll && <span className="text-zinc-400"> ({projectCode})</span>}
                        {" — every cash_flow entry by date (excludes internal ANK↔BAG transfers)."}
                    </p>
                </div>
                <ProjectYearFilters
                    projectCode={projectCode}
                    projectOptions={projectOptions}
                    onProjectChange={onProjectChange}
                    yearOptions={yearOptions}
                    selectedYears={selectedYears}
                    onYearsChange={onYearsChange}
                />
            </div>

            <TopScrollSync maxHeight="560px">
                <table className="text-[11px] tabular-nums leading-tight border-separate border-spacing-0" style={{ minWidth: totalFixedWidth + years.length * 100 }}>
                    <thead>
                        <tr>
                            {COLS.map((col, i) => {
                                const isTotalCol = col.key === "total";
                                const headerBg = isTotalCol
                                    ? "bg-gradient-to-b from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900"
                                    : "bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-800 dark:to-zinc-900";
                                const textColor = isTotalCol
                                    ? "text-emerald-700 dark:text-emerald-200"
                                    : "text-zinc-700 dark:text-zinc-200";
                                const align = ["amount", "rate", "total"].includes(col.key) ? "text-right" : "text-left";
                                const label = {
                                    date: "Date",
                                    description: "Description",
                                    counter_party: "Counter Pt.",
                                    type: "Type",
                                    project: "Project",
                                    amount: "Amount",
                                    currency: "Cur.",
                                    rate: "Rate",
                                    total: "TOTAL (USD)",
                                }[col.key];
                                return (
                                    <th
                                        key={col.key}
                                        className={`${align} px-1.5 h-[28px] font-medium ${textColor} sticky top-0 z-50 ${headerBg} border-r border-b border-zinc-300 dark:border-zinc-700`}
                                        style={{ left: offsets[i], width: col.width, minWidth: col.width, maxWidth: col.width }}
                                    >
                                        {label}
                                    </th>
                                );
                            })}
                            {years.map((y, idx) => (
                                <th
                                    key={y}
                                    className={`text-right px-1.5 h-[28px] font-medium text-zinc-700 dark:text-zinc-200 sticky top-0 z-40 bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-800 dark:to-zinc-900 border-b border-zinc-300 dark:border-zinc-700 ${idx === years.length - 1 ? "" : cellGroupBorder}`}
                                    style={{ width: 100, minWidth: 100, maxWidth: 100 }}
                                >
                                    {y}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((r, idx) => {
                            const isAlt = idx % 2 === 1;
                            const rowBg = isAlt ? "bg-zinc-50 dark:bg-zinc-900/40" : "bg-white dark:bg-zinc-900";
                            const dateStr = r.date ? new Date(r.date).toISOString().slice(0, 10) : "";
                            const amt = Number(r.amount || 0);
                            const origAmt = Number(r.original_amount || 0);
                            const rate = Number(r.currency_rate || 0);
                            const amtColor = amt < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400";
                            const stickyTd = (key: string, content: React.ReactNode, opts: { align?: "left" | "right"; nowrap?: boolean; truncate?: boolean; titleAttr?: string; className?: string } = {}) => {
                                const c = colByKey(key);
                                const align = opts.align === "right" ? "text-right" : "text-left";
                                return (
                                    <td
                                        key={key}
                                        title={opts.titleAttr}
                                        className={`${align} px-1.5 h-[24px] sticky z-10 ${rowBg} border-r border-b border-zinc-200 dark:border-zinc-800 ${opts.nowrap ? "whitespace-nowrap" : ""} ${opts.truncate ? "truncate" : ""} ${opts.className || ""}`}
                                        style={{ left: c.left, width: c.width, minWidth: c.width, maxWidth: c.width }}
                                    >
                                        {content}
                                    </td>
                                );
                            };
                            return (
                                <tr key={r.id}>
                                    {stickyTd("date", dateStr, { nowrap: true, className: "text-zinc-700 dark:text-zinc-300" })}
                                    {stickyTd("description", r.description || "-", { truncate: true, titleAttr: r.description || "", className: "text-zinc-700 dark:text-zinc-300" })}
                                    {stickyTd("counter_party", r.counter_party || "-", { truncate: true, titleAttr: r.counter_party, className: "text-zinc-600 dark:text-zinc-400" })}
                                    {stickyTd("type", <>{r.type}{r.is_exchange ? <span className="ml-0.5 text-[9px] text-amber-600">FX</span> : null}</>, { truncate: true, titleAttr: r.type, className: "text-zinc-600 dark:text-zinc-400" })}
                                    {isAll && stickyTd("project", r.project, { truncate: true, className: "text-zinc-600 dark:text-zinc-400" })}
                                    {stickyTd("amount", fmt(origAmt), { align: "right", nowrap: true, className: "text-zinc-700 dark:text-zinc-300" })}
                                    {stickyTd("currency", r.currency || "-", { className: "text-zinc-600 dark:text-zinc-400" })}
                                    {stickyTd("rate", rate ? rate.toLocaleString("en-US", { maximumFractionDigits: 4 }) : "-", { align: "right", nowrap: true, className: "text-zinc-600 dark:text-zinc-400" })}
                                    {stickyTd("total", fmt(amt), { align: "right", className: `font-semibold ${amtColor}` })}
                                    {years.map((y, yi) => (
                                        <td
                                            key={y}
                                            className={`text-right px-1.5 h-[24px] ${rowBg} border-b border-zinc-200 dark:border-zinc-800 ${yi === years.length - 1 ? "" : cellGroupBorder} ${y === r.yr ? amtColor : "text-zinc-300 dark:text-zinc-700"}`}
                                            style={{ width: 100, minWidth: 100, maxWidth: 100 }}
                                        >
                                            {y === r.yr ? fmt(amt) : "·"}
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                        {items.length === 0 && (
                            <tr>
                                <td colSpan={fixedCols + years.length} className="text-center py-12 text-zinc-500">
                                    No received entries for the selected project / years
                                </td>
                            </tr>
                        )}
                    </tbody>
                    {items.length > 0 && (
                        <tfoot>
                            <tr className="font-bold text-emerald-700 dark:text-emerald-300">
                                <td
                                    colSpan={fixedCols - 1}
                                    className="px-1.5 h-[26px] sticky left-0 bottom-0 z-30 bg-emerald-50 dark:bg-emerald-950 border-r border-t border-zinc-300 dark:border-zinc-700"
                                    style={{ width: totalFixedWidth - COLS[COLS.length - 1].width, minWidth: totalFixedWidth - COLS[COLS.length - 1].width }}
                                >
                                    TOTAL
                                </td>
                                <td
                                    className="text-right px-1.5 h-[26px] sticky bottom-0 z-30 bg-emerald-50 dark:bg-emerald-950 border-r border-t border-zinc-300 dark:border-zinc-700"
                                    style={{ left: offsets[offsets.length - 1], width: COLS[COLS.length - 1].width, minWidth: COLS[COLS.length - 1].width, maxWidth: COLS[COLS.length - 1].width, position: "sticky" }}
                                >
                                    {fmt(total)}
                                </td>
                                {years.map((y, yi) => (
                                    <td
                                        key={y}
                                        className={`text-right px-1.5 h-[26px] sticky bottom-0 z-30 bg-emerald-50 dark:bg-emerald-950 border-t border-zinc-300 dark:border-zinc-700 ${yi === years.length - 1 ? "" : cellGroupBorder}`}
                                        style={{ width: 100, minWidth: 100, maxWidth: 100 }}
                                    >
                                        {fmt(totalsByYear[y] || 0)}
                                    </td>
                                ))}
                            </tr>
                        </tfoot>
                    )}
                </table>
            </TopScrollSync>
        </section>
    );
}

// ---------- Shared filter UI ----------

interface ProjectYearFiltersProps {
    projectCode: string;
    projectOptions: string[];
    onProjectChange: (code: string) => void;
    yearOptions: number[];
    selectedYears: number[];
    onYearsChange: (years: number[]) => void;
}

function ProjectYearFilters({
    projectCode,
    projectOptions,
    onProjectChange,
    yearOptions,
    selectedYears,
    onYearsChange,
}: ProjectYearFiltersProps) {
    return (
        <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">Project</span>
                <Select value={projectCode} onValueChange={onProjectChange}>
                    <SelectTrigger className="w-[260px] h-8 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="__ALL__">
                            <span className="font-semibold">All Projects Combined</span>
                        </SelectItem>
                        {projectOptions.map((code) => (
                            <SelectItem key={code} value={code}>
                                {PROJECT_META[code]?.desc || code} <span className="text-zinc-400 text-[10px] ml-1">({code})</span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">Year</span>
                <div className="w-[180px]">
                    <CompactMultiSelect
                        options={yearOptions.map((y) => ({ label: String(y), value: String(y) }))}
                        selected={selectedYears.map((y) => String(y))}
                        onChange={(vals) => onYearsChange(vals.map(Number))}
                        placeholder="ALL Years"
                    />
                </div>
            </div>
        </div>
    );
}

// ---------- Top horizontal scrollbar that mirrors a scrollable container below it ----------

interface TopScrollSyncProps {
    children: React.ReactNode;
    maxHeight?: string;
    /** Optional className for the main scroll wrapper. */
    className?: string;
}

function TopScrollSync({ children, maxHeight = "560px", className = "" }: TopScrollSyncProps) {
    const topRef = useRef<HTMLDivElement>(null);
    const mainRef = useRef<HTMLDivElement>(null);
    const syncingRef = useRef(false);
    const [contentWidth, setContentWidth] = useState(0);

    useEffect(() => {
        const main = mainRef.current;
        if (!main) return;
        const update = () => {
            const tbl = main.querySelector("table");
            if (tbl) setContentWidth(tbl.scrollWidth);
        };
        update();
        const ro = new ResizeObserver(update);
        ro.observe(main);
        const tbl = main.querySelector("table");
        if (tbl) ro.observe(tbl);
        return () => ro.disconnect();
    }, [children]);

    const onTopScroll = () => {
        if (syncingRef.current) return;
        syncingRef.current = true;
        if (mainRef.current && topRef.current) mainRef.current.scrollLeft = topRef.current.scrollLeft;
        syncingRef.current = false;
    };
    const onMainScroll = () => {
        if (syncingRef.current) return;
        syncingRef.current = true;
        if (mainRef.current && topRef.current) topRef.current.scrollLeft = mainRef.current.scrollLeft;
        syncingRef.current = false;
    };

    return (
        <>
            <div
                ref={topRef}
                onScroll={onTopScroll}
                className="overflow-x-auto overflow-y-hidden border-b border-zinc-200 dark:border-zinc-800"
                style={{ height: 12 }}
            >
                <div style={{ width: contentWidth || 1, height: 1 }} />
            </div>
            <div
                ref={mainRef}
                onScroll={onMainScroll}
                className={`overflow-auto ${className}`}
                style={{ maxHeight }}
            >
                {children}
            </div>
        </>
    );
}
