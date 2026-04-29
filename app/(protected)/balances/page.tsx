"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import {
    Bar,
    Line,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ComposedChart,
} from "recharts";
import { AlertCircle, Wallet, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { CompactMultiSelect } from "@/components/ui/compact-multi-select";
import { formatCurrency } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const PIE_PALETTE = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];

interface ApiRow {
    yr: number;
    mo: number;
    project: string;
    amount: number;
}

interface ApiResponse {
    netPosition: ApiRow[];
    spent: ApiRow[];
}

interface MonthlyPoint {
    month: string;
    sortKey: number;
    netPosition: number;
    spent: number;
    delta: number;
    cumulative: number;
}

function formatAxisValue(value: number) {
    if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${Math.round(value)}`;
}

interface BalanceTooltipPayload {
    netPosition?: number;
    spent?: number;
    delta?: number;
    cumulative?: number;
}

function BalanceTooltip({
    active,
    payload,
    label,
}: {
    active?: boolean;
    payload?: { payload?: BalanceTooltipPayload }[];
    label?: string | number;
}) {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    if (!d) return null;
    const row = (color: string, lbl: string, value: number | undefined) => {
        if (!value) return null;
        return (
            <div className="flex items-center gap-2 text-sm">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="text-zinc-600 dark:text-zinc-400 mr-auto">{lbl}:</span>
                <span className={`font-semibold tabular-nums ${value < 0 ? "text-rose-600 dark:text-rose-400" : "text-zinc-900 dark:text-zinc-100"}`}>
                    {formatCurrency(value)}
                </span>
            </div>
        );
    };
    return (
        <div className="rounded-xl border border-zinc-200/50 dark:border-zinc-700/50 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl p-3 shadow-2xl min-w-[280px] space-y-1">
            {label !== undefined && label !== "" && <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-2">{label}</p>}
            {row("#10b981", "Net Position", d.netPosition)}
            {row("#ef4444", "Spent", d.spent)}
            <div className="border-t border-zinc-200/50 dark:border-zinc-700/50 pt-1 mt-1">
                {row("#71717a", "Monthly Balance Δ", d.delta)}
                {row("#6366f1", "Cumulative Balance", d.cumulative)}
            </div>
        </div>
    );
}

function buildSeries(netRows: ApiRow[], spentRows: ApiRow[]): MonthlyPoint[] {
    const buckets: Record<number, { sortKey: number; month: string; net: number; spent: number }> = {};

    const ingest = (rows: ApiRow[], field: "net" | "spent") => {
        rows.forEach((r) => {
            const sortKey = r.yr * 12 + (r.mo - 1);
            const monthLabel = `${MONTH_NAMES[r.mo - 1]} ${String(r.yr).slice(2)}`;
            if (!buckets[sortKey]) {
                buckets[sortKey] = { sortKey, month: monthLabel, net: 0, spent: 0 };
            }
            buckets[sortKey][field] += Number(r.amount || 0);
        });
    };

    ingest(netRows, "net");
    ingest(spentRows, "spent");

    const sorted = Object.values(buckets).sort((a, b) => a.sortKey - b.sortKey);
    let cum = 0;
    return sorted.map((b) => {
        const delta = b.net - b.spent;
        cum += delta;
        return {
            month: b.month,
            sortKey: b.sortKey,
            netPosition: Math.round(b.net),
            spent: Math.round(b.spent),
            delta: Math.round(delta),
            cumulative: Math.round(cum),
        };
    });
}

export default function BalancesPage() {
    const { data, error, isLoading } = useSWR<ApiResponse>("/api/balance", fetcher, {
        revalidateOnFocus: false,
        dedupingInterval: 60000,
    });

    // All distinct projects (union of net position and spent), used by the multi-select
    const allProjects = useMemo(() => {
        if (!data) return [];
        const set = new Set<string>();
        data.netPosition.forEach((r) => r.project && set.add(r.project));
        data.spent.forEach((r) => r.project && set.add(r.project));
        const sorted = [...set].sort();
        // Push "(empty)" to the end if present
        return sorted.filter((p) => p !== "(empty)").concat(sorted.filter((p) => p === "(empty)"));
    }, [data]);

    // Empty selection = ALL projects (semantically). Picking specific projects narrows.
    const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
    const isAll = selectedProjects.length === 0;

    const overallSeries = useMemo(() => {
        if (!data) return [];
        if (isAll) return buildSeries(data.netPosition, data.spent);
        const allowed = new Set(selectedProjects);
        const netFiltered = data.netPosition.filter((r) => allowed.has(r.project));
        const spentFiltered = data.spent.filter((r) => allowed.has(r.project));
        return buildSeries(netFiltered, spentFiltered);
    }, [data, selectedProjects, isAll]);

    // Bar Y-axis domain: scale bars to occupy lower portion of the chart so the
    // cumulative line has room above. Multiplier is tuned per chart.
    const overallBarDomain = useMemo<[number, number]>(() => {
        if (!overallSeries.length) return [0, 1];
        const maxBar = Math.max(
            ...overallSeries.map((d) => Math.max(d.netPosition, d.spent))
        );
        return [0, maxBar > 0 ? maxBar * 3.5 : 1];
    }, [overallSeries]);

    const projectSeries = useMemo(() => {
        if (!data) return [];
        // Projects with income = those that appear in netPosition (excluding (empty))
        const projectsWithIncome = new Set<string>();
        data.netPosition.forEach((r) => {
            if (r.project && r.project !== "(empty)") projectsWithIncome.add(r.project);
        });

        const result: { project: string; series: MonthlyPoint[]; total: number }[] = [];
        projectsWithIncome.forEach((project) => {
            const net = data.netPosition.filter((r) => r.project === project);
            const spent = data.spent.filter((r) => r.project === project);
            const series = buildSeries(net, spent);
            const total = series.length ? series[series.length - 1].cumulative : 0;
            result.push({ project, series, total });
        });

        return result.sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
    }, [data]);

    const summary = useMemo(() => {
        if (!overallSeries.length) return { net: 0, spent: 0, balance: 0 };
        const totalNet = overallSeries.reduce((s, p) => s + p.netPosition, 0);
        const totalSpent = overallSeries.reduce((s, p) => s + p.spent, 0);
        return { net: totalNet, spent: totalSpent, balance: totalNet - totalSpent };
    }, [overallSeries]);

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans">
            <main className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Balances</h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        Cash balance over time = Net Position − Spent. Per-project view is shown only for projects that have received income.
                    </p>
                </div>

                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="w-4 h-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>Failed to load balance data.</AlertDescription>
                    </Alert>
                )}

                {isLoading && <Skeleton className="h-[400px] w-full rounded-2xl" />}

                {!isLoading && !error && data && (
                    <>
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <KpiCard
                                label="Total Net Position"
                                value={summary.net}
                                icon={<ArrowDownCircle className="w-5 h-5 text-emerald-500" />}
                                accent="from-emerald-500/10 to-emerald-500/0"
                                hint="Cumulative cash received across all projects"
                            />
                            <KpiCard
                                label="Total Spent"
                                value={summary.spent}
                                icon={<ArrowUpCircle className="w-5 h-5 text-rose-500" />}
                                accent="from-rose-500/10 to-rose-500/0"
                                hint="Sum from view_muhasebe_konsolide (excluding TAH-CA)"
                            />
                            <KpiCard
                                label="Balance (Net − Spent)"
                                value={summary.balance}
                                icon={<Wallet className="w-5 h-5 text-violet-500" />}
                                accent={summary.balance >= 0 ? "from-emerald-500/10 to-emerald-500/0" : "from-rose-500/10 to-rose-500/0"}
                                hint="Positive = surplus • Negative = deficit"
                            />
                        </div>

                        {/* Combined balance chart */}
                        <ChartFrame
                            title="Overall Balance — All Projects Combined"
                            subtitle={
                                isAll
                                    ? "ALL projects • Monthly Net Position (green) and Spent (red) bars; cumulative balance line"
                                    : `${selectedProjects.length} of ${allProjects.length} projects selected`
                            }
                        >
                            <div className="mb-4 flex flex-wrap items-center gap-3">
                                <span className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">Projects</span>
                                <div className="w-[260px]">
                                    <CompactMultiSelect
                                        options={allProjects.map((p) => ({ label: p, value: p }))}
                                        selected={selectedProjects}
                                        onChange={setSelectedProjects}
                                        placeholder="ALL Projects"
                                    />
                                </div>
                            </div>
                            <ResponsiveContainer width="100%" height={420}>
                                <ComposedChart data={overallSeries} margin={{ top: 10, right: 20, left: 10, bottom: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#71717a" }} angle={-45} textAnchor="end" height={50} />
                                    <YAxis yAxisId="line" tickFormatter={formatAxisValue} tick={{ fontSize: 11, fill: "#71717a" }} width={70} />
                                    <YAxis yAxisId="bars" hide domain={overallBarDomain} />
                                    <Tooltip content={<BalanceTooltip />} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                                    <Bar yAxisId="bars" dataKey="netPosition" name="Net Position">
                                        {overallSeries.map((d, i) => (
                                            <Cell key={i} fill={d.netPosition >= 0 ? "#10b981" : "#ef4444"} />
                                        ))}
                                    </Bar>
                                    <Bar yAxisId="bars" dataKey="spent" name="Spent (out)" fill="#ef4444" fillOpacity={0.55} />
                                    <Line yAxisId="line" type="monotone" dataKey="cumulative" name="Cumulative Balance" stroke="#6366f1" strokeWidth={2.5} dot={false} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </ChartFrame>

                        {/* Per-project grid */}
                        {projectSeries.length > 0 && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {projectSeries.map((p, i) => {
                                    const maxBar = p.series.length
                                        ? Math.max(...p.series.map((d) => Math.max(d.netPosition, d.spent)))
                                        : 1;
                                    const barDomain: [number, number] = [0, maxBar > 0 ? maxBar * 3.5 : 1];
                                    return (
                                        <ChartFrame
                                            key={p.project}
                                            title={`${p.project} — Balance`}
                                            subtitle={`Cumulative ${formatCurrency(p.total)}`}
                                        >
                                            <ResponsiveContainer width="100%" height={280}>
                                                <ComposedChart data={p.series} margin={{ top: 10, right: 20, left: 10, bottom: 30 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                                                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#71717a" }} angle={-45} textAnchor="end" height={50} />
                                                    <YAxis yAxisId="line" tickFormatter={formatAxisValue} tick={{ fontSize: 10, fill: "#71717a" }} width={70} />
                                                    <YAxis yAxisId="bars" hide domain={barDomain} />
                                                    <Tooltip content={<BalanceTooltip />} />
                                                    <Bar yAxisId="bars" dataKey="netPosition" name="Net Position">
                                                        {p.series.map((d, idx) => (
                                                            <Cell key={idx} fill={d.netPosition >= 0 ? "#10b981" : "#ef4444"} />
                                                        ))}
                                                    </Bar>
                                                    <Bar yAxisId="bars" dataKey="spent" name="Spent" fill="#ef4444" fillOpacity={0.55} />
                                                    <Line
                                                        yAxisId="line"
                                                        type="monotone"
                                                        dataKey="cumulative"
                                                        name="Cumulative"
                                                        stroke={PIE_PALETTE[i % PIE_PALETTE.length]}
                                                        strokeWidth={2.5}
                                                        dot={false}
                                                    />
                                                </ComposedChart>
                                            </ResponsiveContainer>
                                        </ChartFrame>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}

function KpiCard({
    label,
    value,
    icon,
    accent,
    hint,
}: {
    label: string;
    value: number;
    icon: React.ReactNode;
    accent: string;
    hint?: string;
}) {
    return (
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 shadow-sm p-5">
            <div className={`absolute inset-0 bg-gradient-to-br ${accent} pointer-events-none`} />
            <div className="relative">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">{label}</span>
                    {icon}
                </div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white tabular-nums">{formatCurrency(value)}</p>
                {hint && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{hint}</p>}
            </div>
        </div>
    );
}

function ChartFrame({
    title,
    subtitle,
    children,
}: {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 shadow-sm p-5">
            <div className="mb-3">
                <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{title}</h3>
                {subtitle && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{subtitle}</p>}
            </div>
            {children}
        </div>
    );
}
