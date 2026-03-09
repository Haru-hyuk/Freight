export type AdminActivityAction =
  | "QUOTE_UPDATED"
  | "QUOTE_NOTIFICATION_SENT"
  | "PRICING_UPDATED"
  | "PRICING_NOTIFICATION_SENT"
  | "SANCTION_CREATED"
  | "DEVIATION_ACTIONED"
  | "DISPATCH_ASSIGNED"
  | "DRIVER_APPROVAL_REVIEWED"
  | "TRUCK_APPROVAL_REVIEWED"
  | "SETTLEMENT_REVIEWED"
  | "ORDER_CANCELLATION_REVIEWED"
  | "LIVE_ALERT_SENT"
  | "MATCHING_CANCELLED"
  | "ADMIN_LOGOUT";

export type AdminActivityLog = {
  id: string;
  action: AdminActivityAction;
  message: string;
  targetId?: string;
  mode: "MOCK" | "REAL";
  createdAt: string;
};

const ACTIVITY_LOG_KEY = "rodia_admin_activity_logs";
const MAX_LOG_ITEMS = 200;
const EMPTY_LOGS: AdminActivityLog[] = [];
let cachedRawLogs: string | null = null;
let cachedParsedLogs: AdminActivityLog[] = EMPTY_LOGS;
const listeners = new Set<() => void>();

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
  const limited = logs.slice(0, MAX_LOG_ITEMS);
  const raw = JSON.stringify(limited);
  cachedRawLogs = raw;
  cachedParsedLogs = limited;

  if (typeof window !== "undefined") {
    window.localStorage.setItem(ACTIVITY_LOG_KEY, raw);
  }

  listeners.forEach((listener) => listener());
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
  listeners.add(listener);

  if (typeof window === "undefined") {
    return () => {
      listeners.delete(listener);
    };
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== ACTIVITY_LOG_KEY) return;
    cachedRawLogs = null;
    cachedParsedLogs = EMPTY_LOGS;
    listener();
  };

  window.addEventListener("storage", handleStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}
