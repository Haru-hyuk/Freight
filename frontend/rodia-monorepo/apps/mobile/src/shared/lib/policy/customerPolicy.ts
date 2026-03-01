import { normalizeStatus } from "./normalizeStatus";
import {
  BACKEND_STATUS,
  CTA_VARIANT,
  CUSTOMER_CTA_ID,
  CUSTOMER_UI_STATE,
  type BackendStatus,
  type CustomerCtaConfig,
  type CustomerUiState,
} from "./types";

/**
 * 화주 정책
 * - 상태 저장은 하지 않고, 주어진 상태를 기준으로 UI 결정을 반환한다.
 * - 입력: `BackendStatus`, `CustomerUiState`
 * - 출력: 행동 버튼, 상태 타이틀, 위치 조회 가능 여부
 */
const CUSTOMER_CTA_MAP: Readonly<Record<CustomerUiState, CustomerCtaConfig>> = {
  [CUSTOMER_UI_STATE.REQUESTED]: {
    id: CUSTOMER_CTA_ID.VIEW_DETAIL,
    label: "요청 상태 확인",
    variant: CTA_VARIANT.SECONDARY,
    enabled: true,
  },
  [CUSTOMER_UI_STATE.NEGOTIATION_REQUIRED]: {
    id: CUSTOMER_CTA_ID.REVIEW_OFFER,
    label: "제안 확인",
    variant: CTA_VARIANT.PRIMARY,
    enabled: true,
  },
  [CUSTOMER_UI_STATE.PAYMENT_REQUIRED]: {
    id: CUSTOMER_CTA_ID.PAY,
    label: "결제하기",
    variant: CTA_VARIANT.PRIMARY,
    enabled: true,
  },
  [CUSTOMER_UI_STATE.PICKUP_IN_PROGRESS]: {
    id: CUSTOMER_CTA_ID.TRACK_PICKUP,
    label: "상차 현황",
    variant: CTA_VARIANT.SECONDARY,
    enabled: true,
  },
  [CUSTOMER_UI_STATE.TRANSIT_IN_PROGRESS]: {
    id: CUSTOMER_CTA_ID.TRACK_TRANSIT,
    label: "위치 확인",
    variant: CTA_VARIANT.SECONDARY,
    enabled: true,
  },
  [CUSTOMER_UI_STATE.COMPLETED]: {
    id: CUSTOMER_CTA_ID.VIEW_RECEIPT,
    label: "운송 결과 확인",
    variant: CTA_VARIANT.SECONDARY,
    enabled: true,
  },
  [CUSTOMER_UI_STATE.CANCELED]: {
    id: CUSTOMER_CTA_ID.RE_REQUEST,
    label: "다시 요청",
    variant: CTA_VARIANT.PRIMARY,
    enabled: true,
  },
  [CUSTOMER_UI_STATE.UNKNOWN]: {
    id: CUSTOMER_CTA_ID.VIEW_DETAIL,
    label: "상태 확인",
    variant: CTA_VARIANT.SECONDARY,
    enabled: false,
  },
};

const CUSTOMER_STATUS_TITLE_MAP: Readonly<Record<CustomerUiState, string>> = {
  [CUSTOMER_UI_STATE.REQUESTED]: "요청이 접수되었습니다",
  [CUSTOMER_UI_STATE.NEGOTIATION_REQUIRED]: "운임 협의가 필요합니다",
  [CUSTOMER_UI_STATE.PAYMENT_REQUIRED]: "결제가 필요합니다",
  [CUSTOMER_UI_STATE.PICKUP_IN_PROGRESS]: "상차가 진행 중입니다",
  [CUSTOMER_UI_STATE.TRANSIT_IN_PROGRESS]: "화물이 이동 중입니다",
  [CUSTOMER_UI_STATE.COMPLETED]: "운송이 완료되었습니다",
  [CUSTOMER_UI_STATE.CANCELED]: "요청이 취소되었습니다",
  [CUSTOMER_UI_STATE.UNKNOWN]: "진행 상태를 확인해주세요",
};

const LOCATION_VIEWABLE_STATE_SET: ReadonlySet<CustomerUiState> = new Set<CustomerUiState>([
  CUSTOMER_UI_STATE.PICKUP_IN_PROGRESS,
  CUSTOMER_UI_STATE.TRANSIT_IN_PROGRESS,
]);

// ── 정책표 (정규화된 BackendStatus → CustomerUiState) ────────────────────────
// 백엔드 원본 상태값(`rawStatus`) 8종:
//   OPEN      → OPEN             → REQUESTED
//   MATCHED   → MATCHED          → PAYMENT_REQUIRED
//   IN_TRANSIT → IN_TRANSIT      → TRANSIT_IN_PROGRESS
//   DELIVERED → DELIVERED        → COMPLETED
//   READY     → READY (매칭)      → PAYMENT_REQUIRED
//   COMPLETED → COMPLETED        → COMPLETED
//   CANCELLED → CANCELLED        → CANCELED
//   UNKNOWN   → UNKNOWN          → UNKNOWN
const CUSTOMER_UI_STATE_BY_BACKEND_STATUS: Readonly<Record<BackendStatus, CustomerUiState>> = {
  [BACKEND_STATUS.OPEN]: CUSTOMER_UI_STATE.REQUESTED,
  [BACKEND_STATUS.MATCHED]: CUSTOMER_UI_STATE.PAYMENT_REQUIRED,
  [BACKEND_STATUS.IN_TRANSIT]: CUSTOMER_UI_STATE.TRANSIT_IN_PROGRESS,
  [BACKEND_STATUS.DELIVERED]: CUSTOMER_UI_STATE.COMPLETED,
  [BACKEND_STATUS.READY]: CUSTOMER_UI_STATE.PAYMENT_REQUIRED,
  [BACKEND_STATUS.COMPLETED]: CUSTOMER_UI_STATE.COMPLETED,
  [BACKEND_STATUS.CANCELLED]: CUSTOMER_UI_STATE.CANCELED,
  [BACKEND_STATUS.UNKNOWN]: CUSTOMER_UI_STATE.UNKNOWN,
};

function formatKrw(amount: number): string {
  return `${Math.trunc(amount).toLocaleString("ko-KR")}원`;
}

export function getCustomerCta(uiState: CustomerUiState): CustomerCtaConfig {
  return CUSTOMER_CTA_MAP[uiState] ?? CUSTOMER_CTA_MAP[CUSTOMER_UI_STATE.UNKNOWN];
}

// 화주 상태에 따른 상단 상태 문구 정책
export function getCustomerStatusTitle(uiState: CustomerUiState, negotiatedAmount?: number): string {
  const baseTitle = CUSTOMER_STATUS_TITLE_MAP[uiState] ?? CUSTOMER_STATUS_TITLE_MAP[CUSTOMER_UI_STATE.UNKNOWN];
  if (uiState !== CUSTOMER_UI_STATE.NEGOTIATION_REQUIRED) return baseTitle;
  if (!Number.isFinite(negotiatedAmount) || (negotiatedAmount ?? 0) <= 0) return baseTitle;
  return `${baseTitle} (${formatKrw(negotiatedAmount ?? 0)})`;
}

// 화주가 실시간 위치를 볼 수 있는 상태 정책
export function canCustomerViewLocation(uiState: CustomerUiState): boolean {
  return LOCATION_VIEWABLE_STATE_SET.has(uiState);
}

/**
 * 레거시/목 경로 호환을 위한 보조 함수입니다.
 * 백엔드에서 `uiState`를 아직 제공하지 않는 경우를 대비합니다.
 * 백엔드 계약이 준비되면 화면 계층은 변환 없이 `uiState`를 직접 사용해야 합니다.
 */
export function getCustomerUiStateFromBackendStatus(rawStatus: string): CustomerUiState {
  const backendStatus = normalizeStatus(rawStatus);
  return CUSTOMER_UI_STATE_BY_BACKEND_STATUS[backendStatus] ?? CUSTOMER_UI_STATE.UNKNOWN;
}
