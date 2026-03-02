// apps/mobile/src/features/matching/api/usage-history-mapper.ts

export type BackendStatus =
  | "OPEN"
  | "MATCHED"
  | "READY"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED"
  | "UNKNOWN";

export type CustomerUiState =
  | "REQUESTED"
  | "PICKUP_IN_PROGRESS"
  | "PAYMENT_REQUIRED"
  | "TRANSIT_IN_PROGRESS"
  | "COMPLETED"
  | "CANCELED"
  | "UNKNOWN";

export type CustomerCtaId = "PAY" | "TRACK" | "RECEIPT" | "RE_REQUEST";

export interface CustomerCtaConfig {
  id: CustomerCtaId;
  label: string;
  variant: "primary" | "secondary";
  enabled: boolean;
}

export interface DeriveCustomerUiStateInput {
  /**
   * 서버 응답이 단일 status 필드만 제공하는 경우 사용
   * - 예: item.status
   */
  rawStatus?: string | null;

  /**
   * 향후 서버가 quote/match 상태를 분리 제공할 경우 사용
   * - 예: quote.status / match.status
   */
  rawQuoteStatus?: string | null;
  rawMatchStatus?: string | null;
}

export interface DeriveCustomerUiStateResult {
  backendStatus: BackendStatus;
  uiState: CustomerUiState;
}

function sanitizeToken(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Step 1) Backend Raw -> BackendStatus (정규화)
 * - 대소문자/특수문자 제거 후 토큰 기반 매핑
 * - READY와 MATCHED를 반드시 분리 인식(READY 우선)
 */
export function normalizeStatus(raw?: string | null): BackendStatus {
  if (!raw) return "UNKNOWN";

  const v = sanitizeToken(raw);
  if (!v) return "UNKNOWN";

  // cancelled 계열 (CANCELED/ CANCELLED / CANCEL 등)
  if (v.includes("CANCEL")) return "CANCELLED";

  // delivered/completed 계열
  if (v.includes("DELIVER")) return "DELIVERED";
  if (v === "COMPLETED" || v.includes("COMPLETE")) return "COMPLETED";

  // in_transit 계열
  if (v.includes("IN_TRANSIT") || v.includes("INTRANSIT")) return "IN_TRANSIT";
  if (v.includes("TRANSIT") && (v.includes("IN") || v.startsWith("IN_"))) return "IN_TRANSIT";

  // READY 우선(기존 MATCHED로 뭉뚱그려지는 문제 방지)
  if (v.includes("READY")) return "READY";

  // matched 계열
  if (v.includes("MATCH")) return "MATCHED";

  // open/request 계열
  if (v.includes("OPEN") || v.includes("REQUEST")) return "OPEN";

  return "UNKNOWN";
}

const statusRank: Record<BackendStatus, number> = {
  UNKNOWN: 0,
  OPEN: 10,
  MATCHED: 20,
  READY: 30,
  IN_TRANSIT: 40,
  DELIVERED: 50,
  COMPLETED: 50,
  CANCELLED: 100,
};

function pickMostRelevantStatus(statuses: BackendStatus[]): BackendStatus {
  // CANCELLED는 항상 최우선
  if (statuses.includes("CANCELLED")) return "CANCELLED";

  let best: BackendStatus = "UNKNOWN";
  let bestRank = -1;

  for (const s of statuses) {
    const r = statusRank[s] ?? 0;
    if (r > bestRank) {
      best = s;
      bestRank = r;
    }
  }

  return best;
}

/**
 * Step 2) BackendStatus -> CustomerUiState (비즈니스 로직)
 */
export function mapBackendStatusToCustomerUiState(status: BackendStatus): CustomerUiState {
  switch (status) {
    case "OPEN":
      return "REQUESTED";
    case "MATCHED":
      return "PICKUP_IN_PROGRESS";
    case "READY":
      return "PAYMENT_REQUIRED";
    case "IN_TRANSIT":
      return "TRANSIT_IN_PROGRESS";
    case "DELIVERED":
    case "COMPLETED":
      return "COMPLETED";
    case "CANCELLED":
      return "CANCELED";
    default:
      return "UNKNOWN";
  }
}

/**
 * 단일 status 응답/분리 status 응답 모두 대응하는 최종 파이프라인
 */
export function deriveCustomerUiState(input: DeriveCustomerUiStateInput): DeriveCustomerUiStateResult {
  const candidates: BackendStatus[] = [];

  const rawStatus = input.rawStatus ?? null;
  const rawQuoteStatus = input.rawQuoteStatus ?? null;
  const rawMatchStatus = input.rawMatchStatus ?? null;

  if (rawStatus) candidates.push(normalizeStatus(rawStatus));
  if (rawQuoteStatus) candidates.push(normalizeStatus(rawQuoteStatus));
  if (rawMatchStatus) candidates.push(normalizeStatus(rawMatchStatus));

  const backendStatus = pickMostRelevantStatus(candidates.length ? candidates : ["UNKNOWN"]);
  const uiState = mapBackendStatusToCustomerUiState(backendStatus);

  return { backendStatus, uiState };
}

/**
 * 카드 상단 "상태 뱃지" (짧은 라벨)
 */
export function getCustomerStatusBadgeLabel(uiState: CustomerUiState): string {
  switch (uiState) {
    case "REQUESTED":
      return "요청됨";
    case "PICKUP_IN_PROGRESS":
      return "배차완료";
    case "PAYMENT_REQUIRED":
      return "결제대기";
    case "TRANSIT_IN_PROGRESS":
      return "운송중";
    case "COMPLETED":
      return "완료";
    case "CANCELED":
      return "취소";
    default:
      return "상태확인";
  }
}

/**
 * 상태별 마이크로카피(진행형 문장)
 */
export function getCustomerStatusTitle(uiState: CustomerUiState): string {
  switch (uiState) {
    case "REQUESTED":
      return "기사 배정을 기다리고 있습니다";
    case "PICKUP_IN_PROGRESS":
      return "기사님이 상차지로 이동하고 있습니다";
    case "PAYMENT_REQUIRED":
      return "결제를 진행하면 운송이 시작됩니다";
    case "TRANSIT_IN_PROGRESS":
      return "상차를 완료하고 목적지로 이동하고 있습니다";
    case "COMPLETED":
      return "운송이 완료되었습니다";
    case "CANCELED":
      return "요청이 취소되었습니다";
    default:
      return "상태를 확인하고 있습니다";
  }
}

/**
 * 컨텍스트 기반 CTA 정책
 */
export function getCustomerCta(uiState: CustomerUiState): CustomerCtaConfig | null {
  switch (uiState) {
    case "PAYMENT_REQUIRED":
      return { id: "PAY", label: "즉시 결제하기", variant: "primary", enabled: true };
    case "TRANSIT_IN_PROGRESS":
      return { id: "TRACK", label: "실시간 위치 확인", variant: "secondary", enabled: true };
    case "COMPLETED":
      return { id: "RECEIPT", label: "인수증 확인", variant: "secondary", enabled: true };
    case "CANCELED":
      return { id: "RE_REQUEST", label: "다시 요청", variant: "primary", enabled: true };
    default:
      return null;
  }
}