import type { KpiData, TimeRange } from "@/features/dashboard/model/types";
import { KpiCard } from "@/features/dashboard/ui/KpiCard";
import { formatKRW, formatNumber, formatPercent } from "@/shared/lib/utils";

type Props = {
  loading: boolean;
  kpi: KpiData | null;
  range: TimeRange;
};

function toRangeLabel(range: TimeRange) {
  if (range === "today") return "오늘";
  if (range === "week") return "최근 7일";
  return "최근 30일";
}

export function DashboardKpiGrid({ loading, kpi, range }: Props) {
  const totalShippers = kpi?.totalShippers ?? 0;
  const totalDrivers = kpi?.totalDrivers ?? 0;

  const totalMatches = kpi?.totalMatches ?? 0;
  const matchCompletionRate = kpi?.matchCompletionRate ?? 0;
  const averageMatchingTime = kpi?.averageMatchingTime ?? 0;

  const totalRevenue = kpi?.totalRevenue ?? 0;
  const totalPlatformFee = kpi?.totalPlatformFee ?? 0;

  const totalSettlementAmount = kpi?.totalSettlementAmount ?? 0;
  const deviationCasesOpen = kpi?.deviationCasesOpen ?? 0;

  const driverCompletionRate = kpi?.driverCompletionRate ?? 0;
  const driverOnTimeRate = kpi?.driverOnTimeRate ?? 0;

  const rangeLabel = toRangeLabel(range);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <KpiCard
        loading={loading}
        title="총 회원"
        value={formatNumber(totalShippers + totalDrivers)}
        tone="primary"
        meta={{
          label: `화주 ${formatNumber(totalShippers)} / 기사 ${formatNumber(totalDrivers)} (${rangeLabel})`,
          source: "users.active",
        }}
      />

      <KpiCard
        loading={loading}
        title="총 매칭"
        value={formatNumber(totalMatches)}
        tone="accent"
        meta={{
          label: `완료율 ${formatPercent(matchCompletionRate)}`,
          source: "matchings.total",
        }}
      />

      <KpiCard
        loading={loading}
        title="평균 배차 시간"
        value={`${formatNumber(averageMatchingTime)}분`}
        tone="secondary"
        meta={{
          label: "견적 생성부터 배차까지",
          source: "quote_to_match_duration",
        }}
      />

      <KpiCard
        loading={loading}
        title="개설 견적"
        value={formatNumber(kpi?.totalQuotesOpen ?? 0)}
        tone="muted"
        meta={{
          label: "현재 열려있는 견적",
          source: "quotes.OPEN",
        }}
      />

      <KpiCard
        loading={loading}
        title="총 거래액 (GMV)"
        value={formatKRW(totalRevenue)}
        tone="primary"
        meta={{
          label: "배송 총액",
          source: "settlements.total",
        }}
      />

      <KpiCard
        loading={loading}
        title="플랫폼 수수료"
        value={formatKRW(totalPlatformFee)}
        tone="accent"
        meta={{
          label: totalRevenue > 0 ? `수수료율 ${formatPercent((totalPlatformFee / totalRevenue) * 100)}` : "수수료율 0%",
          source: "platform.fee",
        }}
      />

      <KpiCard
        loading={loading}
        title="미정산 금액"
        value={formatKRW(totalSettlementAmount)}
        tone="secondary"
        meta={{
          label: "정산 처리 대기",
          source: "settlements.pending",
        }}
      />

      <KpiCard
        loading={loading}
        title="이상 징후"
        value={formatNumber(deviationCasesOpen)}
        tone="primary"
        meta={{
          label: "검토 필요",
          source: "deviations.open",
        }}
      />

      <KpiCard
        loading={loading}
        title="기사 완료율"
        value={formatPercent(driverCompletionRate)}
        tone="primary"
        meta={{
          label: "배송 완료 비율",
          source: "drivers.completion",
        }}
      />

      <KpiCard
        loading={loading}
        title="기사 정시 배송률"
        value={formatPercent(driverOnTimeRate)}
        tone="accent"
        meta={{
          label: "예정 시간 내 배송",
          source: "drivers.ontime",
        }}
      />
    </div>
  );
}
