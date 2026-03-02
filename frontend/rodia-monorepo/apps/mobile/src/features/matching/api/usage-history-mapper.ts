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
 * - READY/MATCHED 분리 인식
 * - UsageHistory에서 quote/match/legacy 문자열이 섞여 들어와도 안전하게 흡수
 */
export function normalizeStatus(raw?: string | null): BackendStatus {
  if (!raw) return "UNKNOWN";

  const v = sanitizeToken(raw);
  if (!v) return "UNKNOWN";

  if (v.includes("CANCEL")) return "CANCELLED";

  // 완료 계열
  if (v.includes("DROPOFF") || v.includes("DELIVER")) return "DELIVERED";
  if (v === "COMPLETED" || v.includes("DONE") || v.includes("FINISH") || v.includes("COMPLETE")) return "COMPLETED";

  // 운송중 계열
  if (v.includes("IN_TRANSIT") || v.includes("INTRANSIT")) return "IN_TRANSIT";
  if (v.includes("DRIV") || v.includes("DRIVING")) return "IN_TRANSIT";
  if (v.includes("TRANSIT") && (v.includes("IN") || v.startsWith("IN_") || v === "TRANSIT")) return "IN_TRANSIT";

  // 결제 대기(매칭 READY) 계열
  if (v.includes("READY")) return "READY";

  // 배차/상차 이동 계열 (quote MATCHED/ASSIGNED/ACCEPTED/PREPARING/PICKUP 등)
  if (v.includes("MATCH")) return "MATCHED";
  if (v.includes("ASSIGN") || v.includes("ACCEPT")) return "MATCHED";
  if (v.includes("PREPAR")) return "MATCHED";
  if (v.includes("PICKUP")) return "MATCHED";

  // 요청 접수 계열
  if (v.includes("OPEN") || v.includes("REQUEST")) return "OPEN";

  return "UNKNOWN";
}

/**
 * 상태 우선순위 (UsageHistory 표기 기준)
 * - READY(결제대기) < MATCHED(상차지 이동) < IN_TRANSIT < 완료
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
 * Step 2) BackendStatus -> CustomerUiState (UsageHistory 비즈니스 로직)
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
  if (uiState === "PAYMENT_REQUIRED") return "accent";
  if (uiState === "PICKUP_IN_PROGRESS" || uiState === "TRANSIT_IN_PROGRESS") return "primary";
  return "neutral";
}

/**
 * 차량 정보를 한국어로 포맷팅
 */
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

  // 1) 원본 코드 우선: quote(vehicleType=톤수, vehicleBodyType=차종) / match(tonType/tonnage/vehicleType, vehicleBodyType)
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
        // 일부 레거시가 vehicleType에 차종(CARGO 등)을 싣는 경우 대응
        match?.vehicleType,
      ],
      VEHICLE_TYPE_MAP
    ) || "";

  let tonText = tonToken ? TONNAGE_MAP[tonToken] : "";
  let typeText = bodyToken ? VEHICLE_TYPE_MAP[bodyToken] : "";

  // 2) fallback: 기존 문자열(vehicleText)에서 토큰 스캔
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

  // 3) 조합 결과
  if (tonText && typeText) return `${tonText} ${typeText}`;
  if (tonText || typeText) return tonText || typeText;

  return "차량 정보 없음";
}

/**
 * MatchingListPage에서 (match, quoteDetail) 두 인자를 넘기므로 시그니처 유지
 */
export function mapToUsageHistoryItem(match: any, quote?: any): ParsedUsageHistoryItem {
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