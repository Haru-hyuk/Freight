import type {
  CounterOfferResponse,
  MatchResponse,
  QuoteDetailResponse,
} from "@/shared/api/generated/schemas";

export const MOCK_FLOW_QUOTE_STATUSES = [
  "OPEN",
  "NEGOTIATING",
  "ASSIGNED",
  "PICKUP",
  "TRANSIT",
  "DROPOFF",
  "CANCELED",
] as const;

export type MockFlowQuoteStatus = (typeof MOCK_FLOW_QUOTE_STATUSES)[number];

export const MOCK_FLOW_MATCH_STATUSES = [
  "READY",
  "OPEN",
  "NEGOTIATING",
  "ASSIGNED",
  "PICKUP",
  "TRANSIT",
  "DROPOFF",
  "CANCELED",
] as const;

export type MockFlowMatchStatus = (typeof MOCK_FLOW_MATCH_STATUSES)[number];

export type MockFlowSeed = {
  quotes: QuoteDetailResponse[];
  matches: MatchResponse[];
  counterOffers: CounterOfferResponse[];
  nextIds?: {
    quoteId?: number;
    matchId?: number;
    counterOfferId?: number;
  };
};

export type MockFlowState = {
  quotesById: Map<number, QuoteDetailResponse>;
  matchesById: Map<number, MatchResponse>;
  counterOffersById: Map<number, CounterOfferResponse>;
  counterOfferIdsByQuote: Map<number, number[]>;
  nextQuoteId: number;
  nextMatchId: number;
  nextCounterOfferId: number;
};
