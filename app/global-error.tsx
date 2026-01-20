"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <html>
            <body>
                <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 font-sans">
                    <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-6 border border-zinc-200 dark:border-zinc-800 text-center">
                        <h2 className="text-xl font-bold text-red-600 mb-2">Critical System Error</h2>
                        <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-6">
                            {error.message || "A critical error occurred preventing the application from loading."}
                        </p>
                        <Button onClick={() => reset()} variant="default">
                            Reload Application
                        </Button>
                    </div>
                </div>
            </body>
        </html>
    );
}
