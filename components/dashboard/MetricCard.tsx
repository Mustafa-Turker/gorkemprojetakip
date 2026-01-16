import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
    title: string;
    value: string;
    icon?: LucideIcon;
    description?: string;
    trend?: string;
    trendUp?: boolean;
}

export default function MetricCard({ title, value, icon: Icon, description, trend, trendUp }: MetricCardProps) {
    return (
        <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-950 hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold tracking-tight">{value}</div>
                {description && (
                    <p className="text-xs text-muted-foreground mt-1">
                        {description}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
