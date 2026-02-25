import type {
  CounterOfferResponse,
  MatchResponse,
  QuoteDetailResponse,
} from "@/shared/api/generated/schemas";

import { createMockFlowSeed } from "./seed";
import type { MockFlowSeed, MockFlowState } from "./types";

export function toPositiveInt(value: unknown): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

export function toNonNegativeInt(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.trunc(parsed));
}

export function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeStatus(value: unknown): string {
  const text = toText(value).toUpperCase();
  if (!text) return "";
  if (text === "CANCELLED") return "CANCELED";
  return text;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function parseQuoteIdentifier(identifier: unknown): number {
  const raw = toText(identifier);
  const numeric = toPositiveInt(raw);
  if (numeric > 0) return numeric;

  const match = /^mock-quote-(\d+)$/i.exec(raw);
  if (!match) return 0;
  return toPositiveInt(match[1]);
}

export function cloneQuoteDetail(detail: QuoteDetailResponse): QuoteDetailResponse {
  return {
    ...detail,
    checklistItems: Array.isArray(detail.checklistItems)
      ? detail.checklistItems.map((item) => ({ ...item }))
      : [],
    stops: Array.isArray(detail.stops) ? detail.stops.map((stop) => ({ ...stop })) : [],
  };
}

export function cloneMatch(match: MatchResponse): MatchResponse {
  return { ...match };
}

export function cloneCounterOffer(offer: CounterOfferResponse): CounterOfferResponse {
  return { ...offer };
}

export function compareByUpdatedAtDesc<T extends { updatedAt?: string; createdAt?: string }>(a: T, b: T): number {
  const aTs = Date.parse(a.updatedAt ?? a.createdAt ?? "");
  const bTs = Date.parse(b.updatedAt ?? b.createdAt ?? "");
  if (Number.isFinite(aTs) && Number.isFinite(bTs)) return bTs - aTs;
  if (Number.isFinite(bTs)) return 1;
  if (Number.isFinite(aTs)) return -1;
  return 0;
}

function addCounterOfferIndexMap(
  counterOfferIdsByQuote: Map<number, number[]>,
  offer: CounterOfferResponse
): void {
  const quoteId = toPositiveInt(offer.quoteId);
  const offerId = toPositiveInt(offer.counterOfferId);
  if (quoteId <= 0 || offerId <= 0) return;

  const current = counterOfferIdsByQuote.get(quoteId) ?? [];
  if (current.includes(offerId)) {
    counterOfferIdsByQuote.set(
      quoteId,
      [offerId, ...current.filter((id) => id !== offerId)]
    );
    return;
  }

  counterOfferIdsByQuote.set(quoteId, [offerId, ...current]);
}

function addCounterOfferIndex(state: MockFlowState, offer: CounterOfferResponse): void {
  addCounterOfferIndexMap(state.counterOfferIdsByQuote, offer);
}

function buildStateFromSeed(seed: MockFlowSeed): MockFlowState {
  const quotesById = new Map<number, QuoteDetailResponse>();
  const matchesById = new Map<number, MatchResponse>();
  const counterOffersById = new Map<number, CounterOfferResponse>();
  const counterOfferIdsByQuote = new Map<number, number[]>();

  let maxQuoteId = 0;
  let maxMatchId = 0;
  let maxCounterOfferId = 0;

  seed.quotes.forEach((quote) => {
    const quoteId = toPositiveInt(quote.quoteId);
    if (quoteId <= 0) return;
    quotesById.set(quoteId, cloneQuoteDetail(quote));
    if (quoteId > maxQuoteId) maxQuoteId = quoteId;
  });

  seed.matches.forEach((match) => {
    const matchId = toPositiveInt(match.matchId);
    if (matchId <= 0) return;
    matchesById.set(matchId, cloneMatch(match));
    if (matchId > maxMatchId) maxMatchId = matchId;
  });

  seed.counterOffers.forEach((offer) => {
    const offerId = toPositiveInt(offer.counterOfferId);
    if (offerId <= 0) return;
    const cloned = cloneCounterOffer(offer);
    counterOffersById.set(offerId, cloned);
    addCounterOfferIndexMap(counterOfferIdsByQuote, cloned);
    if (offerId > maxCounterOfferId) maxCounterOfferId = offerId;
  });

  return {
    quotesById,
    matchesById,
    counterOffersById,
    counterOfferIdsByQuote,
    nextQuoteId: toPositiveInt(seed.nextIds?.quoteId) || maxQuoteId + 1,
    nextMatchId: toPositiveInt(seed.nextIds?.matchId) || maxMatchId + 1,
    nextCounterOfferId: toPositiveInt(seed.nextIds?.counterOfferId) || maxCounterOfferId + 1,
  };
}

let flowState: MockFlowState | null = null;

export function getMockFlowState(): MockFlowState {
  if (!flowState) {
    flowState = buildStateFromSeed(createMockFlowSeed());
  }
  return flowState;
}

export function resetMockFlowState(): void {
  flowState = null;
}

export function indexCounterOffer(state: MockFlowState, offer: CounterOfferResponse): void {
  addCounterOfferIndex(state, offer);
}
