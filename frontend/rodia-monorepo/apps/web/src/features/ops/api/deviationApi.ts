import { apiCapabilities, apiPaths } from "@/shared/lib/api/endpoints";
import { apiClient } from "@/shared/lib/api/client";
import { isMockModeEnabled } from "@/shared/lib/mock-mode";

export enum DeviationType {
  LATE_DELIVERY = "LATE_DELIVERY",
  ROUTE_DEVIATION = "ROUTE_DEVIATION",
  VEHICLE_CONDITION = "VEHICLE_CONDITION",
  SAFETY_VIOLATION = "SAFETY_VIOLATION",
  CUSTOMER_COMPLAINT = "CUSTOMER_COMPLAINT",
}

export enum DeviationSeverity {
  CRITICAL = "CRITICAL",
  SEVERE = "SEVERE",
  MODERATE = "MODERATE",
  MINOR = "MINOR",
}

export enum DeviationStatus {
  OPEN = "OPEN",
  INVESTIGATING = "INVESTIGATING",
  RESOLVED = "RESOLVED",
  DISMISSED = "DISMISSED",
}

export enum DeviationSource {
  ADMIN = "ADMIN",
  MATCH = "MATCH",
  NOTIFICATION = "NOTIFICATION",
  ANNOUNCEMENT = "ANNOUNCEMENT",
}

export type DeviationSyncMode = "REMOTE" | "LOCAL_SESSION";
export type DeviationProcessOwner = "운영" | "정산" | "회원관리";

export type Deviation = {
  id: string;
  caseNo: string;
  type: DeviationType;
  severity: DeviationSeverity;
  status: DeviationStatus;
  source: DeviationSource;
  sourceRef: string;
  driverId: string;
  driverName: string;
  orderId: string;
  quoteId?: string;
  description: string;
  evidence?: string;
  processOwner: DeviationProcessOwner;
  recommendedAction: string;
  unreadSignal: boolean;
  detectedAt: string;
  updatedAt: string;
  resolvedAt?: string;
  overdueHours: number;
  syncMode: DeviationSyncMode;
  notificationId?: number;
  matchId?: number;
};

export type DeviationFilter = {
  search?: string;
  severity?: DeviationSeverity;
  type?: DeviationType;
  status?: DeviationStatus;
  source?: DeviationSource;
  overdueOnly?: boolean;
  page?: number;
  size?: number;
};

export type DeviationSummary = {
  critical: number;
  open: number;
  investigating: number;
  overdue: number;
  resolvedRate: number;
  bySource: Record<DeviationSource, number>;
};

export type DeviationResponse = {
  items: Deviation[];
  total: number;
  page: number;
  size: number;
  summary: DeviationSummary;
};

export type DeviationAction = {
  caseId: string;
  action: "START_INVESTIGATION" | "RESOLVE" | "DISMISS";
  memo?: string;
};

export type DeviationActionResult = {
  success: boolean;
  mode: DeviationSyncMode;
  message?: string;
};

type BackendNotification = {
  notificationId: number;
  matchId: number | null;
  type: string | null;
  message: string;
  isRead: boolean;
  createdAt: string | null;
};

type BackendAnnouncement = {
  announcementId: number;
  title: string;
  content: string;
  publishedAt: string | null;
  createdAt: string | null;
};

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

const SOURCE_PRIORITY: Record<DeviationSource, number> = {
  [DeviationSource.ADMIN]: 4,
  [DeviationSource.MATCH]: 3,
  [DeviationSource.NOTIFICATION]: 2,
  [DeviationSource.ANNOUNCEMENT]: 1,
};

const liveActionOverrides = new Map<
  string,
  {
    status: DeviationStatus;
    updatedAt: string;
    resolvedAt?: string;
    syncMode: DeviationSyncMode;
  }
>();

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

function toTimestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
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

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeDeviationType(value: string): DeviationType {
  const upper = value.trim().toUpperCase();
  if (upper === DeviationType.ROUTE_DEVIATION) return DeviationType.ROUTE_DEVIATION;
  if (upper === DeviationType.VEHICLE_CONDITION) return DeviationType.VEHICLE_CONDITION;
  if (upper === DeviationType.SAFETY_VIOLATION) return DeviationType.SAFETY_VIOLATION;
  if (upper === DeviationType.CUSTOMER_COMPLAINT) return DeviationType.CUSTOMER_COMPLAINT;
  return DeviationType.LATE_DELIVERY;
}

function normalizeDeviationSeverity(value: string): DeviationSeverity {
  const upper = value.trim().toUpperCase();
  if (upper === DeviationSeverity.CRITICAL) return DeviationSeverity.CRITICAL;
  if (upper === DeviationSeverity.SEVERE) return DeviationSeverity.SEVERE;
  if (upper === DeviationSeverity.MODERATE) return DeviationSeverity.MODERATE;
  return DeviationSeverity.MINOR;
}

function normalizeDeviationStatus(value: string): DeviationStatus {
  const upper = value.trim().toUpperCase();
  if (upper === DeviationStatus.INVESTIGATING) return DeviationStatus.INVESTIGATING;
  if (upper === DeviationStatus.RESOLVED) return DeviationStatus.RESOLVED;
  if (upper === DeviationStatus.DISMISSED) return DeviationStatus.DISMISSED;
  return DeviationStatus.OPEN;
}

function normalizeDeviationSource(value: string): DeviationSource {
  const upper = value.trim().toUpperCase();
  if (upper === DeviationSource.MATCH) return DeviationSource.MATCH;
  if (upper === DeviationSource.NOTIFICATION) return DeviationSource.NOTIFICATION;
  if (upper === DeviationSource.ANNOUNCEMENT) return DeviationSource.ANNOUNCEMENT;
  return DeviationSource.ADMIN;
}

function normalizeMatchStatus(value: string): "READY" | "IN_TRANSIT" | "COMPLETED" | "CANCELLED" {
  const upper = value.trim().toUpperCase();

  if (upper === "CANCELLED" || upper === "CANCELED" || upper === "MATCH_CANCELLED" || upper === "CANCEL") {
    return "CANCELLED";
  }
  if (
    upper === "IN_TRANSIT" ||
    upper === "TRANSIT" ||
    upper === "MOVING" ||
    upper === "PICKUP" ||
    upper === "DROPOFF"
  ) {
    return "IN_TRANSIT";
  }
  if (upper === "COMPLETED" || upper === "DONE" || upper === "DELIVERED" || upper === "FINISHED") {
    return "COMPLETED";
  }

  return "READY";
}

function inferDeviationType(text: string): DeviationType {
  if (/(route|gps|detour|경로|이탈)/i.test(text)) return DeviationType.ROUTE_DEVIATION;
  if (/(vehicle|truck|damage|inspection|차량|점검)/i.test(text)) return DeviationType.VEHICLE_CONDITION;
  if (/(safety|violation|accident|사고|안전|위반)/i.test(text)) return DeviationType.SAFETY_VIOLATION;
  if (/(complaint|claim|cancel|민원|취소)/i.test(text)) return DeviationType.CUSTOMER_COMPLAINT;
  return DeviationType.LATE_DELIVERY;
}

function inferDeviationSeverity(text: string): DeviationSeverity {
  if (/(critical|severe|failed|danger|suspend|fatal|긴급|중대|중단)/i.test(text)) {
    return DeviationSeverity.SEVERE;
  }
  if (/(delay|warning|review|notice|지연|경고|검토)/i.test(text)) {
    return DeviationSeverity.MODERATE;
  }
  return DeviationSeverity.MINOR;
}

function inferOwner(type: DeviationType, text: string): DeviationProcessOwner {
  if (type === DeviationType.CUSTOMER_COMPLAINT || /(sanction|penalty|정지|제재)/i.test(text)) {
    return "회원관리";
  }
  if (/(settlement|payout|정산|출금)/i.test(text)) {
    return "정산";
  }
  return "운영";
}

function getHoursSince(value: string): number {
  const diff = Date.now() - toTimestamp(value);
  if (diff <= 0) return 0;
  return Math.floor(diff / (60 * 60 * 1000));
}

function buildRecommendedAction(
  status: DeviationStatus,
  type: DeviationType,
  severity: DeviationSeverity,
  overdueHours: number,
): string {
  if (status === DeviationStatus.OPEN) {
    if (severity === DeviationSeverity.CRITICAL || severity === DeviationSeverity.SEVERE) {
      return "즉시 조사 시작 후 담당자 배정";
    }
    if (overdueHours >= 24) {
      return "지연 원인 확인 및 차주/화주 양측 통지";
    }
    return "운영 담당자 확인 후 조사 전환";
  }

  if (status === DeviationStatus.INVESTIGATING) {
    if (type === DeviationType.CUSTOMER_COMPLAINT) {
      return "회원관리팀 확인 후 제재 로그와 연동";
    }
    return "증빙 확인 후 해결 또는 기각 처리";
  }

  if (status === DeviationStatus.RESOLVED) {
    return "처리 결과를 이력에 보존";
  }

  return "기각 사유를 기록하고 재발 여부 모니터링";
}

function mapAdminDeviation(raw: unknown): Deviation {
  const row = toRecord(raw);
  const detectedAt = toIsoDate(row.detectedAt ?? row.createdAt ?? row.reportedAt, nowIso());
  const updatedAt = toIsoDate(row.updatedAt ?? row.resolvedAt, detectedAt);
  const status = normalizeDeviationStatus(toStringValue(row.status, ""));
  const type = normalizeDeviationType(toStringValue(row.type, ""));
  const severity = normalizeDeviationSeverity(toStringValue(row.severity, ""));
  const source = normalizeDeviationSource(toStringValue(row.source, "ADMIN"));
  const text = `${toStringValue(row.title)} ${toStringValue(row.description)} ${toStringValue(row.reason)}`;
  const owner = inferOwner(type, text);
  const overdueHours = getHoursSince(detectedAt);

  return {
    id: toStringValue(row.id ?? row.deviationId ?? row.caseId, `admin-${Date.now()}`),
    caseNo: toStringValue(row.caseNo, `DV-${String(Date.now()).slice(-8)}`),
    type,
    severity,
    status,
    source,
    sourceRef: toStringValue(row.sourceRef ?? row.referenceId, "관리 집계"),
    driverId: toStringValue(row.driverId, "-"),
    driverName: toStringValue(row.driverName, "-"),
    orderId: toStringValue(row.orderId ?? row.matchId, "-"),
    quoteId: toStringValue(row.quoteId, "") || undefined,
    description: toStringValue(row.description ?? row.reason, "이상 징후 신호"),
    evidence: toStringValue(row.evidence, "") || undefined,
    processOwner: owner,
    recommendedAction: buildRecommendedAction(status, type, severity, overdueHours),
    unreadSignal: status === DeviationStatus.OPEN || status === DeviationStatus.INVESTIGATING,
    detectedAt,
    updatedAt,
    resolvedAt: toStringValue(row.resolvedAt, "") || undefined,
    overdueHours,
    syncMode: "REMOTE",
    notificationId: toNumberValue(row.notificationId) ?? undefined,
    matchId: toNumberValue(row.matchId) ?? undefined,
  };
}

function mapNotificationDeviation(row: BackendNotification): Deviation {
  const text = `${row.type ?? ""} ${row.message}`;
  const type = inferDeviationType(text);
  const severity = inferDeviationSeverity(text);
  const status = row.isRead ? DeviationStatus.RESOLVED : DeviationStatus.OPEN;
  const detectedAt = row.createdAt ? toIsoDate(row.createdAt, nowIso()) : nowIso();
  const overdueHours = getHoursSince(detectedAt);

  return {
    id: `ntf-${row.notificationId}`,
    caseNo: `DV-N${String(row.notificationId).padStart(6, "0")}`,
    type,
    severity,
    status,
    source: DeviationSource.NOTIFICATION,
    sourceRef: `알림#${row.notificationId}`,
    driverId: row.matchId ? `driver-match-${row.matchId}` : "-",
    driverName: row.matchId ? `기사#${row.matchId}` : "-",
    orderId: row.matchId ? `M-${row.matchId}` : "-",
    description: row.message || row.type || "알림 기반 이상 징후",
    evidence: row.type ?? undefined,
    processOwner: inferOwner(type, text),
    recommendedAction: buildRecommendedAction(status, type, severity, overdueHours),
    unreadSignal: !row.isRead,
    detectedAt,
    updatedAt: detectedAt,
    resolvedAt: row.isRead ? detectedAt : undefined,
    overdueHours,
    syncMode: "REMOTE",
    notificationId: row.notificationId,
    matchId: row.matchId ?? undefined,
  };
}

function mapAnnouncementDeviation(row: BackendAnnouncement): Deviation {
  const text = `${row.title} ${row.content}`;
  const type = inferDeviationType(text);
  const severity = inferDeviationSeverity(text);
  const detectedAt = row.publishedAt
    ? toIsoDate(row.publishedAt, nowIso())
    : row.createdAt
      ? toIsoDate(row.createdAt, nowIso())
      : nowIso();
  const overdueHours = getHoursSince(detectedAt);

  return {
    id: `ann-${row.announcementId}`,
    caseNo: `DV-A${String(row.announcementId).padStart(6, "0")}`,
    type,
    severity,
    status: DeviationStatus.INVESTIGATING,
    source: DeviationSource.ANNOUNCEMENT,
    sourceRef: `공지#${row.announcementId}`,
    driverId: "-",
    driverName: "-",
    orderId: "-",
    description: row.title,
    evidence: "ANNOUNCEMENT",
    processOwner: inferOwner(type, text),
    recommendedAction: buildRecommendedAction(DeviationStatus.INVESTIGATING, type, severity, overdueHours),
    unreadSignal: true,
    detectedAt,
    updatedAt: detectedAt,
    overdueHours,
    syncMode: "REMOTE",
  };
}

function mapMatchDeviation(row: BackendMatch): Deviation | null {
  if (typeof row.matchId !== "number") return null;

  const status = normalizeMatchStatus(row.status);
  const createdAt = row.createdAt ? toIsoDate(row.createdAt, nowIso()) : nowIso();
  const acceptedAt = row.acceptedAt ? toIsoDate(row.acceptedAt, createdAt) : undefined;
  const updatedAt = row.updatedAt ? toIsoDate(row.updatedAt, acceptedAt ?? createdAt) : acceptedAt ?? createdAt;
  const readyHours = getHoursSince(createdAt);
  const transitHours = getHoursSince(acceptedAt ?? updatedAt);

  let type: DeviationType;
  let severity: DeviationSeverity;
  let deviationStatus: DeviationStatus;
  let detectedAt: string;
  let description: string;

  if (status === "CANCELLED") {
    type = DeviationType.CUSTOMER_COMPLAINT;
    severity = DeviationSeverity.SEVERE;
    deviationStatus = DeviationStatus.OPEN;
    detectedAt = updatedAt;
    description = "매칭 취소가 발생하여 운영 검토가 필요합니다.";
  } else if (status === "IN_TRANSIT" && transitHours >= 12) {
    type = DeviationType.ROUTE_DEVIATION;
    severity = transitHours >= 24 ? DeviationSeverity.SEVERE : DeviationSeverity.MODERATE;
    deviationStatus = DeviationStatus.INVESTIGATING;
    detectedAt = acceptedAt ?? createdAt;
    description = "운송 중 상태가 장시간 유지되어 경로/지연 확인이 필요합니다.";
  } else if (status === "READY" && readyHours >= 2) {
    type = DeviationType.LATE_DELIVERY;
    severity = readyHours >= 6 ? DeviationSeverity.MODERATE : DeviationSeverity.MINOR;
    deviationStatus = DeviationStatus.OPEN;
    detectedAt = createdAt;
    description = "배차 대기 시간이 길어져 처리 지연 위험이 있습니다.";
  } else {
    return null;
  }

  const overdueHours = getHoursSince(detectedAt);

  return {
    id: `match-${row.matchId}`,
    caseNo: `DV-M${String(row.matchId).padStart(6, "0")}`,
    type,
    severity,
    status: deviationStatus,
    source: DeviationSource.MATCH,
    sourceRef: `매칭#${row.matchId}`,
    driverId: typeof row.driverId === "number" ? String(row.driverId) : "-",
    driverName: typeof row.driverId === "number" ? `기사#${row.driverId}` : "미배정",
    orderId: `M-${row.matchId}`,
    quoteId: typeof row.quoteId === "number" ? `Q-${row.quoteId}` : undefined,
    description,
    evidence: row.accepted ? "MATCH_ACCEPTED" : "MATCH_PENDING",
    processOwner: inferOwner(type, description),
    recommendedAction: buildRecommendedAction(deviationStatus, type, severity, overdueHours),
    unreadSignal: true,
    detectedAt,
    updatedAt,
    overdueHours,
    syncMode: "REMOTE",
    matchId: row.matchId,
  };
}

function mergeDeviationRows(items: Deviation[]): Deviation[] {
  const merged = new Map<string, Deviation>();

  for (const row of items) {
    const current = merged.get(row.id);

    if (!current) {
      merged.set(row.id, row);
      continue;
    }

    const primary =
      SOURCE_PRIORITY[row.source] >= SOURCE_PRIORITY[current.source] ? row : current;
    const secondary = primary === row ? current : row;
    const latest = toTimestamp(row.updatedAt) >= toTimestamp(current.updatedAt) ? row : current;

    merged.set(row.id, {
      ...secondary,
      ...primary,
      status: latest.status,
      updatedAt: latest.updatedAt,
      resolvedAt: latest.resolvedAt ?? primary.resolvedAt ?? secondary.resolvedAt,
      unreadSignal: primary.unreadSignal || secondary.unreadSignal,
      description: primary.description.length >= secondary.description.length ? primary.description : secondary.description,
      recommendedAction: primary.recommendedAction,
      syncMode:
        primary.syncMode === "LOCAL_SESSION" || secondary.syncMode === "LOCAL_SESSION"
          ? "LOCAL_SESSION"
          : "REMOTE",
    });
  }

  return Array.from(merged.values()).sort((a, b) => toTimestamp(b.detectedAt) - toTimestamp(a.detectedAt));
}

function applyActionOverrides(items: Deviation[]): Deviation[] {
  return items.map((item) => {
    const override = liveActionOverrides.get(item.id);
    if (!override) return item;

    return {
      ...item,
      status: override.status,
      updatedAt: override.updatedAt,
      resolvedAt: override.resolvedAt,
      unreadSignal: false,
      recommendedAction: buildRecommendedAction(
        override.status,
        item.type,
        item.severity,
        item.overdueHours,
      ),
      syncMode: override.syncMode,
    };
  });
}

function applyFilters(items: Deviation[], filter: DeviationFilter): Deviation[] {
  const keyword = filter.search?.trim().toLowerCase() ?? "";

  return items.filter((item) => {
    if (filter.severity && item.severity !== filter.severity) return false;
    if (filter.type && item.type !== filter.type) return false;
    if (filter.status && item.status !== filter.status) return false;
    if (filter.source && item.source !== filter.source) return false;
    if (filter.overdueOnly && item.overdueHours < 24) return false;

    if (keyword) {
      const text = [
        item.caseNo,
        item.driverName,
        item.orderId,
        item.quoteId ?? "",
        item.description,
        item.sourceRef,
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

function buildSummary(items: Deviation[]): DeviationSummary {
  const total = items.length;
  const resolved = items.filter((item) => item.status === DeviationStatus.RESOLVED).length;

  return {
    critical: items.filter((item) => item.severity === DeviationSeverity.CRITICAL || item.severity === DeviationSeverity.SEVERE).length,
    open: items.filter((item) => item.status === DeviationStatus.OPEN).length,
    investigating: items.filter((item) => item.status === DeviationStatus.INVESTIGATING).length,
    overdue: items.filter(
      (item) =>
        item.overdueHours >= 24 &&
        (item.status === DeviationStatus.OPEN || item.status === DeviationStatus.INVESTIGATING),
    ).length,
    resolvedRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
    bySource: {
      [DeviationSource.ADMIN]: items.filter((item) => item.source === DeviationSource.ADMIN).length,
      [DeviationSource.MATCH]: items.filter((item) => item.source === DeviationSource.MATCH).length,
      [DeviationSource.NOTIFICATION]: items.filter((item) => item.source === DeviationSource.NOTIFICATION).length,
      [DeviationSource.ANNOUNCEMENT]: items.filter((item) => item.source === DeviationSource.ANNOUNCEMENT).length,
    },
  };
}

function isRelevantNotification(row: BackendNotification): boolean {
  const text = `${row.type ?? ""} ${row.message}`;
  return /(match|cancel|delay|deviation|warning|violation|complaint|매칭|취소|지연|경고|민원)/i.test(text);
}

function isRelevantAnnouncement(row: BackendAnnouncement): boolean {
  return /(deviation|sanction|penalty|warning|suspend|이상|제재|경고|정지)/i.test(`${row.title} ${row.content}`);
}

function mapBackendMatch(raw: unknown): BackendMatch {
  const row = toRecord(raw);

  return {
    matchId: toNumberValue(row.matchId ?? row.id),
    quoteId: toNumberValue(row.quoteId),
    driverId: toNumberValue(row.driverId),
    accepted: toBooleanValue(row.accepted),
    status: toStringValue(row.status, "READY"),
    acceptedAt: toStringValue(row.acceptedAt, "") || null,
    createdAt: toStringValue(row.createdAt, "") || null,
    updatedAt: toStringValue(row.updatedAt, "") || null,
  };
}

function mergeMatchSnapshots(rows: BackendMatch[]): BackendMatch[] {
  const merged = new Map<number, BackendMatch>();

  for (const row of rows) {
    if (typeof row.matchId !== "number") continue;
    const current = merged.get(row.matchId);
    if (!current) {
      merged.set(row.matchId, row);
      continue;
    }

    const latest =
      toTimestamp(row.updatedAt ?? row.createdAt ?? nowIso()) >=
      toTimestamp(current.updatedAt ?? current.createdAt ?? nowIso())
        ? row
        : current;

    merged.set(row.matchId, {
      ...current,
      ...row,
      status: latest.status,
      updatedAt: latest.updatedAt,
      acceptedAt: latest.acceptedAt ?? current.acceptedAt ?? row.acceptedAt,
      createdAt: current.createdAt ?? row.createdAt,
    });
  }

  return Array.from(merged.values());
}

async function fetchAdminDeviationRows(): Promise<Deviation[]> {
  if (apiCapabilities.useDerivedAdminData) {
    return [];
  }

  try {
    const response = await apiClient.get<unknown>(apiPaths.adminDeviations);
    return pickListPayload(response.data).map(mapAdminDeviation);
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

async function fetchAnnouncements(): Promise<BackendAnnouncement[]> {
  if (!apiCapabilities.useDerivedAdminData) {
    try {
      const response = await apiClient.get<BackendAnnouncement[]>(apiPaths.adminAnnouncements);
      if (Array.isArray(response.data)) return response.data;
    } catch {
      // fallback
    }
  }

  try {
    const response = await apiClient.get<BackendAnnouncement[]>(apiPaths.publicAnnouncements);
    return Array.isArray(response.data) ? response.data : [];
  } catch {
    return [];
  }
}

function resolveDriverMyPath(): string {
  const base = apiPaths.driverMatches.replace(/\/$/, "");
  return `${base}/me`;
}

async function fetchMatchesByPath(path: string): Promise<BackendMatch[]> {
  try {
    const response = await apiClient.get<unknown>(path);
    return pickListPayload(response.data).map(mapBackendMatch);
  } catch {
    return [];
  }
}

async function fetchMatchSignals(): Promise<BackendMatch[]> {
  const [shipperRows, driverOpenRows, driverRows] = await Promise.all([
    fetchMatchesByPath(apiPaths.shipperMatchesMe),
    fetchMatchesByPath(apiPaths.driverMatches),
    fetchMatchesByPath(resolveDriverMyPath()),
  ]);

  return mergeMatchSnapshots([...shipperRows, ...driverOpenRows, ...driverRows]);
}

async function fetchLiveRows(): Promise<Deviation[]> {
  const [adminRows, notifications, announcements, matches] = await Promise.all([
    fetchAdminDeviationRows(),
    fetchNotifications(),
    fetchAnnouncements(),
    fetchMatchSignals(),
  ]);

  const notificationRows = notifications
    .filter(isRelevantNotification)
    .map(mapNotificationDeviation);
  const announcementRows = announcements
    .filter(isRelevantAnnouncement)
    .map(mapAnnouncementDeviation);
  const matchRows = matches
    .map(mapMatchDeviation)
    .filter((row): row is Deviation => row !== null);

  return applyActionOverrides(mergeDeviationRows([...adminRows, ...notificationRows, ...announcementRows, ...matchRows]));
}

function buildMockRows(count: number): Deviation[] {
  const types = [
    DeviationType.LATE_DELIVERY,
    DeviationType.ROUTE_DEVIATION,
    DeviationType.VEHICLE_CONDITION,
    DeviationType.SAFETY_VIOLATION,
    DeviationType.CUSTOMER_COMPLAINT,
  ];

  const severities = [
    DeviationSeverity.CRITICAL,
    DeviationSeverity.SEVERE,
    DeviationSeverity.MODERATE,
    DeviationSeverity.MINOR,
  ];

  const statuses = [
    DeviationStatus.OPEN,
    DeviationStatus.INVESTIGATING,
    DeviationStatus.RESOLVED,
    DeviationStatus.DISMISSED,
  ];

  const sources = [
    DeviationSource.MATCH,
    DeviationSource.NOTIFICATION,
    DeviationSource.ANNOUNCEMENT,
    DeviationSource.ADMIN,
  ];

  return Array.from({ length: count }, (_, index) => {
    const type = types[index % types.length];
    const severity = severities[index % severities.length];
    const status = statuses[index % statuses.length];
    const source = sources[index % sources.length];
    const detectedAt = new Date(Date.now() - (index + 2) * 60 * 60 * 1000).toISOString();
    const overdueHours = getHoursSince(detectedAt);

    return {
      id: `mock-${index + 1}`,
      caseNo: `DV-M${String(index + 1).padStart(6, "0")}`,
      type,
      severity,
      status,
      source,
      sourceRef: source === DeviationSource.MATCH ? `매칭#${6000 + index}` : `신호#${1000 + index}`,
      driverId: `driver-${(index % 24) + 1}`,
      driverName: `기사 ${(index % 24) + 1}`,
      orderId: `M-${6100 + index}`,
      quoteId: `Q-${7900 + index}`,
      description: "관리자가 확인할 수 있도록 표준 프로세스 기반으로 생성된 목업 이상 징후입니다.",
      evidence: index % 2 === 0 ? "GPS_LOG" : undefined,
      processOwner: index % 3 === 0 ? "회원관리" : "운영",
      recommendedAction: buildRecommendedAction(status, type, severity, overdueHours),
      unreadSignal: status === DeviationStatus.OPEN || status === DeviationStatus.INVESTIGATING,
      detectedAt,
      updatedAt: detectedAt,
      resolvedAt: status === DeviationStatus.RESOLVED || status === DeviationStatus.DISMISSED ? detectedAt : undefined,
      overdueHours,
      syncMode: "REMOTE",
      matchId: 6100 + index,
    };
  });
}

const MOCK_ROWS = buildMockRows(80);

function mapActionToStatus(action: DeviationAction["action"]): DeviationStatus {
  if (action === "START_INVESTIGATION") return DeviationStatus.INVESTIGATING;
  if (action === "RESOLVE") return DeviationStatus.RESOLVED;
  return DeviationStatus.DISMISSED;
}

async function tryExecuteAdminAction(action: DeviationAction): Promise<boolean> {
  if (apiCapabilities.useDerivedAdminData) {
    return false;
  }

  try {
    await apiClient.post(`${apiPaths.adminDeviations}/${action.caseId}/actions`, action);
    return true;
  } catch {
    return false;
  }
}

function extractNotificationId(caseId: string): number | null {
  const match = /^ntf-(\d+)$/i.exec(caseId.trim());
  if (!match) return null;
  return Number(match[1]);
}

async function tryMarkNotificationRead(caseId: string): Promise<boolean> {
  const notificationId = extractNotificationId(caseId);
  if (!notificationId) return false;

  try {
    await apiClient.patch(`/api/notifications/${notificationId}/read`);
    return true;
  } catch {
    return false;
  }
}

export async function fetchDeviations(filter: DeviationFilter = {}): Promise<DeviationResponse> {
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

export async function fetchDeviation(caseId: string): Promise<Deviation | null> {
  const rows = await fetchDeviations({ search: caseId, page: 1, size: 300 });
  return rows.items.find((item) => item.id === caseId || item.caseNo === caseId) ?? null;
}

export async function executeDeviationAction(action: DeviationAction): Promise<DeviationActionResult> {
  if (!action.caseId.trim()) {
    return { success: false, mode: "LOCAL_SESSION", message: "사건 ID가 필요합니다." };
  }

  const nextStatus = mapActionToStatus(action.action);
  const updatedAt = nowIso();
  const resolvedAt =
    nextStatus === DeviationStatus.RESOLVED || nextStatus === DeviationStatus.DISMISSED ? updatedAt : undefined;

  if (isMockModeEnabled()) {
    const target = MOCK_ROWS.find((item) => item.id === action.caseId || item.caseNo === action.caseId);
    if (target) {
      target.status = nextStatus;
      target.updatedAt = updatedAt;
      target.resolvedAt = resolvedAt;
      target.syncMode = "REMOTE";
      target.unreadSignal = false;
      target.recommendedAction = buildRecommendedAction(
        nextStatus,
        target.type,
        target.severity,
        target.overdueHours,
      );
    }
    return { success: true, mode: "REMOTE" };
  }

  let remoteApplied = await tryExecuteAdminAction(action);

  if (!remoteApplied && (action.action === "RESOLVE" || action.action === "DISMISS")) {
    remoteApplied = await tryMarkNotificationRead(action.caseId);
  }

  liveActionOverrides.set(action.caseId, {
    status: nextStatus,
    updatedAt,
    resolvedAt,
    syncMode: remoteApplied ? "REMOTE" : "LOCAL_SESSION",
  });

  if (remoteApplied) {
    return { success: true, mode: "REMOTE" };
  }

  return {
    success: true,
    mode: "LOCAL_SESSION",
    message: "서버 조치 API가 확인되지 않아 현재 세션 화면 기준으로 상태를 반영했습니다.",
  };
}

export async function fetchDeviationStats(): Promise<{
  critical: number;
  open: number;
  investigating: number;
  total: number;
}> {
  const rows = await fetchDeviations({ page: 1, size: 500 });

  return {
    critical: rows.summary.critical,
    open: rows.summary.open,
    investigating: rows.summary.investigating,
    total: rows.total,
  };
}
