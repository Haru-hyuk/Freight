// src/features/matching/api/driver-load-plan-api.ts
//
// Generated 함수:
//   previewLoadPlan() ← driver-optimization (POST /api/driver/optimization/load-plan-preview)
// Generated 스키마:
//   LoadPlanPreviewRequest, LoadPlanResponse, Placement, TruckSpecReferenceResponse
//
// UI 레이어가 generated/ 세부사항에 의존하지 않도록 래핑·재공개한다.

import { previewLoadPlan as previewLoadPlanGenerated } from "@/shared/api/generated/driver-optimization/driver-optimization";
import type { LoadPlanPreviewRequest } from "@/shared/api/generated/schemas";

// ─── 타입 재공개 ──────────────────────────────────────────────────────────────

export type { LoadPlanResponse, Placement, TruckSpecReferenceResponse } from "@/shared/api/generated/schemas";

// ─── 공개 API 함수 ────────────────────────────────────────────────────────────

/**
 * 3D 적재 계획 미리보기 (수락 없음)
 *
 * - 서버 응답 타입이 unknown이므로 호출 결과를 그대로 반환한다.
 * - 정규화/파싱은 DriverOrderDetailPage의 resolveLoadPlanPreview에서 수행.
 */
export async function previewDriverLoadPlan(request: LoadPlanPreviewRequest): Promise<unknown> {
  return previewLoadPlanGenerated(request);
}
