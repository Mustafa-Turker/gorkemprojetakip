"use client";

import * as React from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
    label: string;
    value: string;
}

interface CompactMultiSelectProps {
    options: Option[];
    selected: string[];
    onChange: (selected: string[]) => void;
    placeholder?: string;
    className?: string;
}

export function CompactMultiSelect({ options, selected, onChange, placeholder = "All", className }: CompactMultiSelectProps) {
    const [open, setOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    // Close on outside click
    React.useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    const toggle = (value: string) => {
        if (selected.includes(value)) {
            onChange(selected.filter((s) => s !== value));
        } else {
            onChange([...selected, value]);
        }
    };

    const displayText = selected.length === 0
        ? placeholder
        : selected.length === 1
            ? (options.find((o) => o.value === selected[0])?.label ?? selected[0])
            : `${selected.length} selected`;

    return (
        <div ref={containerRef} className={cn("relative", className)}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className={cn(
                    "flex items-center justify-between w-full h-8 px-2.5 text-xs rounded-md border bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors",
                    selected.length > 0
                        ? "text-zinc-900 dark:text-zinc-100"
                        : "text-zinc-500 dark:text-zinc-400"
                )}
            >
                <span className="truncate">{displayText}</span>
                <div className="flex items-center gap-0.5 ml-1 shrink-0">
                    {selected.length > 0 && (
                        <span
                            role="button"
                            onClick={(e) => { e.stopPropagation(); onChange([]); }}
                            className="rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-600 p-0.5"
                        >
                            <X className="h-3 w-3" />
                        </span>
                    )}
                    <ChevronDown className="h-3 w-3 text-zinc-400" />
                </div>
            </button>
            {open && (
                <div className="absolute z-50 mt-1 w-full min-w-[140px] rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-lg overflow-hidden">
                    <div className="max-h-60 overflow-y-auto py-1">
                        {options.map((option) => {
                            const isSelected = selected.includes(option.value);
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => toggle(option.value)}
                                    className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left"
                                >
                                    <div className={cn(
                                        "h-3.5 w-3.5 rounded-sm border flex items-center justify-center shrink-0",
                                        isSelected
                                            ? "bg-indigo-500 border-indigo-500 text-white"
                                            : "border-zinc-300 dark:border-zinc-600"
                                    )}>
                                        {isSelected && <Check className="h-2.5 w-2.5" />}
                                    </div>
                                    <span className="truncate">{option.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
