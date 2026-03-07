// src/features/settlement/api/shipper-settlement-api.ts
//
// Generated 함수:
//   getByMatch() ← shipper-settlement (GET /api/shipper/settlements?matchId=…)
// Generated 스키마:
//   GetByMatchParams, SettlementResponse
//
// UI 레이어가 generated/ 세부사항에 의존하지 않도록 래핑·재공개한다.

import { getByMatch as getByMatchGenerated } from "@/shared/api/generated/shipper-settlement/shipper-settlement";
import type { GetByMatchParams, SettlementResponse } from "@/shared/api/generated/schemas";

// ─── 타입 재공개 ──────────────────────────────────────────────────────────────

export type { SettlementResponse };

// ─── 공개 API 함수 ────────────────────────────────────────────────────────────

/**
 * 매칭별 정산 조회
 */
export async function getShipperSettlementByMatch(params: GetByMatchParams): Promise<SettlementResponse> {
  return getByMatchGenerated(params);
}
