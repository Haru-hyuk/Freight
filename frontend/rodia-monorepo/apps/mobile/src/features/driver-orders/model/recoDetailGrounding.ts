/**
 * recoDetailGrounding.ts
 *
 * 추천 상세(DriverMarketRecommendationPage) 데이터 구조 근거
 * - 추측 금지: 아래 모든 항목은 openapi generated schema / API 응답 / 기존 매퍼 코드에서 확인한 것만 기재
 *
 * ─────────────────────────────────────────────────────────────
 * 1. 추천 상세 관련 파일 위치
 * ─────────────────────────────────────────────────────────────
 *  - 페이지:       apps/mobile/src/pages/driver/matching/DriverMarketRecommendationPage.tsx
 *  - 선택 상태:    apps/mobile/src/features/driver-orders/model/marketRecommendationSelection.ts
 *                  → DriverMarketRecommendationSelection { key, recommendation, orders, mode, ... }
 *  - 오더 타입:    apps/mobile/src/features/matching/api/driver-orders-api.ts
 *                  → DriverRouteRecommendation { quoteIds: number[], ... }
 *                  → DriverOrderCard { matchId: number, quoteId: number, ... }
 *  - 적재 플랜:    apps/mobile/src/shared/api/generated/schemas/loadPlanResponse.ts
 *                  → LoadPlanResponse { placements?: Placement[] }
 *                  apps/mobile/src/shared/api/generated/schemas/placement.ts
 *                  → Placement { id?, x,y,z, width,length,height, weight, stopOrder?, ... }
 *  - 견적 타입:    apps/mobile/src/entities/quote/model/quote.types.ts
 *                  → QuoteDetailResponse { quoteId, quoteItems: QuoteItem[], ... }
 *                  → QuoteItem { quoteItemId, quantity, lengthCm, widthCm, heightCm, ... }
 *
 * ─────────────────────────────────────────────────────────────
 * 2. 적재물 그룹 키: Placement.stopOrder
 * ─────────────────────────────────────────────────────────────
 *  - previewLoadPlan API (driver-optimization-controller)가 반환하는 LoadPlanResponse.placements[]의
 *    각 Placement는 stopOrder 필드를 가진다.
 *  - stopOrder는 1-based 정수로, 추천 recommendation.quoteIds 배열 내 quote의 순서(인덱스+1)에 대응한다.
 *    예) quoteIds = [101, 202] → stopOrder=1 아이템들은 quoteId=101, stopOrder=2는 quoteId=202
 *  - previewLoadPlan 실패 시 buildFallbackPlacements()가 quoteIds 순서대로 stopOrder를 부여한다.
 *  - 따라서 그룹 키는 Placement.stopOrder이며, "같은 stopOrder = 같은 오더(quoteId)의 적재물"을 의미한다.
 *
 * ─────────────────────────────────────────────────────────────
 * 3. 하단 CTA 렌더링 게이트 / 상태 전이 근거
 * ─────────────────────────────────────────────────────────────
 *  - groupedMatchIds: orderedOrders에서 중복 없이 추출한 matchId 배열 (DriverOrderCard.matchId > 0)
 *  - 배차 수락 CTA: groupedMatchIds.length > 0 이어야 활성화
 *      → length === 0이면 수락 가능한 매칭 없음 → disabled
 *  - 운임 제안 CTA: primaryOrder(orderedOrders[0]) 존재 여부로 게이트
 *      → null이면 disabled
 *  - busy lock: isBusy(배차 수락 중) | isSubmittingOffer(운임 제안 중) 중 하나라도 true면
 *    양쪽 CTA 모두 disabled
 *  - 단건(length===1): 기존 acceptDriverMatch() 단건 호출 유지
 *    다건(length>1): acceptDriverMatchesBatch({ matchIds, routeType, orderedQuoteIds }) 호출
 */

/** 적재물 그룹화에 사용되는 기준 필드 */
export const CARGO_GROUP_KEY = "stopOrder" as const;

/**
 * 추천 상세 내 UI 정책 상수
 * - CHIP_SIZE_BASE: 적재물 번호 칩 기본 크기(px), scale=1.0 기준
 * - CHIP_GAP_BASE:  칩 간격(px), scale=1.0 기준
 * - CHIP_SCALE_MIN: 컨테이너 폭 초과 시 최소 축소 비율 (이하면 wrap 허용)
 */
export const RECO_CARGO_CHIP = {
  SIZE_BASE: 32,
  GAP_BASE: 6,
  SCALE_MIN: 0.65,
} as const;
