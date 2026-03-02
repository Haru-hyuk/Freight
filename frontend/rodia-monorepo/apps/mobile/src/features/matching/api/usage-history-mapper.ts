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
  | "PROPOSED"
  | "UNKNOWN";

export type CustomerCtaId = "PAY" | "TRACK" | "RECEIPT" | "RE_REQUEST" | "ACCEPT" | "REJECT";

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

// ---------------------------------------------------------------------------
// Constants & Mappers (Localized)
// ---------------------------------------------------------------------------

const TONNAGE_MAP: Record<string, string> = {
  TON_1: "1톤",
  TON_1_4: "1.4톤",
  TON_2_5: "2.5톤",
  TON_3_5: "3.5톤",
  TON_5: "5톤",
  TON_5_AXLE: "5톤축",
  TON_8: "8톤",
  TON_11: "11톤",
  TON_14: "14톤",
  TON_15: "15톤",
  TON_18: "18톤",
  TON_25: "25톤",
};

const VEHICLE_TYPE_MAP: Record<string, string> = {
  CARGO: "카고",
  WING_BODY: "윙바디",
  WINGBODY: "윙바디",
  TOP_CAR: "탑차",
  TOPCAR: "탑차",
  FREEZER: "냉동",
  REFRIGERATED: "냉장",
};

function sanitizeToken(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Step 1) Backend Raw -> BackendStatus (정규화)
 */
export function normalizeStatus(raw?: string | null): BackendStatus {
  if (!raw) return "UNKNOWN";

  const v = sanitizeToken(raw);
  if (!v) return "UNKNOWN";

  if (v.includes("CANCEL")) return "CANCELLED";

  if (v.includes("DROPOFF") || v.includes("DELIVER")) return "DELIVERED";
  if (v === "COMPLETED" || v.includes("DONE") || v.includes("FINISH") || v.includes("COMPLETE")) return "COMPLETED";

  if (v.includes("IN_TRANSIT") || v.includes("INTRANSIT")) return "IN_TRANSIT";
  if (v.includes("DRIV") || v.includes("DRIVING")) return "IN_TRANSIT";
  if (v.includes("TRANSIT") && (v.includes("IN") || v.startsWith("IN_") || v === "TRANSIT")) return "IN_TRANSIT";

  if (v.includes("READY")) return "READY";

  if (v.includes("MATCH")) return "MATCHED";
  if (v.includes("ASSIGN") || v.includes("ACCEPT")) return "MATCHED";
  if (v.includes("PREPAR")) return "MATCHED";
  if (v.includes("PICKUP")) return "MATCHED";

  if (v.includes("OPEN") || v.includes("REQUEST")) return "OPEN";

  return "UNKNOWN";
}

/**
 * 상태 우선순위
 */
const statusRank: Record<BackendStatus, number> = {
  UNKNOWN: 0,
  OPEN: 10,
  READY: 20,
  MATCHED: 30,
  IN_TRANSIT: 40,
  DELIVERED: 50,
  COMPLETED: 50,
  CANCELLED: 100,
};

function pickMostRelevantStatus(statuses: BackendStatus[]): BackendStatus {
  const filtered = statuses.filter((s) => s !== "UNKNOWN");
  if (!filtered.length) return "UNKNOWN";
  if (filtered.includes("CANCELLED")) return "CANCELLED";

  let best: BackendStatus = "UNKNOWN";
  let bestRank = -1;

  for (const s of filtered) {
    const r = statusRank[s] ?? 0;
    if (r > bestRank) {
      best = s;
      bestRank = r;
    }
  }

  return best;
}

/**
 * Step 2) BackendStatus -> CustomerUiState
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

export function deriveCustomerUiState(input: DeriveCustomerUiStateInput): DeriveCustomerUiStateResult {
  const candidates: BackendStatus[] = [];

  if (input.rawStatus) candidates.push(normalizeStatus(input.rawStatus));
  if (input.rawQuoteStatus) candidates.push(normalizeStatus(input.rawQuoteStatus));
  if (input.rawMatchStatus) candidates.push(normalizeStatus(input.rawMatchStatus));

  const backendStatus = pickMostRelevantStatus(candidates);
  const uiState = mapBackendStatusToCustomerUiState(backendStatus);

  return { backendStatus, uiState };
}

export function getUsageHistoryStatusTone(uiState: CustomerUiState): ParsedUsageHistoryItem["statusTone"] {
  if (uiState === "COMPLETED") return "secondary";
  if (uiState === "CANCELED") return "destructive";
  if (uiState === "PAYMENT_REQUIRED" || uiState === "PROPOSED") return "accent";
  if (uiState === "PICKUP_IN_PROGRESS" || uiState === "TRANSIT_IN_PROGRESS") return "primary";
  return "neutral";
}

// ---------------------------------------------------------------------------
// Vehicle text formatter
// ---------------------------------------------------------------------------

function formatVehicleText(match: any, quote: any): string {
  const pickMappedToken = (values: unknown[], table: Record<string, string>): string => {
    for (const v of values) {
      const token = sanitizeToken(String(v ?? ""));
      if (token && table[token]) return token;
    }
    return "";
  };

  const findKeyInToken = (raw: string, table: Record<string, string>): string => {
    const token = sanitizeToken(raw);
    if (!token) return "";
    const keys = Object.keys(table).sort((a, b) => b.length - a.length);
    for (const key of keys) {
      if (token.includes(key)) return key;
    }
    return "";
  };

  const tonToken =
    pickMappedToken(
      [
        match?.tonType,
        match?.tonnage,
        match?.vehicleType,
        quote?.tonType,
        quote?.tonnage,
        quote?.vehicleType,
      ],
      TONNAGE_MAP
    ) || "";

  const bodyToken =
    pickMappedToken(
      [
        match?.vehicleBodyType,
        match?.vehicle_body_type,
        match?.bodyType,
        match?.body_type,
        quote?.vehicleBodyType,
        quote?.vehicle_body_type,
        match?.vehicleType,
      ],
      VEHICLE_TYPE_MAP
    ) || "";

  let tonText = tonToken ? TONNAGE_MAP[tonToken] : "";
  let typeText = bodyToken ? VEHICLE_TYPE_MAP[bodyToken] : "";

  const fallback = String(match?.vehicleText ?? quote?.vehicleText ?? "");
  if ((!tonText || !typeText) && fallback && fallback !== "차량 정보 없음") {
    if (!tonText) {
      const k = findKeyInToken(fallback, TONNAGE_MAP);
      tonText = k ? TONNAGE_MAP[k] : "";
    }
    if (!typeText) {
      const k = findKeyInToken(fallback, VEHICLE_TYPE_MAP);
      typeText = k ? VEHICLE_TYPE_MAP[k] : "";
    }
  }

  if (tonText && typeText) return `${tonText} ${typeText}`;
  if (tonText || typeText) return tonText || typeText;

  return "차량 정보 없음";
}

// ---------------------------------------------------------------------------
// Counter offer ID extraction
// ---------------------------------------------------------------------------

/**
 * match 객체에서 counterOfferId를 안전하게 추출합니다.
 * 백엔드 응답 구조(any)가 다양하므로 여러 경로를 순서대로 탐색합니다.
 */
function extractCounterOfferId(match: any): number | undefined {
  const candidates = [
    match?.counterOfferId,
    match?.counterOffer?.counterOfferId,
    match?.offer?.counterOfferId,
    match?.offerItem?.counterOfferId,
    match?.proposalId,
  ];
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isInteger(n) && n > 0) return n;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Main mapper
// ---------------------------------------------------------------------------

/**
 * MatchingListPage에서 (match, quoteDetail) 두 인자를 넘기므로 시그니처 유지.
 */
export function mapToUsageHistoryItem(match: any, quote?: any): ParsedUsageHistoryItem {
  // ── 1. PROPOSED 감지 (최우선) ──
  // 기사 역제안은 어떤 백엔드 상태보다 우선합니다.
  const isProposed =
    match?.isProposal === true ||
    match?.isCounterOffer === true ||
    (typeof match?.suggestedPrice === "number" && match.suggestedPrice > 0) ||
    String(match?.status ?? "").toUpperCase().includes("PROPOS") ||
    String(quote?.status ?? "").toUpperCase().includes("PROPOS");

  if (isProposed) {
    const counterOfferId = extractCounterOfferId(match);
    return {
      id: String(match?.id ?? match?.matchId ?? match?.quoteId ?? quote?.id ?? quote?.quoteId ?? Math.random()),
      quoteId: Number(match?.quoteId ?? quote?.quoteId ?? quote?.id ?? 0),
      matchId: Number(match?.matchId ?? match?.id ?? 0) || undefined,
      counterOfferId,
      status: "PROPOSED",
      backendStatus: "UNKNOWN",
      uiState: "PROPOSED",
      statusTone: "accent",
      originAddress: String(match?.originAddress ?? quote?.originAddress ?? "상차지 미정"),
      destinationAddress: String(match?.destinationAddress ?? quote?.destinationAddress ?? "하차지 미정"),
      priceText: String(match?.priceText ?? quote?.priceText ?? "0원"),
      vehicleText: formatVehicleText(match, quote),
      dateText: String(match?.dateText ?? quote?.dateText ?? ""),
    };
  }

  // ── 2. 일반 상태 처리 ──
  const rawMatchStatus: string | null = typeof match?.status === "string" ? match.status : null;
  const rawQuoteStatus: string | null = typeof quote?.status === "string" ? quote.status : null;

  const { backendStatus, uiState } = deriveCustomerUiState({
    rawMatchStatus,
    rawQuoteStatus,
    rawStatus: rawMatchStatus ?? rawQuoteStatus,
  });

  const statusTone = getUsageHistoryStatusTone(uiState);
  const status = rawMatchStatus ?? rawQuoteStatus ?? backendStatus;

  return {
    id: String(match?.id ?? match?.matchId ?? match?.quoteId ?? quote?.id ?? quote?.quoteId ?? Math.random()),
    quoteId: Number(match?.quoteId ?? quote?.quoteId ?? quote?.id ?? 0),
    matchId: Number(match?.matchId ?? match?.id ?? 0) || undefined,
    counterOfferId: undefined,
    status,
    backendStatus,
    uiState,
    statusTone,
    originAddress: String(match?.originAddress ?? quote?.originAddress ?? "상차지 미정"),
    destinationAddress: String(match?.destinationAddress ?? quote?.destinationAddress ?? "하차지 미정"),
    priceText: String(match?.priceText ?? quote?.priceText ?? "0원"),
    vehicleText: formatVehicleText(match, quote),
    dateText: String(match?.dateText ?? quote?.dateText ?? ""),
  };
}

// ---------------------------------------------------------------------------
// Label / title / CTA helpers
// ---------------------------------------------------------------------------

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
    case "PROPOSED":
      return "역제안";
    default:
      return "상태확인";
  }
}

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
    case "PROPOSED":
      return "기사님이 새로운 금액을 제안했습니다";
    default:
      return "상태를 확인하고 있습니다";
  }
}

/**
 * CTA 버튼 목록을 반환합니다.
 * PROPOSED 상태에서는 수락/거절 두 버튼을 배열로 반환합니다.
 */
export function getCustomerCta(uiState: CustomerUiState): CustomerCtaConfig[] | null {
  switch (uiState) {
    case "PROPOSED":
      return [
        { id: "ACCEPT", label: "수락하기", variant: "primary", enabled: true },
        { id: "REJECT", label: "거절하기", variant: "secondary", enabled: true },
      ];
    case "PAYMENT_REQUIRED":
      return [{ id: "PAY", label: "즉시 결제하기", variant: "primary", enabled: true }];
    case "TRANSIT_IN_PROGRESS":
      return [{ id: "TRACK", label: "실시간 위치 확인", variant: "secondary", enabled: true }];
    case "COMPLETED":
      return [{ id: "RECEIPT", label: "인수증 확인", variant: "secondary", enabled: true }];
    case "CANCELED":
      return [{ id: "RE_REQUEST", label: "다시 요청", variant: "primary", enabled: true }];
    default:
      return null;
  }
}
