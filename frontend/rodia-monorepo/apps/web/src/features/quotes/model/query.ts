import type { QuoteQuery, QuoteStatus } from "./types";

export type QuoteFilterValue = {
  q: string;
  status: "all" | QuoteStatus;
  allowCombine: "all" | "yes" | "no";
};

export function toQuoteQuery(filters: QuoteFilterValue, page: number, size: number): QuoteQuery {
  return {
    q: filters.q.trim() ? filters.q.trim() : undefined,
    status: filters.status === "all" ? undefined : filters.status,
    allowCombine: filters.allowCombine === "all" ? undefined : filters.allowCombine === "yes",
    page,
    size,
  };
}
