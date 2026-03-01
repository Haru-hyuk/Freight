import { normalizeStatus } from "./normalizeStatus";
import { BACKEND_STATUS, type BackendStatus, type ProgressStep } from "./types";

/**
 * 운송 진행도 정책
 * - 입력 `rawStatus`를 `BackendStatus`로 정규화한 뒤, 진행 단계 인덱스를 반환한다.
 */
export const DELIVERY_PROGRESS_STEPS: readonly ProgressStep[] = [
  { key: "REQUEST", label: "요청 접수" },
  { key: "ASSIGNED", label: "배차 확정" },
  { key: "PICKUP", label: "상차" },
  { key: "TRANSIT", label: "운송 중" },
  { key: "DONE", label: "완료" },
] as const;

const ACTIVE_STEP_INDEX_BY_STATUS: Readonly<Record<BackendStatus, number>> = {
  [BACKEND_STATUS.OPEN]: 0,           // 요청 접수
  [BACKEND_STATUS.MATCHED]: 1,        // 배차 확정
  [BACKEND_STATUS.IN_TRANSIT]: 3,     // 운송 중
  [BACKEND_STATUS.DELIVERED]: 4,      // 완료
  [BACKEND_STATUS.READY]: 1,          // READY (Match): 배차 확정
  [BACKEND_STATUS.COMPLETED]: 4,      // 완료
  [BACKEND_STATUS.CANCELLED]: 0,      // 취소: 초기 상태로
  [BACKEND_STATUS.UNKNOWN]: 0,        // 미지: 초기 상태로
};

// 진행도 바의 활성 단계 인덱스 계산
export function getActiveStepIndex(rawStatus: string): number {
  const backendStatus = normalizeStatus(rawStatus);
  return ACTIVE_STEP_INDEX_BY_STATUS[backendStatus] ?? 0;
}
