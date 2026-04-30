import { Table as TableIcon } from "lucide-react";

export default function TablesPage() {
    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans">
            <main className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Tables</h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        Reference and reporting tables — added one at a time.
                    </p>
                </div>

                <div className="flex flex-col items-center justify-center min-h-[40vh] rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white/50 dark:bg-zinc-900/30 p-10 text-center">
                    <div className="mb-3 p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                        <TableIcon className="w-6 h-6 text-zinc-500 dark:text-zinc-400" />
                    </div>
                    <p className="text-zinc-600 dark:text-zinc-300 font-medium">No tables yet</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-md">
                        Tables will be added here as they are defined.
                    </p>
                </div>
            </main>
        </div>
    );
}
