export type AdminActivityAction =
  | "QUOTE_UPDATED"
  | "QUOTE_NOTIFICATION_SENT"
  | "PRICING_UPDATED"
  | "PRICING_NOTIFICATION_SENT"
  | "DISPATCH_ASSIGNED"
  | "DRIVER_APPROVAL_REVIEWED"
  | "TRUCK_APPROVAL_REVIEWED"
  | "SETTLEMENT_REVIEWED"
  | "ORDER_CANCELLATION_REVIEWED"
  | "LIVE_ALERT_SENT";

export type AdminActivityLog = {
  id: string;
  action: AdminActivityAction;
  message: string;
  targetId?: string;
  mode: "MOCK" | "REAL";
  createdAt: string;
};

const ACTIVITY_LOG_KEY = "rodia_admin_activity_logs";
const ACTIVITY_LOG_EVENT = "rodia:activity-log-changed";
const MAX_LOG_ITEMS = 200;
const EMPTY_LOGS: AdminActivityLog[] = [];
let cachedRawLogs: string | null = null;
let cachedParsedLogs: AdminActivityLog[] = EMPTY_LOGS;

function readLogs(): AdminActivityLog[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(ACTIVITY_LOG_KEY);
  if (!raw) {
    if (cachedRawLogs !== raw) {
      cachedRawLogs = raw;
      cachedParsedLogs = EMPTY_LOGS;
    }
    return cachedParsedLogs;
  }
  if (raw === cachedRawLogs) return cachedParsedLogs;

  try {
    const parsed = JSON.parse(raw) as AdminActivityLog[];
    if (!Array.isArray(parsed)) {
      cachedRawLogs = raw;
      cachedParsedLogs = EMPTY_LOGS;
      return cachedParsedLogs;
    }
    cachedRawLogs = raw;
    cachedParsedLogs = parsed;
    return cachedParsedLogs;
  } catch {
    cachedRawLogs = raw;
    cachedParsedLogs = EMPTY_LOGS;
    return cachedParsedLogs;
  }
}

function writeLogs(logs: AdminActivityLog[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(logs.slice(0, MAX_LOG_ITEMS)));
  window.dispatchEvent(new Event(ACTIVITY_LOG_EVENT));
}

export function getActivityLogs(): AdminActivityLog[] {
  return readLogs();
}

export function appendActivityLog(item: Omit<AdminActivityLog, "id" | "createdAt">): AdminActivityLog {
  const next: AdminActivityLog = {
    ...item,
    id: `AL-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };

  writeLogs([next, ...readLogs()]);
  return next;
}

export function subscribeActivityLogs(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;

  const handleStorage = (event: StorageEvent) => {
    if (event.key === ACTIVITY_LOG_KEY) listener();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(ACTIVITY_LOG_EVENT, listener);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(ACTIVITY_LOG_EVENT, listener);
  };
}
