// src/pages/dashboard/DashboardPage.tsx
import { useEffect, useState } from "react";

import { Separator } from "@/shared/ui/shadcn/separator";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/shadcn/tabs";

import { fetchAdminDashboard } from "@/features/admin/api/adminApi";
import type { AdminDashboardData, TimeRange } from "@/features/dashboard/model/types";
import { DashboardKpiGrid } from "@/features/dashboard/ui/DashboardKpiGrid";
import { DeviationFeed } from "@/features/dashboard/ui/DeviationFeed";
import { DashboardQuickActions } from "@/features/dashboard/ui/DashboardQuickActions";
import { MatchingsOverview } from "@/features/dashboard/ui/MatchingsOverview";

export default function DashboardPage() {
  const [range, setRange] = useState<TimeRange>("today");
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const res = await fetchAdminDashboard();
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
        {/* 헤더 */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">관리 대시보드</h1>
            <p className="text-sm text-muted-foreground">화물 운송 플랫폼 통합 운영 현황</p>
          </div>

          <Tabs value={range} onValueChange={(v) => setRange(v as TimeRange)}>
            <TabsList className="border border-border bg-muted">
              <TabsTrigger value="today">오늘</TabsTrigger>
              <TabsTrigger value="week">이번 주</TabsTrigger>
              <TabsTrigger value="month">이번 달</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* KPI 그리드 */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-foreground mb-3">핵심 지표 (KPI)</h2>
          <DashboardKpiGrid loading={loading} kpi={data?.kpi ?? null} range={range} />
        </div>

        <Separator className="my-6" />

        {/* 메인 컨텐츠: 최근 배치 + 신청 대기 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <MatchingsOverview loading={loading} matches={data?.recentMatches ?? []} />
          <DashboardQuickActions
            loading={loading}
            kpi={data?.kpi ?? null}
            pendingApprovals={data?.pendingApprovals ?? { drivers: 0, trucks: 0 }}
          />
        </div>

        <Separator className="my-6" />

        {/* 이상징후 피드 */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">이상 징후 관리</h2>
          <DeviationFeed loading={loading} items={data?.deviationEvents ?? []} />
        </div>
      </div>
    </div>
  );
}
