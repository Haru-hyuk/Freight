import { LIVE_DELIVERY_DETAIL_MOCK_BY_MATCH_ID, LIVE_DELIVERY_MOCK_ROWS } from "@/features/delivery/model/liveMockData";
import type { KakaoAlertPayload, LiveDeliveryDetail, LiveDeliveryRow, LiveDeliveryStatus } from "@/features/delivery/model/liveTypes";
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

type BackendNotification = {
  notificationId: number;
  matchId: number | null;
  type: string | null;
  message: string;
  isRead: boolean;
  createdAt: string | null;
};

type BackendQuote = {
  quoteId: number | null;
  originAddress: string;
  destinationAddress: string;
  cargoName: string | null;
  vehicleType: string | null;
  vehicleBodyType: string | null;
  weightKg: number | null;
  volumeCbm: number | null;
};

const USE_MATCH_DETAIL_ENDPOINTS =
  String(import.meta.env.VITE_USE_MATCH_DETAIL_ENDPOINTS ?? "").toLowerCase() === "true";
const USE_QUOTE_DETAIL_ENDPOINTS =
  String(import.meta.env.VITE_USE_QUOTE_DETAIL_ENDPOINTS ?? "").toLowerCase() === "true";
const USE_ROLE_LIVE_ENDPOINT_FALLBACK =
  String(import.meta.env.VITE_USE_ROLE_LIVE_ENDPOINT_FALLBACK ?? "").toLowerCase() === "true";
let isMatchDetailEndpointAvailable = USE_MATCH_DETAIL_ENDPOINTS;
let isQuoteDetailEndpointAvailable = USE_QUOTE_DETAIL_ENDPOINTS;

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
  return new Date(parsed).toISOString().slice(0, 19).replace("T", " ");
}

function normalizeMatchStatus(value: string): "READY" | "IN_TRANSIT" | "COMPLETED" | "CANCELLED" {
  const status = value.trim().toUpperCase();
  if (status === "IN_TRANSIT" || status === "TRANSIT" || status === "MOVING") return "IN_TRANSIT";
  if (status === "COMPLETED" || status === "DONE" || status === "DELIVERED") return "COMPLETED";
  if (status === "CANCELLED" || status === "CANCELED" || status === "CANCEL") return "CANCELLED";
  return "READY";
}

function toSeed(matchId: number): number {
  return Math.abs(matchId * 7919 + 104729);
}

function pseudoLocation(seed: number): { lat: number; lng: number } {
  const lat = 35 + (seed % 2500) / 1000;
  const lng = 126 + ((seed / 17) % 3500) / 1000;
  return {
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
  };
}

function inferLiveStatus(text: string): LiveDeliveryStatus {
  if (/(deviat|route|detour|이탈)/i.test(text)) return "DEVIATED";
  if (/(delay|late|지연)/i.test(text)) return "DELAYED";
  return "NORMAL";
}

function statusToProgress(status: ReturnType<typeof normalizeMatchStatus>, seed: number): number {
  if (status === "COMPLETED") return 100;
  if (status === "CANCELLED") return 0;
  if (status === "IN_TRANSIT") return 20 + (seed % 70);
  return 1 + (seed % 12);
}

function statusToSpeed(status: ReturnType<typeof normalizeMatchStatus>, seed: number): number {
  if (status === "COMPLETED" || status === "CANCELLED") return 0;
  if (status === "READY") return 0;
  return 25 + (seed % 45);
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
    cargoName: toStringValue(row.cargoName ?? row.cargo_name, "") || null,
    vehicleType: toStringValue(row.vehicleType ?? row.vehicle_type, "") || null,
    vehicleBodyType: toStringValue(row.vehicleBodyType ?? row.vehicle_body_type, "") || null,
    weightKg: toNumberValue(row.weightKg ?? row.weight_kg),
    volumeCbm: toNumberValue(row.volumeCbm ?? row.volume_cbm),
  };
}

function mapBackendNotification(raw: unknown): BackendNotification | null {
  const row = toRecord(raw);
  const notificationId = toNumberValue(row.notificationId ?? row.id);
  if (notificationId === null) return null;

  return {
    notificationId,
    matchId: toNumberValue(row.matchId),
    type: toStringValue(row.type, "") || null,
    message: toStringValue(row.message, ""),
    isRead: Boolean(row.isRead),
    createdAt: toStringValue(row.createdAt, "") || null,
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

async function fetchQuotes(): Promise<BackendQuote[]> {
  try {
    const response = await apiClient.get<unknown>(apiPaths.adminTransportQuotes);
    return pickListPayload(response.data).map(mapBackendQuote);
  } catch (error) {
    if (!axios.isAxiosError(error) || error.response?.status !== 404) {
      return [];
    }
    if (!USE_ROLE_LIVE_ENDPOINT_FALLBACK) {
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

async function fetchLiveMatches(): Promise<BackendMatch[]> {
  const adminRows = await fetchAdminMatches();
  if (adminRows !== null) {
    return mergeMatches(adminRows);
  }
  if (!USE_ROLE_LIVE_ENDPOINT_FALLBACK) {
    return [];
  }

  const [shipperMatches, openDriverMatches, myDriverMatches] = await Promise.all([
    fetchMatchesByPath(apiPaths.shipperMatchesMe),
    fetchMatchesByPath(apiPaths.driverMatches),
    fetchMatchesByPath(resolveDriverMyMatchesPath()),
  ]);
  return mergeMatches([...shipperMatches, ...openDriverMatches, ...myDriverMatches]);
}

function buildRowsFromLive(
  matches: BackendMatch[],
  notifications: BackendNotification[],
  quotes: BackendQuote[],
): LiveDeliveryRow[] {
  const quoteMap = new Map<number, BackendQuote>();
  for (const quote of quotes) {
    if (typeof quote.quoteId !== "number") continue;
    quoteMap.set(quote.quoteId, quote);
  }

  const notifByMatch = new Map<number, BackendNotification[]>();
  for (const notification of notifications) {
    if (typeof notification.matchId !== "number") continue;
    const rows = notifByMatch.get(notification.matchId) ?? [];
    rows.push(notification);
    notifByMatch.set(notification.matchId, rows);
  }

  return matches
    .filter((match) => typeof match.matchId === "number" && normalizeMatchStatus(match.status) !== "CANCELLED")
    .map((match) => {
      const matchId = match.matchId as number;
      const seed = toSeed(matchId);
      const quote = typeof match.quoteId === "number" ? quoteMap.get(match.quoteId) : undefined;
      const relatedNotifications = notifByMatch.get(matchId) ?? [];
      const signalText = relatedNotifications.map((item) => `${item.type ?? ""} ${item.message}`).join(" ");
      const status = normalizeMatchStatus(match.status);
      const liveStatus = inferLiveStatus(signalText);
      const location = pseudoLocation(seed);

      return {
        matchId: `M-${matchId}`,
        quoteId: typeof match.quoteId === "number" ? `Q-${match.quoteId}` : "-",
        driverId: typeof match.driverId === "number" ? `D-${match.driverId}` : "-",
        driverName: typeof match.driverId === "number" ? `기사-${match.driverId}` : "미배정",
        shipperName: "화주",
        originAddress: quote?.originAddress ?? "-",
        destinationAddress: quote?.destinationAddress ?? "-",
        currentLat: location.lat,
        currentLng: location.lng,
        speedKmh: statusToSpeed(status, seed),
        progressPercent: statusToProgress(status, seed),
        deviationDistanceKm: liveStatus === "DEVIATED" ? Number((0.8 + (seed % 40) / 10).toFixed(1)) : 0,
        routeUpdatedAt: toDisplayDate(match.updatedAt ?? match.createdAt),
        liveStatus,
      } satisfies LiveDeliveryRow;
    })
    .sort((a, b) => Date.parse(b.routeUpdatedAt) - Date.parse(a.routeUpdatedAt));
}

function parseMatchIdText(matchId: string): number | null {
  const prefixed = /^M-(\d+)$/i.exec(matchId.trim());
  if (prefixed) return Number(prefixed[1]);
  const parsed = Number(matchId);
  return Number.isFinite(parsed) ? parsed : null;
}

async function fetchLiveMatchDetail(matchId: number): Promise<BackendMatch | null> {
  if (!isMatchDetailEndpointAvailable) return null;

  const paths = [`${apiPaths.adminTransportMatches.replace(/\/$/, "")}/${matchId}`];
  if (USE_ROLE_LIVE_ENDPOINT_FALLBACK) {
    paths.push(
      `${apiPaths.driverMatches.replace(/\/$/, "")}/${matchId}`,
      `${apiPaths.shipperMatchesMe.replace(/\/me\/?$/, "").replace(/\/$/, "")}/${matchId}`,
    );
  }

  for (const path of paths) {
    try {
      const response = await apiClient.get<unknown>(path);
      return mapBackendMatch(response.data);
    } catch (error) {
      if (
        axios.isAxiosError(error) &&
        (error.response?.status === 400 || error.response?.status === 403 || error.response?.status === 405)
      ) {
        isMatchDetailEndpointAvailable = false;
        return null;
      }
    }
  }

  return null;
}

async function fetchQuoteDetailById(quoteId: number): Promise<BackendQuote | null> {
  if (!isQuoteDetailEndpointAvailable) return null;

  try {
    const response = await apiClient.get<unknown>(`${apiPaths.adminTransportQuotes.replace(/\/$/, "")}/${quoteId}`);
    return mapBackendQuote(response.data);
  } catch (error) {
    if (
      axios.isAxiosError(error) &&
      (error.response?.status === 400 || error.response?.status === 403 || error.response?.status === 405)
    ) {
      isQuoteDetailEndpointAvailable = false;
      return null;
    }

    if (!axios.isAxiosError(error) || error.response?.status !== 404) {
      return null;
    }
    if (!USE_ROLE_LIVE_ENDPOINT_FALLBACK) return null;

    try {
      const response = await apiClient.get<unknown>(`${apiPaths.shipperQuotes.replace(/\/$/, "")}/${quoteId}`);
      return mapBackendQuote(response.data);
    } catch {
      return null;
    }
  }
}

function buildRoutePoints(baseLat: number, baseLng: number, span: number) {
  return [
    { lat: Number((baseLat - span * 0.5).toFixed(6)), lng: Number((baseLng - span * 0.8).toFixed(6)) },
    { lat: Number((baseLat - span * 0.2).toFixed(6)), lng: Number((baseLng - span * 0.3).toFixed(6)) },
    { lat: Number((baseLat + span * 0.15).toFixed(6)), lng: Number((baseLng + span * 0.25).toFixed(6)) },
    { lat: Number((baseLat + span * 0.45).toFixed(6)), lng: Number((baseLng + span * 0.7).toFixed(6)) },
  ];
}

export async function fetchLiveDeliveryRows(): Promise<LiveDeliveryRow[]> {
  if (isMockModeEnabled()) return [...LIVE_DELIVERY_MOCK_ROWS];

  const [matches, notifications, quotes] = await Promise.all([
    fetchLiveMatches(),
    fetchNotifications(),
    fetchQuotes(),
  ]);

  return buildRowsFromLive(matches, notifications, quotes);
}

export async function fetchLiveDeliveryDetail(matchId: string): Promise<LiveDeliveryDetail | null> {
  if (isMockModeEnabled()) return LIVE_DELIVERY_DETAIL_MOCK_BY_MATCH_ID[matchId] ?? null;

  const parsedMatchId = parseMatchIdText(matchId);
  if (parsedMatchId === null) return null;

  const [rows, matchDetail] = await Promise.all([fetchLiveDeliveryRows(), fetchLiveMatchDetail(parsedMatchId)]);
  const selected = rows.find((row) => row.matchId === `M-${parsedMatchId}`);
  const quoteId = matchDetail?.quoteId ?? parseMatchIdText(selected?.quoteId ?? "");
  const quote = typeof quoteId === "number" ? await fetchQuoteDetailById(quoteId) : null;

  const seed = toSeed(parsedMatchId);
  const location = selected ? { lat: selected.currentLat, lng: selected.currentLng } : pseudoLocation(seed);
  const plannedRoute = buildRoutePoints(location.lat, location.lng, 0.4);
  const currentRoute = [
    { ...plannedRoute[0], recordedAt: new Date(Date.now() - 50 * 60 * 1000).toISOString() },
    { ...plannedRoute[1], recordedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString() },
    { lat: location.lat, lng: location.lng, recordedAt: new Date().toISOString() },
  ];

  return {
    matchId: `M-${parsedMatchId}`,
    cargoType: quote?.cargoName ?? "화물",
    cargoWeightKg: quote?.weightKg ?? 0,
    truckType: [quote?.vehicleType, quote?.vehicleBodyType].filter(Boolean).join(" ").trim() || "미확인",
    truckWeightTon: Number((((seed % 20) + 5) / 2).toFixed(1)),
    truckVolumeCbm: quote?.volumeCbm ?? Number((10 + (seed % 40) / 2).toFixed(1)),
    totalRouteKm: Number((20 + (seed % 900) / 10).toFixed(1)),
    routeProgressPercent: selected?.progressPercent ?? 0,
    deviationReason:
      selected?.liveStatus === "DEVIATED" ? "알림 신호 기반 우회 경로 탐지" : undefined,
    plannedRoute,
    currentRoute,
    timeline: [
      {
        id: "created",
        label: "매칭 생성",
        occurredAt: toDisplayDate(matchDetail?.createdAt),
        note: quoteId ? `견적 Q-${quoteId}` : undefined,
      },
      {
        id: "accepted",
        label: "매칭 수락",
        occurredAt: toDisplayDate(matchDetail?.acceptedAt),
      },
      {
        id: "updated",
        label: "최근 위치 갱신",
        occurredAt: selected?.routeUpdatedAt ?? toDisplayDate(matchDetail?.updatedAt),
        note: selected ? `${selected.currentLat}, ${selected.currentLng}` : undefined,
      },
    ],
  };
}

export async function sendKakaoLiveAlert(payload: KakaoAlertPayload): Promise<void> {
  if (isMockModeEnabled()) {
    appendActivityLog({
      action: "LIVE_ALERT_SENT",
      targetId: payload.matchId,
      mode: "MOCK",
      message: `실시간 알림 템플릿(${payload.templateCode}) 전송`,
    });
    return;
  }

  appendActivityLog({
    action: "LIVE_ALERT_SENT",
    targetId: payload.matchId,
    mode: "REAL",
    message: `실시간 알림 템플릿(${payload.templateCode}) 요청 - 서버 전용 API 미지원으로 로그만 기록`,
  });
}
