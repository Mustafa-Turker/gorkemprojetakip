"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MultiSelect } from "@/components/ui/multi-select";
import { CostRecord } from "@/lib/types";
import { useEffect, useState } from "react";

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
    // Initialize with default categories if provided
    const [selectedCategories, setSelectedCategories] = useState<string[]>(defaultSelectedCategories);

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

    return (
        <Card className={`shadow-md border-none bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm flex flex-col ${className}`}>
            <CardHeader className={`flex ${isCenter ? "flex-col items-center text-center space-y-4" : "flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0"} pb-2`}>
                <div>
                    <CardTitle>{title}</CardTitle>
                    {description && <CardDescription>{description}</CardDescription>}
                </div>
                <div className={`flex flex-wrap gap-2 ${isCenter ? "justify-center" : ""}`}>
                    <MultiSelect
                        options={projectOptions}
                        selected={selectedProjects}
                        onChange={setSelectedProjects}
                        placeholder="Project"
                        className="w-[140px]"
                    />
                    <MultiSelect
                        options={yearOptions}
                        selected={selectedYears}
                        onChange={setSelectedYears}
                        placeholder="Year"
                        className="w-[120px]"
                    />
                    <MultiSelect
                        options={sourceOptions}
                        selected={selectedSources}
                        onChange={setSelectedSources}
                        placeholder="Source"
                        className="w-[120px]"
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
            </CardHeader>
            <CardContent className="flex-1 min-h-[200px]">
                {children(filteredData, { isCategoryFiltered: selectedCategories.length > 0 })}
            </CardContent>
        </Card>
    );
}
