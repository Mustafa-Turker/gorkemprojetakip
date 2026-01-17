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

// Vibrant palette using Tailwdin CSS colors (manually picked for contrast)
const COLORS = [
    "#3b82f6", // blue-500
    "#ef4444", // red-500
    "#10b981", // emerald-500
    "#f59e0b", // amber-500
    "#8b5cf6", // violet-500
    "#ec4899", // pink-500
    "#06b6d4", // cyan-500
    "#84cc16", // lime-500
    "#f97316", // orange-500
    "#6366f1", // indigo-500
];

const CustomTooltip = ({ active, payload, label, maxItems }: any) => {
    if (active && payload && payload.length) {
        // Filter out zero values and internal 'total' key
        const activeItems = payload
            .filter((entry: any) => Number(entry.value) > 0 && entry.dataKey !== 'total')
            .sort((a: any, b: any) => b.value - a.value);

        if (activeItems.length === 0) return null;

        // Calculate total only from valid categories
        const total = activeItems.reduce((sum: number, entry: any) => sum + Number(entry.value), 0);

        // Slice if maxItems is present
        const displayItems = maxItems ? activeItems.slice(0, maxItems) : activeItems;
        const remaining = activeItems.length - displayItems.length;

        return (
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-3 rounded-lg shadow-lg z-50 max-h-[400px] overflow-hidden min-w-[180px]">
                <p className="font-semibold mb-2 border-b border-zinc-100 dark:border-zinc-800 pb-1">{label}</p>
                <div className="space-y-0.5">
                    {displayItems.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center justify-between gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                <span className="text-zinc-600 dark:text-zinc-400 truncate max-w-[100px]">{entry.name}:</span>
                            </div>
                            <span className="font-mono font-medium">{formatCurrency(entry.value)}</span>
                        </div>
                    ))}
                </div>

                {remaining > 0 && (
                    <div className="text-center text-zinc-400 py-1 font-bold text-xs">...</div>
                )}

                {activeItems.length > 1 && (
                    <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-between font-bold text-sm">
                        <span>Total:</span>
                        <span>{formatCurrency(total)}</span>
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
            {/* Chart Side - Fixed Width */}
            <div className="w-full lg:w-[35%] h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            fill="#8884d8"
                            paddingAngle={2}
                            dataKey="value"
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                            ))}
                        </Pie>
                        <Tooltip
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const data = payload[0];
                                    return (
                                        <div className="bg-white/95 dark:bg-zinc-950/95 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800 p-3 rounded-xl shadow-2xl">
                                            <div className="flex items-center gap-3">
                                                <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: data.payload.fill }} />
                                                <div>
                                                    <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{data.name}</p>
                                                    <p className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100">{formatCurrency(Number(data.value))}</p>
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

            {/* Table Side - Flexible Width to Fit Content */}
            <div className="w-full lg:flex-1 overflow-auto max-h-[240px] pr-2">
                <div className="space-y-0.5">
                    {chartData.map((item, index) => (
                        <div key={index} className="flex items-center justify-between text-base py-1.5 px-3 rounded hover:bg-zinc-50 dark:hover:bg-zinc-900/50 border border-transparent hover:border-zinc-100 transition-colors leading-none w-full">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                <span className="font-medium truncate" title={item.name}>{item.name}</span>
                            </div>
                            <div className="text-right font-mono font-medium text-zinc-700 dark:text-zinc-300 flex-shrink-0 ml-4">
                                {formatCurrency(item.value)}
                                <span className="text-zinc-500 dark:text-zinc-400 ml-2 text-xs">
                                    ({((item.value / total) * 100).toFixed(1)}%)
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export function TrendsChart({ data }: { data: CostRecord[] }) {
    if (!data || data.length === 0) return <div className="h-full flex items-center justify-center text-muted-foreground">No data</div>;

    // We want to Stack Project Costs per year.
    // X-Axis: rapor_yili
    // Stacks: proje_kodu

    const projectCodes = [...new Set(data.map(d => d.proje_kodu))].sort();

    const groupedData: Record<string, any> = {};

    data.forEach(item => {
        if (!groupedData[item.rapor_yili]) {
            groupedData[item.rapor_yili] = { year: item.rapor_yili };
            // Initialize all projects to 0
            projectCodes.forEach(p => groupedData[item.rapor_yili][p] = 0);
        }
        groupedData[item.rapor_yili][item.proje_kodu] = (groupedData[item.rapor_yili][item.proje_kodu] || 0) + Number(item.toplam_tutar);
    });

    const chartData = Object.values(groupedData).sort((a: any, b: any) => a.year.localeCompare(b.year));
    const totalAmount = data.reduce((sum, item) => sum + Number(item.toplam_tutar), 0);

    return (
        <div className="flex flex-col w-full">
            <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                        <XAxis dataKey="year" axisLine={false} tickLine={false} dy={10} />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(value) => `$${value / 1000}k`}
                            width={80}
                        />
                        <Tooltip cursor={{ fill: "transparent" }} content={<CustomTooltip maxItems={5} />} />
                        {projectCodes.map((proj, index) => (
                            <Bar
                                key={proj}
                                dataKey={proj}
                                stackId="a"
                                fill={COLORS[index % COLORS.length]}
                                radius={[0, 0, 0, 0]}
                            />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <div className="mt-2 text-center text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Total: <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(totalAmount)}</span>
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

    // Filter Logic:
    // If isFiltered (category selected) -> Show ALL (no slice)
    // If !isFiltered (no category selected) -> Show Top 10
    const topItems = chartData.sort((a, b) => b.value - a.value);
    const displayItems = isFiltered ? topItems : topItems.slice(0, 10);

    // Dynamic Height Calculation
    // itemHeight = 35px (reduced spacing)
    // padding = 40px
    const itemHeight = 40;
    const dynamicHeight = Math.max(200, displayItems.length * itemHeight);

    return (
        <div className="w-full overflow-hidden -mt-2" style={{ height: dynamicHeight }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={displayItems}
                    layout="vertical"
                    margin={{ left: 0, right: 30, top: 0, bottom: 10 }}
                >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.2} />
                    <XAxis type="number" axisLine={false} tickLine={false} tickFormatter={(value) => `$${value / 1000}k`} />
                    <YAxis
                        dataKey="name"
                        type="category"
                        width={320}
                        axisLine={false}
                        tickLine={false}
                        interval={0}
                        tick={{ fontSize: 14, fill: "#52525b" }}
                    />
                    <Tooltip cursor={{ fill: "transparent" }} content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Amount" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

export function StackedProjectChart({ data }: { data: CostRecord[] }) {
    const [useLogScale, setUseLogScale] = useState(false);

    // Manual ticks for log scale as requested
    const logTicks = [1000, 10000, 100000, 1000000, 10000000, 50000000];

    if (!data || data.length === 0) return <div className="h-full flex items-center justify-center text-muted-foreground">No data</div>;

    // Group by Project
    // Data Shape: { name: "ProjectCode", "Cat1": 100, "Cat2": 200 }

    // Sort categories by TOTAL value descending to match Pie Chart color schema
    const categoryTotals: Record<string, number> = {};
    data.forEach(d => {
        categoryTotals[d.kategori_lvl_1] = (categoryTotals[d.kategori_lvl_1] || 0) + Number(d.toplam_tutar);
    });
    const categories = [...new Set(data.map(d => d.kategori_lvl_1))].sort((a, b) => categoryTotals[b] - categoryTotals[a]);

    const groupedData: Record<string, any> = {};

    data.forEach(item => {
        if (!groupedData[item.proje_kodu]) {
            groupedData[item.proje_kodu] = { name: item.proje_kodu };
            // Initialize all categories to 0
            categories.forEach(cat => groupedData[item.proje_kodu][cat] = 0);
        }
        groupedData[item.proje_kodu][item.kategori_lvl_1] = (groupedData[item.proje_kodu][item.kategori_lvl_1] || 0) + Number(item.toplam_tutar);
    });

    const chartData = Object.values(groupedData).sort((a: any, b: any) => a.name.localeCompare(b.name));

    // Calculate total for label placement
    chartData.forEach((d: any) => {
        d.total = categories.reduce((sum, cat) => sum + (d[cat] || 0), 0);
    });

    return (
        <div className="h-[450px] w-full relative">
            <div className="absolute top-0 right-2 z-10">
                <button
                    onClick={() => setUseLogScale(!useLogScale)}
                    className="text-[10px] px-2 py-1 bg-zinc-50 dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors font-medium text-zinc-600 dark:text-zinc-300"
                >
                    {useLogScale ? "Linear Scale" : "Log Scale"}
                </button>
            </div>
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 30, right: 10, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#a1a1aa" opacity={1} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => `${(value / 1000000).toLocaleString()}M`}
                        width={80}
                        scale={useLogScale ? "log" : "auto"}
                        domain={useLogScale ? [1000, 'auto'] : [0, 'auto']}
                        ticks={useLogScale ? logTicks : undefined}
                        allowDataOverflow={true}
                    />
                    <Tooltip cursor={{ fill: "transparent" }} content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                    {categories.map((cat, index) => (
                        <Bar
                            key={cat}
                            dataKey={cat}
                            stackId="a"
                            fill={COLORS[index % COLORS.length]}
                            radius={[0, 0, 0, 0]}
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
                                        fill="#9ca3af"
                                        fontSize={10}
                                        textAnchor="start"
                                        transform={`rotate(-90 ${x} ${y})`}
                                    >
                                        {val}
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
