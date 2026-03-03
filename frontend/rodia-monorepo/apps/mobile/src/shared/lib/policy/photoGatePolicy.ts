import { DRIVER_UI_STATE, type DriverUiState } from "./types";

/**
 * 사진 게이트 정책 (기사)
 * - 특정 운행 상태에서 인증 사진이 없으면 주요 액션을 차단한다.
 */
const PHOTO_GATE_REQUIRED_STATE_SET: ReadonlySet<DriverUiState> = new Set<DriverUiState>([
  DRIVER_UI_STATE.PICKUP_IN_PROGRESS,
  DRIVER_UI_STATE.TRANSIT_IN_PROGRESS,
]);

export function isPhotoGateRequired(uiState: DriverUiState): boolean {
  return PHOTO_GATE_REQUIRED_STATE_SET.has(uiState);
}

// 게이트 대상 상태 + 미통과인 경우 차단
export function shouldBlockDriverPrimaryActionForPhotoGate(
  uiState: DriverUiState,
  photoGatePassed: boolean
): boolean {
  return isPhotoGateRequired(uiState) && !photoGatePassed;
}

// 차단 상태에서 노출할 버튼 라벨 정책
export function getPhotoGatePendingCtaLabel(uiState: DriverUiState): string {
  if (uiState === DRIVER_UI_STATE.PICKUP_IN_PROGRESS) return "상차 인증 대기";
  if (uiState === DRIVER_UI_STATE.TRANSIT_IN_PROGRESS) return "하차 인증 대기";
  return "인증 확인 대기";
}

// 차단 상태에서 노출할 안내 문구 정책
export function getPhotoGateHint(uiState: DriverUiState, photoGatePassed: boolean): string | null {
  if (!shouldBlockDriverPrimaryActionForPhotoGate(uiState, photoGatePassed)) return null;
  if (uiState === DRIVER_UI_STATE.PICKUP_IN_PROGRESS) return "상차 인증 사진 확인 후 진행할 수 있어요.";
  if (uiState === DRIVER_UI_STATE.TRANSIT_IN_PROGRESS) return "하차 인증 사진 확인 후 완료할 수 있어요.";
  return "인증 사진 확인 후 진행할 수 있어요.";
}
