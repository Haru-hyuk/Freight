import { normalizeStatus } from "./normalizeStatus";
import {
  BACKEND_STATUS,
  CTA_VARIANT,
  DRIVER_CTA_ID,
  DRIVER_UI_STATE,
  type BackendStatus,
  type DriverCtaConfig,
  type DriverUiState,
} from "./types";
import { getPhotoGatePendingCtaLabel, shouldBlockDriverPrimaryActionForPhotoGate } from "./photoGatePolicy";

const DRIVER_UI_STATE_BY_BACKEND_STATUS: Readonly<Record<BackendStatus, DriverUiState>> = {
  [BACKEND_STATUS.READY]: DRIVER_UI_STATE.ASSIGNED,
  [BACKEND_STATUS.OPEN]: DRIVER_UI_STATE.READY_TO_ACCEPT,
  [BACKEND_STATUS.NEGOTIATING]: DRIVER_UI_STATE.NEGOTIATING,
  [BACKEND_STATUS.ASSIGNED]: DRIVER_UI_STATE.ASSIGNED,
  [BACKEND_STATUS.ACCEPTED]: DRIVER_UI_STATE.ASSIGNED,
  [BACKEND_STATUS.PICKUP]: DRIVER_UI_STATE.PICKUP_IN_PROGRESS,
  [BACKEND_STATUS.TRANSIT]: DRIVER_UI_STATE.TRANSIT_IN_PROGRESS,
  [BACKEND_STATUS.DROPOFF]: DRIVER_UI_STATE.COMPLETED,
  [BACKEND_STATUS.CANCELED]: DRIVER_UI_STATE.CANCELED,
  [BACKEND_STATUS.UNKNOWN]: DRIVER_UI_STATE.UNKNOWN,
};

const DRIVER_STATUS_TITLE_MAP: Readonly<Record<DriverUiState, string>> = {
  [DRIVER_UI_STATE.READY_TO_ACCEPT]: "배차 요청이 도착했습니다",
  [DRIVER_UI_STATE.NEGOTIATING]: "운임 협의가 진행 중입니다",
  [DRIVER_UI_STATE.ASSIGNED]: "배차가 확정되었습니다",
  [DRIVER_UI_STATE.PICKUP_IN_PROGRESS]: "상차 진행 상태를 확인해주세요",
  [DRIVER_UI_STATE.TRANSIT_IN_PROGRESS]: "운송 중 상태를 확인해주세요",
  [DRIVER_UI_STATE.COMPLETED]: "운송이 완료되었습니다",
  [DRIVER_UI_STATE.CANCELED]: "배차가 취소되었습니다",
  [DRIVER_UI_STATE.UNKNOWN]: "상태 확인이 필요합니다",
};

const DRIVER_DEFAULT_CTA_MAP: Readonly<Record<DriverUiState, DriverCtaConfig>> = {
  [DRIVER_UI_STATE.READY_TO_ACCEPT]: {
    id: DRIVER_CTA_ID.ACCEPT_MATCH,
    label: "배차 수락",
    variant: CTA_VARIANT.PRIMARY,
    enabled: true,
  },
  [DRIVER_UI_STATE.NEGOTIATING]: {
    id: DRIVER_CTA_ID.SEND_OFFER,
    label: "운임 제안",
    variant: CTA_VARIANT.SECONDARY,
    enabled: true,
  },
  [DRIVER_UI_STATE.ASSIGNED]: {
    id: DRIVER_CTA_ID.START_DRIVE,
    label: "운행 준비 시작",
    variant: CTA_VARIANT.PRIMARY,
    enabled: true,
  },
  [DRIVER_UI_STATE.PICKUP_IN_PROGRESS]: {
    id: DRIVER_CTA_ID.START_DRIVE,
    label: "상차 진행",
    variant: CTA_VARIANT.PRIMARY,
    enabled: true,
  },
  [DRIVER_UI_STATE.TRANSIT_IN_PROGRESS]: {
    id: DRIVER_CTA_ID.MARK_DROPOFF,
    label: "하차 완료",
    variant: CTA_VARIANT.PRIMARY,
    enabled: true,
  },
  [DRIVER_UI_STATE.COMPLETED]: {
    id: DRIVER_CTA_ID.VIEW_RESULT,
    label: "운행 결과 확인",
    variant: CTA_VARIANT.SECONDARY,
    enabled: true,
  },
  [DRIVER_UI_STATE.CANCELED]: {
    id: DRIVER_CTA_ID.VIEW_RESULT,
    label: "취소 내역 확인",
    variant: CTA_VARIANT.SECONDARY,
    enabled: true,
  },
  [DRIVER_UI_STATE.UNKNOWN]: {
    id: DRIVER_CTA_ID.VIEW_RESULT,
    label: "상태 확인",
    variant: CTA_VARIANT.DISABLED,
    enabled: false,
  },
};

const DRIVER_ASSIGNED_PAYMENT_PENDING_CTA: DriverCtaConfig = {
  id: DRIVER_CTA_ID.PAYMENT_PENDING,
  label: "결제 확인 중",
  variant: CTA_VARIANT.DISABLED,
  enabled: false,
};

const DRIVER_ORDER_SORT_PRIORITY_MAP: Readonly<Record<DriverUiState, number>> = {
  [DRIVER_UI_STATE.READY_TO_ACCEPT]: 0,
  [DRIVER_UI_STATE.NEGOTIATING]: 1,
  [DRIVER_UI_STATE.ASSIGNED]: 2,
  [DRIVER_UI_STATE.PICKUP_IN_PROGRESS]: 3,
  [DRIVER_UI_STATE.TRANSIT_IN_PROGRESS]: 4,
  [DRIVER_UI_STATE.COMPLETED]: 5,
  [DRIVER_UI_STATE.CANCELED]: 6,
  [DRIVER_UI_STATE.UNKNOWN]: 7,
};

export function getDriverCta(
  uiState: DriverUiState,
  photoGatePassed: boolean,
  rawBackendStatus: BackendStatus = BACKEND_STATUS.UNKNOWN
): DriverCtaConfig {
  if (uiState === DRIVER_UI_STATE.ASSIGNED && rawBackendStatus === BACKEND_STATUS.ASSIGNED) {
    return DRIVER_ASSIGNED_PAYMENT_PENDING_CTA;
  }

  if (shouldBlockDriverPrimaryActionForPhotoGate(uiState, photoGatePassed)) {
    return {
      id: DRIVER_CTA_ID.PHOTO_GATE_PENDING,
      label: getPhotoGatePendingCtaLabel(uiState),
      variant: CTA_VARIANT.DISABLED,
      enabled: false,
    };
  }

  return DRIVER_DEFAULT_CTA_MAP[uiState] ?? DRIVER_DEFAULT_CTA_MAP[DRIVER_UI_STATE.UNKNOWN];
}

export function getDriverStatusTitle(uiState: DriverUiState): string {
  return DRIVER_STATUS_TITLE_MAP[uiState] ?? DRIVER_STATUS_TITLE_MAP[DRIVER_UI_STATE.UNKNOWN];
}

export function getDriverOrderSortPriority(uiState: DriverUiState): number {
  return DRIVER_ORDER_SORT_PRIORITY_MAP[uiState] ?? DRIVER_ORDER_SORT_PRIORITY_MAP[DRIVER_UI_STATE.UNKNOWN];
}

/**
 * Compat helper for legacy/mock paths where backend uiState is not available yet.
 * UI layer should consume uiState directly when backend contract is ready.
 */
export function getDriverUiStateFromBackendStatus(rawStatus: string): DriverUiState {
  const backendStatus = normalizeStatus(rawStatus);
  return DRIVER_UI_STATE_BY_BACKEND_STATUS[backendStatus] ?? DRIVER_UI_STATE.UNKNOWN;
}
