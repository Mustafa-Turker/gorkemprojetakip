import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
    title: string;
    value: string;
    icon?: LucideIcon;
    description?: string;
    trend?: string;
    trendUp?: boolean;
    accentColor?: "indigo" | "emerald" | "amber" | "rose";
}

const accentColors = {
    indigo: {
        gradient: "from-indigo-500 to-violet-600",
        glow: "shadow-indigo-500/25 group-hover:shadow-indigo-500/40",
        bg: "bg-indigo-50 dark:bg-indigo-950/30",
        text: "text-indigo-600 dark:text-indigo-400",
    },
    emerald: {
        gradient: "from-emerald-500 to-teal-600",
        glow: "shadow-emerald-500/25 group-hover:shadow-emerald-500/40",
        bg: "bg-emerald-50 dark:bg-emerald-950/30",
        text: "text-emerald-600 dark:text-emerald-400",
    },
    amber: {
        gradient: "from-amber-500 to-orange-600",
        glow: "shadow-amber-500/25 group-hover:shadow-amber-500/40",
        bg: "bg-amber-50 dark:bg-amber-950/30",
        text: "text-amber-600 dark:text-amber-400",
    },
    rose: {
        gradient: "from-rose-500 to-pink-600",
        glow: "shadow-rose-500/25 group-hover:shadow-rose-500/40",
        bg: "bg-rose-50 dark:bg-rose-950/30",
        text: "text-rose-600 dark:text-rose-400",
    },
};

export default function MetricCard({
    title,
    value,
    icon: Icon,
    description,
    trend,
    trendUp,
    accentColor = "indigo"
}: MetricCardProps) {
    const colors = accentColors[accentColor];

    return (
        <div className="group relative">
            {/* Hover glow effect */}
            <div className={cn(
                "absolute -inset-1 rounded-3xl bg-gradient-to-r opacity-0 blur-xl transition-all duration-500 group-hover:opacity-100",
                colors.gradient
            )} style={{ opacity: 0.1 }} />

            {/* Card */}
            <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 shadow-lg shadow-zinc-900/5 dark:shadow-black/20 group-hover:shadow-xl transition-all duration-500 group-hover:-translate-y-1">

                {/* Gradient accent line at top */}
                <div className={cn(
                    "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r",
                    colors.gradient
                )} />

                {/* Content */}
                <div className="p-6 pt-5">
                    {/* Header row */}
                    <div className="flex items-start justify-between mb-4">
                        <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                            {title}
                        </span>
                        {Icon && (
                            <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110",
                                "bg-gradient-to-br shadow-lg",
                                colors.gradient,
                                colors.glow
                            )}>
                                <Icon className="h-5 w-5 text-white" />
                            </div>
                        )}
                    </div>

                    {/* Value with animated underline */}
                    <div className="space-y-2">
                        <div className="relative inline-block">
                            <span className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                                {value}
                            </span>
                            {/* Subtle underline accent */}
                            <div className={cn(
                                "absolute -bottom-1 left-0 h-0.5 w-0 bg-gradient-to-r transition-all duration-500 ease-out group-hover:w-full",
                                colors.gradient
                            )} />
                        </div>

                        {/* Description */}
                        {description && (
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 transition-colors duration-300">
                                {description}
                            </p>
                        )}

                        {/* Trend indicator */}
                        {trend && (
                            <div className={cn(
                                "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                                trendUp
                                    ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400"
                                    : "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400"
                            )}>
                                <span>{trendUp ? "↑" : "↓"}</span>
                                {trend}
                            </div>
                        )}
                    </div>
                </div>

                {/* Decorative corner gradient */}
                <div className={cn(
                    "absolute -bottom-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br opacity-5 group-hover:opacity-10 transition-opacity duration-500",
                    colors.gradient
                )} />
            </div>
        </div>
    );
}
