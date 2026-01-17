import React from 'react';
import { CostRecord } from "@/lib/types";

interface CostSummaryTableProps {
    data: CostRecord[];
}

const PROJECT_META: Record<string, { desc: string; order: number }> = {
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

export default function CostSummaryTable({ data }: CostSummaryTableProps) {
    if (!data || data.length === 0) return null;

    // 1. Get Unique Projects and Sort
    const projects = [...new Set(data.map((d) => d.proje_kodu))].sort((a, b) => {
        const orderA = PROJECT_META[a]?.order || 999;
        const orderB = PROJECT_META[b]?.order || 999;
        return orderA - orderB;
    });

    // 2. Define Category logic
    const calculateCategoryValue = (items: CostRecord[], categoryType: string): number => {
        return items.reduce((sum, item) => {
            let matches = false;
            const l1 = item.kategori_lvl_1;
            const l2 = item.kategori_lvl_2;

            switch (categoryType) {
                case "MATERIAL":
                    matches = l1 === "MATERIAL COST";
                    break;
                case "WORKERS":
                    matches = l2 === "21.13 - Turkish Staff And Workers" || l2 === "21.14 - Local Staff And Workers";
                    break;
                case "SUBCONTRACTOR":
                    matches = l2 === "22.01 - Turkish Sub Contractor" || l2 === "22.02 - Local Sub Contractor";
                    break;
                case "UNCLASSIFIED":
                    matches = l1 === "UNCLASSIFIED COST";
                    break;
                case "COMMON":
                    matches = l1 === "COMMON EXPENSES";
                    break;
                case "GENERAL":
                    matches = l1 === "GENERAL EXPENSES";
                    break;
                default:
                    matches = false;
            }
            return matches ? sum + Number(item.toplam_tutar) : sum;
        }, 0);
    };

    const fmt = (num: number) => {
        return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    };

    const tableData = projects.map(project => {
        const projectItems = data.filter(d => d.proje_kodu === project);
        const ankItems = projectItems.filter(d => d.source === "ANK");
        const bagItems = projectItems.filter(d => d.source === "BAG");

        const processSource = (items: CostRecord[]) => {
            const material = calculateCategoryValue(items, "MATERIAL");
            const workers = calculateCategoryValue(items, "WORKERS");
            const subcontractor = calculateCategoryValue(items, "SUBCONTRACTOR");
            const unclassified = calculateCategoryValue(items, "UNCLASSIFIED");
            const common = calculateCategoryValue(items, "COMMON");
            const general = calculateCategoryValue(items, "GENERAL");
            const total = material + workers + subcontractor + unclassified + common + general;
            return { material, workers, subcontractor, unclassified, common, general, total };
        };

        const ank = processSource(ankItems);
        const bag = processSource(bagItems);
        const projectTotal = ank.total + bag.total;

        return {
            project,
            desc: PROJECT_META[project]?.desc || "",
            ANK: ank,
            BAG: bag,
            projectTotal
        };
    });

    // Calculate Grand Totals
    const grandTotals = {
        ANK: { material: 0, workers: 0, subcontractor: 0, unclassified: 0, common: 0, general: 0, total: 0 },
        BAG: { material: 0, workers: 0, subcontractor: 0, unclassified: 0, common: 0, general: 0, total: 0 },
        TOT: { material: 0, workers: 0, subcontractor: 0, unclassified: 0, common: 0, general: 0, total: 0 },
        ProjectSum: 0
    };

    tableData.forEach(row => {
        const add = (target: any, source: any) => {
            target.material += source.material;
            target.workers += source.workers;
            target.subcontractor += source.subcontractor;
            target.unclassified += source.unclassified;
            target.common += source.common;
            target.general += source.general;
            target.total += source.total;
        };
        add(grandTotals.ANK, row.ANK);
        add(grandTotals.BAG, row.BAG);
        grandTotals.ProjectSum += row.projectTotal;
    });

    grandTotals.TOT = {
        material: grandTotals.ANK.material + grandTotals.BAG.material,
        workers: grandTotals.ANK.workers + grandTotals.BAG.workers,
        subcontractor: grandTotals.ANK.subcontractor + grandTotals.BAG.subcontractor,
        unclassified: grandTotals.ANK.unclassified + grandTotals.BAG.unclassified,
        common: grandTotals.ANK.common + grandTotals.BAG.common,
        general: grandTotals.ANK.general + grandTotals.BAG.general,
        total: grandTotals.ANK.total + grandTotals.BAG.total,
    };


    return (
        <div className="w-full overflow-x-auto py-6 flex justify-center">
            <div className="border-2 border-black bg-white dark:bg-zinc-950 shadow-sm inline-block">
                <table className="border-collapse text-[10px] sm:text-xs font-mono" style={{ fontFamily: "'Cascadia Code', 'Consolas', 'Monaco', monospace" }}>
                    <thead>
                        <tr>
                            <th className="border border-black border-b-2 p-2 text-center bg-white dark:bg-zinc-900 font-bold text-sm tracking-tight min-w-[140px]" rowSpan={2} colSpan={2}>
                                COST SUMMARY<br />FIXED TABLE
                            </th>
                            <th className="border border-black border-b-2 px-1 py-1 text-center bg-white dark:bg-zinc-900 font-bold whitespace-nowrap">TOTAL<br />MATERIAL<br />COST</th>
                            <th className="border border-black border-b-2 px-1 py-1 text-center bg-white dark:bg-zinc-900 font-bold whitespace-nowrap">TOTAL<br />WORKERS<br />COST</th>
                            <th className="border border-black border-b-2 px-1 py-1 text-center bg-white dark:bg-zinc-900 font-bold whitespace-nowrap">TOTAL SUB-<br />CONTRACTOR<br />COST</th>
                            <th className="border border-black border-b-2 px-1 py-1 text-center bg-white dark:bg-zinc-900 font-bold whitespace-nowrap">TOTAL<br />UNCLASSIFIED<br />COST</th>
                            <th className="border border-black border-b-2 px-1 py-1 text-center bg-white dark:bg-zinc-900 font-bold whitespace-nowrap">TOTAL<br />COMMON<br />EXPENSES</th>
                            <th className="border border-black border-b-2 px-1 py-1 text-center bg-white dark:bg-zinc-900 font-bold whitespace-nowrap">TOTAL<br />GENERAL<br />EXPENSES</th>
                            <th className="border border-black border-b-2 px-1 py-1 text-center bg-white dark:bg-zinc-900 font-bold whitespace-nowrap">TOTAL COST</th>
                            <th className="border border-black border-b-2 px-1 py-1 text-center bg-white dark:bg-zinc-900 font-bold whitespace-nowrap w-[100px]">PROJECT<br />TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tableData.map((row, i) => {
                            // Banded rows: pairs of ANK/BAG. 
                            // i is the project index.
                            const rowBg = i % 2 !== 0 ? "bg-blue-50/50 dark:bg-blue-900/10" : "bg-white dark:bg-zinc-950";
                            return (
                                <React.Fragment key={row.project}>
                                    {/* ANK Row */}
                                    <tr className={rowBg}>
                                        <td className="border-l border-r border-black border-b-2 px-2 py-1 text-center font-bold align-middle" rowSpan={2}>
                                            <div className="flex flex-col items-center justify-center space-y-1">
                                                <span className="text-sm">{row.project}</span>
                                                {row.desc && <span className="text-[10px] text-zinc-500 font-normal uppercase max-w-[120px] whitespace-normal leading-tight">{row.desc}</span>}
                                            </div>
                                        </td>
                                        <td className="border border-black px-1 py-1 text-center font-medium w-[50px]">ANK</td>
                                        <td className="border border-black px-1 py-1 text-right">{fmt(row.ANK.material)}</td>
                                        <td className="border border-black px-1 py-1 text-right">{fmt(row.ANK.workers)}</td>
                                        <td className="border border-black px-1 py-1 text-right">{fmt(row.ANK.subcontractor)}</td>
                                        <td className="border border-black px-1 py-1 text-right">{fmt(row.ANK.unclassified)}</td>
                                        <td className="border border-black px-1 py-1 text-right">{fmt(row.ANK.common)}</td>
                                        <td className="border border-black px-1 py-1 text-right">{fmt(row.ANK.general)}</td>
                                        <td className="border border-black px-1 py-1 text-right font-bold">{fmt(row.ANK.total)}</td>
                                        {/* Merged Project Total Cell */}
                                        <td className="border border-black border-b-2 px-1 py-1 text-center font-bold align-middle text-sm" rowSpan={2}>
                                            {fmt(row.projectTotal)}
                                        </td>
                                    </tr>
                                    {/* BAG Row */}
                                    <tr className={rowBg}>
                                        <td className="border border-black border-b-2 px-1 py-1 text-center font-medium">BAG</td>
                                        <td className="border border-black border-b-2 px-1 py-1 text-right">{fmt(row.BAG.material)}</td>
                                        <td className="border border-black border-b-2 px-1 py-1 text-right">{fmt(row.BAG.workers)}</td>
                                        <td className="border border-black border-b-2 px-1 py-1 text-right">{fmt(row.BAG.subcontractor)}</td>
                                        <td className="border border-black border-b-2 px-1 py-1 text-right">{fmt(row.BAG.unclassified)}</td>
                                        <td className="border border-black border-b-2 px-1 py-1 text-right">{fmt(row.BAG.common)}</td>
                                        <td className="border border-black border-b-2 px-1 py-1 text-right">{fmt(row.BAG.general)}</td>
                                        <td className="border border-black border-b-2 px-1 py-1 text-right font-bold">{fmt(row.BAG.total)}</td>
                                    </tr>
                                </React.Fragment>
                            );
                        })}

                        {/* Totals Section */}
                        <tr className="border-t-2 border-black">
                            <td className="border-l border-r border-black px-2 py-1 text-center font-bold bg-[#fff7d4] dark:bg-yellow-950/30 align-middle" rowSpan={2}>
                                TOTALS
                            </td>
                            <td className="border border-black px-1 py-1 text-center font-medium bg-[#fff7d4] dark:bg-yellow-950/30">ANK</td>
                            <td className="border border-black px-1 py-1 text-right font-bold bg-[#fff7d4] dark:bg-yellow-950/30">{fmt(grandTotals.ANK.material)}</td>
                            <td className="border border-black px-1 py-1 text-right font-bold bg-[#fff7d4] dark:bg-yellow-950/30">{fmt(grandTotals.ANK.workers)}</td>
                            <td className="border border-black px-1 py-1 text-right font-bold bg-[#fff7d4] dark:bg-yellow-950/30">{fmt(grandTotals.ANK.subcontractor)}</td>
                            <td className="border border-black px-1 py-1 text-right font-bold bg-[#fff7d4] dark:bg-yellow-950/30">{fmt(grandTotals.ANK.unclassified)}</td>
                            <td className="border border-black px-1 py-1 text-right font-bold bg-[#fff7d4] dark:bg-yellow-950/30">{fmt(grandTotals.ANK.common)}</td>
                            <td className="border border-black px-1 py-1 text-right font-bold bg-[#fff7d4] dark:bg-yellow-950/30">{fmt(grandTotals.ANK.general)}</td>
                            <td className="border border-black px-1 py-1 text-right font-bold bg-[#fff7d4] dark:bg-yellow-950/30">{fmt(grandTotals.ANK.total)}</td>
                            <td className="border border-black px-1 py-1 text-center font-bold bg-[#fff7d4] dark:bg-yellow-950/30 align-middle" rowSpan={2}>
                                {/* Sum of all Project Totals (which is basically Grand Total TOT.total) */}
                                {fmt(grandTotals.ProjectSum)}
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-black px-1 py-1 text-center font-medium bg-[#fff7d4] dark:bg-yellow-950/30">BAG</td>
                            <td className="border border-black px-1 py-1 text-right font-bold bg-[#fff7d4] dark:bg-yellow-950/30">{fmt(grandTotals.BAG.material)}</td>
                            <td className="border border-black px-1 py-1 text-right font-bold bg-[#fff7d4] dark:bg-yellow-950/30">{fmt(grandTotals.BAG.workers)}</td>
                            <td className="border border-black px-1 py-1 text-right font-bold bg-[#fff7d4] dark:bg-yellow-950/30">{fmt(grandTotals.BAG.subcontractor)}</td>
                            <td className="border border-black px-1 py-1 text-right font-bold bg-[#fff7d4] dark:bg-yellow-950/30">{fmt(grandTotals.BAG.unclassified)}</td>
                            <td className="border border-black px-1 py-1 text-right font-bold bg-[#fff7d4] dark:bg-yellow-950/30">{fmt(grandTotals.BAG.common)}</td>
                            <td className="border border-black px-1 py-1 text-right font-bold bg-[#fff7d4] dark:bg-yellow-950/30">{fmt(grandTotals.BAG.general)}</td>
                            <td className="border border-black px-1 py-1 text-right font-bold bg-[#fff7d4] dark:bg-yellow-950/30">{fmt(grandTotals.BAG.total)}</td>
                        </tr>

                        {/* Grand Total Row */}
                        <tr className="border-t-2 border-black">
                            <td className="border border-black px-2 py-1 text-center font-bold bg-[#dbebf9] dark:bg-blue-950/30" colSpan={2}>
                                GRAND TOTAL
                            </td>
                            <td className="border border-black px-1 py-1 text-right font-bold bg-[#dbebf9] dark:bg-blue-950/30">{fmt(grandTotals.TOT.material)}</td>
                            <td className="border border-black px-1 py-1 text-right font-bold bg-[#dbebf9] dark:bg-blue-950/30">{fmt(grandTotals.TOT.workers)}</td>
                            <td className="border border-black px-1 py-1 text-right font-bold bg-[#dbebf9] dark:bg-blue-950/30">{fmt(grandTotals.TOT.subcontractor)}</td>
                            <td className="border border-black px-1 py-1 text-right font-bold bg-[#dbebf9] dark:bg-blue-950/30">{fmt(grandTotals.TOT.unclassified)}</td>
                            <td className="border border-black px-1 py-1 text-right font-bold bg-[#dbebf9] dark:bg-blue-950/30">{fmt(grandTotals.TOT.common)}</td>
                            <td className="border border-black px-1 py-1 text-right font-bold bg-[#dbebf9] dark:bg-blue-950/30">{fmt(grandTotals.TOT.general)}</td>
                            <td className="border border-black px-1 py-1 text-right font-bold bg-[#dbebf9] dark:bg-blue-950/30">{fmt(grandTotals.TOT.total)}</td>
                            <td className="border border-black px-1 py-1 text-center font-bold bg-[#dbebf9] dark:bg-blue-950/30">
                                {fmt(grandTotals.ProjectSum)}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
