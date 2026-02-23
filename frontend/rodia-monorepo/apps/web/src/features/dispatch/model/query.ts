import type {
  DispatchMatchStatus,
  DispatchPaymentStatus,
  DispatchQuery,
  DispatchSettlementStatus,
} from "./types";

export type DispatchFilterValue = {
  q: string;
  status: "all" | DispatchMatchStatus;
  dispatchState: "all" | "WAITING" | "ASSIGNED";
  paymentStatus: "all" | DispatchPaymentStatus;
  settlementStatus: "all" | DispatchSettlementStatus;
};

export function toDispatchQuery(filters: DispatchFilterValue, page: number, size: number): DispatchQuery {
  return {
    q: filters.q.trim() ? filters.q.trim() : undefined,
    status: filters.status === "all" ? undefined : filters.status,
    dispatchState: filters.dispatchState === "all" ? undefined : filters.dispatchState,
    paymentStatus: filters.paymentStatus === "all" ? undefined : filters.paymentStatus,
    settlementStatus: filters.settlementStatus === "all" ? undefined : filters.settlementStatus,
    page,
    size,
  };
}
