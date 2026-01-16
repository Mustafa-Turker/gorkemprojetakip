"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    Command,
    CommandGroup,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";
import { cn } from "@/lib/utils";

interface Option {
    label: string;
    value: string;
}

interface MultiSelectProps {
    options: Option[];
    selected: string[];
    onChange: (selected: string[]) => void;
    placeholder?: string;
    className?: string;
}

export function MultiSelect({ options, selected, onChange, placeholder = "Select...", className }: MultiSelectProps) {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [open, setOpen] = React.useState(false);
    const [inputValue, setInputValue] = React.useState("");

    const handleUnselect = (value: string) => {
        onChange(selected.filter((s) => s !== value));
    };

    const handleKeyDown = React.useCallback(
        (e: React.KeyboardEvent<HTMLDivElement>) => {
            const input = inputRef.current;
            if (input) {
                if (e.key === "Delete" || e.key === "Backspace") {
                    if (input.value === "" && selected.length > 0) {
                        handleUnselect(selected[selected.length - 1]);
                    }
                }
                if (e.key === "Escape") {
                    input.blur();
                }
            }
        },
        [selected]
    );

    const selectables = options.filter((option) => !selected.includes(option.value));

    return (
        <Command
            onKeyDown={handleKeyDown}
            className={cn("overflow-visible bg-transparent", className)}
        >
            <div
                className="group border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-sm ring-offset-background rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
            >
                <div className="flex gap-1 flex-wrap">
                    {selected.map((value) => {
                        const option = options.find((o) => o.value === value);
                        return (
                            <Badge key={value} variant="secondary" className="hover:bg-secondary/80">
                                {option ? option.label : value}
                                <button
                                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            handleUnselect(value);
                                        }
                                    }}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                    }}
                                    onClick={() => handleUnselect(value)}
                                >
                                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                </button>
                            </Badge>
                        );
                    })}
                    <CommandPrimitive.Input
                        ref={inputRef}
                        value={inputValue}
                        onValueChange={setInputValue}
                        onBlur={() => setOpen(false)}
                        onFocus={() => setOpen(true)}
                        placeholder={placeholder}
                        className="ml-2 bg-transparent outline-none placeholder:text-muted-foreground flex-1"
                    />
                </div>
            </div>
            <div className="relative mt-2">
                {open && selectables.length > 0 ? (
                    <div className="absolute w-full z-10 top-0 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-popover-foreground shadow-md outline-none animate-in">
                        <CommandList>
                            <CommandGroup className="h-full overflow-auto max-h-60">
                                {selectables.map((option) => (
                                    <CommandItem
                                        key={option.value}
                                        onSelect={() => {
                                            setInputValue("");
                                            onChange([...selected, option.value]);
                                        }}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                        }}
                                        className="cursor-pointer"
                                    >
                                        {option.label}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </div>
                ) : null}
            </div>
        </Command>
    );
}
