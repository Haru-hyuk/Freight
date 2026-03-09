// src/features/quote/api/delivery-photo-api.ts
//
// Generated 함수:
//   getShipperMatchPhotos() ← delivery-photo-controller (GET /api/shipper/matches/{matchId}/photos)
// Generated 스키마:
//   DeliveryPhotoResponse
//
// UI 레이어가 generated/ 세부사항에 의존하지 않도록 래핑·재공개한다.

import { getShipperMatchPhotos as getShipperMatchPhotosGenerated } from "@/shared/api/generated/delivery-photo/delivery-photo";
import type { DeliveryPhotoResponse } from "@/shared/api/generated/schemas";

// ─── 타입 재공개 ──────────────────────────────────────────────────────────────

export type { DeliveryPhotoResponse };

// ─── 공개 API 함수 ────────────────────────────────────────────────────────────

/**
 * 화주 매칭 내 배송 사진 목록 조회
 */
export async function getShipperQuotePhotos(matchId: number): Promise<DeliveryPhotoResponse[]> {
  return getShipperMatchPhotosGenerated(matchId);
}

