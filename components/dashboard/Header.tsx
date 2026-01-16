"use client";

import { CostRecord } from "@/lib/types";

export default function Header({ data }: { data: CostRecord[] }) {
    return (
        <div className="flex flex-col md:flex-row items-center justify-between p-6 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 space-y-4 md:space-y-0 sticky top-0 z-10 backdrop-blur-md bg-opacity-80 dark:bg-opacity-80">
            <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent">
                    Project Cost Dashboard
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Overview of construction expenses and metrics
                </p>
            </div>
        </div>
    );
}
