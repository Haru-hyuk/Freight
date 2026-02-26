import { apiClient } from "@/shared/lib/api/client";
import { apiPaths } from "@/shared/lib/api/endpoints";
import type {
  DashboardResponse,
  DeviationFeedItem,
  DeviationSeverity,
  KpiData,
  TimeRange,
} from "../model/types";

type BackendQuote = {
  quoteId: number | null;
  status: string | null;
  createdAt: string | null;
};

type BackendMatch = {
  matchId: number | null;
  status: string | null;
  createdAt: string | null;
  acceptedAt: string | null;
};

type BackendSettlement = {
  settlementId: number | null;
  totalFare: number | null;
  platformFee: number | null;
  settlementStatus: string | null;
  createdAt: string | null;
};

type BackendNotification = {
  notificationId: number;
  matchId: number | null;
  type: string | null;
  message: string;
  isRead: boolean;
  createdAt: string | null;
};

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
  if (typeof value === "string") {
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

function mapQuote(raw: unknown): BackendQuote {
  const row = toRecord(raw);
  return {
    quoteId: toNumberValue(row.quoteId ?? row.id),
    status: toStringValue(row.status, "") || null,
    createdAt: toStringValue(row.createdAt, "") || null,
  };
}

function mapMatch(raw: unknown): BackendMatch {
  const row = toRecord(raw);
  return {
    matchId: toNumberValue(row.matchId ?? row.id),
    status: toStringValue(row.status, "") || null,
    createdAt: toStringValue(row.createdAt, "") || null,
    acceptedAt: toStringValue(row.acceptedAt, "") || null,
  };
}

function mapSettlement(raw: unknown): BackendSettlement {
  const row = toRecord(raw);
  return {
    settlementId: toNumberValue(row.settlementId ?? row.id),
    totalFare: toNumberValue(row.totalFare),
    platformFee: toNumberValue(row.platformFee),
    settlementStatus: toStringValue(row.settlementStatus, "") || null,
    createdAt: toStringValue(row.createdAt, "") || null,
  };
}

function mapNotification(raw: unknown): BackendNotification | null {
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

function toTimestamp(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function rangeStart(range: TimeRange): number {
  const now = new Date();
  if (range === "today") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  }
  if (range === "week") {
    return now.getTime() - 7 * 24 * 60 * 60 * 1000;
  }
  return now.getTime() - 30 * 24 * 60 * 60 * 1000;
}

function inRange(value: string | null | undefined, range: TimeRange): boolean {
  const ts = toTimestamp(value);
  return ts >= rangeStart(range);
}

function mapSeverity(text: string): DeviationSeverity {
  if (/(critical|severe|suspend|violation|error|cancel)/i.test(text)) return "SEVERE";
  if (/(delay|late|warning|review|pending)/i.test(text)) return "MODERATE";
  return "MINOR";
}

function buildDeviationRows(notifications: BackendNotification[]): DeviationFeedItem[] {
  return notifications
    .filter((row) => /(delay|late|deviation|warning|violation|cancel|complaint)/i.test(`${row.type ?? ""} ${row.message}`))
    .map((row) => {
      const sourceText = `${row.type ?? ""} ${row.message}`;
      const severity = mapSeverity(sourceText);
      return {
        deviationId: `NTF-${row.notificationId}`,
        matchId: row.matchId ? `M-${row.matchId}` : "-",
        severity,
        deviationPercent: severity === "SEVERE" ? 25 : severity === "MODERATE" ? 12 : 4,
        adjusted: row.isRead,
        createdAt: row.createdAt ?? new Date().toISOString(),
        quoteSummary: row.message || row.type || "Notification signal",
        driverName: "-",
      };
    })
    .sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt));
}

function normalizeMatchStatus(value: string | null): "READY" | "IN_TRANSIT" | "COMPLETED" | "CANCELLED" {
  const status = (value ?? "").trim().toUpperCase();
  if (status === "IN_TRANSIT" || status === "TRANSIT" || status === "MOVING") return "IN_TRANSIT";
  if (status === "COMPLETED" || status === "DONE" || status === "DELIVERED") return "COMPLETED";
  if (status === "CANCELLED" || status === "CANCELED" || status === "CANCEL") return "CANCELLED";
  return "READY";
}

function averageAcceptanceMinutes(matches: BackendMatch[]): number {
  const values = matches
    .map((row) => {
      const createdAt = toTimestamp(row.createdAt);
      const acceptedAt = toTimestamp(row.acceptedAt);
      if (createdAt <= 0 || acceptedAt <= 0 || acceptedAt < createdAt) return null;
      return Math.round((acceptedAt - createdAt) / 60000);
    })
    .filter((value): value is number => typeof value === "number");

  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

async function fetchQuotes(): Promise<BackendQuote[]> {
  try {
    const response = await apiClient.get<unknown>(apiPaths.shipperQuotes);
    return pickListPayload(response.data).map(mapQuote);
  } catch {
    return [];
  }
}

async function fetchMatches(): Promise<BackendMatch[]> {
  const driverMyPath = `${apiPaths.driverMatches.replace(/\/$/, "")}/me`;
  const [shipperRows, driverOpenRows, driverRows] = await Promise.all([
    apiClient.get<unknown>(apiPaths.shipperMatchesMe).then((res) => pickListPayload(res.data).map(mapMatch)).catch(() => []),
    apiClient.get<unknown>(apiPaths.driverMatches).then((res) => pickListPayload(res.data).map(mapMatch)).catch(() => []),
    apiClient.get<unknown>(driverMyPath).then((res) => pickListPayload(res.data).map(mapMatch)).catch(() => []),
  ]);

  const merged = new Map<number, BackendMatch>();
  for (const row of [...shipperRows, ...driverOpenRows, ...driverRows]) {
    if (typeof row.matchId !== "number") continue;
    merged.set(row.matchId, row);
  }
  return Array.from(merged.values());
}

function resolveSettlementMePath(basePath: string): string {
  const base = basePath.replace(/\/$/, "");
  return base.endsWith("/me") ? base : `${base}/me`;
}

async function fetchSettlements(): Promise<BackendSettlement[]> {
  const [shipperRows, driverRows] = await Promise.all([
    apiClient
      .get<unknown>(resolveSettlementMePath(apiPaths.shipperSettlements))
      .then((res) => pickListPayload(res.data).map(mapSettlement))
      .catch(() => []),
    apiClient
      .get<unknown>(resolveSettlementMePath(apiPaths.driverSettlements))
      .then((res) => pickListPayload(res.data).map(mapSettlement))
      .catch(() => []),
  ]);

  const merged = new Map<number, BackendSettlement>();
  for (const row of [...shipperRows, ...driverRows]) {
    if (typeof row.settlementId === "number") merged.set(row.settlementId, row);
  }
  return Array.from(merged.values());
}

async function fetchNotifications(): Promise<BackendNotification[]> {
  try {
    const response = await apiClient.get<unknown>(apiPaths.notificationsMe);
    return pickListPayload(response.data)
      .map(mapNotification)
      .filter((item): item is BackendNotification => item !== null);
  } catch {
    return [];
  }
}

export async function fetchDashboard(range: TimeRange): Promise<DashboardResponse> {
  const [quotes, matches, settlements, notifications] = await Promise.all([
    fetchQuotes(),
    fetchMatches(),
    fetchSettlements(),
    fetchNotifications(),
  ]);

  const rangedQuotes = quotes.filter((row) => inRange(row.createdAt, range));
  const rangedMatches = matches.filter((row) => inRange(row.createdAt, range));
  const rangedSettlements = settlements.filter((row) => inRange(row.createdAt, range));

  const totalMatches = rangedMatches.length;
  const completedMatches = rangedMatches.filter((row) => normalizeMatchStatus(row.status) === "COMPLETED").length;
  const inTransitCount = rangedMatches.filter((row) => normalizeMatchStatus(row.status) === "IN_TRANSIT").length;
  const canceledQuotes = rangedQuotes.filter((row) => /(cancel|failed|reject)/i.test(row.status ?? "")).length;

  const gmv = rangedSettlements.reduce((sum, row) => sum + (row.totalFare ?? 0), 0);
  const platformRevenue = rangedSettlements.reduce((sum, row) => sum + (row.platformFee ?? 0), 0);
  const unsettledAmount = rangedSettlements
    .filter((row) => (row.settlementStatus ?? "").toUpperCase() !== "COMPLETED")
    .reduce((sum, row) => sum + (row.totalFare ?? 0), 0);

  const kpi: KpiData = {
    todayOrders: range === "today" ? rangedQuotes.length : undefined,
    weeklyOrders: range === "week" ? rangedQuotes.length : undefined,
    dispatchCompletionRate: totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0,
    avgDispatchMinutes: averageAcceptanceMinutes(rangedMatches),
    inTransitCount,
    canceledQuotes,
    gmv,
    platformRevenue,
    unsettledAmount,
  };

  return {
    range,
    kpi,
    deviations: buildDeviationRows(notifications),
  };
}
