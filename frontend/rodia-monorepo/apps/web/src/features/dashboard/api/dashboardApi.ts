// src/features/dashboard/api/dashboardApi.ts
import { apiClient } from "@/shared/lib/api/client";
import type {
  DashboardResponse,
  TimeRange,
  KpiData,
  DeviationFeedItem,
  DeviationSeverity,
} from "../model/types";

/**
 * 백엔드 Raw 응답 타입
 */
type DashboardApiResponse = {
  kpi: {
    today_orders: number;
    weekly_orders: number;
    dispatch_completion_rate: number;
    avg_dispatch_minutes: number;

    in_transit_count: number;
    canceled_quotes: number;

    gmv: number;
    platform_fee: number;
    unsettled_amount: number;
  };
  deviations: Array<{
    id: string;
    occurred_at: string;
    severity: "LOW" | "MEDIUM" | "HIGH";
    adjusted: boolean;

    title: string;
    summary: string;

    match_id?: string;
    quote_id?: string;
    driver_name?: string;
  }>;
};

/**
 * KPI 매핑
 */
function mapKpi(raw: DashboardApiResponse["kpi"]): KpiData {
  return {
    todayOrders: raw.today_orders,
    weeklyOrders: raw.weekly_orders,
    dispatchCompletionRate: raw.dispatch_completion_rate,
    avgDispatchMinutes: raw.avg_dispatch_minutes,

    inTransitCount: raw.in_transit_count,
    canceledQuotes: raw.canceled_quotes,

    gmv: raw.gmv,
    platformRevenue: raw.platform_fee,
    unsettledAmount: raw.unsettled_amount,
  };
}

/**
 * severity 변환 (API → UI)
 */
function mapSeverity(sev: "LOW" | "MEDIUM" | "HIGH"): DeviationSeverity {
  if (sev === "HIGH") return "SEVERE";
  if (sev === "MEDIUM") return "MODERATE";
  return "MINOR";
}

/**
 * Dashboard API
 */
export async function fetchDashboard(range: TimeRange): Promise<DashboardResponse> {
  const res = await apiClient.get<DashboardApiResponse>("/admin/dashboard", {
    params: { range },
  });

  const data = res.data;

  const deviations: DeviationFeedItem[] = data.deviations.map((d) => ({
    deviationId: d.id,
    matchId: d.match_id ?? "-",
    severity: mapSeverity(d.severity),
    deviationPercent: 0, // 서버에 아직 없음 → 0 또는 추후 연결
    adjusted: d.adjusted,
    createdAt: d.occurred_at,

    quoteSummary: d.title || d.summary || "-",
    driverName: d.driver_name ?? "-",
  }));

  return {
    range,
    kpi: mapKpi(data.kpi),
    deviations,
  };
}
