import {
  BADGE_TONE,
  CUSTOMER_UI_STATE,
  DRIVER_UI_STATE,
  type CustomerUiState,
  type DriverUiState,
  type StateBadgePolicy,
} from "./types";

const CUSTOMER_BADGE_MAP: Readonly<Record<CustomerUiState, StateBadgePolicy>> = {
  [CUSTOMER_UI_STATE.REQUESTED]: { label: "요청 접수", tone: BADGE_TONE.NEUTRAL },
  [CUSTOMER_UI_STATE.NEGOTIATION_REQUIRED]: { label: "협의 필요", tone: BADGE_TONE.ATTENTION },
  [CUSTOMER_UI_STATE.PAYMENT_REQUIRED]: { label: "결제 필요", tone: BADGE_TONE.ATTENTION },
  [CUSTOMER_UI_STATE.PICKUP_IN_PROGRESS]: { label: "상차 중", tone: BADGE_TONE.PROGRESS },
  [CUSTOMER_UI_STATE.TRANSIT_IN_PROGRESS]: { label: "운송 중", tone: BADGE_TONE.PROGRESS },
  [CUSTOMER_UI_STATE.COMPLETED]: { label: "운송 완료", tone: BADGE_TONE.CLOSED },
  [CUSTOMER_UI_STATE.CANCELED]: { label: "요청 취소", tone: BADGE_TONE.CLOSED },
  [CUSTOMER_UI_STATE.UNKNOWN]: { label: "상태 확인", tone: BADGE_TONE.NEUTRAL },
};

const DRIVER_BADGE_MAP: Readonly<Record<DriverUiState, StateBadgePolicy>> = {
  [DRIVER_UI_STATE.READY_TO_ACCEPT]: { label: "요청 접수", tone: BADGE_TONE.NEUTRAL },
  [DRIVER_UI_STATE.NEGOTIATING]: { label: "협상 중", tone: BADGE_TONE.ATTENTION },
  [DRIVER_UI_STATE.ASSIGNED]: { label: "배차 완료", tone: BADGE_TONE.ATTENTION },
  [DRIVER_UI_STATE.PICKUP_IN_PROGRESS]: { label: "상차 중", tone: BADGE_TONE.PROGRESS },
  [DRIVER_UI_STATE.TRANSIT_IN_PROGRESS]: { label: "운송 중", tone: BADGE_TONE.PROGRESS },
  [DRIVER_UI_STATE.COMPLETED]: { label: "운송 완료", tone: BADGE_TONE.CLOSED },
  [DRIVER_UI_STATE.CANCELED]: { label: "배차 취소", tone: BADGE_TONE.CLOSED },
  [DRIVER_UI_STATE.UNKNOWN]: { label: "상태 확인", tone: BADGE_TONE.NEUTRAL },
};

export function getCustomerBadge(uiState: CustomerUiState): StateBadgePolicy {
  return CUSTOMER_BADGE_MAP[uiState] ?? CUSTOMER_BADGE_MAP[CUSTOMER_UI_STATE.UNKNOWN];
}

export function getDriverBadge(uiState: DriverUiState): StateBadgePolicy {
  return DRIVER_BADGE_MAP[uiState] ?? DRIVER_BADGE_MAP[DRIVER_UI_STATE.UNKNOWN];
}
