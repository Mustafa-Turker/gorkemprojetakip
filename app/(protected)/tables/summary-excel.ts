// Excel export for the Summary table on /tables.
// Loaded dynamically from the page so the exceljs bundle is only fetched
// when the user clicks the download button.

import type { Workbook } from "exceljs";

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
    bySource: { ANK: PerSourceTotals; BAG: PerSourceTotals };
    received: number;
    totalCostProject: number;
    totalSpentProject: number;
    balanceVsCost: number;
    balanceVsSpent: number;
}

interface GrandTotals {
    ANK: PerSourceTotals;
    BAG: PerSourceTotals;
    received: number;
    totalCostProject: number;
    totalSpentProject: number;
    balanceVsCost: number;
    balanceVsSpent: number;
}

const NUM_FMT = "#,##0;[Red]-#,##0;-";

const FILL = {
    headerGroup: { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFE0E7FF" } }, // indigo-100
    headerCost: { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFEEF2FF" } }, // indigo-50
    headerBalance: { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFF5F3FF" } }, // violet-50
    headerReceived: { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFECFDF5" } }, // emerald-50
    headerSubtle: { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFF4F4F5" } }, // zinc-100
    grandTotal: { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFE4E4E7" } }, // zinc-200
    altRow: { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFFAFAFA" } }, // zinc-50
};

const THIN_BORDER = { style: "thin" as const, color: { argb: "FFD4D4D8" } };
const ALL_BORDERS = { top: THIN_BORDER, left: THIN_BORDER, bottom: THIN_BORDER, right: THIN_BORDER };

export async function downloadSummaryExcel(opts: {
    rows: ProjectRow[];
    grand: GrandTotals;
    yearLabel: string; // e.g. "2024" or "2024, 2025" or "All Years"
}) {
    const ExcelJS = (await import("exceljs")).default;
    const wb: Workbook = new ExcelJS.Workbook();
    wb.creator = "Gorkem Dashboard";
    wb.created = new Date();

    const ws = wb.addWorksheet("Summary", {
        views: [{ state: "frozen", xSplit: 2, ySplit: 3 }], // freeze Project + Src cols and 3 header rows
    });

    // Title row
    const titleRow = ws.addRow([`Summary — Cost / Spent / Received / Balance — ${opts.yearLabel}`]);
    titleRow.font = { bold: true, size: 14 };
    ws.mergeCells(titleRow.number, 1, titleRow.number, 13);
    titleRow.height = 22;

    // Group header (row 2)
    const groupHeaderRow = ws.addRow([
        "Project",
        "Src",
        "COST DETAILS", "", "", "", "", "",
        "Total Cost",
        "Total Spent",
        "Total Received",
        "BALANCE", "",
    ]);
    // Sub header (row 3)
    const subHeaderRow = ws.addRow([
        "", "",
        "Material", "Labour", "Subcontractor", "Unclassified", "Common Exp.", "General Exp.",
        "", "",
        "",
        "vs Cost", "vs Spent",
    ]);

    // Merge group header cells
    ws.mergeCells(groupHeaderRow.number, 1, subHeaderRow.number, 1); // Project
    ws.mergeCells(groupHeaderRow.number, 2, subHeaderRow.number, 2); // Src
    ws.mergeCells(groupHeaderRow.number, 3, groupHeaderRow.number, 8); // COST DETAILS
    ws.mergeCells(groupHeaderRow.number, 9, subHeaderRow.number, 9); // Total Cost
    ws.mergeCells(groupHeaderRow.number, 10, subHeaderRow.number, 10); // Total Spent
    ws.mergeCells(groupHeaderRow.number, 11, subHeaderRow.number, 11); // Total Received
    ws.mergeCells(groupHeaderRow.number, 12, groupHeaderRow.number, 13); // BALANCE

    [groupHeaderRow, subHeaderRow].forEach((row) => {
        row.eachCell({ includeEmpty: true }, (cell) => {
            cell.font = { bold: true, color: { argb: "FF18181B" } };
            cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
            cell.border = ALL_BORDERS;
        });
        row.height = 22;
    });

    // Apply section bg to header cells
    [3, 4, 5, 6, 7, 8].forEach((c) => {
        groupHeaderRow.getCell(c).fill = FILL.headerGroup;
        subHeaderRow.getCell(c).fill = FILL.headerCost;
    });
    [12, 13].forEach((c) => {
        groupHeaderRow.getCell(c).fill = FILL.headerGroup;
        subHeaderRow.getCell(c).fill = FILL.headerBalance;
    });
    groupHeaderRow.getCell(11).fill = FILL.headerReceived;
    [1, 2, 9, 10].forEach((c) => {
        groupHeaderRow.getCell(c).fill = FILL.headerSubtle;
    });

    // Body rows: 2 rows per project (ANK, BAG) — Project, Total Received, vs Cost, vs Spent merged.
    opts.rows.forEach((p, projIdx) => {
        const projectStartRowNum = ws.rowCount + 1;
        const altFill = projIdx % 2 === 1 ? FILL.altRow : null;

        const ankRow = ws.addRow([
            p.desc,
            "ANK",
            p.bySource.ANK.material,
            p.bySource.ANK.labour,
            p.bySource.ANK.subcontractor,
            p.bySource.ANK.unclassified,
            p.bySource.ANK.common,
            p.bySource.ANK.general,
            p.bySource.ANK.totalCost,
            p.bySource.ANK.totalSpent,
            p.received,
            p.balanceVsCost,
            p.balanceVsSpent,
        ]);

        const bagRow = ws.addRow([
            "",
            "BAG",
            p.bySource.BAG.material,
            p.bySource.BAG.labour,
            p.bySource.BAG.subcontractor,
            p.bySource.BAG.unclassified,
            p.bySource.BAG.common,
            p.bySource.BAG.general,
            p.bySource.BAG.totalCost,
            p.bySource.BAG.totalSpent,
            "", "", "",
        ]);

        // Merge across both rows for Project, Total Received, vs Cost, vs Spent
        ws.mergeCells(projectStartRowNum, 1, projectStartRowNum + 1, 1);
        ws.mergeCells(projectStartRowNum, 11, projectStartRowNum + 1, 11);
        ws.mergeCells(projectStartRowNum, 12, projectStartRowNum + 1, 12);
        ws.mergeCells(projectStartRowNum, 13, projectStartRowNum + 1, 13);

        // Style both rows
        [ankRow, bagRow].forEach((row) => {
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                cell.border = ALL_BORDERS;
                if (colNumber >= 3) {
                    cell.numFmt = NUM_FMT;
                    cell.alignment = { horizontal: "right", vertical: "middle" };
                } else {
                    cell.alignment = { vertical: "middle" };
                }
                if (altFill) cell.fill = altFill;
            });
        });

        // Project cell: bold, left-aligned
        const projectCell = ankRow.getCell(1);
        projectCell.value = { richText: [
            { text: p.desc + "\n", font: { bold: true } },
            { text: p.project, font: { color: { argb: "FF71717A" }, size: 9 } },
        ]};
        projectCell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };

        // Section bg for cost detail and balance cells (preserve alt zebra by tinting only when no altFill)
        if (!altFill) {
            [3, 4, 5, 6, 7, 8].forEach((c) => {
                ankRow.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAFBFF" } };
                bagRow.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAFBFF" } };
            });
        }

        // Bold totals
        ankRow.getCell(9).font = { bold: true };
        ankRow.getCell(10).font = { bold: true };
        bagRow.getCell(9).font = { bold: true };
        bagRow.getCell(10).font = { bold: true };

        // Received and Balance cells
        const recCell = ankRow.getCell(11);
        recCell.fill = FILL.headerReceived;
        recCell.font = { bold: true };
        recCell.alignment = { vertical: "middle", horizontal: "right" };

        const vsCostCell = ankRow.getCell(12);
        vsCostCell.fill = FILL.headerBalance;
        vsCostCell.font = { bold: true, color: { argb: p.balanceVsCost < 0 ? "FFDC2626" : "FF047857" } };
        vsCostCell.alignment = { vertical: "middle", horizontal: "right" };

        const vsSpentCell = ankRow.getCell(13);
        vsSpentCell.fill = FILL.headerBalance;
        vsSpentCell.font = { bold: true, color: { argb: p.balanceVsSpent < 0 ? "FFDC2626" : "FF047857" } };
        vsSpentCell.alignment = { vertical: "middle", horizontal: "right" };

        ankRow.height = 22;
        bagRow.height = 18;
    });

    // Grand totals: 2 rows
    const gtStart = ws.rowCount + 1;
    const gtAnk = ws.addRow([
        "GRAND TOTAL",
        "ANK",
        opts.grand.ANK.material, opts.grand.ANK.labour, opts.grand.ANK.subcontractor,
        opts.grand.ANK.unclassified, opts.grand.ANK.common, opts.grand.ANK.general,
        opts.grand.ANK.totalCost, opts.grand.ANK.totalSpent,
        opts.grand.received, opts.grand.balanceVsCost, opts.grand.balanceVsSpent,
    ]);
    const gtBag = ws.addRow([
        "", "BAG",
        opts.grand.BAG.material, opts.grand.BAG.labour, opts.grand.BAG.subcontractor,
        opts.grand.BAG.unclassified, opts.grand.BAG.common, opts.grand.BAG.general,
        opts.grand.BAG.totalCost, opts.grand.BAG.totalSpent,
        "", "", "",
    ]);
    ws.mergeCells(gtStart, 1, gtStart + 1, 1);
    ws.mergeCells(gtStart, 11, gtStart + 1, 11);
    ws.mergeCells(gtStart, 12, gtStart + 1, 12);
    ws.mergeCells(gtStart, 13, gtStart + 1, 13);

    [gtAnk, gtBag].forEach((row) => {
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            cell.fill = FILL.grandTotal;
            cell.font = { bold: true };
            cell.border = ALL_BORDERS;
            if (colNumber >= 3) {
                cell.numFmt = NUM_FMT;
                cell.alignment = { horizontal: "right", vertical: "middle" };
            } else {
                cell.alignment = { vertical: "middle", horizontal: colNumber === 1 ? "left" : "left" };
            }
        });
        row.height = 22;
    });

    // Recolor balance cells in grand total
    gtAnk.getCell(12).font = { bold: true, color: { argb: opts.grand.balanceVsCost < 0 ? "FFDC2626" : "FF047857" } };
    gtAnk.getCell(13).font = { bold: true, color: { argb: opts.grand.balanceVsSpent < 0 ? "FFDC2626" : "FF047857" } };

    // Column widths
    ws.getColumn(1).width = 26; // Project
    ws.getColumn(2).width = 6;  // Src
    [3, 4, 5, 6, 7, 8].forEach((c) => (ws.getColumn(c).width = 14));
    ws.getColumn(9).width = 14; // Total Cost
    ws.getColumn(10).width = 14; // Total Spent
    ws.getColumn(11).width = 16; // Total Received
    ws.getColumn(12).width = 14; // vs Cost
    ws.getColumn(13).width = 14; // vs Spent

    // Trigger download
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Summary_${opts.yearLabel.replace(/[\s,]+/g, "_")}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}
