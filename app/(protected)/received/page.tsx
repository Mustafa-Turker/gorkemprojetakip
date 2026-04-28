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
    Area,
} from "recharts";
import {
    AlertCircle,
    ArrowDownCircle,
    Banknote,
    Lock,
    Pencil,
    Plus,
    Trash2,
    TrendingUp,
    Wallet,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const EDITOR_USERNAME = "mustafa";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const TYPES = ["INCOME", "TRANSFER", "KDV Return", "BLOCKED"] as const;
const CURRENCIES = ["USD", "IQD", "TRY", "EUR"] as const;
const SOURCES = ["BAG", "ANK"] as const;
const CATEGORIES = ["INVOICE", "ADVANCE", "C.COST", "KDV Return", ""] as const;

interface CashFlowRow {
    id: string;
    date: string;
    description: string | null;
    amount: string | number;
    currency: string;
    currency_rate: string | number;
    project: string | null;
    usd_equal: string | number | null;
    type: string;
    counter_party: string | null;
    category: string | null;
    is_exchange: boolean;
    source: string | null;
}

const TYPE_COLORS: Record<string, string> = {
    INCOME: "#10b981",
    TRANSFER: "#6366f1",
    "KDV Return": "#f59e0b",
    BLOCKED: "#ef4444",
};

const SOURCE_COLORS: Record<string, string> = {
    BAG: "#8b5cf6",
    ANK: "#06b6d4",
};

const PIE_PALETTE = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];

function formatAxisValue(value: number) {
    if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${Math.round(value)}`;
}

interface TooltipEntry {
    name?: string;
    value?: number | string;
    color?: string;
    dataKey?: string;
    payload?: { fill?: string };
}
interface TooltipProps {
    active?: boolean;
    payload?: TooltipEntry[];
    label?: string | number;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl border border-zinc-200/50 dark:border-zinc-700/50 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl p-3 shadow-2xl">
            {label !== undefined && label !== "" && <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-2">{label}</p>}
            {payload.map((entry, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color || entry.payload?.fill }} />
                    <span className="text-zinc-600 dark:text-zinc-400">{entry.name}:</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(Number(entry.value))}
                    </span>
                </div>
            ))}
        </div>
    );
}

interface DetailedTooltipPayload {
    received?: number;
    rsccInvoices?: number;
    rsccExchange?: number;
    blocked?: number;
    jv?: number;
    netMonthly?: number;
    cumulative?: number;
}

function ProjectFlowTooltip({
    active,
    payload,
    label,
}: {
    active?: boolean;
    payload?: { payload?: DetailedTooltipPayload }[];
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
            {row("#10b981", "Total Received", d.received)}
            {row("#6366f1", "Transferred RSCC Invoices", d.rsccInvoices)}
            {row("#f59e0b", "Transferred RSCC Exchange", d.rsccExchange)}
            {row("#ef4444", "Blocked", d.blocked)}
            {row("#06b6d4", "JV", d.jv)}
            <div className="border-t border-zinc-200/50 dark:border-zinc-700/50 pt-1 mt-1">
                {row("#71717a", "Net Monthly", d.netMonthly)}
                {row("#8b5cf6", "Cumulative", d.cumulative)}
            </div>
        </div>
    );
}


interface FormState {
    id?: string;
    date: string;
    description: string;
    amount: string;
    currency: string;
    currency_rate: string;
    project: string;
    type: string;
    counter_party: string;
    category: string;
    is_exchange: boolean;
    source: string;
}

const EMPTY_FORM: FormState = {
    date: new Date().toISOString().slice(0, 10),
    description: "",
    amount: "",
    currency: "USD",
    currency_rate: "1",
    project: "",
    type: "INCOME",
    counter_party: "",
    category: "",
    is_exchange: false,
    source: "BAG",
};

export default function ReceivedAmountsPage() {
    const { data, error, isLoading, mutate } = useSWR<CashFlowRow[]>("/api/cash-flow", fetcher, {
        revalidateOnFocus: false,
        dedupingInterval: 60000,
    });

    const { data: meData } = useSWR<{ username: string | null }>("/api/auth/me", fetcher, {
        revalidateOnFocus: false,
        dedupingInterval: 60000,
    });
    const username = meData?.username ?? null;
    const canEdit = username === EDITOR_USERNAME;

    // Filters
    const [yearFilter, setYearFilter] = useState<string>("all");
    const [sourceFilter, setSourceFilter] = useState<string>("all");
    const [typeFilter, setTypeFilter] = useState<string>("all");
    const [projectFilter, setProjectFilter] = useState<string>("all");
    const [currencyFilter, setCurrencyFilter] = useState<string>("all");
    const [search, setSearch] = useState("");

    // Edit dialog
    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    // Delete confirm
    const [deleteRow, setDeleteRow] = useState<CashFlowRow | null>(null);
    const [deleting, setDeleting] = useState(false);

    const rows: CashFlowRow[] = useMemo(() => data || [], [data]);

    // Filter options derived from data
    const years = useMemo(() => {
        const set = new Set<number>();
        rows.forEach((r) => {
            if (r.date) set.add(new Date(r.date).getUTCFullYear());
        });
        return [...set].sort((a, b) => b - a);
    }, [rows]);

    const projects = useMemo(() => {
        const set = new Set<string>();
        rows.forEach((r) => r.project && set.add(r.project));
        return [...set].sort();
    }, [rows]);

    const filtered = useMemo(() => {
        return rows.filter((r) => {
            if (yearFilter !== "all") {
                const y = r.date ? new Date(r.date).getUTCFullYear() : 0;
                if (String(y) !== yearFilter) return false;
            }
            if (sourceFilter !== "all" && r.source !== sourceFilter) return false;
            if (typeFilter !== "all" && r.type !== typeFilter) return false;
            if (projectFilter !== "all" && (r.project || "") !== projectFilter) return false;
            if (currencyFilter !== "all" && r.currency !== currencyFilter) return false;
            if (search) {
                const q = search.toLowerCase();
                const hay = [r.description, r.counter_party, r.project, r.category]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });
    }, [rows, yearFilter, sourceFilter, typeFilter, projectFilter, currencyFilter, search]);

    // KPIs (USD)
    const kpis = useMemo(() => {
        const totalBlocked = filtered
            .filter((r) => r.type === "BLOCKED")
            .reduce((s, r) => s + Number(r.usd_equal || 0), 0);

        // Net position per source (BAG / ANK running balance from all rows in scope)
        const bySource: Record<string, number> = {};
        filtered.forEach((r) => {
            const src = r.source || "?";
            bySource[src] = (bySource[src] || 0) + Number(r.usd_equal || 0);
        });

        // RSCC flows split by is_exchange
        const splitRscc = (matchExchange: boolean) => {
            let inAmt = 0;
            let outAmt = 0;
            filtered.forEach((r) => {
                if (r.type !== "TRANSFER") return;
                if (r.counter_party !== "RSCC") return;
                if (!!r.is_exchange !== matchExchange) return;
                const v = Number(r.usd_equal || 0);
                if (v > 0) inAmt += v;
                else outAmt += Math.abs(v);
            });
            return { in: inAmt, out: outAmt, net: inAmt - outAmt };
        };

        return {
            totalBlocked,
            bySource,
            rsccInvoices: splitRscc(false),
            rsccExchange: splitRscc(true),
        };
    }, [filtered]);

    // Monthly net position over time (all flows, monthly delta + cumulative + breakdown)
    const monthlyNetPosition = useMemo(() => {
        type Bucket = {
            sortKey: number;
            month: string;
            received: number;
            rsccInvoices: number;
            rsccExchange: number;
            blocked: number;
            jv: number;
            netMonthly: number;
        };
        const buckets: Record<number, Bucket> = {};
        filtered.forEach((r) => {
            if (!r.date) return;
            const d = new Date(r.date);
            const y = d.getUTCFullYear();
            const m = d.getUTCMonth();
            const key = `${MONTH_NAMES[m]} ${String(y).slice(2)}`;
            const sortKey = y * 12 + m;
            if (!buckets[sortKey]) {
                buckets[sortKey] = {
                    sortKey,
                    month: key,
                    received: 0,
                    rsccInvoices: 0,
                    rsccExchange: 0,
                    blocked: 0,
                    jv: 0,
                    netMonthly: 0,
                };
            }
            const b = buckets[sortKey];
            const v = Number(r.usd_equal || 0);
            b.netMonthly += v;
            if (r.counter_party === "JV") b.jv += v;
            if ((r.type === "INCOME" || r.type === "KDV Return") && r.counter_party !== "JV") b.received += v;
            if (r.type === "BLOCKED") b.blocked += v;
            if (r.type === "TRANSFER" && r.counter_party === "RSCC") {
                if (r.is_exchange) b.rsccExchange += v;
                else b.rsccInvoices += v;
            }
        });
        const arr = Object.values(buckets).sort((a, b) => a.sortKey - b.sortKey);
        let cum = 0;
        return arr.map((b) => {
            cum += b.netMonthly;
            return {
                month: b.month,
                received: Math.round(b.received),
                rsccInvoices: Math.round(b.rsccInvoices),
                rsccExchange: Math.round(b.rsccExchange),
                blocked: Math.round(b.blocked),
                jv: Math.round(b.jv),
                netMonthly: Math.round(b.netMonthly),
                cumulative: Math.round(cum),
            };
        });
    }, [filtered]);

    // Helper: rows excluded from project-level views (internal ANK<->BAG transfers
    // are neutral and counter_party=ANK/BAG marks them as such).
    const isProjectRelevant = (r: CashFlowRow) =>
        r.counter_party !== "ANK" && r.counter_party !== "BAG";

    // Per-project detailed monthly flow (with breakdown fields for tooltip)
    const projectFlowsDetailed = useMemo(() => {
        type Bucket = {
            sortKey: number;
            month: string;
            received: number;
            rsccInvoices: number;
            rsccExchange: number;
            blocked: number;
            jv: number;
            netMonthly: number;
        };
        const projectMap: Record<string, Record<number, Bucket>> = {};

        filtered.forEach((r) => {
            if (!isProjectRelevant(r)) return;
            if (!r.date) return;
            const p = r.project || "(empty)";
            const d = new Date(r.date);
            const y = d.getUTCFullYear();
            const m = d.getUTCMonth();
            const sortKey = y * 12 + m;
            const monthLabel = `${MONTH_NAMES[m]} ${String(y).slice(2)}`;

            if (!projectMap[p]) projectMap[p] = {};
            if (!projectMap[p][sortKey]) {
                projectMap[p][sortKey] = {
                    sortKey,
                    month: monthLabel,
                    received: 0,
                    rsccInvoices: 0,
                    rsccExchange: 0,
                    blocked: 0,
                    jv: 0,
                    netMonthly: 0,
                };
            }
            const b = projectMap[p][sortKey];
            const v = Number(r.usd_equal || 0);
            b.netMonthly += v;
            if (r.counter_party === "JV") b.jv += v;
            if ((r.type === "INCOME" || r.type === "KDV Return") && r.counter_party !== "JV") b.received += v;
            if (r.type === "BLOCKED") b.blocked += v;
            if (r.type === "TRANSFER" && r.counter_party === "RSCC") {
                if (r.is_exchange) b.rsccExchange += v;
                else b.rsccInvoices += v;
            }
        });

        return Object.entries(projectMap)
            .map(([project, bucketMap]) => {
                const sorted = Object.values(bucketMap).sort((a, b) => a.sortKey - b.sortKey);
                let cum = 0;
                const series = sorted.map((b) => {
                    cum += b.netMonthly;
                    return {
                        month: b.month,
                        received: Math.round(b.received),
                        rsccInvoices: Math.round(b.rsccInvoices),
                        rsccExchange: Math.round(b.rsccExchange),
                        blocked: Math.round(b.blocked),
                        jv: Math.round(b.jv),
                        netMonthly: Math.round(b.netMonthly),
                        cumulative: Math.round(cum),
                    };
                });
                return { project, series, total: cum };
            })
            .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
    }, [filtered]);

    // Combined multi-project cash flow: one cumulative line per project on a shared timeline
    const combinedProjectFlow = useMemo(() => {
        const monthMap = new Map<number, { month: string; sortKey: number }>();
        const projectSet = new Set<string>();
        const deltas: Record<string, Record<number, number>> = {};

        filtered.forEach((r) => {
            if (!isProjectRelevant(r)) return;
            if (!r.date) return;
            const p = r.project || "(empty)";
            const d = new Date(r.date);
            const y = d.getUTCFullYear();
            const m = d.getUTCMonth();
            const sortKey = y * 12 + m;
            const monthLabel = `${MONTH_NAMES[m]} ${String(y).slice(2)}`;
            if (!monthMap.has(sortKey)) monthMap.set(sortKey, { month: monthLabel, sortKey });
            projectSet.add(p);
            if (!deltas[p]) deltas[p] = {};
            deltas[p][sortKey] = (deltas[p][sortKey] || 0) + Number(r.usd_equal || 0);
        });

        const months = [...monthMap.values()].sort((a, b) => a.sortKey - b.sortKey);
        const projects = [...projectSet].sort();

        const cumulative: Record<string, number> = {};
        projects.forEach((p) => (cumulative[p] = 0));

        const data = months.map(({ month, sortKey }) => {
            const row: Record<string, number | string> = { month };
            projects.forEach((p) => {
                cumulative[p] += deltas[p]?.[sortKey] || 0;
                row[p] = Math.round(cumulative[p]);
            });
            return row;
        });

        return { data, projects };
    }, [filtered]);

    // Source flow (per-source cumulative balance over time)
    const sourceFlow = useMemo(() => {
        const buckets: Record<string, { key: string; sortKey: number; BAG: number; ANK: number }> = {};
        filtered.forEach((r) => {
            if (!r.date || !r.source) return;
            const d = new Date(r.date);
            const y = d.getUTCFullYear();
            const m = d.getUTCMonth();
            const key = `${MONTH_NAMES[m]} ${String(y).slice(2)}`;
            const sortKey = y * 12 + m;
            if (!buckets[key]) buckets[key] = { key, sortKey, BAG: 0, ANK: 0 };
            const v = Number(r.usd_equal || 0);
            if (r.source === "BAG") buckets[key].BAG += v;
            else if (r.source === "ANK") buckets[key].ANK += v;
        });
        const arr = Object.values(buckets).sort((a, b) => a.sortKey - b.sortKey);
        let cumBag = 0;
        let cumAnk = 0;
        return arr.map((b) => {
            cumBag += b.BAG;
            cumAnk += b.ANK;
            return { month: b.key, BAG: cumBag, ANK: cumAnk };
        });
    }, [filtered]);

    // Form handlers
    const openAdd = () => {
        setForm(EMPTY_FORM);
        setFormError(null);
        setDialogOpen(true);
    };

    const openEdit = (row: CashFlowRow) => {
        setForm({
            id: row.id,
            date: row.date ? new Date(row.date).toISOString().slice(0, 10) : "",
            description: row.description || "",
            amount: String(row.amount ?? ""),
            currency: row.currency || "USD",
            currency_rate: String(row.currency_rate ?? "1"),
            project: row.project || "",
            type: row.type || "INCOME",
            counter_party: row.counter_party || "",
            category: row.category || "",
            is_exchange: !!row.is_exchange,
            source: row.source || "BAG",
        });
        setFormError(null);
        setDialogOpen(true);
    };

    const computedUsd = useMemo(() => {
        const a = parseFloat(form.amount);
        const r = parseFloat(form.currency_rate);
        if (!isFinite(a) || !isFinite(r) || r === 0) return null;
        return a / r;
    }, [form.amount, form.currency_rate]);

    const handleSave = async () => {
        setFormError(null);
        if (!form.date || !form.amount || !form.currency || !form.currency_rate || !form.type) {
            setFormError("Date, amount, currency, currency rate and type are required");
            return;
        }
        const payload = {
            date: form.date,
            description: form.description,
            amount: parseFloat(form.amount),
            currency: form.currency,
            currency_rate: parseFloat(form.currency_rate),
            project: form.project,
            type: form.type,
            counter_party: form.counter_party,
            category: form.category,
            is_exchange: form.is_exchange,
            source: form.source,
        };

        setSaving(true);
        try {
            const url = form.id ? `/api/cash-flow/${form.id}` : "/api/cash-flow";
            const method = form.id ? "PUT" : "POST";
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `HTTP ${res.status}`);
            }
            await mutate();
            setDialogOpen(false);
        } catch (e) {
            setFormError(e instanceof Error ? e.message : "Save failed");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteRow) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/cash-flow/${deleteRow.id}`, { method: "DELETE" });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `HTTP ${res.status}`);
            }
            await mutate();
            setDeleteRow(null);
        } catch (e) {
            console.error(e);
            alert("Delete failed");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans">
            <main className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Received Amounts</h1>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                            Incoming funds and how they flow between offices
                        </p>
                    </div>
                    {canEdit && (
                        <Button onClick={openAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
                            <Plus className="w-4 h-4 mr-1" /> New Entry
                        </Button>
                    )}
                </div>

                {/* Filters */}
                <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 shadow-sm p-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <Select value={yearFilter} onValueChange={setYearFilter}>
                            <SelectTrigger className="w-[120px]"><SelectValue placeholder="Year" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Years</SelectItem>
                                {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <Select value={sourceFilter} onValueChange={setSourceFilter}>
                            <SelectTrigger className="w-[120px]"><SelectValue placeholder="Source" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Sources</SelectItem>
                                {SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Type" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <Select value={projectFilter} onValueChange={setProjectFilter}>
                            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Project" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Projects</SelectItem>
                                {projects.map((p) => <SelectItem key={p || "__blank"} value={p || "__blank"}>{p || "(empty)"}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
                            <SelectTrigger className="w-[120px]"><SelectValue placeholder="Currency" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search description, party, project..."
                            className="w-[260px]"
                        />

                        <span className="ml-auto text-sm text-zinc-500 dark:text-zinc-400">
                            {filtered.length} / {rows.length} entries
                        </span>
                    </div>
                </div>

                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="w-4 h-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>Failed to load cash flow data.</AlertDescription>
                    </Alert>
                )}

                {isLoading && <Skeleton className="h-[400px] w-full rounded-2xl" />}

                {!isLoading && !error && (
                    <>
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                            <KpiCard
                                label="Net Position (BAG + ANK)"
                                value={(kpis.bySource.BAG || 0) + (kpis.bySource.ANK || 0)}
                                icon={<Wallet className="w-5 h-5 text-violet-500" />}
                                accent="from-violet-500/10 to-violet-500/0"
                                hint={`BAG ${formatCurrency(kpis.bySource.BAG || 0)} • ANK ${formatCurrency(kpis.bySource.ANK || 0)}`}
                            />
                            <KpiCard
                                label="Currently Blocked"
                                value={Math.abs(kpis.totalBlocked)}
                                icon={<Lock className="w-5 h-5 text-rose-500" />}
                                accent="from-rose-500/10 to-rose-500/0"
                                hint="Guarantee deposits / blocked funds"
                            />
                            <RsccCard
                                label="RSCC — Invoices"
                                inAmt={kpis.rsccInvoices.in}
                                outAmt={kpis.rsccInvoices.out}
                                netAmt={kpis.rsccInvoices.net}
                                accent="from-indigo-500/10 to-indigo-500/0"
                                hint="TRANSFER • counter_party=RSCC • is_exchange=false"
                            />
                            <RsccCard
                                label="RSCC — Exchange"
                                inAmt={kpis.rsccExchange.in}
                                outAmt={kpis.rsccExchange.out}
                                netAmt={kpis.rsccExchange.net}
                                accent="from-amber-500/10 to-amber-500/0"
                                hint="TRANSFER • counter_party=RSCC • is_exchange=true"
                            />
                        </div>

                        {/* Net Position over time */}
                        <ChartFrame title="Net Position Over Time" subtitle="Monthly net delta (bars) and cumulative running total (line) across all flows">
                            <ResponsiveContainer width="100%" height={360}>
                                <ComposedChart data={monthlyNetPosition} margin={{ top: 10, right: 20, left: 10, bottom: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#71717a" }} angle={-45} textAnchor="end" height={50} />
                                    <YAxis tickFormatter={formatAxisValue} tick={{ fontSize: 11, fill: "#71717a" }} width={70} />
                                    <Tooltip content={<ProjectFlowTooltip />} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                                    <Bar dataKey="netMonthly" name="Monthly Net">
                                        {monthlyNetPosition.map((d, i) => (
                                            <Cell key={i} fill={d.netMonthly >= 0 ? "#10b981" : "#ef4444"} />
                                        ))}
                                    </Bar>
                                    <Line type="monotone" dataKey="cumulative" name="Cumulative" stroke="#6366f1" strokeWidth={2.5} dot={false} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </ChartFrame>

                        {/* ANK vs BAG balance over time */}
                        <ChartFrame title="ANK vs BAG — Cumulative Balance" subtitle="USD running total per office over time">
                            <ResponsiveContainer width="100%" height={340}>
                                <ComposedChart data={sourceFlow} margin={{ top: 10, right: 20, left: 10, bottom: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#71717a" }} angle={-45} textAnchor="end" height={50} />
                                    <YAxis tickFormatter={formatAxisValue} tick={{ fontSize: 11, fill: "#71717a" }} width={70} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                                    <Area type="monotone" dataKey="BAG" name="BAG" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} strokeWidth={2.5} />
                                    <Area type="monotone" dataKey="ANK" name="ANK" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.2} strokeWidth={2.5} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </ChartFrame>

                        {/* Combined multi-project cash flow */}
                        {combinedProjectFlow.projects.length > 0 && (
                            <ChartFrame
                                title="Project Cash Flows (Combined)"
                                subtitle="Stacked cumulative net per project on a shared timeline (excludes neutral ANK↔BAG transfers)"
                            >
                                <ResponsiveContainer width="100%" height={420}>
                                    <ComposedChart data={combinedProjectFlow.data} margin={{ top: 10, right: 20, left: 10, bottom: 30 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#71717a" }} angle={-45} textAnchor="end" height={50} />
                                        <YAxis tickFormatter={formatAxisValue} tick={{ fontSize: 11, fill: "#71717a" }} width={70} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                                        {combinedProjectFlow.projects.map((p, i) => {
                                            const color = PIE_PALETTE[i % PIE_PALETTE.length];
                                            return (
                                                <Area
                                                    key={p}
                                                    type="monotone"
                                                    dataKey={p}
                                                    name={p}
                                                    stackId="projects"
                                                    stroke={color}
                                                    fill={color}
                                                    fillOpacity={0.55}
                                                    strokeWidth={1.5}
                                                />
                                            );
                                        })}
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </ChartFrame>
                        )}

                        {/* Per-project cash flow grid */}
                        {projectFlowsDetailed.length > 0 && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {projectFlowsDetailed.map((p, i) => {
                                    const color = PIE_PALETTE[i % PIE_PALETTE.length];
                                    const positive = p.total >= 0;
                                    return (
                                        <ChartFrame
                                            key={p.project}
                                            title={`${p.project} — Cash Flow`}
                                            subtitle={`Cumulative net • Total ${formatCurrency(p.total)}`}
                                        >
                                            <ResponsiveContainer width="100%" height={280}>
                                                <ComposedChart data={p.series} margin={{ top: 10, right: 20, left: 10, bottom: 30 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                                                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#71717a" }} angle={-45} textAnchor="end" height={50} />
                                                    <YAxis tickFormatter={formatAxisValue} tick={{ fontSize: 10, fill: "#71717a" }} width={70} />
                                                    <Tooltip content={<ProjectFlowTooltip />} />
                                                    <Area
                                                        type="monotone"
                                                        dataKey="cumulative"
                                                        name={p.project}
                                                        stroke={positive ? "#10b981" : "#ef4444"}
                                                        fill={color}
                                                        fillOpacity={0.18}
                                                        strokeWidth={2.5}
                                                    />
                                                </ComposedChart>
                                            </ResponsiveContainer>
                                        </ChartFrame>
                                    );
                                })}
                            </div>
                        )}

                        {/* Data table */}
                        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 shadow-sm overflow-hidden">
                            <div className="px-4 py-3 border-b border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <Banknote className="w-4 h-4 text-zinc-500" /> Entries
                                </h3>
                                <span className="text-xs text-zinc-500 dark:text-zinc-400">{filtered.length} rows</span>
                            </div>
                            <div className="max-h-[600px] overflow-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-zinc-50/80 dark:bg-zinc-900/50 sticky top-0 z-10">
                                            <TableHead className="w-12">#</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead>Source</TableHead>
                                            <TableHead>Project</TableHead>
                                            <TableHead>Counter Party</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                            <TableHead>Cur.</TableHead>
                                            <TableHead className="text-right">Rate</TableHead>
                                            <TableHead className="text-right">USD Equal</TableHead>
                                            <TableHead className="text-center">FX</TableHead>
                                            {canEdit && <TableHead className="w-24 text-right">Actions</TableHead>}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filtered.map((r, i) => {
                                            const usd = Number(r.usd_equal || 0);
                                            return (
                                                <TableRow key={r.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                                                    <TableCell className="text-xs text-zinc-500">{i + 1}</TableCell>
                                                    <TableCell className="whitespace-nowrap">{r.date ? new Date(r.date).toISOString().slice(0, 10) : ""}</TableCell>
                                                    <TableCell>
                                                        <Badge style={{ backgroundColor: TYPE_COLORS[r.type] || "#888", color: "white" }} className="font-medium">
                                                            {r.type}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="max-w-[260px] truncate" title={r.description || ""}>{r.description}</TableCell>
                                                    <TableCell>
                                                        {r.source && (
                                                            <span style={{ color: SOURCE_COLORS[r.source] || "#71717a" }} className="font-semibold text-xs">
                                                                {r.source}
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-xs">{r.project}</TableCell>
                                                    <TableCell className="text-xs">{r.counter_party}</TableCell>
                                                    <TableCell className="text-xs">{r.category}</TableCell>
                                                    <TableCell className="text-right tabular-nums whitespace-nowrap">
                                                        {Number(r.amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </TableCell>
                                                    <TableCell className="text-xs">{r.currency}</TableCell>
                                                    <TableCell className="text-right tabular-nums text-xs">
                                                        {Number(r.currency_rate).toLocaleString("en-US", { maximumFractionDigits: 4 })}
                                                    </TableCell>
                                                    <TableCell className={`text-right tabular-nums whitespace-nowrap font-medium ${usd < 0 ? "text-rose-600" : "text-emerald-700 dark:text-emerald-400"}`}>
                                                        {formatCurrency(usd)}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {r.is_exchange && <Badge variant="secondary" className="text-[10px]">FX</Badge>}
                                                    </TableCell>
                                                    {canEdit && (
                                                        <TableCell className="text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <Button size="icon" variant="ghost" onClick={() => openEdit(r)} className="h-7 w-7">
                                                                    <Pencil className="w-3.5 h-3.5" />
                                                                </Button>
                                                                <Button size="icon" variant="ghost" onClick={() => setDeleteRow(r)} className="h-7 w-7 hover:text-rose-600">
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    )}
                                                </TableRow>
                                            );
                                        })}
                                        {filtered.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={canEdit ? 14 : 13} className="text-center py-12 text-zinc-500">
                                                    No entries match the current filters
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </>
                )}

                {/* Edit / Add Dialog */}
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>{form.id ? "Edit Entry" : "New Entry"}</DialogTitle>
                            <DialogDescription>
                                USD equal is auto-calculated as <code className="text-xs">amount / currency_rate</code> by the database.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Date">
                                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                            </Field>
                            <Field label="Type">
                                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </Field>

                            <Field label="Description" colSpan={2}>
                                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. HQ Advance Payment" />
                            </Field>

                            <Field label="Amount">
                                <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
                            </Field>
                            <Field label="Currency">
                                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </Field>

                            <Field label="Currency Rate (per USD)">
                                <Input type="number" step="0.0001" value={form.currency_rate} onChange={(e) => setForm({ ...form, currency_rate: e.target.value })} placeholder="1.0" />
                            </Field>
                            <Field label="USD Equal (auto)">
                                <Input
                                    readOnly
                                    value={computedUsd != null ? computedUsd.toFixed(4) : ""}
                                    className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                                />
                            </Field>

                            <Field label="Source">
                                <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field label="Project">
                                <Input value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} placeholder="HQ / SRY / SRY2 ..." />
                            </Field>

                            <Field label="Counter Party">
                                <Input value={form.counter_party} onChange={(e) => setForm({ ...form, counter_party: e.target.value })} placeholder="RSCC / BAG / ANK / JV ..." />
                            </Field>
                            <Field label="Category">
                                <Select value={form.category || "__blank"} onValueChange={(v) => setForm({ ...form, category: v === "__blank" ? "" : v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__blank">(none)</SelectItem>
                                        {CATEGORIES.filter((c) => c !== "").map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </Field>

                            <Field label="" colSpan={2}>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <Checkbox checked={form.is_exchange} onCheckedChange={(v) => setForm({ ...form, is_exchange: !!v })} />
                                    <span className="text-sm">Is exchange (FX conversion entry)</span>
                                </label>
                            </Field>
                        </div>

                        {formError && (
                            <Alert variant="destructive">
                                <AlertCircle className="w-4 h-4" />
                                <AlertDescription>{formError}</AlertDescription>
                            </Alert>
                        )}

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
                            <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                {saving ? "Saving..." : form.id ? "Save Changes" : "Create Entry"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Delete confirm */}
                <Dialog open={!!deleteRow} onOpenChange={(open) => { if (!open) setDeleteRow(null); }}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-rose-600">Delete entry?</DialogTitle>
                            <DialogDescription>
                                This will permanently remove the entry from the database. This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        {deleteRow && (
                            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 text-sm space-y-1 bg-zinc-50 dark:bg-zinc-900/50">
                                <div><span className="text-zinc-500">Date:</span> {deleteRow.date ? new Date(deleteRow.date).toISOString().slice(0, 10) : ""}</div>
                                <div><span className="text-zinc-500">Type:</span> {deleteRow.type}</div>
                                <div><span className="text-zinc-500">Description:</span> {deleteRow.description}</div>
                                <div><span className="text-zinc-500">Amount:</span> {Number(deleteRow.amount).toLocaleString()} {deleteRow.currency} ({formatCurrency(Number(deleteRow.usd_equal || 0))})</div>
                            </div>
                        )}
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDeleteRow(null)} disabled={deleting}>Cancel</Button>
                            <Button onClick={handleDelete} disabled={deleting} className="bg-rose-600 hover:bg-rose-700 text-white">
                                {deleting ? "Deleting..." : "Delete Permanently"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
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
        <div className={`relative overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 shadow-sm p-5`}>
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

function RsccCard({
    label,
    inAmt,
    outAmt,
    netAmt,
    accent,
    hint,
}: {
    label: string;
    inAmt: number;
    outAmt: number;
    netAmt: number;
    accent: string;
    hint?: string;
}) {
    const netPositive = netAmt >= 0;
    return (
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 shadow-sm p-5">
            <div className={`absolute inset-0 bg-gradient-to-br ${accent} pointer-events-none`} />
            <div className="relative">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">{label}</span>
                    <ArrowDownCircle className="w-5 h-5 text-zinc-400" />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                        <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-0.5">In</p>
                        <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(inAmt)}</p>
                    </div>
                    <div>
                        <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-0.5">Out</p>
                        <p className="text-sm font-semibold text-rose-600 dark:text-rose-400 tabular-nums">{formatCurrency(outAmt)}</p>
                    </div>
                    <div>
                        <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-0.5">Net</p>
                        <p className={`text-sm font-bold tabular-nums ${netPositive ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>
                            {formatCurrency(netAmt)}
                        </p>
                    </div>
                </div>
                {hint && <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-3 truncate" title={hint}>{hint}</p>}
            </div>
        </div>
    );
}

function ChartFrame({
    title,
    subtitle,
    children,
    className,
}: {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={`rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 shadow-sm p-5 ${className || ""}`}>
            <div className="mb-3">
                <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-zinc-400" />
                    {title}
                </h3>
                {subtitle && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{subtitle}</p>}
            </div>
            {children}
        </div>
    );
}

function Field({
    label,
    children,
    colSpan,
}: {
    label: string;
    children: React.ReactNode;
    colSpan?: number;
}) {
    return (
        <div className={colSpan === 2 ? "col-span-2" : ""}>
            {label && <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1 block">{label}</label>}
            {children}
        </div>
    );
}
