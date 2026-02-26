import { BACKEND_STATUS, type BackendStatus } from "./types";

const STATUS_ALIAS: Readonly<Record<string, BackendStatus>> = {
  READY: BACKEND_STATUS.READY,
  OPEN: BACKEND_STATUS.OPEN,
  REQUESTED: BACKEND_STATUS.OPEN,
  NEGOTIATING: BACKEND_STATUS.NEGOTIATING,
  NEGOTIATION: BACKEND_STATUS.NEGOTIATING,
  ASSIGNED: BACKEND_STATUS.ASSIGNED,
  ACCEPTED: BACKEND_STATUS.ACCEPTED,
  PICKUP: BACKEND_STATUS.PICKUP,
  PICKUP_IN_PROGRESS: BACKEND_STATUS.PICKUP,
  LOADING: BACKEND_STATUS.PICKUP,
  TRANSIT: BACKEND_STATUS.TRANSIT,
  IN_TRANSIT: BACKEND_STATUS.TRANSIT,
  DRIVING: BACKEND_STATUS.TRANSIT,
  DROPOFF: BACKEND_STATUS.DROPOFF,
  DROPPED_OFF: BACKEND_STATUS.DROPOFF,
  COMPLETED: BACKEND_STATUS.DROPOFF,
  DELIVERED: BACKEND_STATUS.DROPOFF,
  CANCELED: BACKEND_STATUS.CANCELED,
  CANCELLED: BACKEND_STATUS.CANCELED,
  CANCELED_BY_USER: BACKEND_STATUS.CANCELED,
  CANCELLED_BY_USER: BACKEND_STATUS.CANCELED,
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
  return STATUS_ALIAS[token] ?? BACKEND_STATUS.UNKNOWN;
}

const TERMINAL_STATUS_SET: ReadonlySet<BackendStatus> = new Set<BackendStatus>([
  BACKEND_STATUS.DROPOFF,
  BACKEND_STATUS.CANCELED,
]);

export function isTerminalBackendStatus(status: BackendStatus): boolean {
  return TERMINAL_STATUS_SET.has(status);
}
