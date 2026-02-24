import type { DeliveryHistoryQuery, DeliveryHistoryResponse, DeliveryHistoryRow } from "@/features/delivery/model/types";
import { apiClient } from "@/shared/lib/api/client";
import { isMockModeEnabled } from "@/shared/lib/mock-mode";

const MOCK_DELIVERY_HISTORY: DeliveryHistoryRow[] = [
  {
    matchId: "M-3101",
    quoteId: "Q-1022",
    shipperName: "한빛물류",
    driverName: "김차주",
    originAddress: "경기 평택 물류 허브",
    destinationAddress: "충남 천안 북부 창고",
    departAt: "2026-02-10 07:40",
    arriveAt: "2026-02-10 10:20",
    matchStatus: "COMPLETED",
    settlementStatus: "COMPLETED",
    totalFare: 620000,
    driverPayout: 521000,
  },
  {
    matchId: "M-3102",
    quoteId: "Q-1025",
    shipperName: "새길상사",
    driverName: "박차주",
    originAddress: "인천 남구 집하장",
    destinationAddress: "강원 원주 문막 센터",
    departAt: "2026-02-11 05:10",
    matchStatus: "IN_TRANSIT",
    settlementStatus: "PROCESSING",
    totalFare: 780000,
    driverPayout: 640000,
  },
];

function filterMockHistory(query: DeliveryHistoryQuery): DeliveryHistoryResponse {
  const keyword = (query.q ?? "").toLowerCase();

  const filtered = MOCK_DELIVERY_HISTORY.filter((row) => {
    const statusMatched = query.status ? row.matchStatus === query.status : true;
    const keywordMatched = keyword
      ? [row.matchId, row.quoteId, row.shipperName, row.driverName, row.originAddress, row.destinationAddress].join(" ").toLowerCase().includes(keyword)
      : true;
    return statusMatched && keywordMatched;
  });

  const start = (query.page - 1) * query.size;
  const end = start + query.size;
  return {
    items: filtered.slice(start, end),
    total: filtered.length,
  };
}

export async function fetchDeliveryHistory(query: DeliveryHistoryQuery): Promise<DeliveryHistoryResponse> {
  if (isMockModeEnabled()) return filterMockHistory(query);

  try {
    const response = await apiClient.get<DeliveryHistoryResponse>("/admin/delivery/history", { params: query });
    return response.data;
  } catch {
    return { items: [], total: 0 };
  }
}

