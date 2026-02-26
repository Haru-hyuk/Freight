import { useEffect, useState } from "react";

import { fetchAdminDashboard } from "@/features/admin/api/adminApi";
import type { AdminDashboardData } from "@/features/admin/model/types";
import type { TimeRange } from "@/features/dashboard/model/types";
import { DashboardKpiGrid } from "@/features/dashboard/ui/DashboardKpiGrid";
import { DashboardQuickActions } from "@/features/dashboard/ui/DashboardQuickActions";
import { DeviationFeed } from "@/features/dashboard/ui/DeviationFeed";
import { MatchingsOverview } from "@/features/dashboard/ui/MatchingsOverview";
import { useMockMode } from "@/shared/lib/hooks/useMockMode";
import { Badge } from "@/shared/ui/shadcn/badge";
import { Separator } from "@/shared/ui/shadcn/separator";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/shadcn/tabs";

const tabListClass = "h-auto gap-1 rounded-xl border border-border/60 bg-background/60 p-1.5";
const tabTriggerClass =
  "px-4 py-2 text-base data-[state=active]:bg-secondary data-[state=active]:text-foreground hover:bg-secondary/80";

export default function DashboardPage() {
  const [range, setRange] = useState<TimeRange>("today");
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const { enabled: mockModeEnabled } = useMockMode();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const response = await fetchAdminDashboard();
        if (!cancelled) {
          setData(response);
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
  }, [range, mockModeEnabled]);

  const pendingDrivers = data?.pendingApprovals.drivers ?? 0;
  const pendingTrucks = data?.pendingApprovals.trucks ?? 0;
  const deviationCount = data?.kpi.deviationCasesOpen ?? 0;

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-gradient-to-br from-primary/70 via-accent/55 to-background p-6 shadow-xl sm:p-8">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 top-14 h-44 w-[30rem] rotate-[-8deg] rounded-3xl border border-border/50 bg-background/40 backdrop-blur-sm" />
          <div className="absolute -left-16 bottom-[-5.5rem] h-40 w-[24rem] rotate-[9deg] rounded-3xl border border-border/50 bg-secondary/60" />
        </div>

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <Badge variant="secondary" className="text-sm font-semibold">
              Operations Cockpit
            </Badge>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">운영 대시보드</h1>
            <p className="max-w-2xl text-base text-foreground/80">승인, 배차, 배송, 정산 이상징후를 한 화면에서 모니터링하고 조치합니다.</p>
          </div>

          <Tabs value={range} onValueChange={(value) => setRange(value as TimeRange)}>
            <TabsList className={tabListClass}>
              <TabsTrigger value="today" className={tabTriggerClass}>
                오늘
              </TabsTrigger>
              <TabsTrigger value="week" className={tabTriggerClass}>
                최근 7일
              </TabsTrigger>
              <TabsTrigger value="month" className={tabTriggerClass}>
                최근 30일
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="relative mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border/60 bg-background/70 p-4 backdrop-blur">
            <p className="text-sm font-semibold text-foreground/70">승인 대기</p>
            <p className="mt-1 text-3xl font-semibold">{pendingDrivers + pendingTrucks}</p>
            <p className="mt-1 text-sm text-foreground/70">기사 {pendingDrivers} / 차량 {pendingTrucks}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/70 p-4 backdrop-blur">
            <p className="text-sm font-semibold text-foreground/70">이상 징후</p>
            <p className="mt-1 text-3xl font-semibold">{deviationCount}</p>
            <p className="mt-1 text-sm text-foreground/70">검토 필요 건수</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/70 p-4 backdrop-blur">
            <p className="text-sm font-semibold text-foreground/70">열린 견적</p>
            <p className="mt-1 text-3xl font-semibold">{data?.kpi.totalQuotesOpen ?? 0}</p>
            <p className="mt-1 text-sm text-foreground/70">배차 대기 중</p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">핵심 지표</h2>
        <DashboardKpiGrid loading={loading} kpi={data?.kpi ?? null} range={range} />
      </section>

      <Separator />

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <MatchingsOverview loading={loading} matches={data?.recentMatches ?? []} />
        <DashboardQuickActions loading={loading} kpi={data?.kpi ?? null} pendingApprovals={data?.pendingApprovals ?? { drivers: 0, trucks: 0 }} />
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">이상 징후 관리</h2>
        <DeviationFeed loading={loading} items={data?.deviationEvents ?? []} />
      </section>
    </div>
  );
}
