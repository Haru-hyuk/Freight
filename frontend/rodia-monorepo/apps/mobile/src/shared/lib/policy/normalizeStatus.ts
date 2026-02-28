import { BACKEND_STATUS, type BackendStatus } from "./types";

// 백엔드 rawStatus 5종 + 레거시 alias 매핑
const STATUS_ALIAS: Readonly<Record<string, BackendStatus>> = {
  OPEN: BACKEND_STATUS.OPEN,
  MATCHED: BACKEND_STATUS.MATCHED,
  IN_TRANSIT: BACKEND_STATUS.IN_TRANSIT,
  DELIVERED: BACKEND_STATUS.COMPLETED,   // DELIVERED → COMPLETED (배송 완료)
  READY: BACKEND_STATUS.READY,
  COMPLETED: BACKEND_STATUS.COMPLETED,
  CANCELLED: BACKEND_STATUS.CANCELLED,
  CANCELED: BACKEND_STATUS.CANCELLED,    // 단일-L 레거시 alias
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
  BACKEND_STATUS.COMPLETED,
  BACKEND_STATUS.CANCELLED,
]);

export function isTerminalBackendStatus(status: BackendStatus): boolean {
  return TERMINAL_STATUS_SET.has(status);
}
