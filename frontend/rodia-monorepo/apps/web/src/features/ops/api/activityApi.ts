import type { AdminActivityAction, AdminActivityLog } from "@/shared/lib/activity-log";
import { apiClient } from "@/shared/lib/api/client";
import { apiPaths } from "@/shared/lib/api/endpoints";
import { isMockModeEnabled } from "@/shared/lib/mock-mode";

type BackendActivityPayload = {
  items?: unknown[];
  total?: number;
};

const LEGACY_ACTIVITY_LOGS_PATH = "/api/admin/ops/activity-logs";

function normalizeApiPath(path: string): string {
  return path.replace(/\/+$/, "");
}

function shouldCallLegacyActivityLogs(): boolean {
  return normalizeApiPath(apiPaths.adminActivityLogs) !== normalizeApiPath(LEGACY_ACTIVITY_LOGS_PATH);
}

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

function pickListPayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const row = toRecord(payload);
  const candidates = [row.items, row.data, row.content, row.list, row.result, row.rows];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

function toAction(value: string): AdminActivityAction {
  const text = value.toLowerCase();

  if (text.includes("quote") && text.includes("update")) return "QUOTE_UPDATED";
  if (text.includes("quote") && text.includes("notification")) return "QUOTE_NOTIFICATION_SENT";

  if (
    text.includes("sanction") ||
    text.includes("penalty") ||
    text.includes("warning") ||
    text.includes("suspend") ||
    text.includes("fine")
  ) {
    return "SANCTION_CREATED";
  }
  if (text.includes("deviation") || text.includes("anomaly")) return "DEVIATION_ACTIONED";

  if (text.includes("pricing") && text.includes("update")) return "PRICING_UPDATED";
  if (text.includes("pricing") && text.includes("notification")) return "PRICING_NOTIFICATION_SENT";

  if (text.includes("dispatch") || text.includes("assign")) return "DISPATCH_ASSIGNED";
  if (text.includes("driver") && text.includes("approval")) return "DRIVER_APPROVAL_REVIEWED";
  if ((text.includes("truck") || text.includes("vehicle")) && text.includes("approval")) {
    return "TRUCK_APPROVAL_REVIEWED";
  }
  if (text.includes("settlement") || text.includes("payout")) return "SETTLEMENT_REVIEWED";

  return "LIVE_ALERT_SENT";
}

function mapLiveActivity(raw: unknown): AdminActivityLog {
  const row = toRecord(raw);
  const text = `${toStringValue(row.action)} ${toStringValue(row.message)}`;

  return {
    id: toStringValue(row.id ?? row.logId, `REAL-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    action: toAction(text),
    message: toStringValue(row.message ?? row.content, "활동 로그"),
    targetId: toStringValue(row.targetId ?? row.target_id ?? row.resourceId, "") || undefined,
    mode: "REAL",
    createdAt: toStringValue(row.createdAt ?? row.created_at ?? row.timestamp, new Date().toISOString()),
  };
}

function mapNotificationActivity(raw: unknown): AdminActivityLog {
  const row = toRecord(raw);
  const notificationId = toNumberValue(row.notificationId ?? row.notification_id);
  const matchId = toNumberValue(row.matchId ?? row.match_id);
  const type = toStringValue(row.type, "");
  const message = toStringValue(row.message, "");
  const createdAt = toStringValue(row.createdAt ?? row.created_at, new Date().toISOString());
  const text = `${type} ${message}`;

  return {
    id: `NTF-${notificationId ?? Date.now()}`,
    action: toAction(text),
    message: message || type || "알림",
    targetId: matchId ? `M-${matchId}` : undefined,
    mode: "REAL",
    createdAt,
  };
}

export async function fetchRemoteActivityLogs(): Promise<AdminActivityLog[]> {
  if (isMockModeEnabled()) {
    return [];
  }

  if (shouldCallLegacyActivityLogs()) {
    try {
      const response = await apiClient.get<BackendActivityPayload | unknown[]>(apiPaths.adminActivityLogs);
      const items = pickListPayload(response.data);

      return items
        .map(mapLiveActivity)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch {
      // fallback below
    }
  }

  try {
    const response = await apiClient.get<unknown[]>(apiPaths.notificationsMe);
    if (!Array.isArray(response.data)) return [];

    return response.data
      .map(mapNotificationActivity)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch {
    return [];
  }
}

