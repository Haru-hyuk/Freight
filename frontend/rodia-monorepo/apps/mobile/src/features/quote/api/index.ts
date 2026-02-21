import type {
  QuoteCreateRequestDto,
  QuoteCreateResponseDto,
  QuoteUpdateRequestDto,
} from "@/entities/quote/dto";
import type { QuoteDetailResponse, QuoteListItem, QuoteUpdateResponse } from "@/entities/quote/model/quote.types";
import type { QuoteApi } from "@/features/quote/api/quoteApi.contract";
import { createMockQuoteApi } from "@/features/quote/api/providers/quoteApi.mock";
import { createRealQuoteApi } from "@/features/quote/api/providers/quoteApi.real";
import { isMockQuoteEnabled } from "@/shared/lib/config/env";

function resolveQuoteApi(): QuoteApi {
  return isMockQuoteEnabled() ? createMockQuoteApi() : createRealQuoteApi();
}

export const quoteApi: QuoteApi = resolveQuoteApi();

export function listShipperQuotes(): Promise<QuoteListItem[]> {
  return quoteApi.listShipperQuotes();
}

export function getShipperQuoteDetail(quoteId: number): Promise<QuoteDetailResponse> {
  return quoteApi.getShipperQuoteDetail(quoteId);
}

export function createShipperQuote(payload: QuoteCreateRequestDto): Promise<QuoteCreateResponseDto> {
  return quoteApi.createShipperQuote(payload);
}

export function updateShipperQuote(quoteId: number, payload: QuoteUpdateRequestDto): Promise<QuoteUpdateResponse> {
  return quoteApi.updateShipperQuote(quoteId, payload);
}

export function deleteShipperQuote(quoteId: number): Promise<void> {
  return quoteApi.deleteShipperQuote(quoteId);
}

export type { QuoteApi };

