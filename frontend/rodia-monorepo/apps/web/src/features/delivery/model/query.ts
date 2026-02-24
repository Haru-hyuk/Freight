import type { DeliveryHistoryQuery, DeliveryMatchStatus } from "./types";

export type DeliveryHistoryFilterValue = {
  q: string;
  status: "all" | DeliveryMatchStatus;
};

export function toDeliveryHistoryQuery(
  filters: DeliveryHistoryFilterValue,
  page: number,
  size: number,
): DeliveryHistoryQuery {
  return {
    q: filters.q.trim() ? filters.q.trim() : undefined,
    status: filters.status === "all" ? undefined : filters.status,
    page,
    size,
  };
}
