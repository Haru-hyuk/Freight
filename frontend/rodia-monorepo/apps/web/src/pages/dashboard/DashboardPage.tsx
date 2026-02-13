// src/pages/dashboard/DashboardPage.tsx
import { useEffect, useState } from "react";

import { Separator } from "@/shared/ui/shadcn/separator";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/shadcn/tabs";

import { fetchDashboard } from "@/features/dashboard/api/dashboardApi";
import type { DashboardResponse, TimeRange } from "@/features/dashboard/model/types";
import { DashboardKpiGrid } from "@/features/dashboard/ui/DashboardKpiGrid";
import { DeviationFeed } from "@/features/dashboard/ui/DeviationFeed";
import { DashboardQuickActions } from "@/features/dashboard/ui/DashboardQuickActions";

export default function DashboardPage() {
  const [range, setRange] = useState<TimeRange>("today");
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const res = await fetchDashboard(range);
        if (!cancelled) {
          setData(res);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [range]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-bold">운영 현황</h1>
            <p className="text-sm opacity-70">KPI + 이상 징후를 한 화면에서</p>
          </div>

          <Tabs value={range} onValueChange={(v) => setRange(v as TimeRange)}>
            <TabsList className="border border-border bg-muted">
              <TabsTrigger value="today">오늘</TabsTrigger>
              <TabsTrigger value="week">이번 주</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Separator className="my-6" />

        <DashboardKpiGrid loading={loading} kpi={data?.kpi ?? null} range={range} />

        <Separator className="my-6" />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <DeviationFeed loading={loading} items={data?.deviations ?? []} />
          <DashboardQuickActions loading={loading} kpi={data?.kpi ?? null} items={data?.deviations ?? []} />
        </div>
      </div>
    </div>
  );
}
