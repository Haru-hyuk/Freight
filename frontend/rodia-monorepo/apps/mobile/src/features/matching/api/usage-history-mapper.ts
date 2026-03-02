import type { ParsedUsageHistoryItem } from "../ui/UsageHistoryCard";

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
  rawStatus?: string | null;
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

export function normalizeStatus(raw?: string | null): BackendStatus {
  if (!raw) return "UNKNOWN";
  const v = sanitizeToken(raw);
  if (!v) return "UNKNOWN";
  if (v.includes("CANCEL")) return "CANCELLED";
  if (v.includes("DELIVER")) return "DELIVERED";
  if (v === "COMPLETED" || v.includes("COMPLETE")) return "COMPLETED";
  if (v.includes("IN_TRANSIT") || v.includes("INTRANSIT")) return "IN_TRANSIT";
  if (v.includes("TRANSIT") && (v.includes("IN") || v.startsWith("IN_"))) return "IN_TRANSIT";
  if (v.includes("READY")) return "READY";
  if (v.includes("MATCH")) return "MATCHED";
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

export function mapBackendStatusToCustomerUiState(status: BackendStatus): CustomerUiState {
  switch (status) {
    case "OPEN": return "REQUESTED";
    case "MATCHED": return "PICKUP_IN_PROGRESS";
    case "READY": return "PAYMENT_REQUIRED";
    case "IN_TRANSIT": return "TRANSIT_IN_PROGRESS";
    case "DELIVERED":
    case "COMPLETED": return "COMPLETED";
    case "CANCELLED": return "CANCELED";
    default: return "UNKNOWN";
  }
}

export function deriveCustomerUiState(input: DeriveCustomerUiStateInput): DeriveCustomerUiStateResult {
  const candidates: BackendStatus[] = [];
  if (input.rawStatus) candidates.push(normalizeStatus(input.rawStatus));
  if (input.rawQuoteStatus) candidates.push(normalizeStatus(input.rawQuoteStatus));
  if (input.rawMatchStatus) candidates.push(normalizeStatus(input.rawMatchStatus));
  const backendStatus = pickMostRelevantStatus(candidates.length ? candidates : ["UNKNOWN"]);
  const uiState = mapBackendStatusToCustomerUiState(backendStatus);
  return { backendStatus, uiState };
}

/**
 * MatchingListPage에서 (match, quoteDetail) 두 인자를 넘기므로 시그니처를 수정했습니다.
 * @param match - 서버에서 가져온 매칭(Match) 객체
 * @param quote - (선택사항) 해당 매칭에 연결된 견적(Quote) 상세 정보
 */
export function mapToUsageHistoryItem(match: any, quote?: any): ParsedUsageHistoryItem {
  // 1. match와 quote의 상태를 모두 고려하여 최종 UI 상태 도출
  const { uiState } = deriveCustomerUiState({ 
    rawStatus: match.status,
    rawQuoteStatus: quote?.status 
  });

  // 2. 위젯 필터링 기준에 따른 톤(Tone) 결정 로직
  // 위젯은 statusTone이 'secondary'(완료), 'destructive'(취소) 등을 기준으로 탭을 분류합니다.
  let statusTone: ParsedUsageHistoryItem["statusTone"] = "neutral";
  
  if (uiState === "COMPLETED") {
    statusTone = "secondary";
  } else if (uiState === "CANCELED") {
    statusTone = "destructive";
  } else if (uiState === "PAYMENT_REQUIRED") {
    statusTone = "accent";
  } else if (uiState === "PICKUP_IN_PROGRESS" || uiState === "TRANSIT_IN_PROGRESS") {
    statusTone = "primary";
  }

  // 3. 최종 객체 반환 (match에 데이터가 없으면 quote에서 가져오도록 Fallback 처리)
  return {
    id: String(match.id || match.quoteId || quote?.id || Math.random()),
    quoteId: match.quoteId || quote?.id,
    matchId: match.matchId || match.id,
    status: match.status || quote?.status || "UNKNOWN",
    statusTone,
    originAddress: match.originAddress || quote?.originAddress || "상차지 미정",
    destinationAddress: match.destinationAddress || quote?.destinationAddress || "하차지 미정",
    priceText: match.priceText || quote?.priceText || "0원",
    vehicleText: match.vehicleText || quote?.vehicleText || "차량 정보 없음",
    dateText: match.dateText || quote?.dateText || "",
  };
}
export function getCustomerStatusBadgeLabel(uiState: CustomerUiState): string {
  switch (uiState) {
    case "REQUESTED": return "요청됨";
    case "PICKUP_IN_PROGRESS": return "배차완료";
    case "PAYMENT_REQUIRED": return "결제대기";
    case "TRANSIT_IN_PROGRESS": return "운송중";
    case "COMPLETED": return "완료";
    case "CANCELED": return "취소";
    default: return "상태확인";
  }
}

export function getCustomerStatusTitle(uiState: CustomerUiState): string {
  switch (uiState) {
    case "REQUESTED": return "기사 배정을 기다리고 있습니다";
    case "PICKUP_IN_PROGRESS": return "기사님이 상차지로 이동하고 있습니다";
    case "PAYMENT_REQUIRED": return "결제를 진행하면 운송이 시작됩니다";
    case "TRANSIT_IN_PROGRESS": return "상차를 완료하고 목적지로 이동하고 있습니다";
    case "COMPLETED": return "운송이 완료되었습니다";
    case "CANCELED": return "요청이 취소되었습니다";
    default: return "상태를 확인하고 있습니다";
  }
}

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