import type { CounterOfferResponse, MatchResponse, QuoteListResponse } from "@/shared/api/generated/schemas";
import {
  acceptMockFlowDriverMatch,
  advanceMockFlowMatchStatus,
  advanceMockFlowQuoteStatus,
  cancelMockFlowMatch,
  createMockFlowDriverCounterOffer,
  createMockFlowShipperMatch,
  listMockFlowDriverCounterOffersByQuote,
  listMockFlowShipperMatches,
  listMockFlowShipperQuotes,
  removeMockFlowCounterOffer,
  resetMockFlowState,
} from "@/shared/lib/mock-flow";

export type { CounterOfferResponse, MatchResponse, QuoteListResponse };

export {
  acceptMockFlowDriverMatch,
  advanceMockFlowMatchStatus,
  advanceMockFlowQuoteStatus,
  cancelMockFlowMatch,
  createMockFlowDriverCounterOffer,
  createMockFlowShipperMatch,
  listMockFlowDriverCounterOffersByQuote,
  listMockFlowShipperMatches,
  listMockFlowShipperQuotes,
  removeMockFlowCounterOffer,
  resetMockFlowState,
};
