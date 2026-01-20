import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { CostRecord } from "@/lib/types";
import { useState, useMemo, memo, useDeferredValue } from "react";

// Memoized row component to prevent re-renders
const DataRow = memo(({ row, index }: { row: CostRecord; index: number }) => (
    <TableRow key={`${row.proje_kodu}-${index}`}>
        <TableCell className="font-medium">{row.rapor_yili}</TableCell>
        <TableCell>
            <Badge variant="outline" className="font-mono">
                {row.proje_kodu}
            </Badge>
        </TableCell>
        <TableCell>{row.source}</TableCell>
        <TableCell>{row.kategori_lvl_1}</TableCell>
        <TableCell>{row.kategori_lvl_2}</TableCell>
        <TableCell className="text-right font-bold text-zinc-700 dark:text-zinc-300">
            {formatCurrency(Number(row.toplam_tutar))}
        </TableCell>
    </TableRow>
));

DataRow.displayName = 'DataRow';

// Initial rows to show (for performance)
const INITIAL_ROWS = 50;
const ROWS_PER_PAGE = 50;

function DataGrid({ data }: { data: CostRecord[] }) {
    const [filters, setFilters] = useState({
        year: "",
        project: "",
        source: "",
        cat1: "",
        cat2: "",
    });
    const [visibleRows, setVisibleRows] = useState(INITIAL_ROWS);

    // Use deferred value for filter changes to avoid blocking
    const deferredFilters = useDeferredValue(filters);

    if (!data || data.length === 0) {
        return (
            <div className="text-center p-8 text-muted-foreground">
                No data available to display.
            </div>
        );
    }

    // Memoize filtered data
    const filteredData = useMemo(() => {
        return data.filter((row) => {
            const matchYear = row.rapor_yili?.toLowerCase().includes(deferredFilters.year.toLowerCase());
            const matchProject = row.proje_kodu?.toLowerCase().includes(deferredFilters.project.toLowerCase());
            const matchSource = row.source?.toLowerCase().includes(deferredFilters.source.toLowerCase());
            const matchCat1 = row.kategori_lvl_1?.toLowerCase().includes(deferredFilters.cat1.toLowerCase());
            const matchCat2 = row.kategori_lvl_2?.toLowerCase().includes(deferredFilters.cat2.toLowerCase());
            return matchYear && matchProject && matchSource && matchCat1 && matchCat2;
        });
    }, [data, deferredFilters]);

    // Only render visible rows
    const displayedData = useMemo(() => {
        return filteredData.slice(0, visibleRows);
    }, [filteredData, visibleRows]);

    const totalAmount = useMemo(() => {
        return filteredData.reduce((sum, row) => sum + Number(row.toplam_tutar), 0);
    }, [filteredData]);

    const hasMore = visibleRows < filteredData.length;

    const loadMore = () => {
        setVisibleRows(prev => Math.min(prev + ROWS_PER_PAGE, filteredData.length));
    };

    return (
        <div className="space-y-4">
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm max-h-[600px] overflow-auto relative">
                <table className="w-full caption-bottom text-sm">
                    <TableHeader className="sticky top-0 bg-white dark:bg-zinc-950 z-10 shadow-sm">
                        {/* Filter Row */}
                        <TableRow className="bg-zinc-100 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-900/50 border-b-0">
                            <TableHead className="p-2 pb-0">
                                <Input
                                    placeholder="Year..."
                                    className="h-7 text-xs bg-white dark:bg-zinc-900"
                                    value={filters.year}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters({ ...filters, year: e.target.value })}
                                />
                            </TableHead>
                            <TableHead className="p-2 pb-0">
                                <Input
                                    placeholder="Project..."
                                    className="h-7 text-xs bg-white dark:bg-zinc-900"
                                    value={filters.project}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters({ ...filters, project: e.target.value })}
                                />
                            </TableHead>
                            <TableHead className="p-2 pb-0">
                                <Input
                                    placeholder="Source..."
                                    className="h-7 text-xs bg-white dark:bg-zinc-900"
                                    value={filters.source}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters({ ...filters, source: e.target.value })}
                                />
                            </TableHead>
                            <TableHead className="p-2 pb-0">
                                <Input
                                    placeholder="Cat L1..."
                                    className="h-7 text-xs bg-white dark:bg-zinc-900"
                                    value={filters.cat1}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters({ ...filters, cat1: e.target.value })}
                                />
                            </TableHead>
                            <TableHead className="p-2 pb-0">
                                <Input
                                    placeholder="Cat L2..."
                                    className="h-7 text-xs bg-white dark:bg-zinc-900"
                                    value={filters.cat2}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters({ ...filters, cat2: e.target.value })}
                                />
                            </TableHead>
                            <TableHead className="p-2 pb-0"></TableHead>
                        </TableRow>

                        {/* Header Row */}
                        <TableRow className="bg-zinc-50 dark:bg-zinc-900">
                            <TableHead className="w-[80px] pt-1">Year</TableHead>
                            <TableHead className="w-[80px] pt-1">Project Code</TableHead>
                            <TableHead className="w-[80px] pt-1">Source</TableHead>
                            <TableHead className="w-[150px] pt-1">Category (L1)</TableHead>
                            <TableHead className="pt-1">Category (L2)</TableHead>
                            <TableHead className="w-[120px] text-right pt-1">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {displayedData.map((row, index) => (
                            <DataRow key={`${row.proje_kodu}-${index}`} row={row} index={index} />
                        ))}
                        {hasMore && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-4">
                                    <button
                                        onClick={loadMore}
                                        className="px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-950/50 rounded-lg transition-colors"
                                    >
                                        Load more ({filteredData.length - visibleRows} remaining)
                                    </button>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                    <TableFooter className="sticky bottom-0 z-10 bg-zinc-50 dark:bg-zinc-900 border-t shadow-[0_-1px_2px_rgba(0,0,0,0.05)]">
                        <TableRow>
                            <TableCell colSpan={5} className="text-right font-bold text-zinc-900 dark:text-zinc-100">TOTAL</TableCell>
                            <TableCell className="text-right font-bold text-zinc-900 dark:text-zinc-100">
                                {formatCurrency(totalAmount)}
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                </table>
            </div>
            <div className="text-xs text-zinc-500 text-center">
                Showing {displayedData.length} of {filteredData.length} filtered records ({data.length} total)
            </div>
        </div>
    );
}

export default memo(DataGrid);
