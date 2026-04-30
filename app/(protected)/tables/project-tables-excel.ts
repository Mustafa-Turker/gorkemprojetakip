// Combined Excel export for the three project-level tables on /tables:
//   Sheet 1 — Cost by Year (table 2)
//   Sheet 2 — Cost Detail (table 3)
//   Sheet 3 — Received Amounts (table 4)
//
// Loaded dynamically from the page so the exceljs bundle isn't included in
// the initial chunk.

import type { Workbook, Borders, Fill } from "exceljs";

const NUM_FMT = "#,##0;[Red]-#,##0;-";
const PCT_FMT = "0.0%;[Red]-0.0%;-";

// Tailwind-aligned solid hexes (no opacity)
const FILL = {
    headerZinc: { type: "pattern", pattern: "solid", fgColor: { argb: "FFE4E4E7" } } as Fill, // zinc-200
    headerZincLight: { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4F4F5" } } as Fill, // zinc-100
    headerIndigo: { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E7FF" } } as Fill, // indigo-100
    headerIndigoLight: { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF2FF" } } as Fill, // indigo-50
    headerEmerald: { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } } as Fill, // emerald-100
    headerEmeraldLight: { type: "pattern", pattern: "solid", fgColor: { argb: "FFECFDF5" } } as Fill, // emerald-50
    headerViolet: { type: "pattern", pattern: "solid", fgColor: { argb: "FFEDE9FE" } } as Fill, // violet-100
    headerVioletLight: { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F3FF" } } as Fill, // violet-50
    headerAmber: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } } as Fill, // amber-100
    sectionTotal: { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } } as Fill, // emerald-100
    altRow: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAFAFA" } } as Fill, // zinc-50
};

const THIN = { style: "thin" as const, color: { argb: "FFD4D4D8" } };
const ALL_BORDERS: Borders = {
    top: THIN,
    left: THIN,
    bottom: THIN,
    right: THIN,
    diagonal: { up: false, down: false, color: { argb: "FFD4D4D8" } },
} as Borders;

interface CatTotals {
    material: number;
    labour: number;
    subcontractor: number;
    unclassified: number;
    common: number;
    general: number;
}
interface YearBlock {
    ANK: CatTotals;
    BAG: CatTotals;
}

interface ReceivedItem {
    id: string;
    date: string;
    description: string | null;
    counter_party: string;
    type: string;
    is_exchange: boolean;
    project: string;
    original_amount: number;
    currency: string;
    currency_rate: number;
    amount: number;
    yr: number;
}

export interface ExportArgs {
    projectCode: string;
    projectDesc: string;
    yearLabel: string; // for filename/title
    years: number[]; // already in display order (newest-first)
    // table 2
    breakdown: { yearMap: Record<number, YearBlock>; total: YearBlock };
    // table 3
    detail: {
        sections: {
            l1: string;
            items: { l2: string; perYear: Record<number, { ANK: number; BAG: number }>; total: { ANK: number; BAG: number } }[];
            subtotal: { perYear: Record<number, { ANK: number; BAG: number }>; total: { ANK: number; BAG: number } };
        }[];
    };
    // table 4
    received: { items: ReceivedItem[]; total: number; totalsByYear: Record<number, number> };
}

const SECTION_TOTAL_LABEL: Record<string, string> = {
    "MATERIAL COST": "MATERIALS TOTAL",
    "LABOUR COST": "PERSONNEL TOTAL",
    "COMMON EXPENSES": "COMMON EXPENSES TOTAL",
    "GENERAL EXPENSES": "GENERAL EXPENSES TOTAL",
    "UNCLASSIFIED COST": "UNCLASSIFIED TOTAL",
};

const sub = (b: CatTotals) => b.material + b.labour + b.subcontractor + b.unclassified;
const tot = (b: CatTotals) => sub(b) + b.common + b.general;

// ---------- Sheet 1: Cost by Year ----------

function buildCostByYearSheet(wb: Workbook, args: ExportArgs) {
    const ws = wb.addWorksheet("Cost by Year", {
        views: [{ state: "frozen", xSplit: 1, ySplit: 4 }],
    });
    const { breakdown, years } = args;
    const groups = [{ label: "TOTAL", block: breakdown.total }, ...years.map((y) => ({ label: String(y), block: breakdown.yearMap[y] }))];

    // Title
    const title = ws.addRow([`Cost by Year — ${args.projectDesc}${args.projectCode !== "__ALL__" ? ` (${args.projectCode})` : ""} — ${args.yearLabel}`]);
    title.font = { bold: true, size: 14 };
    ws.mergeCells(title.number, 1, title.number, 1 + groups.length * 2);
    title.height = 22;
    ws.addRow([]);

    // Header row 1 (group)
    const groupHeaderCells: string[] = [""];
    groups.forEach((g) => {
        groupHeaderCells.push(g.label);
        groupHeaderCells.push("");
    });
    const groupRow = ws.addRow(groupHeaderCells);
    // Header row 2 (sub)
    const subHeaderCells: string[] = ["SUMMARY OF TOTALS"];
    groups.forEach(() => {
        subHeaderCells.push("HEAD OFFICE");
        subHeaderCells.push("BAGHDAD SITE");
    });
    const subRow = ws.addRow(subHeaderCells);

    // Merge group header cells
    groups.forEach((_g, gi) => {
        const startCol = 2 + gi * 2;
        ws.mergeCells(groupRow.number, startCol, groupRow.number, startCol + 1);
    });

    // Style headers
    [groupRow, subRow].forEach((row) => {
        row.eachCell({ includeEmpty: true }, (cell) => {
            cell.font = { bold: true };
            cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
            cell.border = ALL_BORDERS;
            cell.fill = FILL.headerZinc;
        });
        row.height = 22;
    });
    subRow.eachCell({ includeEmpty: true }, (cell, col) => {
        if (col === 1) {
            cell.alignment = { vertical: "middle", horizontal: "left" };
            cell.fill = FILL.headerZinc;
        } else {
            cell.fill = FILL.headerZincLight;
        }
    });

    // Body rows
    interface BodyRow {
        label: string;
        kind: "category" | "subtotal" | "total" | "ratio";
        get: (b: YearBlock) => { ank: number | null; bag: number | null };
    }
    const fmtPctVal = (num: number, den: number) => (den ? num / den : null);
    const rows: BodyRow[] = [
        { label: "TOTAL MATERIAL COST", kind: "category", get: (b) => ({ ank: b.ANK.material, bag: b.BAG.material }) },
        { label: "TOTAL LABOUR COST", kind: "category", get: (b) => ({ ank: b.ANK.labour, bag: b.BAG.labour }) },
        { label: "TOTAL SUB-CONTRACTOR COST", kind: "category", get: (b) => ({ ank: b.ANK.subcontractor, bag: b.BAG.subcontractor }) },
        { label: "TOTAL UNCLASSIFIED COST", kind: "category", get: (b) => ({ ank: b.ANK.unclassified, bag: b.BAG.unclassified }) },
        { label: "SUB TOTAL DIRECT COST", kind: "subtotal", get: (b) => ({ ank: sub(b.ANK), bag: sub(b.BAG) }) },
        { label: "TOTAL COMMON EXPENSES", kind: "category", get: (b) => ({ ank: b.ANK.common, bag: b.BAG.common }) },
        { label: "TOTAL GENERAL EXPENSES", kind: "category", get: (b) => ({ ank: b.ANK.general, bag: b.BAG.general }) },
        { label: "TOTAL COST", kind: "total", get: (b) => ({ ank: tot(b.ANK), bag: tot(b.BAG) }) },
        { label: "(COMMON EXPENSES) / TOTAL COST", kind: "ratio", get: (b) => ({ ank: fmtPctVal(b.ANK.common, tot(b.ANK)), bag: fmtPctVal(b.BAG.common, tot(b.BAG)) }) },
        { label: "(GENERAL EXPENSES) / TOTAL COST", kind: "ratio", get: (b) => ({ ank: fmtPctVal(b.ANK.general, tot(b.ANK)), bag: fmtPctVal(b.BAG.general, tot(b.BAG)) }) },
    ];

    rows.forEach((r) => {
        const cells: (string | number | null)[] = [r.label];
        groups.forEach((g) => {
            const v = r.get(g.block);
            cells.push(v.ank);
            cells.push(v.bag);
        });
        const row = ws.addRow(cells);
        row.height = 18;
        const isPct = r.kind === "ratio";
        const labelFill: Fill = r.kind === "total" ? FILL.headerEmerald : r.kind === "subtotal" ? FILL.headerZinc : r.kind === "ratio" ? FILL.headerZincLight : FILL.headerZincLight;
        const valueFill: Fill = r.kind === "total" ? FILL.headerEmeraldLight : r.kind === "subtotal" ? FILL.headerZincLight : FILL.headerZincLight;
        const labelFont = r.kind === "total" ? { bold: true, color: { argb: "FF047857" } } : r.kind === "subtotal" ? { bold: true } : r.kind === "ratio" ? { italic: true, color: { argb: "FF52525B" } } : {};
        const valueFont = r.kind === "total" ? { bold: true, color: { argb: "FF047857" } } : r.kind === "subtotal" ? { bold: true } : r.kind === "ratio" ? { italic: true } : {};
        row.eachCell({ includeEmpty: true }, (cell, col) => {
            cell.border = ALL_BORDERS;
            if (col === 1) {
                cell.alignment = { vertical: "middle", horizontal: "left" };
                cell.fill = labelFill;
                cell.font = labelFont;
            } else {
                cell.alignment = { vertical: "middle", horizontal: "right" };
                cell.numFmt = isPct ? PCT_FMT : NUM_FMT;
                cell.fill = valueFill;
                cell.font = valueFont;
            }
        });
    });

    // Column widths
    ws.getColumn(1).width = 34;
    for (let i = 2; i <= 1 + groups.length * 2; i++) ws.getColumn(i).width = 14;
}

// ---------- Sheet 2: Cost Detail ----------

function buildCostDetailSheet(wb: Workbook, args: ExportArgs) {
    const ws = wb.addWorksheet("Cost Detail", {
        views: [{ state: "frozen", xSplit: 1, ySplit: 4 }],
    });
    const { detail, years } = args;
    const groups = [{ label: "TOTAL", isTotal: true }, ...years.map((y) => ({ label: String(y), isTotal: false, year: y }))] as Array<{ label: string; isTotal: boolean; year?: number }>;

    // Title
    const title = ws.addRow([`Detailed Breakdown of Costs — ${args.projectDesc}${args.projectCode !== "__ALL__" ? ` (${args.projectCode})` : ""} — ${args.yearLabel}`]);
    title.font = { bold: true, size: 14 };
    ws.mergeCells(title.number, 1, title.number, 1 + groups.length * 2);
    title.height = 22;
    ws.addRow([]);

    // Header rows
    const groupHeaderCells: string[] = [""];
    groups.forEach((g) => {
        groupHeaderCells.push(g.label);
        groupHeaderCells.push("");
    });
    const groupRow = ws.addRow(groupHeaderCells);
    const subHeaderCells: string[] = ["DETAILED BREAKDOWN OF COSTS"];
    groups.forEach(() => {
        subHeaderCells.push("HEAD OFFICE");
        subHeaderCells.push("BAGHDAD SITE");
    });
    const subRow = ws.addRow(subHeaderCells);

    groups.forEach((_g, gi) => {
        const startCol = 2 + gi * 2;
        ws.mergeCells(groupRow.number, startCol, groupRow.number, startCol + 1);
    });

    [groupRow, subRow].forEach((row) => {
        row.eachCell({ includeEmpty: true }, (cell) => {
            cell.font = { bold: true };
            cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
            cell.border = ALL_BORDERS;
            cell.fill = FILL.headerZinc;
        });
        row.height = 22;
    });
    subRow.getCell(1).alignment = { vertical: "middle", horizontal: "left" };

    detail.sections.forEach((section) => {
        // Section banner
        const banner = ws.addRow([section.l1]);
        banner.height = 20;
        ws.mergeCells(banner.number, 1, banner.number, 1 + groups.length * 2);
        banner.eachCell({ includeEmpty: true }, (cell) => {
            cell.font = { bold: true, color: { argb: "FF92400E" } }; // amber-800
            cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
            cell.fill = FILL.headerAmber;
            cell.border = ALL_BORDERS;
        });

        // Detail rows
        section.items.forEach((item) => {
            const cells: (string | number | null)[] = [item.l2];
            groups.forEach((g) => {
                if (g.isTotal) {
                    cells.push(item.total.ANK);
                    cells.push(item.total.BAG);
                } else {
                    const py = item.perYear[g.year!];
                    cells.push(py?.ANK || 0);
                    cells.push(py?.BAG || 0);
                }
            });
            const row = ws.addRow(cells);
            row.height = 18;
            row.eachCell({ includeEmpty: true }, (cell, col) => {
                cell.border = ALL_BORDERS;
                if (col === 1) {
                    cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
                } else {
                    cell.alignment = { vertical: "middle", horizontal: "right" };
                    cell.numFmt = NUM_FMT;
                }
            });
        });

        // Section subtotal
        const stCells: (string | number | null)[] = [SECTION_TOTAL_LABEL[section.l1] || `${section.l1} TOTAL`];
        groups.forEach((g) => {
            if (g.isTotal) {
                stCells.push(section.subtotal.total.ANK);
                stCells.push(section.subtotal.total.BAG);
            } else {
                const py = section.subtotal.perYear[g.year!];
                stCells.push(py?.ANK || 0);
                stCells.push(py?.BAG || 0);
            }
        });
        const stRow = ws.addRow(stCells);
        stRow.height = 20;
        stRow.eachCell({ includeEmpty: true }, (cell, col) => {
            cell.border = ALL_BORDERS;
            cell.fill = FILL.sectionTotal;
            cell.font = { bold: true, color: { argb: "FF047857" } }; // emerald-700
            if (col === 1) {
                cell.alignment = { vertical: "middle", horizontal: "left" };
            } else {
                cell.alignment = { vertical: "middle", horizontal: "right" };
                cell.numFmt = NUM_FMT;
            }
        });
    });

    ws.getColumn(1).width = 36;
    for (let i = 2; i <= 1 + groups.length * 2; i++) ws.getColumn(i).width = 14;
}

// ---------- Sheet 3: Received Amounts ----------

function buildReceivedAmountsSheet(wb: Workbook, args: ExportArgs) {
    const ws = wb.addWorksheet("Received Amounts", {
        views: [{ state: "frozen", xSplit: 9, ySplit: 4 }],
    });
    const { received, years, projectCode } = args;
    const isAll = projectCode === "__ALL__";

    // Title
    const titleColCount = (isAll ? 9 : 8) + years.length; // Date, Desc, CP, Type, [Project], Amount, Cur, Rate, TOTAL + years
    const title = ws.addRow([`Received Amounts (Chronological) — ${args.projectDesc}${!isAll ? ` (${projectCode})` : ""} — ${args.yearLabel}`]);
    title.font = { bold: true, size: 14 };
    ws.mergeCells(title.number, 1, title.number, titleColCount);
    title.height = 22;
    ws.addRow([]);

    // Header
    const headerCells: string[] = ["Date", "Description", "Counter Party", "Type"];
    if (isAll) headerCells.push("Project");
    headerCells.push("Amount", "Cur.", "Rate", "TOTAL (USD)");
    years.forEach((y) => headerCells.push(String(y)));
    // (sub-header empty so merge spans 2 rows? Keep just one header row for this sheet.)
    const headerRow = ws.addRow(headerCells);
    headerRow.height = 22;
    headerRow.eachCell({ includeEmpty: true }, (cell, col) => {
        cell.font = { bold: true };
        cell.alignment = { vertical: "middle", horizontal: col >= (isAll ? 6 : 5) ? "right" : "left", wrapText: true };
        cell.border = ALL_BORDERS;
        // TOTAL column gets emerald
        const totalCol = isAll ? 9 : 8;
        cell.fill = col === totalCol ? FILL.headerEmerald : FILL.headerZinc;
    });
    // Add a blank row below header for visual separation? No — body starts.

    // Body
    received.items.forEach((r, idx) => {
        const dateStr = r.date ? new Date(r.date).toISOString().slice(0, 10) : "";
        const cells: (string | number | Date | null)[] = [dateStr, r.description || "", r.counter_party || "", r.type + (r.is_exchange ? " (FX)" : "")];
        if (isAll) cells.push(r.project);
        cells.push(r.original_amount, r.currency || "", r.currency_rate || null, r.amount);
        years.forEach((y) => cells.push(y === r.yr ? r.amount : null));
        const row = ws.addRow(cells);
        row.height = 18;
        const isAlt = idx % 2 === 1;
        const totalCol = isAll ? 9 : 8;
        const yearStartCol = totalCol + 1;
        row.eachCell({ includeEmpty: true }, (cell, col) => {
            cell.border = ALL_BORDERS;
            if (isAlt) cell.fill = FILL.altRow;
            if (col === totalCol) {
                // TOTAL — bold, colored
                cell.font = { bold: true, color: { argb: r.amount < 0 ? "FFDC2626" : "FF047857" } };
                cell.alignment = { vertical: "middle", horizontal: "right" };
                cell.numFmt = NUM_FMT;
            } else if (col === totalCol - 1 || col === totalCol - 3) {
                // Rate or Amount columns
                cell.alignment = { vertical: "middle", horizontal: "right" };
                cell.numFmt = col === totalCol - 1 ? "#,##0.0000;-#,##0.0000;-" : NUM_FMT;
            } else if (col >= yearStartCol) {
                // Year columns
                cell.alignment = { vertical: "middle", horizontal: "right" };
                cell.numFmt = NUM_FMT;
                if (cell.value != null && typeof cell.value === "number") {
                    cell.font = { color: { argb: r.amount < 0 ? "FFDC2626" : "FF047857" } };
                }
            } else {
                cell.alignment = { vertical: "middle", horizontal: "left" };
            }
        });
    });

    // Footer total row
    const footerCells: (string | number | null)[] = ["TOTAL"];
    const fixedExtras = isAll ? 7 : 6; // CP, Type, [Project], Amount, Cur, Rate => 6 or 7 columns
    for (let i = 0; i < fixedExtras; i++) footerCells.push("");
    footerCells.push(received.total);
    years.forEach((y) => footerCells.push(received.totalsByYear[y] || 0));
    const fRow = ws.addRow(footerCells);
    fRow.height = 22;
    const totalCol = isAll ? 9 : 8;
    // Merge "TOTAL" label across pre-Total columns
    ws.mergeCells(fRow.number, 1, fRow.number, totalCol - 1);
    fRow.eachCell({ includeEmpty: true }, (cell, col) => {
        cell.font = { bold: true, color: { argb: "FF047857" } };
        cell.fill = FILL.headerEmerald;
        cell.border = ALL_BORDERS;
        if (col === 1) {
            cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
        } else if (col >= totalCol) {
            cell.alignment = { vertical: "middle", horizontal: "right" };
            cell.numFmt = NUM_FMT;
        }
    });

    // Column widths
    ws.getColumn(1).width = 12; // Date
    ws.getColumn(2).width = 36; // Description
    ws.getColumn(3).width = 14; // Counter Party
    ws.getColumn(4).width = 12; // Type
    let nextCol = 5;
    if (isAll) {
        ws.getColumn(nextCol).width = 10; // Project
        nextCol++;
    }
    ws.getColumn(nextCol).width = 16; // Amount
    nextCol++;
    ws.getColumn(nextCol).width = 8; // Cur.
    nextCol++;
    ws.getColumn(nextCol).width = 11; // Rate
    nextCol++;
    ws.getColumn(nextCol).width = 16; // TOTAL
    nextCol++;
    for (let i = 0; i < years.length; i++) {
        ws.getColumn(nextCol + i).width = 14;
    }
}

// ---------- Public download ----------

export async function downloadProjectTablesExcel(args: ExportArgs) {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    wb.creator = "Gorkem Dashboard";
    wb.created = new Date();

    buildCostByYearSheet(wb, args);
    buildCostDetailSheet(wb, args);
    buildReceivedAmountsSheet(wb, args);

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeProject = args.projectCode === "__ALL__" ? "AllProjects" : args.projectCode;
    a.download = `ProjectTables_${safeProject}_${args.yearLabel.replace(/[\s,]+/g, "_")}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}
