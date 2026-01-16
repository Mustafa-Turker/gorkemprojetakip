"use client";

import ChartCard from "@/components/dashboard/ChartCard";
import {
  CategoryDistributionChart,
  StackedProjectChart,
  TopExpensesChart,
  TrendsChart,
} from "@/components/dashboard/CostCharts";
import DataGrid from "@/components/dashboard/DataGrid";
import Header from "@/components/dashboard/Header";
import MetricCard from "@/components/dashboard/MetricCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { CostRecord } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { AlertCircle, Building2, CreditCard, DollarSign } from "lucide-react";
import useSWR from "swr";
import { Suspense } from "react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function DashboardContent() {
  // Fetch ALL data. Filtering is now handled locally in ChartCards or computed for Metrics.
  const { data, error, isLoading } = useSWR<CostRecord[]>("/api/costs", fetcher);

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        <Alert variant="destructive" className="max-w-md mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to load dashboard data. Is the database connected?</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Calculate Global Metrics (All Time)
  const totalCost = data ? data.reduce((sum, item) => sum + Number(item.toplam_tutar || 0), 0) : 0;

  // Top Category (Global)
  const categoryTotals: Record<string, number> = {};
  if (data) {
    data.forEach((item) => {
      categoryTotals[item.kategori_lvl_1] = (categoryTotals[item.kategori_lvl_1] || 0) + Number(item.toplam_tutar || 0);
    });
  }
  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];

  // Active Projects (Global)
  const activeProjects = data ? new Set(data.map((item) => item.proje_kodu)).size : 0;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans">
      <Header data={data || []} />

      <main className="p-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Metrics Row - Global Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {isLoading ? (
            Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)
          ) : (
            <>
              <MetricCard
                title="Total Cost (All Time)"
                value={formatCurrency(totalCost)}
                icon={DollarSign}
                description="Total expenditure across all projects"
              />
              <MetricCard
                title="Top Category (All Time)"
                value={topCategory ? topCategory[0] : "N/A"}
                icon={Building2}
                description={topCategory ? formatCurrency(topCategory[1]) : ""}
              />
              <MetricCard
                title="Total Projects"
                value={activeProjects.toString()}
                icon={CreditCard}
                description="Count of active projects"
              />
            </>
          )}
        </div>

        {/* Charts Section - Decentralized Filters */}
        {isLoading ? (
          <Skeleton className="h-[400px] w-full rounded-xl" />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Donut Chart */}
            <ChartCard
              title="Category Distribution (L1)"
              description="Filter by Year/Source locally"
              data={data || []}
              headerAlign="center"
            >
              {(filtered) => <CategoryDistributionChart data={filtered} />}
            </ChartCard>

            {/* Trends Chart */}
            <ChartCard
              title="Cost Trends"
              description="Yearly expenditure"
              data={data || []}
            >
              {(filtered) => <TrendsChart data={filtered} />}
            </ChartCard>

            {/* Top Expenses */}
            <ChartCard
              title="Top Categories (L2)"
              description="Top 10 Level 2 Categories"
              data={data || []}
              className="lg:col-span-1"
              headerAlign="center"
              enableCategoryFilter={true}
              defaultSelectedCategories={["MATERIAL COST"]}
            >
              {(filtered) => <TopExpensesChart data={filtered} />}
            </ChartCard>

            {/* Stacked Project Chart (New) */}
            <ChartCard
              title="Project Costs by Category"
              description="Stacked breakdown per project"
              data={data || []}
              className="lg:col-span-1"
            >
              {(filtered) => <StackedProjectChart data={filtered} />}
            </ChartCard>

          </div>
        )}

        {/* Data Grid Section - Global View (Could be filtered?) 
            User didn't explicitly say DataGrid needs filters, but it usually follows. 
            For now, showing ALL data as requested by "Endless scroll".
            If they want filtering here, they might miss the global filters.
            Let's keep it showing all data for now or maybe duplicate filters?
            Actually, DataGrid allows sorting. Filtering was removed from Header.
            It acts as a "Raw Data Dump".
        */}
        <div className="pt-6">
          <h2 className="text-xl font-semibold mb-4 text-zinc-800 dark:text-zinc-200">Detailed Summary Table</h2>
          {isLoading ? (
            <Skeleton className="h-[400px] w-full rounded-xl" />
          ) : (
            <DataGrid data={data || []} />
          )}
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<Skeleton className="w-full h-screen" />}>
      <DashboardContent />
    </Suspense>
  );
}
