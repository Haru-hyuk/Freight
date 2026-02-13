// src/features/dashboard/ui/DashboardKpiGrid.tsx
import type { KpiData, TimeRange } from "@/features/dashboard/model/types";
import { formatKRW, formatNumber, formatPercent } from "@/shared/lib/utils/format";
import { KpiCard } from "@/features/dashboard/ui/KpiCard";

type Props = {
  loading: boolean;
  kpi: KpiData | null;
  range: TimeRange;
};

export function DashboardKpiGrid({ loading, kpi, range }: Props) {
  const orders = range === "today" ? kpi?.todayOrders ?? 0 : kpi?.weeklyOrders ?? 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        loading={loading}
        title={range === "today" ? "오늘 오더 수" : "주간 오더 수"}
        value={formatNumber(orders)}
        meta={{
          label: "견적/배차 데이터를 기준으로 집계한 오더 수",
          source: "quotes, matches",
        }}
      />

      <KpiCard
        loading={loading}
        title="배차 완료율"
        value={formatPercent(kpi?.dispatchCompletionRate ?? 0)}
        meta={{
          label: "배차가 완료된 비율",
          source: "matches.status",
        }}
      />

      <KpiCard
        loading={loading}
        title="평균 배차 소요"
        value={`${formatNumber(kpi?.avgDispatchMinutes ?? 0)}분`}
        meta={{
          label: "견적 생성 → 배차 생성까지 걸린 평균 시간",
          source: "quotes.created_at → matches.created_at",
        }}
      />

      <KpiCard
        loading={loading}
        title="진행중 오더"
        value={formatNumber(kpi?.inTransitCount ?? 0)}
        meta={{
          label: "현재 운송 진행 상태인 오더 수",
          source: "matches.status = IN_TRANSIT",
        }}
      />

      <KpiCard
        loading={loading}
        title="취소 오더"
        value={formatNumber(kpi?.canceledQuotes ?? 0)}
        meta={{
          label: "취소 처리된 오더 수",
          source: "quotes.status = CANCELED",
        }}
      />

      <KpiCard
        loading={loading}
        title="GMV"
        value={formatKRW(kpi?.gmv ?? 0)}
        meta={{
          label: "총 거래액(운송 총액 합계)",
          source: "settlements.total_fare",
        }}
      />

      <KpiCard
        loading={loading}
        title="수수료 매출"
        value={formatKRW(kpi?.platformRevenue ?? 0)}
        meta={{
          label: "플랫폼 수수료 합계",
          source: "settlements.platform_fee",
        }}
      />

      <KpiCard
        loading={loading}
        title="미정산 금액"
        value={formatKRW(kpi?.unsettledAmount ?? 0)}
        meta={{
          label: "정산이 완료되지 않은 금액 합계",
          source: "settlements.status != COMPLETED",
        }}
      />
    </div>
  );
}
