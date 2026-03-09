import type {
  DeviationSeverity,
  DispatchDriverOption,
  DispatchForceAssignPayload,
  DispatchQuery,
  DispatchResponse,
  DispatchRow,
  DispatchMatchStatus,
  DispatchPaymentStatus,
  DispatchSettlementStatus,
} from "@/features/dispatch/model/types";
import axios from "axios";
import { apiPaths } from "@/shared/lib/api/endpoints";
import { apiClient } from "@/shared/lib/api/client";
import { appendActivityLog } from "@/shared/lib/activity-log";
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

type BackendQuote = {
  quoteId: number | null;
  originAddress: string;
  destinationAddress: string;
  distanceKm: number | null;
  cargoName: string | null;
  desiredPrice: number | null;
  finalPrice: number | null;
  volumeCbm: number | null;
};

type BackendSettlement = {
  settlementId: number | null;
  matchId: number | null;
  totalFare: number | null;
  platformFee: number | null;
  driverPayout: number | null;
  shipperPaymentStatus: string | null;
  settlementStatus: string | null;
  completedAt: string | null;
};

type BackendNotification = {
  notificationId: number;
  matchId: number | null;
  type: string | null;
  message: string;
  isRead: boolean;
  createdAt: string | null;
};

type BackendTruck = {
  truckId: number | null;
  driverId: number | null;
  vehicleType: string | null;
  vehicleBodyType: string | null;
  maxVolume: number | null;
  maxWeight: number | null;
  name: string | null;
};

const MOCK_DISPATCH_ROWS: DispatchRow[] = [
  {
    matchId: "M-3201",
    quoteId: "Q-1042",
    shipperName: "샘플 화주",
    cargoType: "냉장",
    originAddress: "인천 물류센터",
    destinationAddress: "서울 도착지",
    requestedAt: "2026-02-19 07:30",
    departAt: "2026-02-19 09:00",
    driverName: "샘플 기사",
    truckName: "11t 냉장",
    matchStatus: "READY",
    accepted: true,
    currentVolumeCbm: 8.5,
    remainingVolumeCbm: 3.5,
    routeDistanceKm: 32,
    totalFare: 460000,
    driverPayout: 355000,
    platformFee: 42000,
    paymentStatus: "PENDING",
    settlementStatus: "PENDING",
    unreadNotificationCount: 1,
    deviationSeverity: "NONE",
  },
  {
    matchId: "M-3202",
    quoteId: "Q-1043",
    shipperName: "샘플 화주",
    cargoType: "팔레트",
    originAddress: "파주 집하장",
    destinationAddress: "수원 창고",
    requestedAt: "2026-02-19 06:50",
    driverName: undefined,
    truckName: undefined,
    matchStatus: "READY",
    accepted: false,
    currentVolumeCbm: 0,
    remainingVolumeCbm: 12,
    routeDistanceKm: 58,
    totalFare: 520000,
    driverPayout: 0,
    platformFee: 0,
    paymentStatus: "PENDING",
    settlementStatus: "PENDING",
    unreadNotificationCount: 3,
    deviationSeverity: "NONE",
  },
];

const MOCK_DRIVER_OPTIONS: DispatchDriverOption[] = [
  { driverId: "D-1201", driverName: "샘플 기사 1", truckName: "11t 냉장", maxVolumeCbm: 20, currentVolumeCbm: 8.5 },
  { driverId: "D-1211", driverName: "샘플 기사 2", truckName: "8.5t 윙바디", maxVolumeCbm: 28, currentVolumeCbm: 9.4 },
  { driverId: "D-1217", driverName: "샘플 기사 3", truckName: "5t 탑차", maxVolumeCbm: 14, currentVolumeCbm: 3.2 },
];

const liveAssignmentOverrides = new Map<
  number,
  {
    driverId: string;
    driverName: string;
    truckName: string;
    updatedAt: string;
  }
>();

const liveRowsCache = new Map<number, DispatchRow>();

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

function normalizeMatchStatus(value: string): DispatchMatchStatus {
  const status = value.trim().toUpperCase();
  if (status === "IN_TRANSIT" || status === "TRANSIT" || status === "MOVING") return "IN_TRANSIT";
  if (status === "COMPLETED" || status === "DONE" || status === "DELIVERED") return "COMPLETED";
  if (status === "CANCELLED" || status === "CANCELED" || status === "CANCEL") return "CANCELLED";
  return "READY";
}

function normalizePaymentStatus(value: string | null | undefined): DispatchPaymentStatus {
  const status = (value ?? "").trim().toUpperCase();
  if (status === "COMPLETED" || status === "PAID") return "COMPLETED";
  if (status === "FAILED" || status === "CANCELLED") return "FAILED";
  if (status === "REFUNDED") return "REFUNDED";
  return "PENDING";
}

function normalizeSettlementStatus(value: string | null | undefined): DispatchSettlementStatus {
  const status = (value ?? "").trim().toUpperCase();
  if (status === "PROCESSING") return "PROCESSING";
  if (status === "COMPLETED") return "COMPLETED";
  if (status === "FAILED" || status === "REJECTED") return "FAILED";
  return "PENDING";
}

function inferDeviationSeverity(text: string, status: DispatchMatchStatus): DeviationSeverity {
  if (/(deviat|detour|route|이탈|critical|severe)/i.test(text)) return "SEVERE";
  if (/(delay|late|warning|지연|경고)/i.test(text)) return "MODERATE";
  if (status === "CANCELLED") return "SEVERE";
  return "NONE";
}

function parseMatchId(input: string): number | null {
  const prefixed = /^M-(\d+)$/i.exec(input.trim());
  if (prefixed) return Number(prefixed[1]);
  const parsed = Number(input);
  return Number.isFinite(parsed) ? parsed : null;
}

function resolveDriverMyMatchesPath(): string {
  return `${apiPaths.driverMatches.replace(/\/$/, "")}/me`;
}

function resolveSettlementMePath(basePath: string): string {
  const base = basePath.replace(/\/$/, "");
  return base.endsWith("/me") ? base : `${base}/me`;
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

function mapBackendQuote(raw: unknown): BackendQuote {
  const row = toRecord(raw);
  return {
    quoteId: toNumberValue(row.quoteId ?? row.quote_id ?? row.id),
    originAddress: toStringValue(row.originAddress ?? row.origin_address, "-"),
    destinationAddress: toStringValue(row.destinationAddress ?? row.destination_address, "-"),
    distanceKm: toNumberValue(row.distanceKm ?? row.distance_km),
    cargoName: toStringValue(row.cargoName ?? row.cargo_name, "") || null,
    desiredPrice: toNumberValue(row.desiredPrice ?? row.desired_price),
    finalPrice: toNumberValue(row.finalPrice ?? row.final_price),
    volumeCbm: toNumberValue(row.volumeCbm ?? row.volume_cbm),
  };
}

function mapBackendSettlement(raw: unknown): BackendSettlement {
  const row = toRecord(raw);
  return {
    settlementId: toNumberValue(row.settlementId ?? row.settlement_id ?? row.id),
    matchId: toNumberValue(row.matchId ?? row.match_id),
    totalFare: toNumberValue(row.totalFare ?? row.total_fare),
    platformFee: toNumberValue(row.platformFee ?? row.platform_fee),
    driverPayout: toNumberValue(row.driverPayout ?? row.driver_payout),
    shipperPaymentStatus: toStringValue(row.shipperPaymentStatus ?? row.shipper_payment_status, "") || null,
    settlementStatus: toStringValue(row.settlementStatus ?? row.settlement_status, "") || null,
    completedAt: toStringValue(row.completedAt ?? row.completed_at, "") || null,
  };
}

function mapBackendNotification(raw: unknown): BackendNotification | null {
  const row = toRecord(raw);
  const notificationId = toNumberValue(row.notificationId ?? row.id);
  if (notificationId === null) return null;

  return {
    notificationId,
    matchId: toNumberValue(row.matchId ?? row.match_id),
    type: toStringValue(row.type, "") || null,
    message: toStringValue(row.message, ""),
    isRead: Boolean(row.isRead ?? row.is_read),
    createdAt: toStringValue(row.createdAt ?? row.created_at, "") || null,
  };
}

function mapBackendTruck(raw: unknown): BackendTruck {
  const row = toRecord(raw);
  return {
    truckId: toNumberValue(row.truckId ?? row.truck_id ?? row.id),
    driverId: toNumberValue(row.driverId ?? row.driver_id),
    vehicleType: toStringValue(row.vehicleType ?? row.vehicle_type, "") || null,
    vehicleBodyType: toStringValue(row.vehicleBodyType ?? row.vehicle_body_type, "") || null,
    maxVolume: toNumberValue(row.maxVolume ?? row.max_volume),
    maxWeight: toNumberValue(row.maxWeight ?? row.max_weight),
    name: toStringValue(row.name, "") || null,
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

    const currentTime = Date.parse(current.updatedAt ?? current.createdAt ?? "");
    const rowTime = Date.parse(row.updatedAt ?? row.createdAt ?? "");
    const latest = rowTime >= currentTime ? row : current;
    merged.set(row.matchId, {
      ...current,
      ...row,
      status: latest.status,
      updatedAt: latest.updatedAt,
      acceptedAt: latest.acceptedAt ?? current.acceptedAt,
      driverId: row.driverId ?? current.driverId,
      quoteId: row.quoteId ?? current.quoteId,
      accepted: current.accepted || row.accepted,
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

async function fetchQuotes(): Promise<BackendQuote[]> {
  try {
    const response = await apiClient.get<unknown>(apiPaths.adminTransportQuotes);
    return pickListPayload(response.data).map(mapBackendQuote);
  } catch (error) {
    if (!axios.isAxiosError(error) || error.response?.status !== 404) {
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

async function fetchSettlementsByPath(path: string): Promise<BackendSettlement[]> {
  try {
    const response = await apiClient.get<unknown>(path);
    return pickListPayload(response.data).map(mapBackendSettlement);
  } catch {
    return [];
  }
}

async function fetchNotifications(): Promise<BackendNotification[]> {
  try {
    const response = await apiClient.get<unknown>(apiPaths.notificationsMe);
    return pickListPayload(response.data)
      .map(mapBackendNotification)
      .filter((row): row is BackendNotification => row !== null);
  } catch {
    return [];
  }
}

async function fetchTrucks(): Promise<BackendTruck[]> {
  try {
    const response = await apiClient.get<unknown>(apiPaths.adminTrucksPending);
    return pickListPayload(response.data).map(mapBackendTruck);
  } catch (error) {
    if (!axios.isAxiosError(error) || error.response?.status !== 404) {
      return [];
    }

    try {
      const response = await apiClient.get<unknown>(apiPaths.driverTrucks);
      return pickListPayload(response.data).map(mapBackendTruck);
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

async function fetchLegacyMatches(): Promise<BackendMatch[]> {
  const [shipperMatches, openDriverMatches, myDriverMatches] = await Promise.all([
    fetchMatchesByPath(apiPaths.shipperMatchesMe),
    fetchMatchesByPath(apiPaths.driverMatches),
    fetchMatchesByPath(resolveDriverMyMatchesPath()),
  ]);
  return mergeMatches([...shipperMatches, ...openDriverMatches, ...myDriverMatches]);
}

async function fetchLegacySettlements(): Promise<BackendSettlement[]> {
  const [shipperSettlements, driverSettlements] = await Promise.all([
    fetchSettlementsByPath(resolveSettlementMePath(apiPaths.shipperSettlements)),
    fetchSettlementsByPath(resolveSettlementMePath(apiPaths.driverSettlements)),
  ]);
  return [...shipperSettlements, ...driverSettlements];
}

function applyAssignmentOverrides(rows: DispatchRow[]): DispatchRow[] {
  return rows.map((row) => {
    const matchId = parseMatchId(row.matchId);
    if (matchId === null) return row;
    const override = liveAssignmentOverrides.get(matchId);
    if (!override) return row;
    return {
      ...row,
      accepted: true,
      driverName: override.driverName,
      truckName: override.truckName,
    };
  });
}

function applyQueryFilter(rows: DispatchRow[], query: DispatchQuery): DispatchRow[] {
  const keyword = (query.q ?? "").trim().toLowerCase();

  return rows.filter((row) => {
    if (query.status && row.matchStatus !== query.status) return false;
    if (query.dispatchState) {
      if (query.dispatchState === "ASSIGNED" && !row.accepted) return false;
      if (query.dispatchState === "WAITING" && row.accepted) return false;
    }
    if (query.paymentStatus && row.paymentStatus !== query.paymentStatus) return false;
    if (query.settlementStatus && row.settlementStatus !== query.settlementStatus) return false;

    if (!keyword) return true;
    const text = [
      row.matchId,
      row.quoteId,
      row.shipperName,
      row.cargoType,
      row.originAddress,
      row.destinationAddress,
      row.driverName ?? "",
      row.truckName ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return text.includes(keyword);
  });
}

function paginateRows(rows: DispatchRow[], page: number, size: number): DispatchResponse {
  const start = (page - 1) * size;
  return {
    items: rows.slice(start, start + size),
    total: rows.length,
  };
}

async function buildLiveRows(): Promise<DispatchRow[]> {
  const [adminMatches, adminSettlements, quotes, notifications, trucks] = await Promise.all([
    fetchAdminMatches(),
    fetchAdminSettlements(),
    fetchQuotes(),
    fetchNotifications(),
    fetchTrucks(),
  ]);

  const mergedMatches = adminMatches === null ? await fetchLegacyMatches() : mergeMatches(adminMatches);
  const settlements = adminSettlements === null ? await fetchLegacySettlements() : adminSettlements;

  const quoteMap = new Map<number, BackendQuote>();
  for (const quote of quotes) {
    if (typeof quote.quoteId !== "number") continue;
    quoteMap.set(quote.quoteId, quote);
  }

  const settlementMap = new Map<number, BackendSettlement>();
  for (const settlement of settlements) {
    if (typeof settlement.matchId !== "number") continue;
    settlementMap.set(settlement.matchId, settlement);
  }

  const truckByDriverMap = new Map<number, BackendTruck>();
  for (const truck of trucks) {
    if (typeof truck.driverId !== "number") continue;
    if (!truckByDriverMap.has(truck.driverId)) truckByDriverMap.set(truck.driverId, truck);
  }

  const unreadCountByMatch = new Map<number, number>();
  const signalByMatch = new Map<number, string>();
  for (const notification of notifications) {
    if (typeof notification.matchId !== "number") continue;
    if (!notification.isRead) {
      unreadCountByMatch.set(notification.matchId, (unreadCountByMatch.get(notification.matchId) ?? 0) + 1);
    }
    const previous = signalByMatch.get(notification.matchId) ?? "";
    signalByMatch.set(notification.matchId, `${previous} ${notification.type ?? ""} ${notification.message}`);
  }

  const rows = mergedMatches
    .filter((match) => typeof match.matchId === "number")
    .map((match) => {
      const matchId = match.matchId as number;
      const quote = typeof match.quoteId === "number" ? quoteMap.get(match.quoteId) : undefined;
      const settlement = settlementMap.get(matchId);
      const status = normalizeMatchStatus(match.status);
      const driverId = match.driverId;
      const truck = typeof driverId === "number" ? truckByDriverMap.get(driverId) : undefined;

      const paymentStatus = normalizePaymentStatus(settlement?.shipperPaymentStatus);
      const settlementStatus = settlement?.settlementStatus
        ? normalizeSettlementStatus(settlement.settlementStatus)
        : status === "COMPLETED"
          ? "PROCESSING"
          : status === "CANCELLED"
            ? "FAILED"
            : "PENDING";
      const totalFare = settlement?.totalFare ?? quote?.finalPrice ?? quote?.desiredPrice ?? 0;
      const driverPayout = settlement?.driverPayout ?? 0;
      const platformFee = settlement?.platformFee ?? Math.max(totalFare - driverPayout, 0);
      const signalText = signalByMatch.get(matchId) ?? "";
      const unreadCount = unreadCountByMatch.get(matchId) ?? 0;

      return {
        matchId: `M-${matchId}`,
        quoteId: typeof match.quoteId === "number" ? `Q-${match.quoteId}` : "-",
        shipperName: "화주",
        cargoType: quote?.cargoName ?? "화물",
        originAddress: quote?.originAddress ?? "-",
        destinationAddress: quote?.destinationAddress ?? "-",
        requestedAt: toDisplayDate(match.createdAt),
        departAt: match.acceptedAt ? toDisplayDate(match.acceptedAt) : undefined,
        arriveAt: settlement?.completedAt ? toDisplayDate(settlement.completedAt) : undefined,
        driverName: typeof driverId === "number" ? `기사-${driverId}` : undefined,
        truckName: (truck?.name ?? [truck?.vehicleType, truck?.vehicleBodyType].filter(Boolean).join(" ").trim()) || undefined,
        matchStatus: status,
        accepted: Boolean(match.accepted) || typeof driverId === "number",
        currentVolumeCbm: quote?.volumeCbm ?? 0,
        remainingVolumeCbm: Boolean(match.accepted) ? 0 : quote?.volumeCbm ?? 0,
        routeDistanceKm: quote?.distanceKm ?? 0,
        totalFare,
        driverPayout,
        platformFee,
        paymentStatus,
        settlementStatus,
        unreadNotificationCount: unreadCount,
        deviationSeverity: inferDeviationSeverity(signalText, status),
      } satisfies DispatchRow;
    })
    .sort((a, b) => Date.parse(b.requestedAt) - Date.parse(a.requestedAt));

  return applyAssignmentOverrides(rows);
}

function cacheLiveRows(rows: DispatchRow[]): void {
  liveRowsCache.clear();
  for (const row of rows) {
    const matchId = parseMatchId(row.matchId);
    if (matchId === null) continue;
    liveRowsCache.set(matchId, row);
  }
}

function filterMockDispatchRows(query: DispatchQuery): DispatchResponse {
  const filtered = applyQueryFilter(MOCK_DISPATCH_ROWS, query);
  return paginateRows(filtered, query.page, query.size);
}

export async function fetchDispatchRows(query: DispatchQuery): Promise<DispatchResponse> {
  if (isMockModeEnabled()) {
    return filterMockDispatchRows(query);
  }

  const rows = await buildLiveRows();
  cacheLiveRows(rows);
  const filtered = applyQueryFilter(rows, query);
  return paginateRows(filtered, query.page, query.size);
}

export async function fetchAssignableDrivers(matchId: string): Promise<DispatchDriverOption[]> {
  if (isMockModeEnabled()) {
    const target = MOCK_DISPATCH_ROWS.find((row) => row.matchId === matchId);
    if (!target) return [];
    return [...MOCK_DRIVER_OPTIONS];
  }

  const [trucks, rowsResponse] = await Promise.all([
    fetchTrucks(),
    fetchDispatchRows({ page: 1, size: 400 }),
  ]);

  const currentVolumeByDriver = new Map<string, number>();
  for (const row of rowsResponse.items) {
    if (!row.driverName) continue;
    const driverId = row.driverName.replace("기사-", "D-");
    currentVolumeByDriver.set(driverId, (currentVolumeByDriver.get(driverId) ?? 0) + row.currentVolumeCbm);
  }

  const options = trucks
    .filter((truck) => typeof truck.driverId === "number")
    .map((truck) => {
      const driverId = `D-${truck.driverId}`;
      const maxVolume = truck.maxVolume ?? truck.maxWeight ?? 0;
      const truckName =
        (truck.name ?? [truck.vehicleType, truck.vehicleBodyType].filter(Boolean).join(" ").trim()) || "차량";
      return {
        driverId,
        driverName: `기사-${truck.driverId}`,
        truckName,
        maxVolumeCbm: maxVolume,
        currentVolumeCbm: currentVolumeByDriver.get(driverId) ?? 0,
      } satisfies DispatchDriverOption;
    });

  const unique = new Map<string, DispatchDriverOption>();
  for (const option of options) {
    if (!unique.has(option.driverId)) unique.set(option.driverId, option);
  }

  return Array.from(unique.values()).sort(
    (a, b) => b.maxVolumeCbm - b.currentVolumeCbm - (a.maxVolumeCbm - a.currentVolumeCbm),
  );
}

export async function forceAssignDispatchDriver(payload: DispatchForceAssignPayload): Promise<DispatchRow | null> {
  if (isMockModeEnabled()) {
    const row = MOCK_DISPATCH_ROWS.find((item) => item.matchId === payload.matchId);
    const driver = MOCK_DRIVER_OPTIONS.find((item) => item.driverId === payload.driverId);
    if (!row || !driver) return null;

    row.driverName = driver.driverName;
    row.truckName = driver.truckName;
    row.accepted = true;
    appendActivityLog({
      action: "DISPATCH_ASSIGNED",
      targetId: payload.matchId,
      mode: "MOCK",
      message: `매칭 ${payload.matchId} 기사 지정 완료`,
    });
    return row;
  }

  const matchId = parseMatchId(payload.matchId);
  if (matchId === null) return null;

  const options = await fetchAssignableDrivers(payload.matchId);
  const targetDriver = options.find((item) => item.driverId === payload.driverId);
  if (!targetDriver) return null;

  liveAssignmentOverrides.set(matchId, {
    driverId: payload.driverId,
    driverName: targetDriver.driverName,
    truckName: targetDriver.truckName,
    updatedAt: new Date().toISOString(),
  });

  appendActivityLog({
    action: "DISPATCH_ASSIGNED",
    targetId: payload.matchId,
    mode: "REAL",
    message: `매칭 ${payload.matchId} 기사 지정 요청 - 서버 전용 배차 API 미지원으로 세션에 반영`,
  });

  const cached = liveRowsCache.get(matchId);
  if (!cached) return null;

  const updated: DispatchRow = {
    ...cached,
    accepted: true,
    driverName: targetDriver.driverName,
    truckName: targetDriver.truckName,
  };
  liveRowsCache.set(matchId, updated);
  return updated;
}
