import type { AdminActivityAction, AdminActivityLog } from "@/shared/lib/activity-log";
import { apiCapabilities, apiPaths } from "@/shared/lib/api/endpoints";
import { apiClient } from "@/shared/lib/api/client";
import { isMockModeEnabled } from "@/shared/lib/mock-mode";

type BackendActivityPayload = {
  items?: unknown[];
  total?: number;
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

function toStringValue(value: unknown, fallback: string = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function toAction(value: string): AdminActivityAction {
  if (/(quote|견적).*(update|수정)|(update|수정).*(quote|견적)/i.test(value)) return "QUOTE_UPDATED";
  if (/(quote|견적).*(notification|알림)|(notification|알림).*(quote|견적)/i.test(value)) return "QUOTE_NOTIFICATION_SENT";
  if (/(pricing|요율).*(update|수정)|(update|수정).*(pricing|요율)/i.test(value)) return "PRICING_UPDATED";
  if (/(pricing|요율).*(notification|알림)|(notification|알림).*(pricing|요율)/i.test(value)) return "PRICING_NOTIFICATION_SENT";
  if (/(dispatch|assign|배차|배정)/i.test(value)) return "DISPATCH_ASSIGNED";
  if (/(driver|차주).*(approval|승인)/i.test(value)) return "DRIVER_APPROVAL_REVIEWED";
  if (/(truck|vehicle|차량).*(approval|승인)/i.test(value)) return "TRUCK_APPROVAL_REVIEWED";
  if (/(settlement|payout|정산)/i.test(value)) return "SETTLEMENT_REVIEWED";
  return "LIVE_ALERT_SENT";
}

function mapLiveActivity(raw: unknown): AdminActivityLog {
  const row = toRecord(raw);
  const text = `${toStringValue(row.action)} ${toStringValue(row.message)}`;

  return {
    id: toStringValue(row.id ?? row.logId, `REAL-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    action: toAction(text),
    message: toStringValue(row.message ?? row.content, "활동 로그"),
    targetId: toStringValue(row.targetId ?? row.resourceId, "") || undefined,
    mode: "REAL",
    createdAt: toStringValue(row.createdAt ?? row.timestamp, new Date().toISOString()),
  };
}

function mapNotificationActivity(row: BackendNotification): AdminActivityLog {
  const text = `${row.type ?? ""} ${row.message}`;

  return {
    id: `NTF-${row.notificationId}`,
    action: toAction(text),
    message: row.message || row.type || "알림",
    targetId: row.matchId ? `M-${row.matchId}` : undefined,
    mode: "REAL",
    createdAt: row.createdAt ?? new Date().toISOString(),
  };
}

export async function fetchRemoteActivityLogs(): Promise<AdminActivityLog[]> {
  if (isMockModeEnabled()) {
    return [];
  }

  if (!apiCapabilities.useDerivedAdminData) {
    try {
      const response = await apiClient.get<BackendActivityPayload | unknown[]>(apiPaths.adminActivityLogs);
      const payload = response.data;
      const items = Array.isArray(payload) ? payload : Array.isArray(payload.items) ? payload.items : [];
      return items.map(mapLiveActivity);
    } catch {
      // fallback below
    }
  }

  try {
    const response = await apiClient.get<BackendNotification[]>(apiPaths.notificationsMe);
    if (!Array.isArray(response.data)) return [];

    return response.data
      .map(mapNotificationActivity)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch {
    return [];
  }
}
