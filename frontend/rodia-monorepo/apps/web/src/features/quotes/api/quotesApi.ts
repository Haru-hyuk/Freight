import type { QuoteQuery, QuoteResponse, QuoteRow, QuoteUpdatePayload } from "@/features/quotes/model/types";
import { apiClient } from "@/shared/lib/api/client";
import { appendActivityLog } from "@/shared/lib/activity-log";
import { isMockModeEnabled } from "@/shared/lib/mock-mode";

const MOCK_QUOTES: QuoteRow[] = [
  {
    quoteId: "Q-4401",
    shipperName: "한빛물류",
    originAddress: "인천항 물류센터 A",
    destinationAddress: "용산 냉장 허브",
    distanceKm: 37.8,
    weightKg: 9200,
    volumeCbm: 14.2,
    cargoType: "냉장식품",
    desiredPrice: 620000,
    finalPrice: 640000,
    status: "OPEN",
    allowCombine: false,
    loadMethod: "SHIPPER",
    unloadMethod: "DRIVER",
    deadlineAt: "2026-02-19 16:00",
    checklistSummary: "온도유지, 도착 전 연락",
    createdAt: "2026-02-19 09:10",
    updatedAt: "2026-02-19 09:30",
  },
  {
    quoteId: "Q-4402",
    shipperName: "미래가구",
    originAddress: "파주 산업단지 B",
    destinationAddress: "수원 권역 창고",
    distanceKm: 58.3,
    weightKg: 5100,
    volumeCbm: 22.5,
    cargoType: "파렛트",
    desiredPrice: 480000,
    status: "DRAFT",
    allowCombine: true,
    loadMethod: "SHIPPER",
    unloadMethod: "SHIPPER",
    checklistSummary: "지게차 필요",
    createdAt: "2026-02-19 08:40",
    updatedAt: "2026-02-19 08:40",
  },
  {
    quoteId: "Q-4403",
    shipperName: "네오전자",
    originAddress: "판교 분배센터",
    destinationAddress: "부산 항만 야드",
    distanceKm: 389.4,
    weightKg: 13200,
    volumeCbm: 29.1,
    cargoType: "고가 전자부품",
    desiredPrice: 1460000,
    finalPrice: 1510000,
    status: "MATCHED",
    allowCombine: false,
    loadMethod: "DRIVER",
    unloadMethod: "DRIVER",
    deadlineAt: "2026-02-19 12:30",
    checklistSummary: "봉인필수, 2인 인수인계",
    createdAt: "2026-02-19 06:10",
    updatedAt: "2026-02-19 07:05",
  },
  {
    quoteId: "Q-4404",
    shipperName: "오메가파츠",
    originAddress: "천안 생산동",
    destinationAddress: "익산 부품보관소",
    distanceKm: 121.2,
    weightKg: 8400,
    volumeCbm: 16.4,
    cargoType: "벌크",
    desiredPrice: 790000,
    status: "CANCELLED",
    allowCombine: true,
    loadMethod: "SHIPPER",
    unloadMethod: "DRIVER",
    checklistSummary: "하역대기 30분 허용",
    createdAt: "2026-02-18 19:20",
    updatedAt: "2026-02-18 20:15",
  },
];

function filterMockQuotes(query: QuoteQuery): QuoteResponse {
  const keyword = (query.q ?? "").toLowerCase();

  const filtered = MOCK_QUOTES.filter((row) => {
    const statusMatched = query.status ? row.status === query.status : true;
    const combineMatched = typeof query.allowCombine === "boolean" ? row.allowCombine === query.allowCombine : true;
    const keywordMatched = keyword
      ? [row.quoteId, row.shipperName, row.originAddress, row.destinationAddress, row.cargoType].join(" ").toLowerCase().includes(keyword)
      : true;

    return statusMatched && combineMatched && keywordMatched;
  });

  const start = (query.page - 1) * query.size;
  const end = start + query.size;

  return {
    items: filtered.slice(start, end),
    total: filtered.length,
  };
}

export async function fetchQuoteRows(query: QuoteQuery): Promise<QuoteResponse> {
  if (isMockModeEnabled()) return filterMockQuotes(query);

  try {
    const response = await apiClient.get<QuoteResponse>("/admin/quotes", { params: query });
    return response.data;
  } catch {
    return { items: [], total: 0 };
  }
}

export async function updateQuoteByAdmin(payload: QuoteUpdatePayload): Promise<QuoteRow | null> {
  if (isMockModeEnabled()) {
    const index = MOCK_QUOTES.findIndex((row) => row.quoteId === payload.quoteId);
    if (index < 0) return null;

    const next: QuoteRow = {
      ...MOCK_QUOTES[index],
      status: payload.status,
      cargoType: payload.cargoType,
      desiredPrice: payload.desiredPrice,
      finalPrice: payload.finalPrice,
      distanceKm: payload.distanceKm,
      weightKg: payload.weightKg,
      volumeCbm: payload.volumeCbm,
      originAddress: payload.originAddress,
      destinationAddress: payload.destinationAddress,
      allowCombine: payload.allowCombine,
      loadMethod: payload.loadMethod,
      unloadMethod: payload.unloadMethod,
      deadlineAt: payload.deadlineAt,
      checklistSummary: payload.checklistSummary,
      updatedAt: "2026-02-19 11:10",
    };

    MOCK_QUOTES[index] = next;
    appendActivityLog({
      action: "QUOTE_UPDATED",
      targetId: payload.quoteId,
      mode: "MOCK",
      message: `견적 ${payload.quoteId} 정보를 수정했습니다.`,
    });
    return next;
  }

  try {
    const response = await apiClient.patch<QuoteRow>(`/admin/quotes/${payload.quoteId}`, payload);
    appendActivityLog({
      action: "QUOTE_UPDATED",
      targetId: payload.quoteId,
      mode: "REAL",
      message: `견적 ${payload.quoteId} 정보를 수정했습니다.`,
    });
    return response.data;
  } catch {
    return null;
  }
}

export async function sendAdminQuoteUpdatedPush(quoteId: string): Promise<void> {
  if (isMockModeEnabled()) {
    appendActivityLog({
      action: "QUOTE_NOTIFICATION_SENT",
      targetId: quoteId,
      mode: "MOCK",
      message: `견적 ${quoteId} 수정 알림을 발송했습니다.`,
    });
    return;
  }

  try {
    await apiClient.post("/admin/notifications/quote-updated", {
      quoteId,
      actorType: "ADMIN",
      message: "관리자가 견적 정보를 수정했습니다.",
    });
    appendActivityLog({
      action: "QUOTE_NOTIFICATION_SENT",
      targetId: quoteId,
      mode: "REAL",
      message: `견적 ${quoteId} 수정 알림을 발송했습니다.`,
    });
  } catch {
    // no-op
  }
}
