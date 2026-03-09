import type { DriverUiState } from "@/shared/lib/policy";

const DRIVER_ORDERS_TAB_PATH = "/(driver)/quotes";

export const DRIVER_ROUTE_PATH = {
  ORDER_DETAIL: "/(driver)/(stack)/order/[id]",
  RUN_DETAIL: "/(driver)/(stack)/run/[id]",
  RUN_TAB: "/(driver)/run",
  ORDERS_TAB: DRIVER_ORDERS_TAB_PATH,
  MARKET_TAB: DRIVER_ORDERS_TAB_PATH,
} as const;

export type DriverStatusFlowItem = {
  serverRaw: string;
  parserStatus: string;
  uiState: DriverUiState;
  ctaLabel: string;
};

/**
 * Driver run UI/API grounding matrix.
 * - Use this as the single source when debugging state drift between server payload and UI policy.
 * - Items are code-facing references, not user-facing copy.
 */
export const DRIVER_STATUS_FLOW_MATRIX: readonly DriverStatusFlowItem[] = [
  { serverRaw: "OPEN", parserStatus: "OPEN", uiState: "READY_TO_ACCEPT", ctaLabel: "배차 수락" },
  { serverRaw: "MATCHED", parserStatus: "ASSIGNED", uiState: "ASSIGNED", ctaLabel: "운행 시작" },
  { serverRaw: "READY", parserStatus: "READY", uiState: "ASSIGNED", ctaLabel: "운행 시작" },
  { serverRaw: "PICKUP", parserStatus: "PICKUP", uiState: "PICKUP_IN_PROGRESS", ctaLabel: "상차 완료" },
  {
    serverRaw: "IN_TRANSIT|TRANSIT|DRIVING",
    parserStatus: "TRANSIT",
    uiState: "TRANSIT_IN_PROGRESS",
    ctaLabel: "하차 완료",
  },
  {
    serverRaw: "DELIVERED|COMPLETED|DROPOFF",
    parserStatus: "DROPOFF",
    uiState: "COMPLETED",
    ctaLabel: "운행 결과 확인",
  },
  { serverRaw: "NEGOTIATING", parserStatus: "NEGOTIATING", uiState: "NEGOTIATING", ctaLabel: "운임 제안" },
] as const;
