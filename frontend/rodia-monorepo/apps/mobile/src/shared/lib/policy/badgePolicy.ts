import {
  BADGE_TONE,
  CUSTOMER_UI_STATE,
  DRIVER_UI_STATE,
  type CustomerUiState,
  type DriverUiState,
  type StateBadgePolicy,
} from "./types";

/**
 * 화주 전용 배지 매핑
 * - REQUESTED: 오더가 생성되어 기사에게 노출되기 시작한 초기 상태
 * - ATTENTION: 화주가 가격 협의를 승인하거나 결제를 진행해야 하는 '액션 차례'
 * - PROGRESS: 실제 운송 인프라(차량)가 움직이고 있는 실시간 상태
 */
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
/**
 * 기사 전용 배지 매핑
 * - READY_TO_ACCEPT: 수락 가능한 신규 오더 목록에 표시될 때 사용
 * - NEGOTIATING: 기사가 역제안을 보낸 후 화주의 응답을 기다리는 중
 * - ASSIGNED: 배차는 완료되었으나 화주의 결제가 완료되기 전 (실제 운송 시작 전 대기)
 */
const DRIVER_BADGE_MAP: Readonly<Record<DriverUiState, StateBadgePolicy>> = {
  [DRIVER_UI_STATE.READY_TO_ACCEPT]: { label: "요청 접수", tone: BADGE_TONE.NEUTRAL },
  [DRIVER_UI_STATE.NEGOTIATING]: { label: "협상 중", tone: BADGE_TONE.ATTENTION },
  [DRIVER_UI_STATE.ASSIGNED]: { label: "결제 대기", tone: BADGE_TONE.ATTENTION },
  [DRIVER_UI_STATE.PICKUP_IN_PROGRESS]: { label: "상차 중", tone: BADGE_TONE.PROGRESS },
  [DRIVER_UI_STATE.TRANSIT_IN_PROGRESS]: { label: "운송 중", tone: BADGE_TONE.PROGRESS },
  [DRIVER_UI_STATE.COMPLETED]: { label: "운송 완료", tone: BADGE_TONE.CLOSED },
  [DRIVER_UI_STATE.CANCELED]: { label: "취소", tone: BADGE_TONE.CLOSED },
  [DRIVER_UI_STATE.UNKNOWN]: { label: "상태 확인", tone: BADGE_TONE.NEUTRAL },
};

export function getCustomerBadge(uiState: CustomerUiState): StateBadgePolicy {
  return CUSTOMER_BADGE_MAP[uiState] ?? CUSTOMER_BADGE_MAP[CUSTOMER_UI_STATE.UNKNOWN];
}

export function getDriverBadge(uiState: DriverUiState): StateBadgePolicy {
  return DRIVER_BADGE_MAP[uiState] ?? DRIVER_BADGE_MAP[DRIVER_UI_STATE.UNKNOWN];
}
