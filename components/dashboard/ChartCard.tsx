"use client";

import { MultiSelect } from "@/components/ui/multi-select";
import { CostRecord } from "@/lib/types";
import { useEffect, useState } from "react";
import { Filter } from "lucide-react";

interface ChartCardProps {
    title: string;
    description?: string;
    data: CostRecord[];
    className?: string;
    children: (filteredData: CostRecord[], context: { isCategoryFiltered: boolean }) => React.ReactNode;
    headerAlign?: "left" | "center";
    enableCategoryFilter?: boolean;
    defaultSelectedCategories?: string[];
}

export default function ChartCard({ title, description, data, className, children, headerAlign = "left", enableCategoryFilter = false, defaultSelectedCategories = [] }: ChartCardProps) {
    const [yearOptions, setYearOptions] = useState<{ label: string; value: string }[]>([]);
    const [sourceOptions, setSourceOptions] = useState<{ label: string; value: string }[]>([]);
    const [projectOptions, setProjectOptions] = useState<{ label: string; value: string }[]>([]);
    const [categoryOptions, setCategoryOptions] = useState<{ label: string; value: string }[]>([]);

    const [selectedYears, setSelectedYears] = useState<string[]>([]);
    const [selectedSources, setSelectedSources] = useState<string[]>([]);
    const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
    const [selectedCategories, setSelectedCategories] = useState<string[]>(defaultSelectedCategories);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        if (data) {
            const years = [...new Set(data.map((item) => item.rapor_yili))].sort().reverse();
            const sources = [...new Set(data.map((item) => item.source))].sort();
            const projects = [...new Set(data.map((item) => item.proje_kodu))].sort();
            const categories = [...new Set(data.map((item) => item.kategori_lvl_1))].sort();

            setYearOptions(years.map((y) => ({ label: y, value: y })));
            setSourceOptions(sources.map((s) => ({ label: s, value: s })));
            setProjectOptions(projects.map((p) => ({ label: p, value: p })));
            setCategoryOptions(categories.map((c) => ({ label: c, value: c })));
        }
    }, [data]);

    const filteredData = data.filter((item) => {
        const matchesYear = selectedYears.length === 0 || selectedYears.includes(item.rapor_yili);
        const matchesSource = selectedSources.length === 0 || selectedSources.includes(item.source);
        const matchesProject = selectedProjects.length === 0 || selectedProjects.includes(item.proje_kodu);
        const matchesCategory = !enableCategoryFilter || selectedCategories.length === 0 || selectedCategories.includes(item.kategori_lvl_1);

        return matchesYear && matchesSource && matchesProject && matchesCategory;
    });

    const isCenter = headerAlign === "center";
    const hasActiveFilters = selectedYears.length > 0 || selectedSources.length > 0 || selectedProjects.length > 0 || (enableCategoryFilter && selectedCategories.length > 0);

    return (
        <div
            className={`group relative flex flex-col rounded-2xl overflow-hidden transition-all duration-500 ${className}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Premium gradient border */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/20 via-violet-500/10 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute inset-[1px] rounded-2xl bg-white dark:bg-zinc-900" />

            {/* Subtle glow effect on hover */}
            <div className={`absolute -inset-1 bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-purple-500/10 rounded-3xl blur-xl transition-opacity duration-500 ${isHovered ? 'opacity-100' : 'opacity-0'}`} />

            {/* Card content */}
            <div className="relative flex flex-col flex-1 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-lg shadow-zinc-900/5 dark:shadow-black/20 group-hover:shadow-xl group-hover:shadow-indigo-500/5 transition-all duration-500">

                {/* Header */}
                <div className={`px-6 pt-5 pb-4 ${isCenter ? "text-center" : ""}`}>
                    {/* Title row */}
                    <div className={`flex ${isCenter ? "flex-col items-center space-y-3" : "flex-col sm:flex-row items-start sm:items-center justify-between gap-4"}`}>
                        <div className={`space-y-1 ${isCenter ? "" : "flex-1"}`}>
                            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                                {title}
                                {/* Active filter indicator */}
                                {hasActiveFilters && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 animate-in fade-in duration-300">
                                        <Filter className="w-3 h-3 mr-1" />
                                        Filtered
                                    </span>
                                )}
                            </h3>
                            {description && (
                                <p className="text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
                            )}
                        </div>

                        {/* Premium filter pills */}
                        <div className={`flex flex-wrap gap-2 ${isCenter ? "justify-center" : ""}`}>
                            <MultiSelect
                                options={projectOptions}
                                selected={selectedProjects}
                                onChange={setSelectedProjects}
                                placeholder="Project"
                                className="w-[100px]"
                            />
                            <MultiSelect
                                options={yearOptions}
                                selected={selectedYears}
                                onChange={setSelectedYears}
                                placeholder="Year"
                                className="w-[80px]"
                            />
                            <MultiSelect
                                options={sourceOptions}
                                selected={selectedSources}
                                onChange={setSelectedSources}
                                placeholder="Source"
                                className="w-[80px]"
                            />
                            {enableCategoryFilter && (
                                <MultiSelect
                                    options={categoryOptions}
                                    selected={selectedCategories}
                                    onChange={setSelectedCategories}
                                    placeholder="Category"
                                    className="w-[160px]"
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Subtle separator */}
                <div className="mx-6 h-px bg-gradient-to-r from-transparent via-zinc-200 dark:via-zinc-800 to-transparent" />

                {/* Chart content with animation */}
                <div className="flex-1 px-6 py-4 min-h-[200px]">
                    <div className="h-full transition-all duration-300 ease-out">
                        {children(filteredData, { isCategoryFiltered: selectedCategories.length > 0 })}
                    </div>
                </div>
            </div>
        </div>
    );
}
