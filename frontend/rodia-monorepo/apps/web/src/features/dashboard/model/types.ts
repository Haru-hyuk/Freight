// src/features/dashboard/model/types.ts
export type TimeRange = "today" | "week";

/** 서버에서 오는 severity (실제 응답) */
export type ApiDeviationSeverity = "LOW" | "MEDIUM" | "HIGH";

/** UI에서 쓰는 severity(도메인/표현) */
export type DeviationSeverity = "MINOR" | "MODERATE" | "SEVERE";

export type KpiData = {
  todayOrders: number;
  weeklyOrders: number;

  dispatchCompletionRate: number;
  avgDispatchMinutes: number;

  inTransitCount: number;
  canceledQuotes: number;

  gmv: number;
  platformRevenue: number;
  unsettledAmount: number;
};

/** ✅ 서버 응답의 deviation 이벤트 DTO */
export type ApiDeviationEvent = {
  id: string;
  occurredAt: string;
  severity: ApiDeviationSeverity;
  adjusted: boolean;
  title: string;
  summary: string;
  matchId?: string;
  quoteId?: string;
  driverName?: string;
};

/** ✅ UI가 실제로 렌더링에 쓰는 모델 */
export type DeviationFeedItem = {
  deviationId: string;
  matchId: string;
  severity: DeviationSeverity;
  deviationPercent: number;
  adjusted: boolean;
  createdAt: string;

  quoteSummary: string;
  driverName: string;
};

/** 서버 dashboard 응답 */
export type DashboardResponse = {
  range: TimeRange;
  kpi: KpiData;
  deviations: DeviationFeedItem[];
};

/** 서버가 주는 dashboard raw 응답 */
export type ApiDashboardResponse = {
  range: TimeRange;
  kpi: KpiData;
  deviations: ApiDeviationEvent[];
};
