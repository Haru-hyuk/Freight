import {
  ORDER_CANCELLATION_REQUEST_MOCK_ROWS,
  ORDER_MONITORING_MOCK_ROWS,
} from "@/features/orders/model/mockData";
import type {
  CancellationApprovalStatus,
  CancellationRequestDetail,
  CancellationRequestQuery,
  CancellationRequestResponse,
  CancellationRequestRow,
  CancellationReviewPayload,
  CancellationRequesterRole,
  MatchInfo,
  OrderMonitoringMatchStatus,
  OrderMonitoringPaymentStatus,
  OrderMonitoringQuoteStatus,
  OrderMonitoringRow,
  OrderMonitoringSettlementStatus,
  OrderMonitoringSnapshot,
  OrderMonitoringSummary,
  OrderRiskState,
  ParticipantInfo,
  PaymentInfo,
  QuoteInfo,
  SettlementInfo,
} from "@/features/orders/model/types";
import { appendActivityLog } from "@/shared/lib/activity-log";
import { apiClient } from "@/shared/lib/api/client";
import { apiCapabilities, apiPaths } from "@/shared/lib/api/endpoints";
import { isMockModeEnabled } from "@/shared/lib/mock-mode";

type BackendQuote = {
  quoteId: number | null;
  status: string | null;
  shipperId: number | null;
  shipperName: string | null;
  originAddress: string;
  destinationAddress: string;
  cargoName: string | null;
  cargoType: string | null;
  weightKg: number | null;
  volumeCbm: number | null;
  distanceKm: number | null;
  finalPrice: number | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type BackendMatch = {
  matchId: number | null;
  quoteId: number | null;
  driverId: number | null;
  accepted: boolean;
  status: string | null;
  acceptedAt: string | null;
  updatedAt: string | null;
  createdAt: string | null;
};

type BackendPayment = {
  paymentId: number | null;
  matchId: number | null;
  status: string | null;
  totalAmount: number | null;
  paidAt: string | null;
  createdAt: string | null;
};

type BackendSettlement = {
  settlementId: number | null;
  matchId: number | null;
  settlementStatus: string | null;
  totalFare: number | null;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string | null;
};

type BackendUser = {
  id: number | null;
  code: string;
  name: string;
  phone: string;
  email?: string;
  status?: string;
};

type ReviewOverride = Pick<CancellationRequestRow, "approvalStatus" | "reviewedAt" | "reviewedBy" | "reviewMemo">;

const REVIEWER_ID = "admin.web";
const DERIVED_REASON_TEXT = "백엔드 취소 사유 필드가 없어 상태 기반으로 생성된 요청입니다.";
const liveReviewOverrides = new Map<string, ReviewOverride>();

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
  if (typeof value === "number") return value > 0;
  return false;
}

function toNumericIdFromText(value: string | null | undefined): number | null {
  if (!value) return null;
  const matches = value.match(/\d+/g);
  if (!matches || matches.length === 0) return null;
  const parsed = Number(matches[matches.length - 1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function pickListPayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const row = toRecord(payload);
  const candidates = [row.items, row.data, row.content, row.list, row.result, row.rows];
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

function toTimestamp(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toQuoteIdText(value: unknown): string {
  const numeric = toNumberValue(value);
  if (numeric !== null) return `Q-${Math.trunc(numeric)}`;
  const text = toStringValue(value, "").trim();
  if (!text) return "-";
  return /^Q-/i.test(text) ? text.toUpperCase() : `Q-${text}`;
}

function toMatchIdText(value: unknown): string {
  const numeric = toNumberValue(value);
  if (numeric !== null) return `M-${Math.trunc(numeric)}`;
  const text = toStringValue(value, "").trim();
  if (!text) return "-";
  return /^M-/i.test(text) ? text.toUpperCase() : `M-${text}`;
}

function toShipperIdText(value: unknown): string {
  const numeric = toNumberValue(value);
  if (numeric !== null) return `S-${Math.trunc(numeric)}`;
  const text = toStringValue(value, "").trim();
  if (!text) return "-";
  return /^S-/i.test(text) ? text.toUpperCase() : `S-${text}`;
}

function toDriverIdText(value: unknown): string {
  const numeric = toNumberValue(value);
  if (numeric !== null) return `D-${Math.trunc(numeric)}`;
  const text = toStringValue(value, "").trim();
  if (!text) return "-";
  return /^D-/i.test(text) ? text.toUpperCase() : `D-${text}`;
}

function normalizeApprovalStatus(value: unknown): CancellationApprovalStatus {
  const text = toStringValue(value, "").trim().toUpperCase();
  if (text === "APPROVED") return "APPROVED";
  if (text === "REJECTED") return "REJECTED";
  return "PENDING";
}

function normalizeQuoteStatus(value: unknown): OrderMonitoringQuoteStatus {
  const text = toStringValue(value, "").trim().toUpperCase();
  if (text === "OPEN" || text === "READY") return "OPEN";
  if (text === "MATCHED" || text === "ACCEPTED") return "MATCHED";
  if (text === "IN_TRANSIT" || text === "TRANSIT") return "IN_TRANSIT";
  if (text === "DELIVERED" || text === "COMPLETED") return "DELIVERED";
  if (text === "CANCELLED" || text === "CANCELED") return "CANCELLED";
  return "UNKNOWN";
}

function normalizeMatchStatus(value: unknown, hasMatch: boolean): OrderMonitoringMatchStatus {
  if (!hasMatch) return "UNMATCHED";
  const text = toStringValue(value, "").trim().toUpperCase();
  if (text === "IN_TRANSIT" || text === "TRANSIT") return "IN_TRANSIT";
  if (text === "COMPLETED" || text === "DELIVERED") return "COMPLETED";
  if (text === "CANCELLED" || text === "CANCELED") return "CANCELLED";
  return "READY";
}

function normalizePaymentStatus(value: unknown): OrderMonitoringPaymentStatus {
  const text = toStringValue(value, "").trim().toUpperCase();
  if (text === "PAID" || text === "COMPLETED" || text === "DONE") return "COMPLETED";
  if (text === "FAILED" || text === "CANCELLED" || text === "CANCELED") return "FAILED";
  if (text === "PENDING" || text === "REQUESTED" || text === "READY") return "PENDING";
  return "UNKNOWN";
}

function normalizeSettlementStatus(value: unknown): OrderMonitoringSettlementStatus {
  const text = toStringValue(value, "").trim().toUpperCase();
  if (text === "PROCESSING") return "PROCESSING";
  if (text === "COMPLETED" || text === "DONE") return "COMPLETED";
  if (text === "FAILED" || text === "REJECTED") return "FAILED";
  if (text === "PENDING") return "PENDING";
  return "UNKNOWN";
}

function normalizeRequesterRole(value: unknown): CancellationRequesterRole {
  const text = toStringValue(value, "").trim().toUpperCase();
  if (text === "SHIPPER") return "SHIPPER";
  if (text === "DRIVER") return "DRIVER";
  return "UNKNOWN";
}

function resolveRiskState(row: Omit<OrderMonitoringRow, "riskState">): OrderRiskState {
  if (row.quoteStatus === "CANCELLED" && row.matchStatus !== "CANCELLED") return "ACTION_REQUIRED";
  if (row.paymentStatus === "FAILED" || row.settlementStatus === "FAILED") return "ACTION_REQUIRED";
  if (row.matchStatus === "READY" && row.quoteStatus === "MATCHED") return "WATCH";
  if (row.matchStatus === "COMPLETED" && row.paymentStatus === "PENDING") return "WATCH";
  if (row.matchStatus === "COMPLETED" && (row.settlementStatus === "PENDING" || row.settlementStatus === "PROCESSING")) {
    return "WATCH";
  }
  if (row.matchStatus === "UNMATCHED" && row.quoteStatus === "OPEN") return "WATCH";
  return "NORMAL";
}

function mapBackendQuote(raw: unknown): BackendQuote {
  const row = toRecord(raw);
  return {
    quoteId: toNumberValue(row.quoteId ?? row.quote_id ?? row.id),
    status: toStringValue(row.status, "") || null,
    shipperId: toNumberValue(row.shipperId ?? row.shipper_id),
    shipperName: toStringValue(row.shipperName ?? row.shipper_name, "") || null,
    originAddress: toStringValue(row.originAddress ?? row.origin_address, "-"),
    destinationAddress: toStringValue(row.destinationAddress ?? row.destination_address, "-"),
    cargoName: toStringValue(row.cargoName ?? row.cargo_name, "") || null,
    cargoType: toStringValue(row.cargoType ?? row.cargo_type, "") || null,
    weightKg: toNumberValue(row.weightKg ?? row.weight_kg),
    volumeCbm: toNumberValue(row.volumeCbm ?? row.volume_cbm),
    distanceKm: toNumberValue(row.distanceKm ?? row.distance_km),
    finalPrice: toNumberValue(row.finalPrice ?? row.final_price),
    createdAt: toStringValue(row.createdAt ?? row.created_at, "") || null,
    updatedAt: toStringValue(row.updatedAt ?? row.updated_at, "") || null,
  };
}

function mapBackendMatch(raw: unknown): BackendMatch {
  const row = toRecord(raw);
  return {
    matchId: toNumberValue(row.matchId ?? row.match_id ?? row.id),
    quoteId: toNumberValue(row.quoteId ?? row.quote_id),
    driverId: toNumberValue(row.driverId ?? row.driver_id),
    accepted: toBooleanValue(row.accepted),
    status: toStringValue(row.status, "") || null,
    acceptedAt: toStringValue(row.acceptedAt ?? row.accepted_at, "") || null,
    updatedAt: toStringValue(row.updatedAt ?? row.updated_at, "") || null,
    createdAt: toStringValue(row.createdAt ?? row.created_at, "") || null,
  };
}

function mapBackendPayment(raw: unknown): BackendPayment {
  const row = toRecord(raw);
  return {
    paymentId: toNumberValue(row.paymentId ?? row.payment_id ?? row.id),
    matchId: toNumberValue(row.matchId ?? row.match_id),
    status: toStringValue(row.status, "") || null,
    totalAmount: toNumberValue(row.totalAmount ?? row.total_amount),
    paidAt: toStringValue(row.paidAt ?? row.paid_at, "") || null,
    createdAt: toStringValue(row.createdAt ?? row.created_at, "") || null,
  };
}

function mapBackendSettlement(raw: unknown): BackendSettlement {
  const row = toRecord(raw);
  return {
    settlementId: toNumberValue(row.settlementId ?? row.settlement_id ?? row.id),
    matchId: toNumberValue(row.matchId ?? row.match_id),
    settlementStatus: toStringValue(row.settlementStatus ?? row.settlement_status, "") || null,
    totalFare: toNumberValue(row.totalFare ?? row.total_fare),
    dueDate: toStringValue(row.dueDate ?? row.due_date, "") || null,
    completedAt: toStringValue(row.completedAt ?? row.completed_at, "") || null,
    createdAt: toStringValue(row.createdAt ?? row.created_at, "") || null,
  };
}

function mapBackendUser(raw: unknown): BackendUser {
  const row = toRecord(raw);
  const code = toStringValue(
    row.id ?? row.userId ?? row.user_id ?? row.shipperId ?? row.shipper_id ?? row.driverId ?? row.driver_id,
    "",
  );
  return {
    id: toNumberValue(row.id ?? row.shipperId ?? row.shipper_id ?? row.driverId ?? row.driver_id ?? code),
    code,
    name: toStringValue(row.name, "정보 없음"),
    phone: toStringValue(row.phone, "-"),
    email: toStringValue(row.email, "") || undefined,
    status: toStringValue(row.status, "") || undefined,
  };
}

function toDerivedRequestId(quoteId: number | null, matchId: number | null): string {
  const q = quoteId ?? 0;
  const m = matchId ?? 0;
  return `CR-DERIVED-${q}-${m}`;
}

function mapBackendCancellationRequest(raw: unknown): CancellationRequestRow {
  const row = toRecord(raw);
  const quoteId = row.quoteId ?? row.quote_id;
  const matchId = row.matchId ?? row.match_id;
  const requestIdValue = row.requestId ?? row.request_id ?? row.cancellationRequestId ?? row.id;
  const reviewedAtRaw = toStringValue(row.reviewedAt ?? row.reviewed_at, "").trim();
  const requestedByRole = normalizeRequesterRole(
    row.requestedByRole ?? row.requested_by_role ?? row.canceledByRole ?? row.cancelledByRole,
  );
  const requestedByName =
    toStringValue(row.requestedByName ?? row.requested_by_name, "").trim() ||
    (requestedByRole === "SHIPPER"
      ? toStringValue(row.shipperName ?? row.shipper_name, "화주")
      : requestedByRole === "DRIVER"
        ? toStringValue(row.driverName ?? row.driver_name, "기사")
        : "확인 필요");

  return {
    requestId:
      toStringValue(requestIdValue, "").trim() ||
      toDerivedRequestId(toNumberValue(quoteId), toNumberValue(matchId)),
    quoteId: toQuoteIdText(quoteId),
    matchId: toMatchIdText(matchId),
    requestedByRole,
    requestedByName,
    shipperId: toShipperIdText(row.shipperId ?? row.shipper_id),
    shipperName: toStringValue(
      row.shipperName ?? row.shipper_name,
      "화주 정보 확인 필요",
    ),
    driverId: toDriverIdText(row.driverId ?? row.driver_id),
    driverName: toStringValue(
      row.driverName ?? row.driver_name,
      "기사 정보 확인 필요",
    ),
    originAddress: toStringValue(row.originAddress ?? row.origin_address, "-"),
    destinationAddress: toStringValue(row.destinationAddress ?? row.destination_address, "-"),
    cargoName: toStringValue(row.cargoName ?? row.cargo_name, "-"),
    cancelReason: toStringValue(row.cancelReason ?? row.cancel_reason ?? row.reason, DERIVED_REASON_TEXT),
    requestedAt: toDisplayDate(toStringValue(row.requestedAt ?? row.requested_at ?? row.createdAt ?? row.created_at)),
    approvalStatus: normalizeApprovalStatus(row.approvalStatus ?? row.approval_status ?? row.status),
    reviewedAt: reviewedAtRaw ? toDisplayDate(reviewedAtRaw) : undefined,
    reviewedBy: toStringValue(row.reviewedBy ?? row.reviewed_by, "") || undefined,
    reviewMemo: toStringValue(row.reviewMemo ?? row.review_memo, "") || undefined,
    source: "API",
  };
}

function applyReviewOverride(row: CancellationRequestRow): CancellationRequestRow {
  const override = liveReviewOverrides.get(row.requestId);
  if (!override) return row;
  return {
    ...row,
    ...override,
  };
}

function filterCancellationRows(rows: CancellationRequestRow[], query: CancellationRequestQuery): CancellationRequestRow[] {
  const keyword = (query.search ?? "").trim().toLowerCase();
  return rows.filter((row) => {
    if (query.status && row.approvalStatus !== query.status) return false;
    if (!keyword) return true;

    const haystack = [
      row.requestId,
      row.quoteId,
      row.matchId,
      row.shipperName,
      row.driverName,
      row.originAddress,
      row.destinationAddress,
      row.cargoName,
      row.cancelReason,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(keyword);
  });
}

function paginateCancellationRows(rows: CancellationRequestRow[], page: number, size: number): CancellationRequestResponse {
  const safePage = Math.max(1, page);
  const safeSize = Math.max(1, size);
  const start = (safePage - 1) * safeSize;
  return {
    items: rows.slice(start, start + safeSize),
    total: rows.length,
  };
}

function resolveMePath(path: string): string {
  const base = path.replace(/\/$/, "");
  return `${base}/me`;
}

async function fetchQuotesByPath(path: string): Promise<BackendQuote[]> {
  try {
    const response = await apiClient.get<unknown>(path);
    return pickListPayload(response.data).map(mapBackendQuote);
  } catch {
    return [];
  }
}

async function fetchQuoteDetailByPath(path: string, quoteId: number | null): Promise<BackendQuote | null> {
  if (quoteId === null) return null;
  try {
    const response = await apiClient.get<unknown>(`${path}/${encodeURIComponent(String(quoteId))}`);
    return mapBackendQuote(response.data);
  } catch {
    return null;
  }
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

async function fetchAdminQuotes(): Promise<BackendQuote[]> {
  const primaryPath = apiCapabilities.useDerivedAdminData ? apiPaths.shipperQuotes : apiPaths.adminTransportQuotes;
  const primaryRows = await fetchQuotesByPath(primaryPath);
  if (primaryRows.length > 0 || apiCapabilities.useDerivedAdminData) {
    return primaryRows;
  }

  return fetchQuotesByPath(apiPaths.shipperQuotes);
}

async function fetchAdminQuoteDetail(quoteId: number | null): Promise<BackendQuote | null> {
  const primaryPath = apiCapabilities.useDerivedAdminData ? apiPaths.shipperQuotes : apiPaths.adminTransportQuotes;
  const primaryDetail = await fetchQuoteDetailByPath(primaryPath, quoteId);
  if (primaryDetail || apiCapabilities.useDerivedAdminData) {
    return primaryDetail;
  }

  return fetchQuoteDetailByPath(apiPaths.shipperQuotes, quoteId);
}

async function fetchAdminMatches(): Promise<BackendMatch[]> {
  if (!apiCapabilities.useDerivedAdminData) {
    const rows = await fetchMatchesByPath(apiPaths.adminTransportMatches);
    if (rows.length > 0) return rows;
  }

  const [shipperRows, driverOpenRows, driverRows] = await Promise.all([
    fetchMatchesByPath(apiPaths.shipperMatchesMe),
    fetchMatchesByPath(apiPaths.driverMatches),
    fetchMatchesByPath(resolveMePath(apiPaths.driverMatches)),
  ]);

  const merged = pickLatestByTimestamp(
    [...shipperRows, ...driverOpenRows, ...driverRows],
    (item) => item.matchId,
    (item) => Math.max(toTimestamp(item.updatedAt), toTimestamp(item.createdAt)),
  );

  return Array.from(merged.values());
}

async function fetchAdminMatchDetail(matchId: number | null): Promise<BackendMatch | null> {
  if (matchId === null) return null;

  if (!apiCapabilities.useDerivedAdminData) {
    try {
      const response = await apiClient.get<unknown>(`${apiPaths.adminTransportMatches}/${encodeURIComponent(String(matchId))}`);
      return mapBackendMatch(response.data);
    } catch {
      // fallback below
    }
  }

  const rows = await fetchAdminMatches();
  return rows.find((row) => row.matchId === matchId) ?? null;
}

async function fetchAdminPayments(): Promise<BackendPayment[]> {
  if (apiCapabilities.useDerivedAdminData) {
    return [];
  }

  try {
    const response = await apiClient.get<unknown>(apiPaths.adminTransportPayments);
    return pickListPayload(response.data).map(mapBackendPayment);
  } catch {
    return [];
  }
}

async function fetchAdminSettlements(): Promise<BackendSettlement[]> {
  if (apiCapabilities.useDerivedAdminData) {
    const [shipperRows, shipperMyRows, driverRows, driverMyRows] = await Promise.all([
      fetchSettlementsByPath(apiPaths.shipperSettlements),
      fetchSettlementsByPath(resolveMePath(apiPaths.shipperSettlements)),
      fetchSettlementsByPath(apiPaths.driverSettlements),
      fetchSettlementsByPath(resolveMePath(apiPaths.driverSettlements)),
    ]);
    const merged = pickLatestByTimestamp(
      [...shipperRows, ...shipperMyRows, ...driverRows, ...driverMyRows],
      (item) => item.settlementId,
      (item) => Math.max(toTimestamp(item.completedAt), toTimestamp(item.createdAt)),
    );
    return Array.from(merged.values());
  }

  try {
    const response = await apiClient.get<unknown>(apiPaths.adminTransportSettlements);
    return pickListPayload(response.data).map(mapBackendSettlement);
  } catch {
    return [];
  }
}

async function fetchAdminUsersByRole(role: "SHIPPER" | "DRIVER"): Promise<Map<number, BackendUser>> {
  const users = new Map<number, BackendUser>();
  if (apiCapabilities.useDerivedAdminData) {
    return users;
  }

  const ingest = (payload: unknown) => {
    for (const raw of pickListPayload(payload)) {
      const mapped = mapBackendUser(raw);
      const fromCode = toNumericIdFromText(mapped.code);
      const id = mapped.id ?? fromCode;
      if (id === null) continue;
      users.set(id, mapped);
    }
  };

  try {
    const response = await apiClient.get<unknown>(apiPaths.adminUsers, {
      params: { role, page: 1, size: 500 },
    });
    ingest(response.data);
    if (users.size > 0) return users;
  } catch {
    // fallback to legacy split endpoints
  }

  const legacyPath = role === "SHIPPER" ? apiPaths.adminShippers : apiPaths.adminDrivers;
  try {
    const response = await apiClient.get<unknown>(legacyPath);
    ingest(response.data);
  } catch {
    // no-op
  }

  return users;
}

function pickLatestByTimestamp<T>(values: T[], getKey: (value: T) => number | null, getTime: (value: T) => number): Map<number, T> {
  const map = new Map<number, T>();
  for (const item of values) {
    const key = getKey(item);
    if (key === null) continue;
    const current = map.get(key);
    if (!current || getTime(item) >= getTime(current)) {
      map.set(key, item);
    }
  }
  return map;
}

async function fetchRemoteCancellationRequests(): Promise<CancellationRequestRow[] | null> {
  if (apiCapabilities.useDerivedAdminData) {
    return null;
  }

  try {
    const response = await apiClient.get<unknown>(apiPaths.adminOrderCancellationRequests);
    return pickListPayload(response.data)
      .map(mapBackendCancellationRequest)
      .sort((a, b) => toTimestamp(b.requestedAt) - toTimestamp(a.requestedAt));
  } catch {
    return null;
  }
}

async function fetchDerivedCancellationRequests(): Promise<CancellationRequestRow[]> {
  const [quotes, matches, shippers, drivers] = await Promise.all([
    fetchAdminQuotes(),
    fetchAdminMatches(),
    fetchAdminUsersByRole("SHIPPER"),
    fetchAdminUsersByRole("DRIVER"),
  ]);

  const latestMatchByQuote = pickLatestByTimestamp(
    matches,
    (item) => item.quoteId,
    (item) => Math.max(toTimestamp(item.updatedAt), toTimestamp(item.createdAt)),
  );

  const rows: CancellationRequestRow[] = [];

  for (const quote of quotes) {
    if (quote.quoteId === null) continue;
    const match = latestMatchByQuote.get(quote.quoteId);
    if (!match || match.matchId === null) continue;

    const quoteCancelled = normalizeQuoteStatus(quote.status) === "CANCELLED";
    const matchCancelled = normalizeMatchStatus(match.status, true) === "CANCELLED";
    if (!quoteCancelled && !matchCancelled) continue;

    const shipperId = quote.shipperId;
    const driverId = match.driverId;
    const shipperUser = shipperId !== null ? shippers.get(shipperId) : undefined;
    const driverUser = driverId !== null ? drivers.get(driverId) : undefined;

    const requestedByRole: CancellationRequesterRole =
      quoteCancelled && !matchCancelled ? "SHIPPER" : matchCancelled && !quoteCancelled ? "DRIVER" : "UNKNOWN";

    const requestId = toDerivedRequestId(quote.quoteId, match.matchId);
    const requestedAt = toDisplayDate(match.updatedAt ?? quote.updatedAt ?? quote.createdAt ?? match.createdAt);
    const approvalStatus: CancellationApprovalStatus = quoteCancelled && !matchCancelled ? "PENDING" : "APPROVED";

    rows.push({
      requestId,
      quoteId: toQuoteIdText(quote.quoteId),
      matchId: toMatchIdText(match.matchId),
      requestedByRole,
      requestedByName:
        requestedByRole === "SHIPPER"
          ? shipperUser?.name ?? "화주"
          : requestedByRole === "DRIVER"
            ? driverUser?.name ?? "기사"
            : "확인 필요",
      shipperId: toShipperIdText(shipperId),
      shipperName:
        shipperUser?.name ??
        (shipperId !== null
          ? `화주 S-${shipperId}`
          : "화주 정보 확인 필요"),
      driverId: toDriverIdText(driverId),
      driverName:
        driverUser?.name ??
        (driverId !== null
          ? `기사 D-${driverId}`
          : "기사 정보 확인 필요"),
      originAddress: quote.originAddress,
      destinationAddress: quote.destinationAddress,
      cargoName: quote.cargoName ?? "-",
      cancelReason: DERIVED_REASON_TEXT,
      requestedAt,
      approvalStatus,
      reviewedAt: approvalStatus === "APPROVED" ? requestedAt : undefined,
      reviewedBy: approvalStatus === "APPROVED" ? "system.sync" : undefined,
      source: "DERIVED",
    });
  }

  return rows.sort((a, b) => toTimestamp(b.requestedAt) - toTimestamp(a.requestedAt));
}

async function fetchAllCancellationRows(): Promise<CancellationRequestRow[]> {
  if (isMockModeEnabled()) {
    return [...ORDER_CANCELLATION_REQUEST_MOCK_ROWS]
      .map(applyReviewOverride)
      .sort((a, b) => toTimestamp(b.requestedAt) - toTimestamp(a.requestedAt));
  }

  const remoteRows = await fetchRemoteCancellationRequests();
  const sourceRows = remoteRows ?? (await fetchDerivedCancellationRequests());
  return sourceRows
    .map(applyReviewOverride)
    .sort((a, b) => toTimestamp(b.requestedAt) - toTimestamp(a.requestedAt));
}

function buildMonitoringRows(
  quotes: BackendQuote[],
  matches: BackendMatch[],
  payments: BackendPayment[],
  settlements: BackendSettlement[],
): OrderMonitoringRow[] {
  const latestMatchByQuote = pickLatestByTimestamp(
    matches,
    (item) => item.quoteId,
    (item) => Math.max(toTimestamp(item.updatedAt), toTimestamp(item.createdAt)),
  );
  const latestPaymentByMatch = pickLatestByTimestamp(
    payments,
    (item) => item.matchId,
    (item) => toTimestamp(item.createdAt),
  );
  const latestSettlementByMatch = pickLatestByTimestamp(
    settlements,
    (item) => item.matchId,
    (item) => toTimestamp(item.createdAt),
  );

  const rows: OrderMonitoringRow[] = [];
  const knownQuoteIds = new Set<number>();

  for (const quote of quotes) {
    const quoteIdNumeric = quote.quoteId ?? null;
    if (quoteIdNumeric !== null) knownQuoteIds.add(quoteIdNumeric);

    const match = quoteIdNumeric !== null ? latestMatchByQuote.get(quoteIdNumeric) : undefined;
    const payment = match?.matchId !== null && match?.matchId !== undefined ? latestPaymentByMatch.get(match.matchId) : undefined;
    const settlement =
      match?.matchId !== null && match?.matchId !== undefined ? latestSettlementByMatch.get(match.matchId) : undefined;

    const rowBase = {
      quoteId: toQuoteIdText(quote.quoteId),
      matchId: toMatchIdText(match?.matchId),
      quoteStatus: normalizeQuoteStatus(quote.status),
      matchStatus: normalizeMatchStatus(match?.status, Boolean(match)),
      paymentStatus: normalizePaymentStatus(payment?.status),
      settlementStatus: normalizeSettlementStatus(settlement?.settlementStatus),
      shipperName:
        quote.shipperName ??
        (quote.shipperId !== null ? `화주 S-${quote.shipperId}` : "화주"),
      driverName:
        match?.driverId !== null && match?.driverId !== undefined
          ? `기사 D-${match.driverId}`
          : "-",
      originAddress: quote.originAddress,
      destinationAddress: quote.destinationAddress,
      cargoName: quote.cargoName ?? "화물",
      requestedAt: toDisplayDate(quote.createdAt),
      totalFare: payment?.totalAmount ?? quote.finalPrice ?? 0,
    } satisfies Omit<OrderMonitoringRow, "riskState">;

    rows.push({
      ...rowBase,
      riskState: resolveRiskState(rowBase),
    });
  }

  for (const match of matches) {
    if (match.quoteId === null || knownQuoteIds.has(match.quoteId)) continue;

    const payment = match.matchId !== null ? latestPaymentByMatch.get(match.matchId) : undefined;
    const settlement = match.matchId !== null ? latestSettlementByMatch.get(match.matchId) : undefined;
    const rowBase = {
      quoteId: toQuoteIdText(match.quoteId),
      matchId: toMatchIdText(match.matchId),
      quoteStatus: "UNKNOWN" as const,
      matchStatus: normalizeMatchStatus(match.status, true),
      paymentStatus: normalizePaymentStatus(payment?.status),
      settlementStatus: normalizeSettlementStatus(settlement?.settlementStatus),
      shipperName: "화주",
      driverName: match.driverId !== null ? `기사 D-${match.driverId}` : "-",
      originAddress: "-",
      destinationAddress: "-",
      cargoName: "화물",
      requestedAt: toDisplayDate(match.createdAt),
      totalFare: payment?.totalAmount ?? 0,
    } satisfies Omit<OrderMonitoringRow, "riskState">;

    rows.push({
      ...rowBase,
      riskState: resolveRiskState(rowBase),
    });
  }

  return rows.sort((a, b) => toTimestamp(b.requestedAt) - toTimestamp(a.requestedAt));
}

function buildMonitoringSummary(rows: OrderMonitoringRow[]): OrderMonitoringSummary {
  const pendingSettlements = rows.filter(
    (row) => row.settlementStatus === "PENDING" || row.settlementStatus === "PROCESSING",
  ).length;

  return {
    totalQuotes: rows.length,
    matchedOrders: rows.filter((row) => row.matchStatus !== "UNMATCHED").length,
    inTransitOrders: rows.filter((row) => row.matchStatus === "IN_TRANSIT").length,
    cancelledOrders: rows.filter((row) => row.quoteStatus === "CANCELLED" || row.matchStatus === "CANCELLED").length,
    pendingPayments: rows.filter((row) => row.paymentStatus === "PENDING").length,
    pendingSettlements,
    actionRequired: rows.filter((row) => row.riskState === "ACTION_REQUIRED").length,
  };
}

export async function fetchCancellationRequestRows(query: CancellationRequestQuery): Promise<CancellationRequestResponse> {
  const rows = await fetchAllCancellationRows();
  const filtered = filterCancellationRows(rows, query);
  return paginateCancellationRows(filtered, query.page, query.size);
}

export async function fetchCancellationRequestDetail(requestId: string): Promise<CancellationRequestDetail | null> {
  const rows = await fetchAllCancellationRows();
  const request = rows.find((row) => row.requestId === requestId);
  if (!request) return null;

  const quoteIdNumeric = toNumericIdFromText(request.quoteId);
  const matchIdNumeric = toNumericIdFromText(request.matchId);

  const [quoteDetail, matchDetail, payments, settlements, shippers, drivers] = await Promise.all([
    fetchAdminQuoteDetail(quoteIdNumeric),
    fetchAdminMatchDetail(matchIdNumeric),
    fetchAdminPayments(),
    fetchAdminSettlements(),
    fetchAdminUsersByRole("SHIPPER"),
    fetchAdminUsersByRole("DRIVER"),
  ]);

  const shipperNumericId = quoteDetail?.shipperId ?? toNumericIdFromText(request.shipperId);
  const driverNumericId = matchDetail?.driverId ?? toNumericIdFromText(request.driverId);
  const shipperUser = shipperNumericId !== null ? shippers.get(shipperNumericId) : undefined;
  const driverUser = driverNumericId !== null ? drivers.get(driverNumericId) : undefined;

  const paymentRow =
    matchIdNumeric === null
      ? undefined
      : payments
          .filter((row) => row.matchId === matchIdNumeric)
          .sort((a, b) => toTimestamp(b.paidAt ?? b.createdAt) - toTimestamp(a.paidAt ?? a.createdAt))[0];
  const settlementRow =
    matchIdNumeric === null
      ? undefined
      : settlements
          .filter((row) => row.matchId === matchIdNumeric)
          .sort((a, b) => toTimestamp(b.completedAt ?? b.createdAt) - toTimestamp(a.completedAt ?? a.createdAt))[0];

  const shipper: ParticipantInfo = {
    id: shipperNumericId !== null ? `S-${shipperNumericId}` : request.shipperId,
    name: shipperUser?.name ?? request.shipperName,
    phone: shipperUser?.phone ?? "-",
    email: shipperUser?.email,
    status: shipperUser?.status,
  };

  const driver: ParticipantInfo = {
    id: driverNumericId !== null ? `D-${driverNumericId}` : request.driverId,
    name: driverUser?.name ?? request.driverName,
    phone: driverUser?.phone ?? "-",
    email: driverUser?.email,
    status: driverUser?.status,
  };

  const quote: QuoteInfo = {
    quoteId: request.quoteId,
    status: toStringValue(quoteDetail?.status, "UNKNOWN"),
    originAddress: quoteDetail?.originAddress ?? request.originAddress,
    destinationAddress: quoteDetail?.destinationAddress ?? request.destinationAddress,
    cargoName: quoteDetail?.cargoName ?? request.cargoName,
    cargoType: quoteDetail?.cargoType ?? undefined,
    weightKg: quoteDetail?.weightKg ?? null,
    volumeCbm: quoteDetail?.volumeCbm ?? null,
    distanceKm: quoteDetail?.distanceKm ?? null,
    finalPrice: quoteDetail?.finalPrice ?? null,
    createdAt: toDisplayDate(quoteDetail?.createdAt ?? request.requestedAt),
  };

  const match: MatchInfo = {
    matchId: request.matchId,
    status: toStringValue(matchDetail?.status, "UNKNOWN"),
    accepted: matchDetail?.accepted ?? false,
    acceptedAt: matchDetail?.acceptedAt ? toDisplayDate(matchDetail.acceptedAt) : undefined,
    createdAt: matchDetail?.createdAt ? toDisplayDate(matchDetail.createdAt) : undefined,
    updatedAt: matchDetail?.updatedAt ? toDisplayDate(matchDetail.updatedAt) : undefined,
  };

  const payment: PaymentInfo | undefined = paymentRow
    ? {
        status: toStringValue(paymentRow.status, "UNKNOWN"),
        totalAmount: paymentRow.totalAmount,
        paidAt: paymentRow.paidAt ? toDisplayDate(paymentRow.paidAt) : undefined,
      }
    : undefined;

  const settlement: SettlementInfo | undefined = settlementRow
    ? {
        status: toStringValue(settlementRow.settlementStatus, "UNKNOWN"),
        totalFare: settlementRow.totalFare,
        dueDate: settlementRow.dueDate ? toDisplayDate(settlementRow.dueDate) : undefined,
        completedAt: settlementRow.completedAt ? toDisplayDate(settlementRow.completedAt) : undefined,
      }
    : undefined;

  return {
    request,
    shipper,
    driver,
    quote,
    match,
    payment,
    settlement,
  };
}

export async function reviewCancellationRequest(payload: CancellationReviewPayload): Promise<void> {
  const nextStatus: CancellationApprovalStatus = payload.action === "APPROVE" ? "APPROVED" : "REJECTED";
  const reviewMemo = payload.reviewMemo?.trim() || undefined;
  const override: ReviewOverride = {
    approvalStatus: nextStatus,
    reviewMemo,
    reviewedAt: toDisplayDate(new Date().toISOString()),
    reviewedBy: REVIEWER_ID,
  };

  liveReviewOverrides.set(payload.requestId, override);

  if (isMockModeEnabled()) {
    appendActivityLog({
      action: "ORDER_CANCELLATION_REVIEWED",
      targetId: payload.requestId,
      mode: "MOCK",
      message: `취소 요청 ${payload.requestId} 검토 결과를 목업 데이터에 반영했습니다.`,
    });
    return;
  }

  let remoteApplied = false;
  if (!apiCapabilities.useDerivedAdminData) {
    try {
      await apiClient.post(apiPaths.adminOrderCancellationReview(payload.requestId), {
        action: payload.action,
        reviewMemo,
      });
      remoteApplied = true;
    } catch {
      remoteApplied = false;
    }
  }

  appendActivityLog({
    action: "ORDER_CANCELLATION_REVIEWED",
    targetId: payload.requestId,
    mode: "REAL",
    message: remoteApplied
      ? `취소 요청 ${payload.requestId} 검토 결과가 관리자 API에 반영되었습니다.`
      : `취소 요청 ${payload.requestId} 검토 결과를 로컬 세션에 저장했습니다.`,
  });
}

export async function fetchOrderMonitoringSnapshot(): Promise<OrderMonitoringSnapshot> {
  if (isMockModeEnabled()) {
    const rows = [...ORDER_MONITORING_MOCK_ROWS];
    return {
      rows,
      summary: buildMonitoringSummary(rows),
    };
  }

  const [quotes, matches, payments, settlements] = await Promise.all([
    fetchAdminQuotes(),
    fetchAdminMatches(),
    fetchAdminPayments(),
    fetchAdminSettlements(),
  ]);

  const rows = buildMonitoringRows(quotes, matches, payments, settlements);
  return {
    rows,
    summary: buildMonitoringSummary(rows),
  };
}




