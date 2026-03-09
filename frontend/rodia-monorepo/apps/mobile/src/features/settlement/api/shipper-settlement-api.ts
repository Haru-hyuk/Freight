// src/features/settlement/api/shipper-settlement-api.ts
//
// shipper-settings wrapper를 경유해 응답 정규화 규칙을 단일화한다.

import {
  getShipperSettlementByMatch as getShipperSettlementByMatchFromSettings,
  type SettlementResponse,
} from "@/features/shipper-settings/api/shipper-settlement-api";
import type { GetByMatchParams } from "@/shared/api/generated/schemas";

// ─── 타입 재공개 ──────────────────────────────────────────────────────────────

export type { SettlementResponse };

// ─── 공개 API 함수 ────────────────────────────────────────────────────────────

/**
 * 매칭별 정산 조회
 */
export async function getShipperSettlementByMatch(params: GetByMatchParams): Promise<SettlementResponse> {
  return getShipperSettlementByMatchFromSettings(params.matchId);
}
