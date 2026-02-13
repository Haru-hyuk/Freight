import type { QuoteCreateRequestDto, QuoteCreateResponseDto } from "@/entities/quote/dto";
import { apiClient } from "@/shared/lib/api/apiClient";
import { getShipperQuoteCreatePath, isMockQuoteEnabled } from "@/shared/lib/config/env";

const SHIPPER_QUOTES_PATH = getShipperQuoteCreatePath();

function toQuoteCreateResponse(data: unknown): QuoteCreateResponseDto {
  const raw = (data ?? {}) as Record<string, unknown>;
  const quoteId = Number(
    raw.quoteId ??
      (raw.data as Record<string, unknown> | undefined)?.quoteId ??
      (raw.result as Record<string, unknown> | undefined)?.quoteId ??
      0
  );

  return {
    quoteId: Number.isFinite(quoteId) ? quoteId : 0,
  };
}

function createMockQuoteResponse(payload: QuoteCreateRequestDto): QuoteCreateResponseDto {
  const seed = Date.now() + (payload?.desiredPrice ?? 0) + (payload?.weightKg ?? 0);
  const quoteId = Math.max(1, seed % 9_000_000);
  return { quoteId };
}

export async function createShipperQuote(payload: QuoteCreateRequestDto): Promise<QuoteCreateResponseDto> {
  if (isMockQuoteEnabled()) {
    return createMockQuoteResponse(payload);
  }

  const res = await apiClient.post(SHIPPER_QUOTES_PATH, payload);
  return toQuoteCreateResponse((res as { data?: unknown })?.data);
}
