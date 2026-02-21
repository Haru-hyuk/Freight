import type {
  QuoteCreateRequestDto,
  QuoteCreateResponseDto,
  QuoteUpdateRequestDto,
} from "@/entities/quote/dto";
import type {
  QuoteDetailResponse,
  QuoteListItem,
  QuoteUpdateResponse,
} from "@/entities/quote/model/quote.types";

export interface QuoteApi {
  listShipperQuotes: () => Promise<QuoteListItem[]>;
  getShipperQuoteDetail: (quoteId: number) => Promise<QuoteDetailResponse>;
  createShipperQuote: (payload: QuoteCreateRequestDto) => Promise<QuoteCreateResponseDto>;
  updateShipperQuote: (quoteId: number, payload: QuoteUpdateRequestDto) => Promise<QuoteUpdateResponse>;
  deleteShipperQuote: (quoteId: number) => Promise<void>;
}

