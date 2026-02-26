import { normalizeStatus } from "./normalizeStatus";
import { BACKEND_STATUS, type BackendStatus, type ProgressStep } from "./types";

export const DELIVERY_PROGRESS_STEPS: readonly ProgressStep[] = [
  { key: "REQUEST", label: "요청 접수" },
  { key: "ASSIGNED", label: "배차 확정" },
  { key: "PICKUP", label: "상차" },
  { key: "TRANSIT", label: "운송 중" },
  { key: "DONE", label: "완료" },
] as const;

const ACTIVE_STEP_INDEX_BY_STATUS: Readonly<Record<BackendStatus, number>> = {
  [BACKEND_STATUS.READY]: 0,
  [BACKEND_STATUS.OPEN]: 0,
  [BACKEND_STATUS.NEGOTIATING]: 0,
  [BACKEND_STATUS.ASSIGNED]: 1,
  [BACKEND_STATUS.ACCEPTED]: 1,
  [BACKEND_STATUS.PICKUP]: 2,
  [BACKEND_STATUS.TRANSIT]: 3,
  [BACKEND_STATUS.DROPOFF]: 4,
  [BACKEND_STATUS.CANCELED]: 0,
  [BACKEND_STATUS.UNKNOWN]: 0,
};

export function getActiveStepIndex(rawStatus: string): number {
  const backendStatus = normalizeStatus(rawStatus);
  return ACTIVE_STEP_INDEX_BY_STATUS[backendStatus] ?? 0;
}
