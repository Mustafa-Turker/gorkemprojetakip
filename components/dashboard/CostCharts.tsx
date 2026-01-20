"use client";

import { useState } from "react";

import { ChartDataPoint, CostRecord, YearlyDataPoint } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ComposedChart,
    LabelList,
    Legend,
    Line,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

// Premium gradient-inspired palette with refined, sophisticated colors
const COLORS = [
    "#6366f1", // indigo-500
    "#8b5cf6", // violet-500
    "#ec4899", // pink-500
    "#14b8a6", // teal-500
    "#f59e0b", // amber-500
    "#3b82f6", // blue-500
    "#10b981", // emerald-500
    "#f97316", // orange-500
    "#06b6d4", // cyan-500
    "#a855f7", // purple-500
];

// Gradient pairs for premium effects - First 5 are distinct for L1 categories
const GRADIENT_COLORS = [
    { start: "#3b82f6", end: "#1d4ed8" },  // Blue
    { start: "#ef4444", end: "#dc2626" },  // Red
    { start: "#10b981", end: "#059669" },  // Emerald/Green
    { start: "#a855f7", end: "#7c3aed" },  // Purple
    { start: "#f59e0b", end: "#d97706" },  // Amber/Gold
    { start: "#06b6d4", end: "#0891b2" },  // Cyan
    { start: "#ec4899", end: "#db2777" },  // Pink
    { start: "#6366f1", end: "#4f46e5" },  // Indigo
    { start: "#f97316", end: "#ea580c" },  // Orange
    { start: "#14b8a6", end: "#0d9488" },  // Teal
];

// Premium tooltip with glassmorphism
const PremiumTooltip = ({ active, payload, label, maxItems }: any) => {
    if (active && payload && payload.length) {
        const activeItems = payload
            .filter((entry: any) => Number(entry.value) > 0 && entry.dataKey !== 'total')
            .sort((a: any, b: any) => b.value - a.value);

        if (activeItems.length === 0) return null;

        const total = activeItems.reduce((sum: number, entry: any) => sum + Number(entry.value), 0);
        const displayItems = maxItems ? activeItems.slice(0, maxItems) : activeItems;
        const remaining = activeItems.length - displayItems.length;

        return (
            <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-700/50 p-4 rounded-2xl shadow-2xl shadow-zinc-900/10 dark:shadow-black/30 min-w-[200px] animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
                    <p className="font-semibold text-zinc-900 dark:text-white">{label}</p>
                </div>

                {/* Items */}
                <div className="space-y-2">
                    {displayItems.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center justify-between gap-6 group">
                            <div className="flex items-center gap-2.5">
                                <div
                                    className="w-3 h-3 rounded-md shadow-sm transition-transform group-hover:scale-110"
                                    style={{ backgroundColor: entry.color }}
                                />
                                <span className="text-sm text-zinc-600 dark:text-zinc-400 truncate max-w-[120px]">
                                    {entry.name}
                                </span>
                            </div>
                            <span className="text-sm font-mono font-semibold text-zinc-900 dark:text-white">
                                {formatCurrency(entry.value)}
                            </span>
                        </div>
                    ))}
                </div>

                {remaining > 0 && (
                    <div className="text-center text-zinc-400 py-2 text-xs font-medium">
                        +{remaining} more items
                    </div>
                )}

                {activeItems.length > 1 && (
                    <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                        <span className="text-sm font-medium text-zinc-500">Total</span>
                        <span className="text-sm font-mono font-bold text-zinc-900 dark:text-white">
                            {formatCurrency(total)}
                        </span>
                    </div>
                )}
            </div>
        );
    }
    return null;
};

export function CategoryDistributionChart({ data }: { data: CostRecord[] }) {
    if (!data || data.length === 0) return <div className="h-full flex items-center justify-center text-muted-foreground">No data</div>;

    const total = data.reduce((sum, curr) => sum + (Number(curr.toplam_tutar) || 0), 0);

    const chartData = data.reduce<ChartDataPoint[]>((acc, curr) => {
        const existing = acc.find((item) => item.name === curr.kategori_lvl_1);
        const amount = Number(curr.toplam_tutar) || 0;
        if (existing) {
            existing.value += amount;
        } else {
            acc.push({ name: curr.kategori_lvl_1, value: amount });
        }
        return acc;
    }, []);

    chartData.sort((a, b) => b.value - a.value);

    return (
        <div className="flex flex-col lg:flex-row items-center gap-6 h-full pl-2">
            {/* Chart Side - No center label, moved to footer */}
            <div className="w-full lg:w-[35%] h-[240px] relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <defs>
                            {GRADIENT_COLORS.map((color, index) => (
                                <linearGradient key={index} id={`pieGradient${index}`} x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0%" stopColor={color.start} />
                                    <stop offset="100%" stopColor={color.end} />
                                </linearGradient>
                            ))}
                        </defs>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={95}
                            paddingAngle={3}
                            dataKey="value"
                            animationBegin={0}
                            animationDuration={800}
                            animationEasing="ease-out"
                        >
                            {chartData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={`url(#pieGradient${index % GRADIENT_COLORS.length})`}
                                    strokeWidth={0}
                                    className="transition-all duration-300 hover:opacity-80"
                                    style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                                />
                            ))}
                        </Pie>
                        <Tooltip
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const data = payload[0];
                                    const percentage = ((Number(data.value) / total) * 100).toFixed(1);
                                    return (
                                        <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-700/50 p-4 rounded-2xl shadow-2xl shadow-zinc-900/10 dark:shadow-black/30 animate-in fade-in zoom-in-95 duration-200">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-4 h-4 rounded-lg shadow-sm"
                                                    style={{ background: `linear-gradient(135deg, ${GRADIENT_COLORS[chartData.findIndex(d => d.name === data.name) % GRADIENT_COLORS.length].start}, ${GRADIENT_COLORS[chartData.findIndex(d => d.name === data.name) % GRADIENT_COLORS.length].end})` }}
                                                />
                                                <div>
                                                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{data.name}</p>
                                                    <div className="flex items-baseline gap-2">
                                                        <p className="text-xl font-bold font-mono text-zinc-900 dark:text-white">{formatCurrency(Number(data.value))}</p>
                                                        <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{percentage}%</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* Table Side - Compact layout to fit all items */}
            <div className="w-full lg:flex-1 flex flex-col justify-center pr-2">
                <div className="space-y-0.5">
                    {chartData.map((item, index) => (
                        <div
                            key={index}
                            className="group flex items-center justify-between text-sm py-1.5 px-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors duration-150 cursor-default"
                        >
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <div
                                    className="w-3 h-3 rounded-md flex-shrink-0 shadow-sm"
                                    style={{ background: `linear-gradient(135deg, ${GRADIENT_COLORS[index % GRADIENT_COLORS.length].start}, ${GRADIENT_COLORS[index % GRADIENT_COLORS.length].end})` }}
                                />
                                <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate text-sm" title={item.name}>
                                    {item.name}
                                </span>
                            </div>
                            <div className="text-right font-mono font-semibold text-zinc-900 dark:text-white flex-shrink-0 ml-3 flex items-center gap-2">
                                <span className="text-sm">{formatCurrency(item.value)}</span>
                                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 min-w-[42px] text-center">
                                    {((item.value / total) * 100).toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Total Footer - Compact */}
                <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                    <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                        <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">Total</span>
                        <span className="text-base font-mono font-bold text-zinc-900 dark:text-white">{formatCurrency(total)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function TrendsChart({ data }: { data: CostRecord[] }) {
    if (!data || data.length === 0) return <div className="h-full flex items-center justify-center text-muted-foreground">No data</div>;

    const projectCodes = [...new Set(data.map(d => d.proje_kodu))].sort();
    const groupedData: Record<string, any> = {};

    data.forEach(item => {
        if (!groupedData[item.rapor_yili]) {
            groupedData[item.rapor_yili] = { year: item.rapor_yili };
            projectCodes.forEach(p => groupedData[item.rapor_yili][p] = 0);
        }
        groupedData[item.rapor_yili][item.proje_kodu] = (groupedData[item.rapor_yili][item.proje_kodu] || 0) + Number(item.toplam_tutar);
    });

    const chartData = Object.values(groupedData).sort((a: any, b: any) => a.year.localeCompare(b.year));
    const totalAmount = data.reduce((sum, item) => sum + Number(item.toplam_tutar), 0);

    // Create project-to-color mapping for tooltip
    const projectColorMap: Record<string, string> = {};
    projectCodes.forEach((proj, index) => {
        projectColorMap[proj] = GRADIENT_COLORS[index % GRADIENT_COLORS.length].start;
    });

    // Custom tooltip with proper colors
    const TrendsTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const activeItems = payload
                .filter((entry: any) => Number(entry.value) > 0 && entry.dataKey !== 'total')
                .sort((a: any, b: any) => b.value - a.value);

            if (activeItems.length === 0) return null;

            const total = activeItems.reduce((sum: number, entry: any) => sum + Number(entry.value), 0);
            const displayItems = activeItems.slice(0, 5);
            const remaining = activeItems.length - displayItems.length;

            return (
                <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-700/50 p-4 rounded-2xl shadow-2xl shadow-zinc-900/10 dark:shadow-black/30 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                        <div className="w-2 h-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
                        <p className="font-semibold text-zinc-900 dark:text-white">{label}</p>
                    </div>
                    <div className="space-y-2">
                        {displayItems.map((entry: any, index: number) => (
                            <div key={index} className="flex items-center justify-between gap-6">
                                <div className="flex items-center gap-2.5">
                                    <div
                                        className="w-3 h-3 rounded-md shadow-sm"
                                        style={{ backgroundColor: projectColorMap[entry.dataKey] || '#6366f1' }}
                                    />
                                    <span className="text-sm text-zinc-600 dark:text-zinc-400 truncate max-w-[100px]">
                                        {entry.dataKey}
                                    </span>
                                </div>
                                <span className="text-sm font-mono font-semibold text-zinc-900 dark:text-white">
                                    {formatCurrency(entry.value)}
                                </span>
                            </div>
                        ))}
                    </div>
                    {remaining > 0 && (
                        <div className="text-center text-zinc-400 py-2 text-xs font-medium">
                            +{remaining} more items
                        </div>
                    )}
                    {activeItems.length > 1 && (
                        <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                            <span className="text-sm font-medium text-zinc-500">Total</span>
                            <span className="text-sm font-mono font-bold text-zinc-900 dark:text-white">
                                {formatCurrency(total)}
                            </span>
                        </div>
                    )}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="flex flex-col w-full">
            <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            {GRADIENT_COLORS.map((color, index) => (
                                <linearGradient key={index} id={`barGradient${index}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={color.start} stopOpacity={1} />
                                    <stop offset="100%" stopColor={color.end} stopOpacity={0.8} />
                                </linearGradient>
                            ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" strokeOpacity={0.5} />
                        <XAxis
                            dataKey="year"
                            axisLine={false}
                            tickLine={false}
                            dy={10}
                            tick={{ fill: '#71717a', fontSize: 12, fontWeight: 500 }}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
                            width={70}
                            tick={{ fill: '#71717a', fontSize: 11 }}
                        />
                        <Tooltip cursor={{ fill: "rgba(99, 102, 241, 0.05)", radius: 8 }} content={<TrendsTooltip />} />
                        {projectCodes.map((proj, index) => (
                            <Bar
                                key={proj}
                                dataKey={proj}
                                stackId="a"
                                fill={`url(#barGradient${index % GRADIENT_COLORS.length})`}
                                radius={index === projectCodes.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                                animationBegin={index * 50}
                                animationDuration={600}
                                animationEasing="ease-out"
                            />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <div className="mt-4 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30 border border-indigo-100 dark:border-indigo-900/50">
                <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Total Amount:</span>
                <span className="text-lg font-mono font-bold text-indigo-700 dark:text-indigo-300">{formatCurrency(totalAmount)}</span>
            </div>
        </div>
    );
}

export function TopExpensesChart({ data, isFiltered = false }: { data: CostRecord[]; isFiltered?: boolean }) {
    if (!data || data.length === 0) return <div className="h-full flex items-center justify-center text-muted-foreground">No data</div>;

    const chartData = data.reduce<ChartDataPoint[]>((acc, curr) => {
        const existing = acc.find((item) => item.name === curr.kategori_lvl_2);
        const amount = Number(curr.toplam_tutar) || 0;
        if (existing) {
            existing.value += amount;
        } else {
            acc.push({ name: curr.kategori_lvl_2, value: amount });
        }
        return acc;
    }, []);

    const topItems = chartData.sort((a, b) => b.value - a.value);
    const displayItems = isFiltered ? topItems : topItems.slice(0, 10);

    const maxValue = Math.max(...displayItems.map(d => d.value));

    const itemHeight = 42;
    const dynamicHeight = Math.max(200, displayItems.length * itemHeight);

    return (
        <div className="w-full overflow-hidden -mt-2" style={{ height: dynamicHeight }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={displayItems}
                    layout="vertical"
                    margin={{ left: 0, right: 30, top: 0, bottom: 10 }}
                >
                    <defs>
                        <linearGradient id="horizontalBarGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#6366f1" />
                            <stop offset="50%" stopColor="#8b5cf6" />
                            <stop offset="100%" stopColor="#a855f7" />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e4e4e7" strokeOpacity={0.3} />
                    <XAxis
                        type="number"
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                        tick={{ fill: '#71717a', fontSize: 11 }}
                    />
                    <YAxis
                        dataKey="name"
                        type="category"
                        width={300}
                        axisLine={false}
                        tickLine={false}
                        interval={0}
                        tick={{ fontSize: 13, fill: "#52525b", fontWeight: 500 }}
                    />
                    <Tooltip
                        cursor={{ fill: "rgba(99, 102, 241, 0.05)", radius: 8 }}
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const data = payload[0];
                                return (
                                    <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-700/50 p-4 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">{data.payload.name}</p>
                                        <p className="text-xl font-bold font-mono text-zinc-900 dark:text-white">{formatCurrency(Number(data.value))}</p>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    <Bar
                        dataKey="value"
                        name="Amount"
                        fill="url(#horizontalBarGradient)"
                        radius={[0, 8, 8, 0]}
                        barSize={24}
                        animationBegin={0}
                        animationDuration={800}
                        animationEasing="ease-out"
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

export function StackedProjectChart({ data }: { data: CostRecord[] }) {
    const [useLogScale, setUseLogScale] = useState(false);
    const logTicks = [1000, 10000, 100000, 1000000, 10000000, 50000000];

    if (!data || data.length === 0) return <div className="h-full flex items-center justify-center text-muted-foreground">No data</div>;

    const categoryTotals: Record<string, number> = {};
    data.forEach(d => {
        categoryTotals[d.kategori_lvl_1] = (categoryTotals[d.kategori_lvl_1] || 0) + Number(d.toplam_tutar);
    });
    const categories = [...new Set(data.map(d => d.kategori_lvl_1))].sort((a, b) => categoryTotals[b] - categoryTotals[a]);

    const groupedData: Record<string, any> = {};
    data.forEach(item => {
        if (!groupedData[item.proje_kodu]) {
            groupedData[item.proje_kodu] = { name: item.proje_kodu };
            categories.forEach(cat => groupedData[item.proje_kodu][cat] = 0);
        }
        groupedData[item.proje_kodu][item.kategori_lvl_1] = (groupedData[item.proje_kodu][item.kategori_lvl_1] || 0) + Number(item.toplam_tutar);
    });

    const chartData = Object.values(groupedData).sort((a: any, b: any) => a.name.localeCompare(b.name));
    chartData.forEach((d: any) => {
        d.total = categories.reduce((sum, cat) => sum + (d[cat] || 0), 0);
    });

    return (
        <div className="h-[450px] w-full relative">
            {/* Premium toggle button */}
            <div className="absolute top-0 right-2 z-10">
                <button
                    onClick={() => setUseLogScale(!useLogScale)}
                    className="text-xs px-3 py-1.5 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all duration-200 font-medium text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-sm"
                >
                    {useLogScale ? "📊 Linear Scale" : "📈 Log Scale"}
                </button>
            </div>
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 30, right: 10, left: 10, bottom: 20 }}>
                    <defs>
                        {GRADIENT_COLORS.map((color, index) => (
                            <linearGradient key={index} id={`stackGradient${index}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={color.start} stopOpacity={1} />
                                <stop offset="100%" stopColor={color.end} stopOpacity={0.85} />
                            </linearGradient>
                        ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#a1a1aa" strokeOpacity={0.3} />
                    <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: '#71717a', fontWeight: 500 }}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => `${(value / 1000000).toLocaleString()}M`}
                        width={60}
                        scale={useLogScale ? "log" : "auto"}
                        domain={useLogScale ? [1000, 'auto'] : [0, 'auto']}
                        ticks={useLogScale ? logTicks : undefined}
                        allowDataOverflow={true}
                        tick={{ fill: '#71717a', fontSize: 11 }}
                    />
                    <Tooltip cursor={{ fill: "rgba(99, 102, 241, 0.05)", radius: 8 }} content={<PremiumTooltip />} />
                    <Legend
                        wrapperStyle={{ fontSize: '11px', paddingTop: '20px' }}
                        iconType="circle"
                        iconSize={8}
                    />
                    {categories.map((cat, index) => (
                        <Bar
                            key={cat}
                            dataKey={cat}
                            stackId="a"
                            fill={`url(#stackGradient${index % GRADIENT_COLORS.length})`}
                            radius={index === categories.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                            animationBegin={index * 30}
                            animationDuration={600}
                            animationEasing="ease-out"
                        />
                    ))}
                    <Line type="monotone" dataKey="total" stroke="none" dot={false} activeDot={false} legendType="none" isAnimationActive={false}>
                        <LabelList
                            dataKey="total"
                            position="top"
                            content={({ x, y, value }: any) => {
                                if (!value || Number(value) <= 0) return null;
                                const val = (Number(value) / 1000000).toFixed(1);
                                return (
                                    <text
                                        x={x}
                                        y={y}
                                        dx={5}
                                        dy="0.32em"
                                        fill="#6366f1"
                                        fontSize={10}
                                        fontWeight={600}
                                        textAnchor="start"
                                        transform={`rotate(-90 ${x} ${y})`}
                                    >
                                        {val}M
                                    </text>
                                );
                            }}
                        />
                    </Line>
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}
