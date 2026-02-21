import type {
  QuoteCreateRequestDto,
  QuoteCreateResponseDto,
  QuoteUpdateRequestDto,
} from "@/entities/quote/dto";
import type { QuoteDetailResponse, QuoteListItem, QuoteUpdateResponse } from "@/entities/quote/model/quote.types";
import type { QuoteApi } from "@/features/quote/api/quoteApi.contract";
import {
  toQuoteCreateResponse,
  toQuoteDetail,
  toQuoteList,
} from "@/features/quote/api/quoteApi.mapper";
import { apiClient } from "@/shared/lib/api/apiClient";
import { getShipperQuoteCreatePath } from "@/shared/lib/config/env";

const SHIPPER_QUOTES_PATH = getShipperQuoteCreatePath();

function normalizeQuoteId(quoteId: number): number {
  if (!Number.isFinite(quoteId)) return 0;
  return Math.max(0, Math.trunc(quoteId));
}

function buildQuoteDetailPath(quoteId: number): string {
  const safeQuoteId = normalizeQuoteId(quoteId);
  return safeQuoteId > 0 ? `${SHIPPER_QUOTES_PATH}/${safeQuoteId}` : SHIPPER_QUOTES_PATH;
}

export function createRealQuoteApi(): QuoteApi {
  return {
    async listShipperQuotes(): Promise<QuoteListItem[]> {
      const res = await apiClient.get(SHIPPER_QUOTES_PATH);
      return toQuoteList((res as { data?: unknown })?.data);
    },

    async getShipperQuoteDetail(quoteId: number): Promise<QuoteDetailResponse> {
      const safeQuoteId = normalizeQuoteId(quoteId);
      if (safeQuoteId <= 0) return toQuoteDetail({}, 0);

      const res = await apiClient.get(buildQuoteDetailPath(safeQuoteId));
      return toQuoteDetail((res as { data?: unknown })?.data, safeQuoteId);
    },

    async createShipperQuote(payload: QuoteCreateRequestDto): Promise<QuoteCreateResponseDto> {
      const safePayload = (payload ?? {}) as QuoteCreateRequestDto;
      const res = await apiClient.post(SHIPPER_QUOTES_PATH, safePayload);
      return toQuoteCreateResponse((res as { data?: unknown })?.data);
    },

    async updateShipperQuote(quoteId: number, payload: QuoteUpdateRequestDto): Promise<QuoteUpdateResponse> {
      const safeQuoteId = normalizeQuoteId(quoteId);
      if (safeQuoteId <= 0) return toQuoteDetail({}, 0);

      const safePayload = (payload ?? {}) as QuoteUpdateRequestDto;
      const res = await apiClient.put(buildQuoteDetailPath(safeQuoteId), safePayload);
      return toQuoteDetail((res as { data?: unknown })?.data, safeQuoteId);
    },

    async deleteShipperQuote(quoteId: number): Promise<void> {
      const safeQuoteId = normalizeQuoteId(quoteId);
      if (safeQuoteId <= 0) return;
      await apiClient.delete(buildQuoteDetailPath(safeQuoteId));
    },
  };
}

