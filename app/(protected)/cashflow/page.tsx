"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import useSWR from "swr";
import { Suspense, useMemo, useState } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const PROJECTS: Record<string, { desc: string; order: number }> = {
    "HQ": { desc: "INFO CENTER HQ", order: 1 },
    "ADM": { desc: "INFO CENTER ADMIN", order: 2 },
    "HQAUX": { desc: "INFO CENTER AUX", order: 3 },
    "SRY2": { desc: "PALACE-PH-2", order: 4 },
    "OBGH": { desc: "GUEST HOUSE REN. PH 1", order: 5 },
    "SRY": { desc: "PALACE-PH-1", order: 6 },
    "THR": { desc: "TAHRIR", order: 7 },
    "GAC": { desc: "GENERAL ADMINSTRATIVE", order: 8 },
    "DLH": { desc: "DREAMLINE HANGAR", order: 9 },
    "ZBS": { desc: "ZIRAAT BAGHDAD BRANCH OFFICE", order: 10 },
    "WHP": { desc: "WAITING HALL PALACE", order: 11 },
    "NBGH": { desc: "GUEST HOUSE EXTENSION", order: 12 },
    "VLL": { desc: "BAKANIN VİLLASI", order: 13 },
    "PMO": { desc: "PMO SARAY DIŞINDAKİ BİNA", order: 14 },
    "FSC": { desc: "FEDERAL SUPREME COURT", order: 15 },
    "DIC": { desc: "DICLE PALACE", order: 16 },
    "VLL3": { desc: "RAWAND'IN YAPTIR. VILLA", order: 17 },
    "ANG": { desc: "TCBBE", order: 18 },
    "MLK": { desc: "KADININ VİLLASI", order: 19 },
    "PMO2": { desc: "NAFIZ BEYIN YAPTIGI", order: 20 },
    "VBATH": { desc: "LEVENTİN YAPTIĞI VİLLA", order: 21 },
    "OGHF": { desc: "OLD GUEST HOUSE FURN.", order: 22 },
};

const PROJECT_LIST = Object.entries(PROJECTS)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([code, meta]) => ({ code, desc: meta.desc }));

const SOURCES = ["ANK", "BAG"];

interface CashflowRow {
    yr: number;
    mo: number;
    total_cost: string | number;
    total_spent: string | number;
}

function formatAxisValue(value: number) {
    if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value}`;
}

function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl border border-zinc-200/50 dark:border-zinc-700/50 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl p-3 shadow-2xl shadow-zinc-900/10 dark:shadow-black/30">
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-2">{label}</p>
            {payload.map((entry: any) => (
                <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-zinc-600 dark:text-zinc-400">{entry.name}:</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(entry.value)}
                    </span>
                </div>
            ))}
        </div>
    );
}

function CashFlowContent() {
    const [selectedProject, setSelectedProject] = useState<string>("");
    const [selectedSource, setSelectedSource] = useState<string>("all");

    const apiUrl = useMemo(() => {
        if (!selectedProject) return null;
        let url = `/api/cashflow?project=${selectedProject}`;
        if (selectedSource && selectedSource !== "all") url += `&source=${selectedSource}`;
        return url;
    }, [selectedProject, selectedSource]);

    const { data, error, isLoading } = useSWR<CashflowRow[]>(apiUrl, fetcher, {
        revalidateOnFocus: false,
        dedupingInterval: 60000,
    });

    const cumulativeData = useMemo(() => {
        if (!data || data.length === 0) return [];

        let cumCost = 0;
        let cumSpent = 0;

        return data.map((row) => {
            cumCost += Number(row.total_cost) || 0;
            cumSpent += Number(row.total_spent) || 0;

            return {
                month: `${MONTH_NAMES[row.mo - 1]} ${String(row.yr).slice(2)}`,
                cost: Math.round(cumCost),
                spent: Math.round(cumSpent),
            };
        });
    }, [data]);

    const summary = useMemo(() => {
        if (!cumulativeData.length) return { totalCost: 0, totalSpent: 0 };
        const last = cumulativeData[cumulativeData.length - 1];
        return { totalCost: last.cost, totalSpent: last.spent };
    }, [cumulativeData]);

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans">
            <main className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
                {/* Header & Filters */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                        Cash Flow
                    </h1>
                    <div className="flex items-center gap-3 flex-wrap">
                        <Select value={selectedProject} onValueChange={setSelectedProject}>
                            <SelectTrigger className="w-[280px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                                <SelectValue placeholder="Select Project" />
                            </SelectTrigger>
                            <SelectContent>
                                {PROJECT_LIST.map((p) => (
                                    <SelectItem key={p.code} value={p.code}>
                                        {p.code} — {p.desc}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={selectedSource} onValueChange={setSelectedSource}>
                            <SelectTrigger className="w-[120px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                                <SelectValue placeholder="Source" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Sources</SelectItem>
                                {SOURCES.map((s) => (
                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Error State */}
                {error && (
                    <Alert variant="destructive" className="max-w-md">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>Failed to load cash flow data.</AlertDescription>
                    </Alert>
                )}

                {/* Empty State */}
                {!selectedProject && (
                    <div className="flex items-center justify-center h-[500px] rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white/50 dark:bg-zinc-900/50">
                        <p className="text-zinc-500 dark:text-zinc-400 text-lg">
                            Select a project to view cash flow
                        </p>
                    </div>
                )}

                {/* Loading State */}
                {selectedProject && isLoading && (
                    <Skeleton className="h-[500px] w-full rounded-2xl" />
                )}

                {/* Chart */}
                {selectedProject && !isLoading && !error && data && (
                    <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 shadow-lg shadow-zinc-900/5 dark:shadow-black/20 p-5">
                                <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 mb-1">
                                    <TrendingUp className="w-4 h-4 text-indigo-500" />
                                    Total Cost
                                </div>
                                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                                    {formatCurrency(summary.totalCost)}
                                </p>
                            </div>
                            <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 shadow-lg shadow-zinc-900/5 dark:shadow-black/20 p-5">
                                <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 mb-1">
                                    <TrendingDown className="w-4 h-4 text-emerald-500" />
                                    Total Spent
                                </div>
                                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                                    {formatCurrency(summary.totalSpent)}
                                </p>
                            </div>
                            <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 shadow-lg shadow-zinc-900/5 dark:shadow-black/20 p-5">
                                <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 mb-1">
                                    Difference
                                </div>
                                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                                    {formatCurrency(summary.totalCost - summary.totalSpent)}
                                </p>
                            </div>
                        </div>

                        {/* Chart Card */}
                        {cumulativeData.length === 0 ? (
                            <div className="flex items-center justify-center h-[400px] rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white/50 dark:bg-zinc-900/50">
                                <p className="text-zinc-500 dark:text-zinc-400">
                                    No data for this project
                                </p>
                            </div>
                        ) : (
                            <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 shadow-lg shadow-zinc-900/5 dark:shadow-black/20 p-6">
                                <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-4">
                                    Cumulative Cash Flow — {selectedProject}
                                    {selectedSource !== "all" && ` (${selectedSource})`}
                                </h2>
                                <ResponsiveContainer width="100%" height={480}>
                                    <LineChart data={cumulativeData} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                                        <XAxis
                                            dataKey="month"
                                            tick={{ fontSize: 12, fill: "#71717a" }}
                                            angle={-45}
                                            textAnchor="end"
                                            height={60}
                                            interval={cumulativeData.length > 24 ? Math.floor(cumulativeData.length / 12) - 1 : 0}
                                        />
                                        <YAxis
                                            tickFormatter={formatAxisValue}
                                            tick={{ fontSize: 12, fill: "#71717a" }}
                                            width={80}
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend
                                            verticalAlign="top"
                                            height={36}
                                            iconType="circle"
                                            wrapperStyle={{ fontSize: 14 }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="cost"
                                            name="Cost"
                                            stroke="#6366f1"
                                            strokeWidth={2.5}
                                            dot={false}
                                            activeDot={{ r: 5, strokeWidth: 2 }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="spent"
                                            name="Spent"
                                            stroke="#10b981"
                                            strokeWidth={2.5}
                                            dot={false}
                                            activeDot={{ r: 5, strokeWidth: 2 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* Calculation Filters */}
                        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 shadow-lg shadow-zinc-900/5 dark:shadow-black/20 p-5">
                            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">Calculation Filters</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-indigo-500 shrink-0" />
                                        <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Cost</span>
                                    </div>
                                    <div className="pl-5 space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                                        <p><span className="text-zinc-700 dark:text-zinc-300 font-medium">Source:</span> view_muhasebe_konsolide</p>
                                        <p><span className="text-zinc-700 dark:text-zinc-300 font-medium">Partner:</span> GORKEM</p>
                                        <p><span className="text-zinc-700 dark:text-zinc-300 font-medium">Source:</span> ANK, BAG <span className="text-zinc-400">(ERB excluded)</span></p>
                                        <p><span className="text-zinc-700 dark:text-zinc-300 font-medium">Cost:</span> &gt; 0</p>
                                        <p><span className="text-zinc-700 dark:text-zinc-300 font-medium">Amount:</span> SUM(-1 &times; usd_degeri)</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                                        <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Spent</span>
                                    </div>
                                    <div className="pl-5 space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                                        <p><span className="text-zinc-700 dark:text-zinc-300 font-medium">Source:</span> view_muhasebe_konsolide</p>
                                        <p><span className="text-zinc-700 dark:text-zinc-300 font-medium">Partner:</span> GORKEM</p>
                                        <p><span className="text-zinc-700 dark:text-zinc-300 font-medium">Source:</span> ANK, BAG <span className="text-zinc-400">(ERB excluded)</span></p>
                                        <p><span className="text-zinc-700 dark:text-zinc-300 font-medium">Cost:</span> &gt; 0</p>
                                        <p><span className="text-zinc-700 dark:text-zinc-300 font-medium">IslemTuru:</span> &ne; TAH-CA</p>
                                        <p><span className="text-zinc-700 dark:text-zinc-300 font-medium">Amount:</span> SUM(-1 &times; usd_degeri)</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}

export default function CashFlowPage() {
    return (
        <Suspense fallback={<Skeleton className="w-full h-screen" />}>
            <CashFlowContent />
        </Suspense>
    );
}
