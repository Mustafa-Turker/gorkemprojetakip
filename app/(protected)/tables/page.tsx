"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { AlertCircle, FileSpreadsheet, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CompactMultiSelect } from "@/components/ui/compact-multi-select";

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
interface ApiResponse {
    cost: CostRow[];
    spent: SpentRow[];
    received: ReceivedRow[];
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
                            <table className="w-full text-[11px] tabular-nums border-collapse leading-tight">
                                <thead>
                                    <tr className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800">
                                        <th rowSpan={2} className="text-left px-2 py-1 font-semibold text-zinc-600 dark:text-zinc-300 sticky left-0 top-0 bg-zinc-100 dark:bg-zinc-900 z-40 w-[140px] min-w-[140px] max-w-[140px] border-r border-b border-zinc-200 dark:border-zinc-800">Project</th>
                                        <th rowSpan={2} className="text-left px-1.5 py-1 font-semibold text-zinc-600 dark:text-zinc-300 sticky left-[140px] top-0 bg-zinc-100 dark:bg-zinc-900 z-40 w-[44px] min-w-[44px] max-w-[44px] border-r border-b border-zinc-200 dark:border-zinc-800">Src</th>
                                        <th colSpan={6} className="text-center px-2 py-1 font-semibold text-zinc-600 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-800 bg-indigo-50/80 dark:bg-indigo-950/40 sticky top-0 z-30">COST DETAILS</th>
                                        <th rowSpan={2} className="text-right px-1.5 py-1 font-semibold text-zinc-600 dark:text-zinc-300 border-l border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 sticky top-0 z-30">Total Cost</th>
                                        <th rowSpan={2} className="text-right px-1.5 py-1 font-semibold text-zinc-600 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 sticky top-0 z-30">Total Spent</th>
                                        <th rowSpan={2} className="text-right px-1.5 py-1 font-semibold text-zinc-600 dark:text-zinc-300 border-l border-b border-zinc-200 dark:border-zinc-800 bg-emerald-50/80 dark:bg-emerald-950/40 sticky top-0 z-30">Total Received</th>
                                        <th colSpan={2} className="text-center px-2 py-1 font-semibold text-zinc-600 dark:text-zinc-300 border-l border-b border-zinc-200 dark:border-zinc-800 bg-violet-50/80 dark:bg-violet-950/40 sticky top-0 z-30">BALANCE</th>
                                    </tr>
                                    <tr className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 text-[10px]">
                                        <th className="text-right px-1.5 py-1 font-medium text-zinc-500 dark:text-zinc-400 bg-indigo-50/80 dark:bg-indigo-950/30 sticky top-7 z-30">Material</th>
                                        <th className="text-right px-1.5 py-1 font-medium text-zinc-500 dark:text-zinc-400 bg-indigo-50/80 dark:bg-indigo-950/30 sticky top-7 z-30">Labour</th>
                                        <th className="text-right px-1.5 py-1 font-medium text-zinc-500 dark:text-zinc-400 bg-indigo-50/80 dark:bg-indigo-950/30 sticky top-7 z-30">Subcontr.</th>
                                        <th className="text-right px-1.5 py-1 font-medium text-zinc-500 dark:text-zinc-400 bg-indigo-50/80 dark:bg-indigo-950/30 sticky top-7 z-30">Unclass.</th>
                                        <th className="text-right px-1.5 py-1 font-medium text-zinc-500 dark:text-zinc-400 bg-indigo-50/80 dark:bg-indigo-950/30 sticky top-7 z-30">Common</th>
                                        <th className="text-right px-1.5 py-1 font-medium text-zinc-500 dark:text-zinc-400 bg-indigo-50/80 dark:bg-indigo-950/30 sticky top-7 z-30">General</th>
                                        <th className="text-right px-1.5 py-1 font-medium text-zinc-500 dark:text-zinc-400 bg-violet-50/80 dark:bg-violet-950/30 sticky top-7 z-30">vs Cost</th>
                                        <th className="text-right px-1.5 py-1 font-medium text-zinc-500 dark:text-zinc-400 bg-violet-50/80 dark:bg-violet-950/30 sticky top-7 z-30">vs Spent</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tableRows.map((row) => (
                                        <ProjectRows key={row.project} row={row} />
                                    ))}
                                    {tableRows.length === 0 && (
                                        <tr>
                                            <td colSpan={13} className="text-center py-12 text-zinc-500">No data for the selected years</td>
                                        </tr>
                                    )}
                                </tbody>
                                {tableRows.length > 0 && (
                                    <tfoot>
                                        <tr className="bg-zinc-100 dark:bg-zinc-900 border-t-2 border-zinc-300 dark:border-zinc-700 font-semibold">
                                            <td rowSpan={2} className="px-2 py-1 align-middle sticky left-0 bottom-0 z-40 bg-zinc-100 dark:bg-zinc-900 w-[140px] min-w-[140px] max-w-[140px] border-r border-t-2 border-zinc-300 dark:border-zinc-700">GRAND TOTAL</td>
                                            <td className="px-1.5 py-1 sticky left-[140px] bottom-7 z-40 bg-zinc-100 dark:bg-zinc-900 w-[44px] min-w-[44px] max-w-[44px] border-r border-t-2 border-zinc-300 dark:border-zinc-700">ANK</td>
                                            <td className="text-right px-1.5 py-1 sticky bottom-7 z-30 bg-zinc-100 dark:bg-zinc-900 border-t-2 border-zinc-300 dark:border-zinc-700">{fmt(grand.ANK.material)}</td>
                                            <td className="text-right px-1.5 py-1 sticky bottom-7 z-30 bg-zinc-100 dark:bg-zinc-900 border-t-2 border-zinc-300 dark:border-zinc-700">{fmt(grand.ANK.labour)}</td>
                                            <td className="text-right px-1.5 py-1 sticky bottom-7 z-30 bg-zinc-100 dark:bg-zinc-900 border-t-2 border-zinc-300 dark:border-zinc-700">{fmt(grand.ANK.subcontractor)}</td>
                                            <td className="text-right px-1.5 py-1 sticky bottom-7 z-30 bg-zinc-100 dark:bg-zinc-900 border-t-2 border-zinc-300 dark:border-zinc-700">{fmt(grand.ANK.unclassified)}</td>
                                            <td className="text-right px-1.5 py-1 sticky bottom-7 z-30 bg-zinc-100 dark:bg-zinc-900 border-t-2 border-zinc-300 dark:border-zinc-700">{fmt(grand.ANK.common)}</td>
                                            <td className="text-right px-1.5 py-1 sticky bottom-7 z-30 bg-zinc-100 dark:bg-zinc-900 border-t-2 border-zinc-300 dark:border-zinc-700">{fmt(grand.ANK.general)}</td>
                                            <td className="text-right px-1.5 py-1 sticky bottom-7 z-30 bg-zinc-100 dark:bg-zinc-900 border-l border-t-2 border-zinc-300 dark:border-zinc-700">{fmt(grand.ANK.totalCost)}</td>
                                            <td className="text-right px-1.5 py-1 sticky bottom-7 z-30 bg-zinc-100 dark:bg-zinc-900 border-t-2 border-zinc-300 dark:border-zinc-700">{fmt(grand.ANK.totalSpent)}</td>
                                            <td rowSpan={2} className="text-right px-1.5 py-1 sticky bottom-0 z-30 bg-emerald-50 dark:bg-emerald-950/40 border-l border-t-2 border-zinc-300 dark:border-zinc-700 align-middle">{fmt(grand.received)}</td>
                                            <td rowSpan={2} className={`text-right px-1.5 py-1 sticky bottom-0 z-30 bg-violet-50 dark:bg-violet-950/40 border-l border-t-2 border-zinc-300 dark:border-zinc-700 align-middle font-bold ${grand.balanceVsCost < 0 ? "text-rose-600" : "text-emerald-700 dark:text-emerald-400"}`}>{fmt(grand.balanceVsCost)}</td>
                                            <td rowSpan={2} className={`text-right px-1.5 py-1 sticky bottom-0 z-30 bg-violet-50 dark:bg-violet-950/40 border-t-2 border-zinc-300 dark:border-zinc-700 align-middle font-bold ${grand.balanceVsSpent < 0 ? "text-rose-600" : "text-emerald-700 dark:text-emerald-400"}`}>{fmt(grand.balanceVsSpent)}</td>
                                        </tr>
                                        <tr className="bg-zinc-100 dark:bg-zinc-900 font-semibold">
                                            <td className="px-1.5 py-1 sticky left-[140px] bottom-0 z-40 bg-zinc-100 dark:bg-zinc-900 w-[44px] min-w-[44px] max-w-[44px] border-r border-zinc-200 dark:border-zinc-800">BAG</td>
                                            <td className="text-right px-1.5 py-1 sticky bottom-0 z-30 bg-zinc-100 dark:bg-zinc-900">{fmt(grand.BAG.material)}</td>
                                            <td className="text-right px-1.5 py-1 sticky bottom-0 z-30 bg-zinc-100 dark:bg-zinc-900">{fmt(grand.BAG.labour)}</td>
                                            <td className="text-right px-1.5 py-1 sticky bottom-0 z-30 bg-zinc-100 dark:bg-zinc-900">{fmt(grand.BAG.subcontractor)}</td>
                                            <td className="text-right px-1.5 py-1 sticky bottom-0 z-30 bg-zinc-100 dark:bg-zinc-900">{fmt(grand.BAG.unclassified)}</td>
                                            <td className="text-right px-1.5 py-1 sticky bottom-0 z-30 bg-zinc-100 dark:bg-zinc-900">{fmt(grand.BAG.common)}</td>
                                            <td className="text-right px-1.5 py-1 sticky bottom-0 z-30 bg-zinc-100 dark:bg-zinc-900">{fmt(grand.BAG.general)}</td>
                                            <td className="text-right px-1.5 py-1 sticky bottom-0 z-30 bg-zinc-100 dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800">{fmt(grand.BAG.totalCost)}</td>
                                            <td className="text-right px-1.5 py-1 sticky bottom-0 z-30 bg-zinc-100 dark:bg-zinc-900">{fmt(grand.BAG.totalSpent)}</td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}

function ProjectRows({ row }: { row: ProjectRow }) {
    const renderRow = (src: Source, isFirst: boolean) => {
        const t = row.bySource[src];
        // Sticky cells need an explicit solid bg so scrolling content doesn't bleed through.
        const rowBg = isFirst
            ? "bg-white dark:bg-zinc-900"
            : "bg-zinc-50/60 dark:bg-zinc-900/40";
        return (
            <tr className={`border-b border-zinc-100 dark:border-zinc-800/60 ${rowBg}`}>
                {isFirst ? (
                    <td rowSpan={2} className="px-2 py-1 align-middle font-medium text-zinc-800 dark:text-zinc-200 sticky left-0 z-20 w-[140px] min-w-[140px] max-w-[140px] bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800">
                        <div className="leading-tight truncate">{row.desc}</div>
                        <div className="text-[10px] text-zinc-500 font-normal leading-tight">{row.project}</div>
                    </td>
                ) : null}
                <td className={`px-1.5 py-1 text-zinc-600 dark:text-zinc-400 font-medium sticky left-[140px] z-20 w-[44px] min-w-[44px] max-w-[44px] border-r border-zinc-200 dark:border-zinc-800 ${rowBg}`}>{src}</td>
                <td className="text-right px-1.5 py-1">{fmt(t.material)}</td>
                <td className="text-right px-1.5 py-1">{fmt(t.labour)}</td>
                <td className="text-right px-1.5 py-1">{fmt(t.subcontractor)}</td>
                <td className="text-right px-1.5 py-1">{fmt(t.unclassified)}</td>
                <td className="text-right px-1.5 py-1">{fmt(t.common)}</td>
                <td className="text-right px-1.5 py-1">{fmt(t.general)}</td>
                <td className="text-right px-1.5 py-1 border-l border-zinc-200 dark:border-zinc-800 font-semibold">{fmt(t.totalCost)}</td>
                <td className="text-right px-1.5 py-1 font-semibold">{fmt(t.totalSpent)}</td>
                {isFirst ? (
                    <>
                        <td rowSpan={2} className="text-right px-1.5 py-1 border-l border-zinc-200 dark:border-zinc-800 align-middle font-semibold bg-emerald-50/40 dark:bg-emerald-950/20">{fmt(row.received)}</td>
                        <td rowSpan={2} className={`text-right px-1.5 py-1 border-l border-zinc-200 dark:border-zinc-800 align-middle font-semibold bg-violet-50/40 dark:bg-violet-950/20 ${row.balanceVsCost < 0 ? "text-rose-600" : "text-emerald-700 dark:text-emerald-400"}`}>{fmt(row.balanceVsCost)}</td>
                        <td rowSpan={2} className={`text-right px-1.5 py-1 align-middle font-semibold bg-violet-50/40 dark:bg-violet-950/20 ${row.balanceVsSpent < 0 ? "text-rose-600" : "text-emerald-700 dark:text-emerald-400"}`}>{fmt(row.balanceVsSpent)}</td>
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
