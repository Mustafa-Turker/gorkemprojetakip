import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";

export default function ReceivedAmountsPage() {
    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
            <main className="p-6 max-w-[1600px] mx-auto">
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Card className="w-full max-w-md text-center border-none shadow-xl bg-gradient-to-br from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-950">
                        <CardHeader className="pb-4">
                            <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20">
                                <Clock className="w-8 h-8 text-white" />
                            </div>
                            <CardTitle className="text-2xl">Received Amounts</CardTitle>
                            <CardDescription className="text-base">
                                Track incoming payments and received funds
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-zinc-500 dark:text-zinc-400">
                                This page is under construction. Coming soon!
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
