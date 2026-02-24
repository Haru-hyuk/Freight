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

const CUSTOMER_UI_STATE_BY_BACKEND_STATUS: Readonly<Record<BackendStatus, CustomerUiState>> = {
  [BACKEND_STATUS.READY]: CUSTOMER_UI_STATE.REQUESTED,
  [BACKEND_STATUS.OPEN]: CUSTOMER_UI_STATE.REQUESTED,
  [BACKEND_STATUS.NEGOTIATING]: CUSTOMER_UI_STATE.NEGOTIATION_REQUIRED,
  [BACKEND_STATUS.ASSIGNED]: CUSTOMER_UI_STATE.PAYMENT_REQUIRED,
  [BACKEND_STATUS.ACCEPTED]: CUSTOMER_UI_STATE.PAYMENT_REQUIRED,
  [BACKEND_STATUS.PICKUP]: CUSTOMER_UI_STATE.PICKUP_IN_PROGRESS,
  [BACKEND_STATUS.TRANSIT]: CUSTOMER_UI_STATE.TRANSIT_IN_PROGRESS,
  [BACKEND_STATUS.DROPOFF]: CUSTOMER_UI_STATE.COMPLETED,
  [BACKEND_STATUS.CANCELED]: CUSTOMER_UI_STATE.CANCELED,
  [BACKEND_STATUS.UNKNOWN]: CUSTOMER_UI_STATE.UNKNOWN,
};

function formatKrw(amount: number): string {
  return `${Math.trunc(amount).toLocaleString("ko-KR")}원`;
}

export function getCustomerCta(uiState: CustomerUiState): CustomerCtaConfig {
  return CUSTOMER_CTA_MAP[uiState] ?? CUSTOMER_CTA_MAP[CUSTOMER_UI_STATE.UNKNOWN];
}

export function getCustomerStatusTitle(uiState: CustomerUiState, negotiatedAmount?: number): string {
  const baseTitle = CUSTOMER_STATUS_TITLE_MAP[uiState] ?? CUSTOMER_STATUS_TITLE_MAP[CUSTOMER_UI_STATE.UNKNOWN];
  if (uiState !== CUSTOMER_UI_STATE.NEGOTIATION_REQUIRED) return baseTitle;
  if (!Number.isFinite(negotiatedAmount) || (negotiatedAmount ?? 0) <= 0) return baseTitle;
  return `${baseTitle} (${formatKrw(negotiatedAmount ?? 0)})`;
}

export function canCustomerViewLocation(uiState: CustomerUiState): boolean {
  return LOCATION_VIEWABLE_STATE_SET.has(uiState);
}

/**
 * Compat helper for legacy/mock paths where backend uiState is not available yet.
 * UI layer should consume uiState directly when backend contract is ready.
 */
export function getCustomerUiStateFromBackendStatus(rawStatus: string): CustomerUiState {
  const backendStatus = normalizeStatus(rawStatus);
  return CUSTOMER_UI_STATE_BY_BACKEND_STATUS[backendStatus] ?? CUSTOMER_UI_STATE.UNKNOWN;
}
