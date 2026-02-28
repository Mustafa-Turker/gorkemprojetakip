"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4">
            <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-6 border border-zinc-200 dark:border-zinc-800 text-center">
                <h2 className="text-xl font-bold text-red-600 mb-2">Something went wrong!</h2>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-6">
                    {error.message || "An unexpected error occurred while rendering the dashboard."}
                </p>
                <div className="flex gap-4 justify-center">
                    <Button onClick={() => reset()} variant="default">
                        Try again
                    </Button>
                    <Button onClick={() => window.location.href = "/"} variant="outline">
                        Go Home
                    </Button>
                </div>
            </div>
        </div>
    );
}
