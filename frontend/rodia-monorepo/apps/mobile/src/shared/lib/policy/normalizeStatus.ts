import { BACKEND_STATUS, type BackendStatus } from "./types";

/**
 * 상태 정규화 정책
 * - 여러 도메인(견적/매칭/레거시)의 원시 상태 문자열을 `BackendStatus`로 통일한다.
 */
// 견적 상태(`Quote.status`) 단일 기준 매핑 (우선순위 최상단)
const QUOTE_STATUS_ALIAS: Readonly<Record<string, BackendStatus>> = {
  OPEN: BACKEND_STATUS.OPEN,
  MATCHED: BACKEND_STATUS.MATCHED,
  IN_TRANSIT: BACKEND_STATUS.IN_TRANSIT,
  DELIVERED: BACKEND_STATUS.DELIVERED,
  CANCELLED: BACKEND_STATUS.CANCELLED,
  CANCELED: BACKEND_STATUS.CANCELLED,
};

// 매칭 상태(`Match.status`) 보조 매핑
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

// 입력 문자열을 매핑 키 형태(대문자/언더스코어)로 정규화
function toStatusToken(rawStatus: string | null | undefined): string {
  return String(rawStatus ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
}

// 우선순위: 견적 → 매칭 → 레거시 → UNKNOWN
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
