import type {
  CounterOfferResponse,
  MatchResponse,
  QuoteDetailResponse,
  QuoteListResponse,
} from "@/shared/api/generated/schemas";

import {
  cloneCounterOffer,
  cloneMatch,
  cloneQuoteDetail,
  compareByUpdatedAtDesc,
  getMockFlowState,
  normalizeStatus,
  parseQuoteIdentifier,
  toPositiveInt,
} from "./store";

export const MOCK_FLOW_DRIVER_ORDER_TAG_KEYS = ["AI_RECOMMENDED", "COMBINED", "WAYPOINT", "URGENT"] as const;
export type MockFlowDriverOrderTagKey = (typeof MOCK_FLOW_DRIVER_ORDER_TAG_KEYS)[number];
export type MockFlowDriverOrderScope = "market" | "my";

export type MockFlowDriverOrderDecoration = {
  fallbackOriginAddress?: string;
  fallbackDestinationAddress?: string;
  fallbackVehicleText?: string;
  fallbackMethodText?: string;
  fallbackCargoText?: string;
  pickupTimeText?: string;
  emptyDistanceText?: string;
  fallbackPriceValue?: number;
  tagKeys: MockFlowDriverOrderTagKey[];
};

export type MockFlowAiRecommendedDecoration = {
  priceValue: number;
  pickupTimeText: string;
  emptyDistanceText: string;
  addUrgentTag: boolean;
};

type MockFlowDriverOrderFlags = {
  aiRecommended?: boolean;
  combined?: boolean;
  waypoint?: boolean;
  urgent?: boolean;
};

const MOCK_ORIGIN_POOL = [
  "경기 화성시 향남읍",
  "인천 연수구 송도동",
  "서울 강서구 마곡동",
  "경기 안산시 단원구",
  "경기 김포시 고촌읍",
];

const MOCK_DESTINATION_POOL = [
  "대전 대덕구 대화동",
  "부산 강서구 녹산동",
  "전북 군산시 소룡동",
  "충남 아산시 둔포면",
  "경북 칠곡군 왜관읍",
];

const MOCK_VEHICLE_POOL = ["1톤 카고", "2.5톤 윙바디", "5톤 탑차"];
const MOCK_METHOD_POOL = ["고객 상차 / 기사 하차", "기사 상차 / 지게차 하차", "기사 상차 / 기사 하차"];
const MOCK_CARGO_POOL = ["생활가전", "전자부품", "공산품"];
const MOCK_PICKUP_HINT_POOL = ["즉시 상차 가능", "30분 내 상차", "1시간 내 상차"];

function pickFromPool(pool: readonly string[], seed: number): string {
  if (pool.length <= 0) return "";
  return pool[Math.abs(seed) % pool.length] ?? "";
}

function toMockFlowTagKeys(flags: MockFlowDriverOrderFlags): MockFlowDriverOrderTagKey[] {
  const keys: MockFlowDriverOrderTagKey[] = [];
  if (flags.aiRecommended) keys.push("AI_RECOMMENDED");
  if (flags.combined) keys.push("COMBINED");
  if (flags.waypoint) keys.push("WAYPOINT");
  if (flags.urgent) keys.push("URGENT");
  return keys;
}

function buildMockFlowOrderFlags(seed: number): MockFlowDriverOrderFlags {
  const mod = Math.abs(seed) % 5;
  if (mod === 0) return { aiRecommended: true, urgent: true };
  if (mod === 1) return { combined: true };
  if (mod === 2) return { waypoint: true };
  if (mod === 3) return { aiRecommended: true, combined: true };
  return { urgent: true };
}

function toEmptyDistanceText(seed: number): string {
  const distanceKm = 2.1 + ((seed + 3) % 7) * 0.9;
  return `공차 ${distanceKm.toFixed(1)}km`;
}

export function selectMockFlowDriverOrderDecoration(
  seed: number,
  scope: MockFlowDriverOrderScope
): MockFlowDriverOrderDecoration {
  const safeSeed = Math.abs(Math.trunc(seed)) || 1;
  const flags = buildMockFlowOrderFlags(safeSeed + (scope === "my" ? 7 : 0));

  return {
    fallbackOriginAddress: pickFromPool(MOCK_ORIGIN_POOL, safeSeed),
    fallbackDestinationAddress: pickFromPool(MOCK_DESTINATION_POOL, safeSeed + 1),
    fallbackVehicleText: pickFromPool(MOCK_VEHICLE_POOL, safeSeed),
    fallbackMethodText: pickFromPool(MOCK_METHOD_POOL, safeSeed + 2),
    fallbackCargoText: pickFromPool(MOCK_CARGO_POOL, safeSeed + 3),
    pickupTimeText: pickFromPool(MOCK_PICKUP_HINT_POOL, safeSeed),
    emptyDistanceText: toEmptyDistanceText(safeSeed),
    fallbackPriceValue: 120000 + (safeSeed % 8) * 12000,
    tagKeys: toMockFlowTagKeys(flags),
  };
}

export function selectMockFlowAiRecommendedDecoration(
  seed: number,
  basePriceValue: number
): MockFlowAiRecommendedDecoration {
  const safeSeed = Math.abs(Math.trunc(seed)) || 1;
  const safeBasePrice = Number.isFinite(basePriceValue) && basePriceValue > 0 ? Math.trunc(basePriceValue) : 150000;
  return {
    priceValue: safeBasePrice + 15000,
    pickupTimeText: "AI 추천: 즉시 상차 가능",
    emptyDistanceText: toEmptyDistanceText(safeSeed + 5),
    addUrgentTag: true,
  };
}

function toQuoteListItem(detail: QuoteDetailResponse): QuoteListResponse {
  return {
    quoteId: detail.quoteId,
    quotePublicId: detail.quotePublicId,
    truckId: detail.truckId,
    originAddress: detail.originAddress,
    destinationAddress: detail.destinationAddress,
    distanceKm: detail.distanceKm,
    vehicleType: detail.vehicleType,
    vehicleBodyType: detail.vehicleBodyType,
    cargoName: detail.cargoName,
    desiredPrice: detail.desiredPrice,
    finalPrice: detail.finalPrice,
    status: normalizeStatus(detail.status),
    createdAt: detail.createdAt,
  };
}

export function listMockFlowShipperQuotes(): QuoteListResponse[] {
  const state = getMockFlowState();

  return Array.from(state.quotesById.values())
    .map((detail) => cloneQuoteDetail(detail))
    .sort((a, b) => compareByUpdatedAtDesc(a, b))
    .map((detail) => toQuoteListItem(detail));
}

export function getMockFlowShipperQuoteDetail(quoteId: number): QuoteDetailResponse | null {
  const state = getMockFlowState();
  const safeQuoteId = toPositiveInt(quoteId);
  if (safeQuoteId <= 0) return null;

  const detail = state.quotesById.get(safeQuoteId);
  return detail ? cloneQuoteDetail(detail) : null;
}

export function getMockFlowShipperQuoteDetailByIdentifier(identifier: string): QuoteDetailResponse | null {
  const quoteId = parseQuoteIdentifier(identifier);
  if (quoteId <= 0) return null;
  return getMockFlowShipperQuoteDetail(quoteId);
}

export function listMockFlowDriverOpenMatches(): MatchResponse[] {
  const state = getMockFlowState();

  return Array.from(state.matchesById.values())
    .map((match) => cloneMatch(match))
    .filter((match) => {
      if (match.accepted === true) return false;
      return normalizeStatus(match.status) !== "CANCELED";
    })
    .sort((a, b) => compareByUpdatedAtDesc(a, b));
}

export function listMockFlowDriverMyMatches(): MatchResponse[] {
  const state = getMockFlowState();

  return Array.from(state.matchesById.values())
    .map((match) => cloneMatch(match))
    .filter((match) => match.accepted === true || toPositiveInt(match.driverId) > 0)
    .sort((a, b) => compareByUpdatedAtDesc(a, b));
}

export function listMockFlowShipperMatches(): MatchResponse[] {
  const state = getMockFlowState();
  return Array.from(state.matchesById.values())
    .map((match) => cloneMatch(match))
    .sort((a, b) => compareByUpdatedAtDesc(a, b));
}

export function getMockFlowDriverMatch(matchId: number): MatchResponse | null {
  const state = getMockFlowState();
  const safeMatchId = toPositiveInt(matchId);
  if (safeMatchId <= 0) return null;

  const match = state.matchesById.get(safeMatchId);
  return match ? cloneMatch(match) : null;
}

export function listMockFlowDriverCounterOffersByQuote(quoteId: number): CounterOfferResponse[] {
  const state = getMockFlowState();
  const safeQuoteId = toPositiveInt(quoteId);
  if (safeQuoteId <= 0) return [];

  const ids = state.counterOfferIdsByQuote.get(safeQuoteId) ?? [];
  const list = ids
    .map((id) => state.counterOffersById.get(id))
    .filter((offer): offer is CounterOfferResponse => Boolean(offer))
    .map((offer) => cloneCounterOffer(offer))
    .sort((a, b) => compareByUpdatedAtDesc(a, b));

  if (list.length > 0) return list;

  return Array.from(state.counterOffersById.values())
    .filter((offer) => toPositiveInt(offer.quoteId) === safeQuoteId)
    .map((offer) => cloneCounterOffer(offer))
    .sort((a, b) => compareByUpdatedAtDesc(a, b));
}

export function listMockFlowMyDriverCounterOffers(): CounterOfferResponse[] {
  const state = getMockFlowState();
  return Array.from(state.counterOffersById.values())
    .filter((offer) => toPositiveInt(offer.driverId) > 0)
    .map((offer) => cloneCounterOffer(offer))
    .sort((a, b) => compareByUpdatedAtDesc(a, b));
}

export function listMockFlowShipperCounterOffers(quoteId: number): CounterOfferResponse[] {
  return listMockFlowDriverCounterOffersByQuote(quoteId);
}
