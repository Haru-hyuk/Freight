import { BACKEND_STATUS, type BackendStatus } from "./types";

// Quote.status SSOT 매핑 (우선순위 최상단)
const QUOTE_STATUS_ALIAS: Readonly<Record<string, BackendStatus>> = {
  OPEN: BACKEND_STATUS.OPEN,
  MATCHED: BACKEND_STATUS.MATCHED,
  IN_TRANSIT: BACKEND_STATUS.IN_TRANSIT,
  DELIVERED: BACKEND_STATUS.DELIVERED,
  CANCELLED: BACKEND_STATUS.CANCELLED,
  CANCELED: BACKEND_STATUS.CANCELLED,
};

// Match.status fallback 매핑
const MATCH_STATUS_ALIAS: Readonly<Record<string, BackendStatus>> = {
  READY: BACKEND_STATUS.READY,
  IN_TRANSIT: BACKEND_STATUS.IN_TRANSIT,
  COMPLETED: BACKEND_STATUS.COMPLETED,
  CANCELLED: BACKEND_STATUS.CANCELLED,
  CANCELED: BACKEND_STATUS.CANCELLED,
};

const LEGACY_STATUS_ALIAS: Readonly<Record<string, BackendStatus>> = {
  ACCEPTED: BACKEND_STATUS.MATCHED,
  ASSIGNED: BACKEND_STATUS.MATCHED,
  TRANSIT: BACKEND_STATUS.IN_TRANSIT,
  DROPOFF: BACKEND_STATUS.DELIVERED,
};

function toStatusToken(rawStatus: string | null | undefined): string {
  return String(rawStatus ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
}

export function normalizeStatus(rawStatus: string | null | undefined): BackendStatus {
  const token = toStatusToken(rawStatus);
  if (!token) return BACKEND_STATUS.UNKNOWN;
  return (
    QUOTE_STATUS_ALIAS[token] ??
    MATCH_STATUS_ALIAS[token] ??
    LEGACY_STATUS_ALIAS[token] ??
    BACKEND_STATUS.UNKNOWN
  );
}

const TERMINAL_STATUS_SET: ReadonlySet<BackendStatus> = new Set<BackendStatus>([
  BACKEND_STATUS.DELIVERED,
  BACKEND_STATUS.COMPLETED,
  BACKEND_STATUS.CANCELLED,
]);

export function isTerminalBackendStatus(status: BackendStatus): boolean {
  return TERMINAL_STATUS_SET.has(status);
}
