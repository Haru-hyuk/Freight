// src/features/dashboard/ui/DashboardKpiGrid.tsx
import type { KpiData, TimeRange } from "@/features/dashboard/model/types";
import { formatKRW, formatNumber, formatPercent } from "@/shared/lib/utils";
import { KpiCard } from "@/features/dashboard/ui/KpiCard";

type Props = {
  loading: boolean;
  kpi: KpiData | null;
  range: TimeRange;
};

export function DashboardKpiGrid({ loading, kpi, range }: Props) {
  // 사용자 통계
  const totalShippers = kpi?.totalShippers ?? 0;
  const totalDrivers = kpi?.totalDrivers ?? 0;

  // 배차 및 매칭 통계
  const totalMatches = kpi?.totalMatches ?? 0;
  const matchCompletionRate = kpi?.matchCompletionRate ?? 0;
  const averageMatchingTime = kpi?.averageMatchingTime ?? 0;

  // 수익 통계
  const totalRevenue = kpi?.totalRevenue ?? 0;
  const totalPlatformFee = kpi?.totalPlatformFee ?? 0;

  // 정산 및 편차
  const totalSettlementAmount = kpi?.totalSettlementAmount ?? 0;
  const deviationCasesOpen = kpi?.deviationCasesOpen ?? 0;

  // 평가 및 성과
  const averageShipperRating = kpi?.averageShipperRating ?? 0;
  const averageDriverRating = kpi?.averageDriverRating ?? 0;
  const driverCompletionRate = kpi?.driverCompletionRate ?? 0;
  const driverOnTimeRate = kpi?.driverOnTimeRate ?? 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {/* 사용자 */}
      <KpiCard
        loading={loading}
        title="총 회원"
        value={formatNumber(totalShippers + totalDrivers)}
        meta={{
          label: `화주 ${formatNumber(totalShippers)}명 / 기사 ${formatNumber(totalDrivers)}명`,
          source: "users.active",
        }}
      />

      {/* 매칭 건수 */}
      <KpiCard
        loading={loading}
        title="총 매칭"
        value={formatNumber(totalMatches)}
        meta={{
          label: `완료율: ${formatPercent(matchCompletionRate)}`,
          source: "matchings.total",
        }}
      />

      {/* 평균 배차 시간 */}
      <KpiCard
        loading={loading}
        title="평균 배차 시간"
        value={`${formatNumber(averageMatchingTime)}분`}
        meta={{
          label: "견적 생성 → 배차",
          source: "quote_to_match_duration",
        }}
      />

      {/* 개설 견적 */}
      <KpiCard
        loading={loading}
        title="개설된 견적"
        value={formatNumber(kpi?.totalQuotesOpen ?? 0)}
        meta={{
          label: "대기 중인 견적서",
          source: "quotes.OPEN",
        }}
      />

      {/* GMV */}
      <KpiCard
        loading={loading}
        title="총 거래액 (GMV)"
        value={formatKRW(totalRevenue)}
        meta={{
          label: "배송 총액",
          source: "settlements.total",
        }}
      />

      {/* 수수료 */}
      <KpiCard
        loading={loading}
        title="플랫폼 수수료"
        value={formatKRW(totalPlatformFee)}
        meta={{
          label: totalRevenue > 0 ? `수수료율: ${formatPercent((totalPlatformFee / totalRevenue) * 100)}` : "수수료율: 0%",
          source: "platform.fee",
        }}
      />

      {/* 미정산 */}
      <KpiCard
        loading={loading}
        title="미정산액"
        value={formatKRW(totalSettlementAmount)}
        meta={{
          label: "처리 대기액",
          source: "settlements.pending",
        }}
      />

      {/* 이상 징후 */}
      <KpiCard
        loading={loading}
        title="이상 징후"
        value={formatNumber(deviationCasesOpen)}
        meta={{
          label: "검토 중",
          source: "deviations.open",
        }}
      />

      {/* 화주 평점 */}
      <KpiCard
        loading={loading}
        title="화주 평점 평균"
        value={`${averageShipperRating.toFixed(1)}/5.0`}
        meta={{
          label: "모든 화주의 평균 점수",
          source: "shipper.ratings",
        }}
      />

      {/* 기사 평점 */}
      <KpiCard
        loading={loading}
        title="기사 평점 평균"
        value={`${averageDriverRating.toFixed(1)}/5.0`}
        meta={{
          label: "모든 기사의 평균 점수",
          source: "driver.ratings",
        }}
      />

      {/* 기사 완료율 */}
      <KpiCard
        loading={loading}
        title="기사 완료율"
        value={formatPercent(driverCompletionRate)}
        meta={{
          label: "배송 완료 비율",
          source: "drivers.completion",
        }}
      />

      {/* 기사 정시율 */}
      <KpiCard
        loading={loading}
        title="기사 정시 배송율"
        value={formatPercent(driverOnTimeRate)}
        meta={{
          label: "예정 시간 내 배송",
          source: "drivers.ontime",
        }}
      />
    </div>
  );
}
