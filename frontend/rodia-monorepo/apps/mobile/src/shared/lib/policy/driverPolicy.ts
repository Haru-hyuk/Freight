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

/**
 * 기사 정책
 * - 상태를 보고 기사 화면의 행동/문구/정렬 우선순위를 결정한다.
 * - 입력: `BackendStatus`, `DriverUiState`, `photoGatePassed`
 * - 출력: 도메인 분류, 행동 버튼, 상태 타이틀, 정렬 우선순위
 */
// ── 정책표 (정규화된 BackendStatus → DriverUiState) ──────────────────────────
// 백엔드 원본 상태값(`rawStatus`) 8종:
//   OPEN      → OPEN             → READY_TO_ACCEPT
//   MATCHED   → MATCHED          → ASSIGNED
//   IN_TRANSIT → IN_TRANSIT      → TRANSIT_IN_PROGRESS
//   DELIVERED → DELIVERED        → COMPLETED
//   READY     → READY (매칭)      → ASSIGNED
//   COMPLETED → COMPLETED        → COMPLETED
//   CANCELLED → CANCELLED        → CANCELED
//   UNKNOWN   → UNKNOWN          → UNKNOWN
const DRIVER_UI_STATE_BY_BACKEND_STATUS: Readonly<Record<BackendStatus, DriverUiState>> = {
  [BACKEND_STATUS.OPEN]: DRIVER_UI_STATE.READY_TO_ACCEPT,
  [BACKEND_STATUS.MATCHED]: DRIVER_UI_STATE.ASSIGNED,
  [BACKEND_STATUS.IN_TRANSIT]: DRIVER_UI_STATE.TRANSIT_IN_PROGRESS,
  [BACKEND_STATUS.DELIVERED]: DRIVER_UI_STATE.COMPLETED,
  [BACKEND_STATUS.READY]: DRIVER_UI_STATE.ASSIGNED,
  [BACKEND_STATUS.COMPLETED]: DRIVER_UI_STATE.COMPLETED,
  [BACKEND_STATUS.CANCELLED]: DRIVER_UI_STATE.CANCELED,
  [BACKEND_STATUS.UNKNOWN]: DRIVER_UI_STATE.UNKNOWN,
};

const DRIVER_STATUS_TITLE_MAP: Readonly<Record<DriverUiState, string>> = {
  [DRIVER_UI_STATE.READY_TO_ACCEPT]: "배차 요청이 도착했습니다",
  [DRIVER_UI_STATE.NEGOTIATING]: "운임 협의가 진행 중입니다",
  [DRIVER_UI_STATE.ASSIGNED]: "결제 대기 중입니다",
  [DRIVER_UI_STATE.PICKUP_IN_PROGRESS]: "운행 준비 중입니다",
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
    id: DRIVER_CTA_ID.PAYMENT_PENDING,
    label: "결제 대기",
    variant: CTA_VARIANT.SECONDARY,
    enabled: false,
  },
  [DRIVER_UI_STATE.PICKUP_IN_PROGRESS]: {
    id: DRIVER_CTA_ID.PAYMENT_PENDING,
    label: "운행 준비 중",
    variant: CTA_VARIANT.SECONDARY,
    enabled: false,
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

export type DriverDomain = "market" | "my" | "run" | "unknown";

// 백엔드 상태를 기사 탭 도메인(마켓/내오더/운행)으로 분류하는 정책
export function getDriverDomain(backendStatus: BackendStatus): DriverDomain {
  if (backendStatus === BACKEND_STATUS.OPEN) return "market";
  if (backendStatus === BACKEND_STATUS.MATCHED || backendStatus === BACKEND_STATUS.READY) return "my";
  if (
    backendStatus === BACKEND_STATUS.IN_TRANSIT ||
    backendStatus === BACKEND_STATUS.DELIVERED ||
    backendStatus === BACKEND_STATUS.COMPLETED
  ) {
    return "run";
  }
  return "unknown";
}

export function getDriverCta(
  uiState: DriverUiState,
  photoGatePassed: boolean,
): DriverCtaConfig {
  // 사진 게이트 미통과 시, 주행 관련 주요 액션을 강제로 차단한다.
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

// 기사 상태에 따른 상단 상태 문구 정책
export function getDriverStatusTitle(uiState: DriverUiState): string {
  return DRIVER_STATUS_TITLE_MAP[uiState] ?? DRIVER_STATUS_TITLE_MAP[DRIVER_UI_STATE.UNKNOWN];
}

// 기사 오더 목록 정렬 우선순위 정책(숫자가 작을수록 먼저 노출)
export function getDriverOrderSortPriority(uiState: DriverUiState): number {
  return DRIVER_ORDER_SORT_PRIORITY_MAP[uiState] ?? DRIVER_ORDER_SORT_PRIORITY_MAP[DRIVER_UI_STATE.UNKNOWN];
}

/**
 * 레거시/목 경로 호환을 위한 보조 함수입니다.
 * 백엔드에서 `uiState`를 아직 제공하지 않는 경우를 대비합니다.
 * 백엔드 계약이 준비되면 화면 계층은 변환 없이 `uiState`를 직접 사용해야 합니다.
 */
export function getDriverUiStateFromBackendStatus(rawStatus: string): DriverUiState {
  const backendStatus = normalizeStatus(rawStatus);
  return DRIVER_UI_STATE_BY_BACKEND_STATUS[backendStatus] ?? DRIVER_UI_STATE.UNKNOWN;
}
