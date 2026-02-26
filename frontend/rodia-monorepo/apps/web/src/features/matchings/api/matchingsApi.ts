import { apiPaths } from "@/shared/lib/api/endpoints";
import { apiClient } from "@/shared/lib/api/client";
import { isMockModeEnabled } from "@/shared/lib/mock-mode";

export enum MatchingStatus {
  READY = "READY",
  IN_TRANSIT = "IN_TRANSIT",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum MatchingSource {
  ADMIN = "ADMIN",
  SHIPPER = "SHIPPER",
  DRIVER = "DRIVER",
  OPEN_POOL = "OPEN_POOL",
  NOTIFICATION = "NOTIFICATION",
}

export type MatchingSyncMode = "REMOTE" | "LOCAL_SESSION";

export type MatchingItem = {
  id: string;
  matchId: number | null;
  quoteId: number | null;
  driverId: number | null;
  accepted: boolean;
  status: MatchingStatus;
  source: MatchingSource;
  signal: string;
  relatedNotificationIds: number[];
  createdAt: string;
  updatedAt: string;
  acceptedAt?: string;
  canCancel: boolean;
  syncMode: MatchingSyncMode;
};

export type MatchingFilter = {
  search?: string;
  status?: MatchingStatus;
  source?: MatchingSource;
  page?: number;
  size?: number;
};

export type MatchingSummary = {
  total: number;
  ready: number;
  inTransit: number;
  completed: number;
  cancelled: number;
  unassigned: number;
};

export type MatchingResponse = {
  items: MatchingItem[];
  total: number;
  page: number;
  size: number;
  summary: MatchingSummary;
};

export type MatchingActionResult = {
  success: boolean;
  mode: MatchingSyncMode;
  message?: string;
};

type MatchingApiEnv = {
  VITE_API_ADMIN_MATCHINGS_PATH?: string;
};

type BackendNotification = {
  notificationId: number;
  matchId: number | null;
  type: string | null;
  message: string;
  isRead: boolean;
  createdAt: string | null;
};

const env = import.meta.env as MatchingApiEnv;
const ADMIN_MATCHINGS_PATH = env.VITE_API_ADMIN_MATCHINGS_PATH?.trim() ?? "";

const TERMINAL_STATUSES = new Set<MatchingStatus>([
  MatchingStatus.CANCELLED,
  MatchingStatus.COMPLETED,
]);

const SOURCE_PRIORITY: Record<MatchingSource, number> = {
  [MatchingSource.ADMIN]: 5,
  [MatchingSource.SHIPPER]: 4,
  [MatchingSource.DRIVER]: 3,
  [MatchingSource.OPEN_POOL]: 2,
  [MatchingSource.NOTIFICATION]: 1,
};

const liveOverrides = new Map<
  number,
  {
    status: MatchingStatus;
    updatedAt: string;
    signal: string;
    syncMode: MatchingSyncMode;
  }
>();

function buildMockRows(): MatchingItem[] {
  const now = Date.now();
  const statuses = [
    MatchingStatus.READY,
    MatchingStatus.READY,
    MatchingStatus.IN_TRANSIT,
    MatchingStatus.COMPLETED,
    MatchingStatus.CANCELLED,
  ];

  return Array.from({ length: 36 }, (_, index) => {
    const status = statuses[index % statuses.length];
    const matchId = 5100 + index;
    const createdAt = new Date(now - (index + 2) * 60 * 60 * 1000).toISOString();
    const updatedAt = new Date(now - (index + 1) * 30 * 60 * 1000).toISOString();

    return {
      id: `M-${matchId}`,
      matchId,
      quoteId: 8200 + index,
      driverId: status === MatchingStatus.READY && index % 3 === 0 ? null : 1400 + (index % 24),
      accepted: status !== MatchingStatus.READY || index % 3 !== 0,
      status,
      source:
        index % 5 === 0
          ? MatchingSource.NOTIFICATION
          : index % 2 === 0
            ? MatchingSource.SHIPPER
            : MatchingSource.DRIVER,
      signal:
        status === MatchingStatus.CANCELLED
          ? "화주/차주 취소 알림"
          : status === MatchingStatus.IN_TRANSIT
            ? "운송 진행 신호"
            : status === MatchingStatus.COMPLETED
              ? "완료 처리됨"
              : "배차 대기",
      relatedNotificationIds: index % 2 === 0 ? [19000 + index] : [],
      createdAt,
      updatedAt,
      acceptedAt:
        status === MatchingStatus.READY ? undefined : new Date(now - (index + 1) * 45 * 60 * 1000).toISOString(),
      canCancel: !TERMINAL_STATUSES.has(status),
      syncMode: "REMOTE",
    };
  });
}

const MOCK_ROWS = buildMockRows();

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function toStringValue(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function toNumberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.trunc(parsed);
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

function pickListPayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const row = toRecord(payload);

  const candidates = [row.items, row.data, row.content, row.list, row.result];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
}

function toTimestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeStatus(value: string): MatchingStatus {
  const status = value.trim().toUpperCase();

  if (
    status === "CANCELLED" ||
    status === "CANCELED" ||
    status === "CANCEL" ||
    status === "MATCH_CANCELLED"
  ) {
    return MatchingStatus.CANCELLED;
  }

  if (
    status === "IN_TRANSIT" ||
    status === "TRANSIT" ||
    status === "MOVING" ||
    status === "PICKUP" ||
    status === "DROPOFF"
  ) {
    return MatchingStatus.IN_TRANSIT;
  }

  if (
    status === "COMPLETED" ||
    status === "DONE" ||
    status === "DELIVERED" ||
    status === "FINISHED"
  ) {
    return MatchingStatus.COMPLETED;
  }

  return MatchingStatus.READY;
}

function inferStatusFromNotification(row: BackendNotification): MatchingStatus {
  const text = `${row.type ?? ""} ${row.message}`.toUpperCase();

  if (text.includes("CANCEL")) return MatchingStatus.CANCELLED;
  if (text.includes("COMPLETE") || text.includes("DELIVER")) return MatchingStatus.COMPLETED;
  if (text.includes("TRANSIT") || text.includes("PICKUP")) return MatchingStatus.IN_TRANSIT;
  return MatchingStatus.READY;
}

function mapMatchRow(raw: unknown, source: MatchingSource): MatchingItem {
  const row = toRecord(raw);
  const nowIso = new Date().toISOString();
  const matchId = toNumberValue(row.matchId ?? row.id);
  const quoteId = toNumberValue(row.quoteId);
  const driverId = toNumberValue(row.driverId);
  const status = normalizeStatus(toStringValue(row.status, ""));
  const createdAt = toIsoDate(row.createdAt, nowIso);
  const updatedAt = toIsoDate(row.updatedAt ?? row.acceptedAt, createdAt);
  const acceptedAt = toStringValue(row.acceptedAt, "");

  return {
    id: matchId !== null ? `M-${matchId}` : `M-UNKNOWN-${Math.max(Date.now(), 1)}`,
    matchId,
    quoteId,
    driverId,
    accepted: toBooleanValue(row.accepted) || driverId !== null,
    status,
    source,
    signal: source === MatchingSource.ADMIN ? "관리 집계" : "매칭 이벤트",
    relatedNotificationIds: [],
    createdAt,
    updatedAt,
    acceptedAt: acceptedAt ? toIsoDate(acceptedAt, updatedAt) : undefined,
    canCancel: matchId !== null && !TERMINAL_STATUSES.has(status),
    syncMode: "REMOTE",
  };
}

function mapNotificationRow(row: BackendNotification): MatchingItem | null {
  if (typeof row.matchId !== "number") return null;

  const status = inferStatusFromNotification(row);
  const date = row.createdAt ? toIsoDate(row.createdAt, new Date().toISOString()) : new Date().toISOString();
  return {
    id: `M-${row.matchId}`,
    matchId: row.matchId,
    quoteId: null,
    driverId: null,
    accepted: status !== MatchingStatus.READY,
    status,
    source: MatchingSource.NOTIFICATION,
    signal: row.message || row.type || "알림 시그널",
    relatedNotificationIds: [row.notificationId],
    createdAt: date,
    updatedAt: date,
    canCancel: !TERMINAL_STATUSES.has(status),
    syncMode: "REMOTE",
  };
}

function mergeSignals(first: string, second: string): string {
  const merged = Array.from(
    new Set(
      [first, second]
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
    ),
  );
  return merged.join(" / ");
}

function mergeRows(items: MatchingItem[]): MatchingItem[] {
  const merged = new Map<string, MatchingItem>();

  for (const row of items) {
    const key = row.matchId !== null ? `M-${row.matchId}` : row.id;
    const current = merged.get(key);

    if (!current) {
      merged.set(key, row);
      continue;
    }

    const primary =
      SOURCE_PRIORITY[row.source] >= SOURCE_PRIORITY[current.source] ? row : current;
    const secondary = primary === row ? current : row;
    const latest = toTimestamp(row.updatedAt) >= toTimestamp(current.updatedAt) ? row : current;
    const earliestCreated =
      toTimestamp(row.createdAt) <= toTimestamp(current.createdAt) ? row.createdAt : current.createdAt;

    merged.set(key, {
      ...secondary,
      ...primary,
      status: latest.status,
      createdAt: earliestCreated,
      updatedAt: latest.updatedAt,
      accepted: primary.accepted || secondary.accepted,
      signal: mergeSignals(primary.signal, secondary.signal),
      relatedNotificationIds: Array.from(
        new Set([...primary.relatedNotificationIds, ...secondary.relatedNotificationIds]),
      ),
      canCancel: primary.matchId !== null && !TERMINAL_STATUSES.has(latest.status),
      syncMode:
        primary.syncMode === "LOCAL_SESSION" || secondary.syncMode === "LOCAL_SESSION"
          ? "LOCAL_SESSION"
          : "REMOTE",
    });
  }

  return Array.from(merged.values()).sort((a, b) => toTimestamp(b.updatedAt) - toTimestamp(a.updatedAt));
}

function applyLiveOverrides(items: MatchingItem[]): MatchingItem[] {
  return items.map((item) => {
    if (item.matchId === null) return item;
    const override = liveOverrides.get(item.matchId);
    if (!override) return item;

    return {
      ...item,
      status: override.status,
      updatedAt: override.updatedAt,
      signal: mergeSignals(item.signal, override.signal),
      syncMode: override.syncMode,
      canCancel: !TERMINAL_STATUSES.has(override.status),
    };
  });
}

function applyFilters(items: MatchingItem[], filter: MatchingFilter): MatchingItem[] {
  const keyword = filter.search?.trim().toLowerCase() ?? "";

  return items.filter((item) => {
    if (filter.status && item.status !== filter.status) return false;
    if (filter.source && item.source !== filter.source) return false;

    if (keyword) {
      const text = [
        item.id,
        item.matchId !== null ? `M-${item.matchId}` : "",
        item.quoteId !== null ? `Q-${item.quoteId}` : "",
        item.driverId !== null ? `D-${item.driverId}` : "",
        item.signal,
      ]
        .join(" ")
        .toLowerCase();

      if (!text.includes(keyword)) return false;
    }

    return true;
  });
}

function paginate<T>(items: T[], page: number, size: number): T[] {
  const start = (page - 1) * size;
  return items.slice(start, start + size);
}

function buildSummary(items: MatchingItem[]): MatchingSummary {
  return {
    total: items.length,
    ready: items.filter((item) => item.status === MatchingStatus.READY).length,
    inTransit: items.filter((item) => item.status === MatchingStatus.IN_TRANSIT).length,
    completed: items.filter((item) => item.status === MatchingStatus.COMPLETED).length,
    cancelled: items.filter((item) => item.status === MatchingStatus.CANCELLED).length,
    unassigned: items.filter((item) => item.driverId === null).length,
  };
}

async function fetchMatchRows(path: string, source: MatchingSource): Promise<MatchingItem[]> {
  try {
    const response = await apiClient.get<unknown>(path);
    return pickListPayload(response.data).map((row) => mapMatchRow(row, source));
  } catch {
    return [];
  }
}

async function fetchNotifications(): Promise<BackendNotification[]> {
  try {
    const response = await apiClient.get<BackendNotification[]>(apiPaths.notificationsMe);
    return Array.isArray(response.data) ? response.data : [];
  } catch {
    return [];
  }
}

function resolveDriverMyPath(): string {
  const base = apiPaths.driverMatches.replace(/\/$/, "");
  return `${base}/me`;
}

function resolveShipperBasePath(): string {
  const mePath = apiPaths.shipperMatchesMe.replace(/\/$/, "");
  if (mePath.endsWith("/me")) {
    return mePath.slice(0, -3);
  }
  return "/api/shipper/matches";
}

async function fetchLiveRows(): Promise<MatchingItem[]> {
  const adminRowsPromise =
    ADMIN_MATCHINGS_PATH.length > 0
      ? fetchMatchRows(ADMIN_MATCHINGS_PATH, MatchingSource.ADMIN)
      : Promise.resolve<MatchingItem[]>([]);

  const [adminRows, shipperRows, driverOpenRows, driverRows, notifications] = await Promise.all([
    adminRowsPromise,
    fetchMatchRows(apiPaths.shipperMatchesMe, MatchingSource.SHIPPER),
    fetchMatchRows(apiPaths.driverMatches, MatchingSource.OPEN_POOL),
    fetchMatchRows(resolveDriverMyPath(), MatchingSource.DRIVER),
    fetchNotifications(),
  ]);

  const notificationRows = notifications
    .map(mapNotificationRow)
    .filter((item): item is MatchingItem => item !== null);

  return applyLiveOverrides(
    mergeRows([
      ...adminRows,
      ...shipperRows,
      ...driverOpenRows,
      ...driverRows,
      ...notificationRows,
    ]),
  );
}

function resolveMatchId(input: string | number): number | null {
  if (typeof input === "number" && Number.isFinite(input)) return Math.trunc(input);

  const text = typeof input === "string" ? input.trim() : String(input);
  const prefixed = /^M-(\d+)$/i.exec(text);
  if (prefixed) return Number(prefixed[1]);

  const numeric = Number(text);
  if (Number.isFinite(numeric)) return Math.trunc(numeric);

  return null;
}

async function tryCancelRemote(matchId: number): Promise<boolean> {
  const shipperBasePath = resolveShipperBasePath();
  const driverBasePath = apiPaths.driverMatches.replace(/\/$/, "");
  const candidates = [`${shipperBasePath}/${matchId}`, `${driverBasePath}/${matchId}`];

  for (const path of candidates) {
    try {
      await apiClient.delete(path);
      return true;
    } catch {
      // try next
    }
  }

  return false;
}

export async function fetchMatchings(filter: MatchingFilter = {}): Promise<MatchingResponse> {
  const page = filter.page ?? 1;
  const size = filter.size ?? 20;
  const rows = isMockModeEnabled() ? [...MOCK_ROWS] : await fetchLiveRows();
  const filtered = applyFilters(rows, filter);

  return {
    items: paginate(filtered, page, size),
    total: filtered.length,
    page,
    size,
    summary: buildSummary(filtered),
  };
}

export async function cancelMatching(target: string | number): Promise<MatchingActionResult> {
  const matchId = resolveMatchId(target);
  if (matchId === null || matchId <= 0) {
    return {
      success: false,
      mode: "LOCAL_SESSION",
      message: "유효한 매칭 ID가 아닙니다.",
    };
  }

  const updatedAt = new Date().toISOString();

  if (isMockModeEnabled()) {
    const row = MOCK_ROWS.find((item) => item.matchId === matchId);
    if (row) {
      row.status = MatchingStatus.CANCELLED;
      row.updatedAt = updatedAt;
      row.signal = mergeSignals(row.signal, "관리자 취소 처리");
      row.canCancel = false;
    }
    return { success: true, mode: "REMOTE" };
  }

  const cancelled = await tryCancelRemote(matchId);

  if (cancelled) {
    liveOverrides.set(matchId, {
      status: MatchingStatus.CANCELLED,
      updatedAt,
      signal: "취소 요청 반영",
      syncMode: "REMOTE",
    });
    return { success: true, mode: "REMOTE" };
  }

  liveOverrides.set(matchId, {
    status: MatchingStatus.CANCELLED,
    updatedAt,
    signal: "서버 취소 API 미확인으로 세션 반영",
    syncMode: "LOCAL_SESSION",
  });

  return {
    success: true,
    mode: "LOCAL_SESSION",
    message: "서버 취소 API 접근이 제한되어 현재 세션 화면에만 반영했습니다.",
  };
}
