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
