import type {
  QuoteCreateRequestDto,
  QuoteCreateResponseDto,
  QuoteUpdateRequestDto,
} from "@/entities/quote/dto";
import type { QuoteDetailResponse, QuoteListItem, QuoteUpdateResponse } from "@/entities/quote/model/quote.types";
import type { QuoteApi } from "@/features/quote/api/quoteApi.contract";

function normalizeQuoteId(quoteId: number): number {
  if (!Number.isFinite(quoteId)) return 0;
  return Math.max(0, Math.trunc(quoteId));
}

function nowIso(): string {
  return new Date().toISOString();
}

function buildMockListItem(quoteId: number): QuoteListItem {
  const safeQuoteId = normalizeQuoteId(quoteId) || 1;
  return {
    quoteId: safeQuoteId,
    truckId: 1,
    originAddress: "서울특별시 강남구",
    destinationAddress: "경기도 성남시 분당구",
    distanceKm: 18.5,
    vehicleType: "TON_1",
    vehicleBodyType: "CARGO",
    cargoName: "목업 화물",
    desiredPrice: 100000,
    finalPrice: 120000,
    status: "OPEN",
    createdAt: nowIso(),
  };
}

function buildMockDetail(quoteId: number, payload?: Partial<QuoteCreateRequestDto>): QuoteDetailResponse {
  const safeQuoteId = normalizeQuoteId(quoteId) || 1;
  const createdAt = nowIso();

  return {
    quoteId: safeQuoteId,
    shipperId: 1,
    truckId: Math.max(1, normalizeQuoteId(payload?.truckId ?? 1)),
    originAddress: String(payload?.originAddress ?? "서울특별시 강남구"),
    destinationAddress: String(payload?.destinationAddress ?? "경기도 성남시 분당구"),
    originLat: Number(payload?.originLat ?? 0),
    originLng: Number(payload?.originLng ?? 0),
    destinationLat: Number(payload?.destinationLat ?? 0),
    destinationLng: Number(payload?.destinationLng ?? 0),
    distanceKm: Math.max(0, Number(payload?.distanceKm ?? 0)),
    weightKg: Math.max(0, Number(payload?.weightKg ?? 0)),
    volumeCbm: Math.max(0, Number(payload?.volumeCbm ?? 0)),
    vehicleType: String(payload?.vehicleType ?? "TON_1"),
    vehicleBodyType: String(payload?.vehicleBodyType ?? "CARGO"),
    cargoName: String(payload?.cargoName ?? "목업 화물"),
    cargoType: String(payload?.cargoType ?? "GENERAL"),
    cargoDesc: String(payload?.cargoDesc ?? ""),
    basePrice: Math.max(0, Number(payload?.desiredPrice ?? 0)),
    distancePrice: 0,
    extraPrice: 0,
    desiredPrice: Math.max(0, Number(payload?.desiredPrice ?? 0)),
    finalPrice: Math.max(0, Number(payload?.desiredPrice ?? 0)),
    allowCombine: Boolean(payload?.allowCombine),
    loadMethod: String(payload?.loadMethod ?? "SHIPPER"),
    unloadMethod: String(payload?.unloadMethod ?? "DRIVER"),
    status: "OPEN",
    createdAt,
    updatedAt: createdAt,
    checklistItems: Array.isArray(payload?.checklistItems)
      ? payload.checklistItems.map((item, index) => ({
          checklistItemId: Math.max(0, Number(item?.checklistItemId ?? index + 1)),
          extraInput: String(item?.extraInput ?? ""),
          extraFee: Math.max(0, Number(item?.extraFee ?? 0)),
        }))
      : [],
  };
}

export function createMockQuoteApi(): QuoteApi {
  return {
    async listShipperQuotes(): Promise<QuoteListItem[]> {
      return [buildMockListItem(1), buildMockListItem(2)];
    },

    async getShipperQuoteDetail(quoteId: number): Promise<QuoteDetailResponse> {
      return buildMockDetail(quoteId);
    },

    async createShipperQuote(payload: QuoteCreateRequestDto): Promise<QuoteCreateResponseDto> {
      const seed = Date.now() + Math.max(0, Number(payload?.desiredPrice ?? 0)) + Math.max(0, Number(payload?.weightKg ?? 0));
      const quoteId = Math.max(1, Math.trunc(seed % 9_000_000));
      return { quoteId };
    },

    async updateShipperQuote(quoteId: number, payload: QuoteUpdateRequestDto): Promise<QuoteUpdateResponse> {
      return buildMockDetail(quoteId, payload);
    },

    async deleteShipperQuote(_quoteId: number): Promise<void> {
      return;
    },
  };
}

