import type {
  DeliveryHistoryQuery,
  DeliveryHistoryResponse,
  DeliveryHistoryRow,
  DeliveryMatchStatus,
  DeliverySettlementStatus,
} from "@/features/delivery/model/types";
import axios from "axios";
import { apiPaths } from "@/shared/lib/api/endpoints";
import { apiClient } from "@/shared/lib/api/client";
import { isMockModeEnabled } from "@/shared/lib/mock-mode";

type BackendMatch = {
  matchId: number | null;
  quoteId: number | null;
  driverId: number | null;
  accepted: boolean;
  status: string;
  acceptedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type BackendSettlement = {
  settlementId: number | null;
  matchId: number | null;
  totalFare: number | null;
  driverPayout: number | null;
  settlementStatus: string | null;
  completedAt: string | null;
};

type BackendQuote = {
  quoteId: number | null;
  quotePublicId: string | null;
  originAddress: string;
  destinationAddress: string;
  cargoName: string | null;
  desiredPrice: number | null;
  finalPrice: number | null;
};

const MOCK_DELIVERY_HISTORY: DeliveryHistoryRow[] = [
  {
    matchId: "M-3101",
    quoteId: "Q-1022",
    shipperName: "샘플 화주",
    driverName: "샘플 기사",
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
    shipperName: "샘플 화주",
    driverName: "미배정",
    originAddress: "인천 서구 집하장",
    destinationAddress: "강원 원주 터미널",
    departAt: "2026-02-11 05:10",
    matchStatus: "IN_TRANSIT",
    settlementStatus: "PROCESSING",
    totalFare: 780000,
    driverPayout: 640000,
  },
];
const USE_ROLE_DELIVERY_ENDPOINT_FALLBACK =
  String(import.meta.env.VITE_USE_ROLE_DELIVERY_ENDPOINT_FALLBACK ?? "").toLowerCase() === "true";

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

function toBooleanValue(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return Boolean(value);
}

function toIsoDate(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return fallback;
  return new Date(parsed).toISOString();
}

function toDisplayDate(value: string | null | undefined): string {
  if (!value) return "-";
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  return new Date(parsed).toISOString().slice(0, 16).replace("T", " ");
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

function normalizeMatchStatus(value: string): DeliveryMatchStatus {
  const status = value.trim().toUpperCase();
  if (status === "IN_TRANSIT" || status === "TRANSIT" || status === "MOVING") return "IN_TRANSIT";
  if (status === "COMPLETED" || status === "DONE" || status === "DELIVERED") return "COMPLETED";
  if (status === "CANCELLED" || status === "CANCELED" || status === "CANCEL") return "CANCELLED";
  return "READY";
}

function normalizeSettlementStatus(value: string): DeliverySettlementStatus {
  const status = value.trim().toUpperCase();
  if (status === "PROCESSING") return "PROCESSING";
  if (status === "COMPLETED") return "COMPLETED";
  if (status === "FAILED" || status === "REJECTED") return "FAILED";
  return "PENDING";
}

function parseMatchId(input: string): number | null {
  const prefixed = /^M-(\d+)$/i.exec(input.trim());
  if (prefixed) return Number(prefixed[1]);
  const parsed = Number(input);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapBackendMatch(raw: unknown): BackendMatch {
  const row = toRecord(raw);
  return {
    matchId: toNumberValue(row.matchId ?? row.match_id ?? row.id),
    quoteId: toNumberValue(row.quoteId ?? row.quote_id),
    driverId: toNumberValue(row.driverId ?? row.driver_id),
    accepted: toBooleanValue(row.accepted),
    status: toStringValue(row.status, "READY"),
    acceptedAt: toStringValue(row.acceptedAt ?? row.accepted_at, "") || null,
    createdAt: toStringValue(row.createdAt ?? row.created_at, "") || null,
    updatedAt: toStringValue(row.updatedAt ?? row.updated_at, "") || null,
  };
}

function mapBackendSettlement(raw: unknown): BackendSettlement {
  const row = toRecord(raw);
  return {
    settlementId: toNumberValue(row.settlementId ?? row.settlement_id ?? row.id),
    matchId: toNumberValue(row.matchId ?? row.match_id),
    totalFare: toNumberValue(row.totalFare ?? row.total_fare),
    driverPayout: toNumberValue(row.driverPayout ?? row.driver_payout),
    settlementStatus: toStringValue(row.settlementStatus ?? row.settlement_status ?? row.status, "") || null,
    completedAt: toStringValue(row.completedAt ?? row.completed_at, "") || null,
  };
}

function mapBackendQuote(raw: unknown): BackendQuote {
  const row = toRecord(raw);
  return {
    quoteId: toNumberValue(row.quoteId ?? row.quote_id ?? row.id),
    quotePublicId: toStringValue(row.quotePublicId ?? row.quote_public_id, "") || null,
    originAddress: toStringValue(row.originAddress ?? row.origin_address, "-"),
    destinationAddress: toStringValue(row.destinationAddress ?? row.destination_address, "-"),
    cargoName: toStringValue(row.cargoName ?? row.cargo_name, "") || null,
    desiredPrice: toNumberValue(row.desiredPrice ?? row.desired_price),
    finalPrice: toNumberValue(row.finalPrice ?? row.final_price),
  };
}

function mergeMatches(rows: BackendMatch[]): BackendMatch[] {
  const merged = new Map<number, BackendMatch>();
  for (const row of rows) {
    if (typeof row.matchId !== "number") continue;
    const current = merged.get(row.matchId);
    if (!current) {
      merged.set(row.matchId, row);
      continue;
    }

    const currentUpdatedAt = Date.parse(current.updatedAt ?? current.createdAt ?? "");
    const rowUpdatedAt = Date.parse(row.updatedAt ?? row.createdAt ?? "");
    const latest = rowUpdatedAt >= currentUpdatedAt ? row : current;
    merged.set(row.matchId, {
      ...current,
      ...row,
      status: latest.status,
      updatedAt: latest.updatedAt,
      acceptedAt: latest.acceptedAt ?? current.acceptedAt,
      accepted: current.accepted || row.accepted,
      driverId: row.driverId ?? current.driverId,
      quoteId: row.quoteId ?? current.quoteId,
    });
  }
  return Array.from(merged.values());
}

async function fetchMatchesByPath(path: string): Promise<BackendMatch[]> {
  try {
    const response = await apiClient.get<unknown>(path);
    return pickListPayload(response.data).map(mapBackendMatch);
  } catch {
    return [];
  }
}

async function fetchSettlementsByPath(path: string): Promise<BackendSettlement[]> {
  try {
    const response = await apiClient.get<unknown>(path);
    return pickListPayload(response.data).map(mapBackendSettlement);
  } catch {
    return [];
  }
}

async function fetchQuotes(): Promise<BackendQuote[]> {
  try {
    const response = await apiClient.get<unknown>(apiPaths.adminTransportQuotes);
    return pickListPayload(response.data).map(mapBackendQuote);
  } catch (error) {
    if (!axios.isAxiosError(error) || error.response?.status !== 404) {
      return [];
    }
    if (!USE_ROLE_DELIVERY_ENDPOINT_FALLBACK) {
      return [];
    }

    try {
      const response = await apiClient.get<unknown>(apiPaths.shipperQuotes);
      return pickListPayload(response.data).map(mapBackendQuote);
    } catch {
      return [];
    }
  }
}

async function fetchAdminMatches(): Promise<BackendMatch[] | null> {
  try {
    const response = await apiClient.get<unknown>(apiPaths.adminTransportMatches);
    return pickListPayload(response.data).map(mapBackendMatch);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    return [];
  }
}

async function fetchAdminSettlements(): Promise<BackendSettlement[] | null> {
  try {
    const response = await apiClient.get<unknown>(apiPaths.adminTransportSettlements);
    return pickListPayload(response.data).map(mapBackendSettlement);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    return [];
  }
}

async function fetchLegacySettlements(): Promise<BackendSettlement[]> {
  if (!USE_ROLE_DELIVERY_ENDPOINT_FALLBACK) return [];
  const [shipperSettlements, driverSettlements] = await Promise.all([
    fetchSettlementsByPath(resolveSettlementMePath(apiPaths.shipperSettlements)),
    fetchSettlementsByPath(resolveSettlementMePath(apiPaths.driverSettlements)),
  ]);
  return [...shipperSettlements, ...driverSettlements];
}

async function fetchLegacyMatches(): Promise<BackendMatch[]> {
  if (!USE_ROLE_DELIVERY_ENDPOINT_FALLBACK) return [];
  const [shipperMatches, openDriverMatches, myDriverMatches] = await Promise.all([
    fetchMatchesByPath(apiPaths.shipperMatchesMe),
    fetchMatchesByPath(apiPaths.driverMatches),
    fetchMatchesByPath(resolveDriverMyMatchesPath()),
  ]);
  return mergeMatches([...shipperMatches, ...openDriverMatches, ...myDriverMatches]);
}

async function buildLiveRows(): Promise<DeliveryHistoryRow[]> {
  const [adminMatches, adminSettlements, quotes] = await Promise.all([
    fetchAdminMatches(),
    fetchAdminSettlements(),
    fetchQuotes(),
  ]);

  const matches = adminMatches === null ? await fetchLegacyMatches() : mergeMatches(adminMatches);
  const settlements = adminSettlements === null ? await fetchLegacySettlements() : adminSettlements;

  const settlementMap = new Map<number, BackendSettlement>();
  for (const settlement of settlements) {
    if (typeof settlement.matchId !== "number") continue;
    settlementMap.set(settlement.matchId, settlement);
  }

  const quoteMap = new Map<number, BackendQuote>();
  for (const quote of quotes) {
    if (typeof quote.quoteId !== "number") continue;
    quoteMap.set(quote.quoteId, quote);
  }

  const rows = mergedMatches
    .filter((match) => typeof match.matchId === "number")
    .map((match) => {
      const matchStatus = normalizeMatchStatus(match.status);
      const settlement = typeof match.matchId === "number" ? settlementMap.get(match.matchId) : undefined;
      const quote = typeof match.quoteId === "number" ? quoteMap.get(match.quoteId) : undefined;

      const inferredSettlementStatus: DeliverySettlementStatus =
        matchStatus === "COMPLETED" ? "PROCESSING" : matchStatus === "CANCELLED" ? "FAILED" : "PENDING";

      return {
        matchId: `M-${match.matchId}`,
        quoteId: typeof match.quoteId === "number" ? `Q-${match.quoteId}` : "-",
        shipperName: "화주",
        driverName: typeof match.driverId === "number" ? `DRIVER-${match.driverId}` : "미배정",
        originAddress: quote?.originAddress ?? "-",
        destinationAddress: quote?.destinationAddress ?? "-",
        departAt: toDisplayDate(match.acceptedAt ?? match.createdAt),
        arriveAt: settlement?.completedAt ? toDisplayDate(settlement.completedAt) : undefined,
        matchStatus,
        settlementStatus: settlement?.settlementStatus
          ? normalizeSettlementStatus(settlement.settlementStatus)
          : inferredSettlementStatus,
        totalFare: settlement?.totalFare ?? quote?.finalPrice ?? quote?.desiredPrice ?? 0,
        driverPayout: settlement?.driverPayout ?? 0,
      } satisfies DeliveryHistoryRow;
    })
    .sort((a, b) => Date.parse(b.departAt) - Date.parse(a.departAt));

  return rows;
}

function filterRows(rows: DeliveryHistoryRow[], query: DeliveryHistoryQuery): DeliveryHistoryResponse {
  const keyword = (query.q ?? "").trim().toLowerCase();
  const filtered = rows.filter((row) => {
    if (query.status && row.matchStatus !== query.status) return false;
    if (!keyword) return true;
    const text = [
      row.matchId,
      row.quoteId,
      row.shipperName,
      row.driverName,
      row.originAddress,
      row.destinationAddress,
    ]
      .join(" ")
      .toLowerCase();
    return text.includes(keyword);
  });

  const start = (query.page - 1) * query.size;
  const end = start + query.size;
  return {
    items: filtered.slice(start, end),
    total: filtered.length,
  };
}

export async function fetchDeliveryHistory(query: DeliveryHistoryQuery): Promise<DeliveryHistoryResponse> {
  if (isMockModeEnabled()) {
    return filterRows(MOCK_DELIVERY_HISTORY, query);
  }

  const rows = await buildLiveRows();
  return filterRows(rows, query);
}
