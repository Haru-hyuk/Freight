import type { QuoteQuery, QuoteResponse, QuoteRow, QuoteStatus, QuoteUpdatePayload } from "@/features/quotes/model/types";
import { apiPaths } from "@/shared/lib/api/endpoints";
import { apiClient } from "@/shared/lib/api/client";
import { appendActivityLog } from "@/shared/lib/activity-log";
import { isMockModeEnabled } from "@/shared/lib/mock-mode";

type BackendQuoteList = {
  quoteId: number | null;
  quotePublicId: string | null;
  originAddress: string;
  destinationAddress: string;
  distanceKm: number | null;
  vehicleType: string | null;
  vehicleBodyType: string | null;
  cargoName: string | null;
  desiredPrice: number | null;
  finalPrice: number | null;
  status: string | null;
  createdAt: string | null;
};

type BackendQuoteDetail = {
  quoteId: number | null;
  quotePublicId: string | null;
  truckId: number | null;
  originAddress: string;
  destinationAddress: string;
  originLat: number | null;
  originLng: number | null;
  destinationLat: number | null;
  destinationLng: number | null;
  distanceKm: number | null;
  weightKg: number | null;
  volumeCbm: number | null;
  vehicleType: string | null;
  vehicleBodyType: string | null;
  cargoName: string | null;
  cargoType: string | null;
  cargoDesc: string | null;
  desiredPrice: number | null;
  finalPrice: number | null;
  allowCombine: boolean | null;
  loadMethod: string | null;
  unloadMethod: string | null;
  status: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  checklistItems?: unknown[];
  stops?: unknown[];
};

const MOCK_QUOTES: QuoteRow[] = [
  {
    quoteId: "Q-4401",
    shipperName: "샘플 화주",
    originAddress: "인천 물류센터 A",
    destinationAddress: "서울 허브",
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
    checklistSummary: "온도 유지, 상하차 주의",
    createdAt: "2026-02-19 09:10",
    updatedAt: "2026-02-19 09:30",
  },
  {
    quoteId: "Q-4402",
    shipperName: "샘플 화주",
    originAddress: "파주 센터",
    destinationAddress: "수원 창고",
    distanceKm: 58.3,
    weightKg: 5100,
    volumeCbm: 22.5,
    cargoType: "팔레트",
    desiredPrice: 480000,
    status: "DRAFT",
    allowCombine: true,
    loadMethod: "SHIPPER",
    unloadMethod: "SHIPPER",
    checklistSummary: "지게차 필요",
    createdAt: "2026-02-19 08:40",
    updatedAt: "2026-02-19 08:40",
  },
];

const liveQuoteOverrides = new Map<string, QuoteUpdatePayload>();

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function toStringValue(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function toNumberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function pickListPayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const row = toRecord(payload);
  const candidates = [row.items, row.data, row.content, row.list, row.result];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

function toDisplayDate(value: string | null | undefined): string {
  if (!value) return "-";
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  return new Date(parsed).toISOString().slice(0, 16).replace("T", " ");
}

function normalizeQuoteStatus(value: string | null | undefined): QuoteStatus {
  const status = (value ?? "").trim().toUpperCase();
  if (status === "OPEN") return "OPEN";
  if (status === "MATCHED" || status === "ACCEPTED") return "MATCHED";
  if (status === "CANCELLED" || status === "CANCELED") return "CANCELLED";
  return "DRAFT";
}

function normalizeQuoteKey(value: string): string {
  return value.trim().toUpperCase().replace(/^Q-/, "");
}

function extractQuoteIdentifier(value: string): string {
  const raw = value.trim();
  const prefixed = /^Q-(.+)$/i.exec(raw);
  return prefixed?.[1] ?? raw;
}

function mapBackendQuoteList(raw: unknown): BackendQuoteList {
  const row = toRecord(raw);
  return {
    quoteId: toNumberValue(row.quoteId ?? row.quote_id ?? row.id),
    quotePublicId: toStringValue(row.quotePublicId ?? row.quote_public_id, "") || null,
    originAddress: toStringValue(row.originAddress ?? row.origin_address, "-"),
    destinationAddress: toStringValue(row.destinationAddress ?? row.destination_address, "-"),
    distanceKm: toNumberValue(row.distanceKm ?? row.distance_km),
    vehicleType: toStringValue(row.vehicleType ?? row.vehicle_type, "") || null,
    vehicleBodyType: toStringValue(row.vehicleBodyType ?? row.vehicle_body_type, "") || null,
    cargoName: toStringValue(row.cargoName ?? row.cargo_name, "") || null,
    desiredPrice: toNumberValue(row.desiredPrice ?? row.desired_price),
    finalPrice: toNumberValue(row.finalPrice ?? row.final_price),
    status: toStringValue(row.status, "") || null,
    createdAt: toStringValue(row.createdAt ?? row.created_at, "") || null,
  };
}

function mapBackendQuoteDetail(raw: unknown): BackendQuoteDetail {
  const row = toRecord(raw);
  return {
    quoteId: toNumberValue(row.quoteId ?? row.quote_id ?? row.id),
    quotePublicId: toStringValue(row.quotePublicId ?? row.quote_public_id, "") || null,
    truckId: toNumberValue(row.truckId ?? row.truck_id),
    originAddress: toStringValue(row.originAddress ?? row.origin_address, "-"),
    destinationAddress: toStringValue(row.destinationAddress ?? row.destination_address, "-"),
    originLat: toNumberValue(row.originLat ?? row.origin_lat),
    originLng: toNumberValue(row.originLng ?? row.origin_lng),
    destinationLat: toNumberValue(row.destinationLat ?? row.destination_lat),
    destinationLng: toNumberValue(row.destinationLng ?? row.destination_lng),
    distanceKm: toNumberValue(row.distanceKm ?? row.distance_km),
    weightKg: toNumberValue(row.weightKg ?? row.weight_kg),
    volumeCbm: toNumberValue(row.volumeCbm ?? row.volume_cbm),
    vehicleType: toStringValue(row.vehicleType ?? row.vehicle_type, "") || null,
    vehicleBodyType: toStringValue(row.vehicleBodyType ?? row.vehicle_body_type, "") || null,
    cargoName: toStringValue(row.cargoName ?? row.cargo_name, "") || null,
    cargoType: toStringValue(row.cargoType ?? row.cargo_type, "") || null,
    cargoDesc: toStringValue(row.cargoDesc ?? row.cargo_desc, "") || null,
    desiredPrice: toNumberValue(row.desiredPrice ?? row.desired_price),
    finalPrice: toNumberValue(row.finalPrice ?? row.final_price),
    allowCombine:
      typeof row.allowCombine === "boolean" ? row.allowCombine : typeof row.allow_combine === "boolean" ? row.allow_combine : null,
    loadMethod: toStringValue(row.loadMethod ?? row.load_method, "") || null,
    unloadMethod: toStringValue(row.unloadMethod ?? row.unload_method, "") || null,
    status: toStringValue(row.status, "") || null,
    createdAt: toStringValue(row.createdAt ?? row.created_at, "") || null,
    updatedAt: toStringValue(row.updatedAt ?? row.updated_at, "") || null,
    checklistItems: Array.isArray(row.checklistItems) ? row.checklistItems : Array.isArray(row.checklist_items) ? row.checklist_items : [],
    stops: Array.isArray(row.stops) ? row.stops : [],
  };
}

function toRowFromList(list: BackendQuoteList): QuoteRow {
  const idText = typeof list.quoteId === "number" ? `Q-${list.quoteId}` : list.quotePublicId ?? "Q-UNKNOWN";

  return {
    quoteId: idText,
    shipperName: "화주",
    originAddress: list.originAddress,
    destinationAddress: list.destinationAddress,
    distanceKm: list.distanceKm ?? 0,
    weightKg: 0,
    volumeCbm: 0,
    cargoType: list.cargoName ?? "화물",
    desiredPrice: list.desiredPrice ?? list.finalPrice ?? 0,
    finalPrice: list.finalPrice ?? undefined,
    status: normalizeQuoteStatus(list.status),
    allowCombine: false,
    loadMethod: "SHIPPER",
    unloadMethod: "SHIPPER",
    deadlineAt: undefined,
    checklistSummary: "-",
    createdAt: toDisplayDate(list.createdAt),
    updatedAt: toDisplayDate(list.createdAt),
  };
}

function mergeRowWithDetail(base: QuoteRow, detail: BackendQuoteDetail | null): QuoteRow {
  if (!detail) return applyLiveOverride(base);

  const merged: QuoteRow = {
    ...base,
    originAddress: detail.originAddress || base.originAddress,
    destinationAddress: detail.destinationAddress || base.destinationAddress,
    distanceKm: detail.distanceKm ?? base.distanceKm,
    weightKg: detail.weightKg ?? base.weightKg,
    volumeCbm: detail.volumeCbm ?? base.volumeCbm,
    cargoType: detail.cargoType ?? detail.cargoName ?? base.cargoType,
    desiredPrice: detail.desiredPrice ?? base.desiredPrice,
    finalPrice: detail.finalPrice ?? base.finalPrice,
    status: normalizeQuoteStatus(detail.status ?? base.status),
    allowCombine: detail.allowCombine ?? base.allowCombine,
    loadMethod:
      detail.loadMethod?.toUpperCase() === "DRIVER"
        ? "DRIVER"
        : detail.loadMethod?.toUpperCase() === "SHIPPER"
          ? "SHIPPER"
          : base.loadMethod,
    unloadMethod:
      detail.unloadMethod?.toUpperCase() === "DRIVER"
        ? "DRIVER"
        : detail.unloadMethod?.toUpperCase() === "SHIPPER"
          ? "SHIPPER"
          : base.unloadMethod,
    checklistSummary:
      (detail.checklistItems?.length ?? 0) > 0 ? `체크리스트 ${detail.checklistItems?.length ?? 0}건` : base.checklistSummary,
    createdAt: toDisplayDate(detail.createdAt),
    updatedAt: toDisplayDate(detail.updatedAt ?? detail.createdAt),
  };

  return applyLiveOverride(merged);
}

function applyLiveOverride(row: QuoteRow): QuoteRow {
  const override = liveQuoteOverrides.get(normalizeQuoteKey(row.quoteId));
  if (!override) return row;

  return {
    ...row,
    status: override.status,
    cargoType: override.cargoType,
    desiredPrice: override.desiredPrice,
    finalPrice: override.finalPrice,
    distanceKm: override.distanceKm,
    weightKg: override.weightKg,
    volumeCbm: override.volumeCbm,
    originAddress: override.originAddress,
    destinationAddress: override.destinationAddress,
    allowCombine: override.allowCombine,
    loadMethod: override.loadMethod,
    unloadMethod: override.unloadMethod,
    deadlineAt: override.deadlineAt,
    checklistSummary: override.checklistSummary,
    updatedAt: toDisplayDate(new Date().toISOString()),
  };
}

function filterRows(rows: QuoteRow[], query: QuoteQuery): QuoteRow[] {
  const keyword = (query.q ?? "").trim().toLowerCase();
  return rows.filter((row) => {
    if (query.status && row.status !== query.status) return false;
    if (typeof query.allowCombine === "boolean" && row.allowCombine !== query.allowCombine) return false;

    if (!keyword) return true;
    const text = [row.quoteId, row.shipperName, row.originAddress, row.destinationAddress, row.cargoType]
      .join(" ")
      .toLowerCase();
    return text.includes(keyword);
  });
}

function paginateRows(rows: QuoteRow[], page: number, size: number): QuoteResponse {
  const start = (page - 1) * size;
  return {
    items: rows.slice(start, start + size),
    total: rows.length,
  };
}

async function fetchQuoteList(): Promise<BackendQuoteList[]> {
  try {
    const response = await apiClient.get<unknown>(apiPaths.adminTransportQuotes);
    return pickListPayload(response.data).map(mapBackendQuoteList);
  } catch {
    return [];
  }
}

async function fetchQuoteDetail(identifier: string): Promise<BackendQuoteDetail | null> {
  try {
    const response = await apiClient.get<unknown>(`${apiPaths.adminTransportQuotes.replace(/\/$/, "")}/${identifier}`);
    return mapBackendQuoteDetail(response.data);
  } catch {
    return null;
  }
}

function filterMockQuotes(query: QuoteQuery): QuoteResponse {
  const filtered = filterRows(MOCK_QUOTES, query);
  return paginateRows(filtered, query.page, query.size);
}

export async function fetchQuoteRows(query: QuoteQuery): Promise<QuoteResponse> {
  if (isMockModeEnabled()) return filterMockQuotes(query);

  const list = await fetchQuoteList();
  if (list.length === 0) return { items: [], total: 0 };

  const baseRows = list.map(toRowFromList).map(applyLiveOverride);
  const byStatusAndKeyword = baseRows.filter((row) => {
    const keyword = (query.q ?? "").trim().toLowerCase();
    if (query.status && row.status !== query.status) return false;
    if (!keyword) return true;
    const text = [row.quoteId, row.originAddress, row.destinationAddress, row.cargoType].join(" ").toLowerCase();
    return text.includes(keyword);
  });

  const shouldFilterCombine = typeof query.allowCombine === "boolean";
  if (shouldFilterCombine) {
    const enriched = await Promise.all(
      byStatusAndKeyword.map(async (row) => {
        const detail = await fetchQuoteDetail(extractQuoteIdentifier(row.quoteId));
        return mergeRowWithDetail(row, detail);
      }),
    );
    const filtered = filterRows(enriched, query);
    return paginateRows(filtered, query.page, query.size);
  }

  const pageStart = (query.page - 1) * query.size;
  const pageRows = byStatusAndKeyword.slice(pageStart, pageStart + query.size);
  const enrichedPage = await Promise.all(
    pageRows.map(async (row) => {
      const detail = await fetchQuoteDetail(extractQuoteIdentifier(row.quoteId));
      return mergeRowWithDetail(row, detail);
    }),
  );

  return {
    items: enrichedPage,
    total: byStatusAndKeyword.length,
  };
}

export async function updateQuoteByAdmin(payload: QuoteUpdatePayload): Promise<QuoteRow | null> {
  if (isMockModeEnabled()) {
    liveQuoteOverrides.set(normalizeQuoteKey(payload.quoteId), payload);
    const row = MOCK_QUOTES.find((item) => normalizeQuoteKey(item.quoteId) === normalizeQuoteKey(payload.quoteId));
    return row ? applyLiveOverride(row) : null;
  }

  const identifier = extractQuoteIdentifier(payload.quoteId);
  const detail = await fetchQuoteDetail(identifier);
  if (!detail) {
    liveQuoteOverrides.set(normalizeQuoteKey(payload.quoteId), payload);
    appendActivityLog({
      action: "QUOTE_UPDATED",
      targetId: payload.quoteId,
      mode: "REAL",
      message: `견적 ${payload.quoteId} 수정 - 서버 상세 조회 실패로 세션 상태로 반영`,
    });
    return null;
  }

  const requestBody = {
    truckId: detail.truckId,
    originAddress: payload.originAddress,
    destinationAddress: payload.destinationAddress,
    originLat: detail.originLat,
    originLng: detail.originLng,
    destinationLat: detail.destinationLat,
    destinationLng: detail.destinationLng,
    distanceKm: Math.max(1, Math.round(payload.distanceKm)),
    weightKg: Math.max(0, Math.round(payload.weightKg)),
    volumeCbm: Math.max(0, Math.round(payload.volumeCbm)),
    vehicleType: detail.vehicleType ?? "TRUCK",
    vehicleBodyType: detail.vehicleBodyType ?? "WINGBODY",
    cargoName: detail.cargoName ?? payload.cargoType,
    cargoType: payload.cargoType,
    cargoDesc: detail.cargoDesc ?? payload.checklistSummary,
    desiredPrice: Math.max(0, Math.round(payload.desiredPrice)),
    allowCombine: payload.allowCombine,
    loadMethod: payload.loadMethod,
    unloadMethod: payload.unloadMethod,
    checklistItems: Array.isArray(detail.checklistItems) ? detail.checklistItems : [],
    stops: Array.isArray(detail.stops) ? detail.stops : [],
  };

  try {
    const response = await apiClient.put<unknown>(`${apiPaths.adminTransportQuotes.replace(/\/$/, "")}/${identifier}`, requestBody);
    const updatedDetail = mapBackendQuoteDetail(response.data);
    const base = toRowFromList({
      quoteId: updatedDetail.quoteId,
      quotePublicId: updatedDetail.quotePublicId,
      originAddress: updatedDetail.originAddress,
      destinationAddress: updatedDetail.destinationAddress,
      distanceKm: updatedDetail.distanceKm,
      vehicleType: updatedDetail.vehicleType,
      vehicleBodyType: updatedDetail.vehicleBodyType,
      cargoName: updatedDetail.cargoName,
      desiredPrice: updatedDetail.desiredPrice,
      finalPrice: updatedDetail.finalPrice,
      status: updatedDetail.status,
      createdAt: updatedDetail.createdAt,
    });
    const merged = mergeRowWithDetail(base, updatedDetail);
    appendActivityLog({
      action: "QUOTE_UPDATED",
      targetId: payload.quoteId,
      mode: "REAL",
      message: `견적 ${payload.quoteId} 수정 완료`,
    });
    liveQuoteOverrides.delete(normalizeQuoteKey(payload.quoteId));
    return merged;
  } catch {
    liveQuoteOverrides.set(normalizeQuoteKey(payload.quoteId), payload);
    appendActivityLog({
      action: "QUOTE_UPDATED",
      targetId: payload.quoteId,
      mode: "REAL",
      message: `견적 ${payload.quoteId} 수정 - 서버 전용 관리자 API 미지원으로 세션 상태로 반영`,
    });
    return null;
  }
}

export async function sendAdminQuoteUpdatedPush(quoteId: string): Promise<void> {
  appendActivityLog({
    action: "QUOTE_NOTIFICATION_SENT",
    targetId: quoteId,
    mode: isMockModeEnabled() ? "MOCK" : "REAL",
    message: isMockModeEnabled()
      ? `견적 ${quoteId} 수정 알림 전송`
      : `견적 ${quoteId} 수정 알림 요청 - 서버 전용 관리자 알림 API 미지원으로 로그만 기록`,
  });
}
