import type {
  QuoteChecklistItemDto,
  QuoteCreateRequestDto,
  QuoteCreateResponseDto,
  QuoteDetailResponseDto,
  QuoteListItemDto,
  QuoteUpdateRequestDto,
} from "@/entities/quote/dto";
import type {
  QuoteDetailResponse,
  QuoteListItem,
  QuoteStatusApi,
  QuoteUpdateResponse,
} from "@/entities/quote/model/quote.types";
import { apiClient } from "@/shared/lib/api/apiClient";
import { getShipperQuoteCreatePath, isMockQuoteEnabled } from "@/shared/lib/config/env";

export interface QuoteApi {
  listShipperQuotes: () => Promise<QuoteListItem[]>;
  getShipperQuoteDetail: (quoteId: number) => Promise<QuoteDetailResponse>;
  createShipperQuote: (payload: QuoteCreateRequestDto) => Promise<QuoteCreateResponseDto>;
  updateShipperQuote: (quoteId: number, payload: QuoteUpdateRequestDto) => Promise<QuoteUpdateResponse>;
  deleteShipperQuote: (quoteId: number) => Promise<void>;
}

const SHIPPER_QUOTES_PATH = getShipperQuoteCreatePath();

function isMockMode(): boolean {
  return isMockQuoteEnabled();
}

function resolveQuoteApi(): QuoteApi {
  return isMockMode() ? createMockQuoteApi() : createRealQuoteApi();
}

type AnyObj = Record<string, unknown>;

const QUOTE_STATUS: QuoteStatusApi[] = [
  "OPEN",
  "NEGOTIATING",
  "ASSIGNED",
  "PICKUP",
  "TRANSIT",
  "DROPOFF",
  "CANCELED",
];

function isPlainObject(input: unknown): input is AnyObj {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function asObject(input: unknown): AnyObj {
  return isPlainObject(input) ? input : {};
}

function safeString(input: unknown, fallback = ""): string {
  if (typeof input === "string") return input.trim();
  if (typeof input === "number" || typeof input === "boolean") return String(input);
  return fallback;
}

function safeNumber(input: unknown, fallback = 0): number {
  const value = typeof input === "number" ? input : Number(input);
  return Number.isFinite(value) ? value : fallback;
}

function safeInt(input: unknown, fallback = 0): number {
  return Math.trunc(safeNumber(input, fallback));
}

function safeDateString(input: unknown, fallback: string): string {
  const raw = safeString(input, "");
  if (!raw) return fallback;
  const ts = Date.parse(raw);
  return Number.isFinite(ts) ? new Date(ts).toISOString() : fallback;
}

function parseStatus(input: unknown): QuoteStatusApi {
  const raw = safeString(input, "").toUpperCase();
  return (QUOTE_STATUS.find((status) => status === raw) ?? "OPEN") as QuoteStatusApi;
}

function pickPayload(input: unknown): unknown {
  const root = asObject(input);
  if (typeof root.data !== "undefined" && root.data !== null) return root.data;
  if (typeof root.result !== "undefined" && root.result !== null) return root.result;
  return input;
}

function pickListPayload(input: unknown): unknown[] {
  const payload = pickPayload(input);
  if (Array.isArray(payload)) return payload;

  const obj = asObject(payload);
  const candidates = [obj.items, obj.list, obj.content, obj.data, obj.result];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
}

function pickDetailPayload(input: unknown): AnyObj {
  const payload = pickPayload(input);
  if (Array.isArray(payload)) {
    return asObject(payload[0]);
  }
  return asObject(payload);
}

function pickQuoteId(input: AnyObj, fallback = 0): number {
  const candidates = [
    input.quoteId,
    input.quote_id,
    input.id,
    asObject(input.data).quoteId,
    asObject(input.result).quoteId,
  ];

  for (const value of candidates) {
    const parsed = safeInt(value, NaN);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  return Math.max(0, safeInt(fallback, 0));
}

function mapChecklistItems(input: unknown): QuoteDetailResponse["checklistItems"] {
  if (!Array.isArray(input)) return [];

  return input.slice(0, 100).map((item, index) => {
    const source = asObject(item as QuoteChecklistItemDto);
    return {
      checklistItemId: Math.max(0, safeInt(source.checklistItemId, index + 1)),
      extraInput: safeString(source.extraInput, ""),
      extraFee: Math.max(0, safeInt(source.extraFee, 0)),
    };
  });
}

function toQuoteCreateResponse(input: unknown): QuoteCreateResponseDto {
  const payload = asObject(pickPayload(input));
  const quoteId = pickQuoteId(payload, 0);
  return { quoteId };
}

function toQuoteListItem(input: unknown, fallbackId = 0): QuoteListItem {
  const source = asObject(input as QuoteListItemDto);
  const nowIso = new Date().toISOString();
  const quoteId = pickQuoteId(source, fallbackId);

  return {
    quoteId,
    truckId: Math.max(0, safeInt(source.truckId, 0)),
    originAddress: safeString(source.originAddress, ""),
    destinationAddress: safeString(source.destinationAddress, ""),
    distanceKm: Math.max(0, safeNumber(source.distanceKm, 0)),
    vehicleType: safeString(source.vehicleType, ""),
    vehicleBodyType: safeString(source.vehicleBodyType, ""),
    cargoName: safeString(source.cargoName, ""),
    desiredPrice: Math.max(0, safeInt(source.desiredPrice, 0)),
    finalPrice: Math.max(0, safeInt(source.finalPrice, 0)),
    status: parseStatus(source.status),
    createdAt: safeDateString(source.createdAt, nowIso),
  };
}

function toQuoteList(input: unknown): QuoteListItem[] {
  const list = pickListPayload(input);
  return list.map((item, index) => toQuoteListItem(item, index + 1));
}

function toQuoteDetail(input: unknown, fallbackQuoteId = 0): QuoteDetailResponse {
  const source = pickDetailPayload(input as QuoteDetailResponseDto);
  const nowIso = new Date().toISOString();
  const quoteId = pickQuoteId(source, fallbackQuoteId);
  const createdAt = safeDateString(source.createdAt, nowIso);
  const updatedAt = safeDateString(source.updatedAt, createdAt);

  return {
    quoteId,
    shipperId: Math.max(0, safeInt(source.shipperId, 0)),
    truckId: Math.max(0, safeInt(source.truckId, 0)),
    originAddress: safeString(source.originAddress, ""),
    destinationAddress: safeString(source.destinationAddress, ""),
    originLat: safeNumber(source.originLat, 0),
    originLng: safeNumber(source.originLng, 0),
    destinationLat: safeNumber(source.destinationLat, 0),
    destinationLng: safeNumber(source.destinationLng, 0),
    distanceKm: Math.max(0, safeNumber(source.distanceKm, 0)),
    weightKg: Math.max(0, safeNumber(source.weightKg, 0)),
    volumeCbm: Math.max(0, safeNumber(source.volumeCbm, 0)),
    vehicleType: safeString(source.vehicleType, ""),
    vehicleBodyType: safeString(source.vehicleBodyType, ""),
    cargoName: safeString(source.cargoName, ""),
    cargoType: safeString(source.cargoType, ""),
    cargoDesc: safeString(source.cargoDesc, ""),
    basePrice: Math.max(0, safeInt(source.basePrice, 0)),
    distancePrice: Math.max(0, safeInt(source.distancePrice, 0)),
    extraPrice: Math.max(0, safeInt(source.extraPrice, 0)),
    desiredPrice: Math.max(0, safeInt(source.desiredPrice, 0)),
    finalPrice: Math.max(0, safeInt(source.finalPrice, 0)),
    allowCombine: Boolean(source.allowCombine),
    loadMethod: safeString(source.loadMethod, ""),
    unloadMethod: safeString(source.unloadMethod, ""),
    status: parseStatus(source.status),
    createdAt,
    updatedAt,
    checklistItems: mapChecklistItems(source.checklistItems),
  };
}

function normalizeQuoteId(quoteId: number): number {
  if (!Number.isFinite(quoteId)) return 0;
  return Math.max(0, Math.trunc(quoteId));
}

function buildQuoteDetailPath(quoteId: number): string {
  const safeQuoteId = normalizeQuoteId(quoteId);
  return safeQuoteId > 0 ? `${SHIPPER_QUOTES_PATH}/${safeQuoteId}` : SHIPPER_QUOTES_PATH;
}

function createRealQuoteApi(): QuoteApi {
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

function createMockQuoteApi(): QuoteApi {
  return {
    async listShipperQuotes(): Promise<QuoteListItem[]> {
      return [buildMockListItem(1), buildMockListItem(2)];
    },

    async getShipperQuoteDetail(quoteId: number): Promise<QuoteDetailResponse> {
      return buildMockDetail(quoteId);
    },

    async createShipperQuote(payload: QuoteCreateRequestDto): Promise<QuoteCreateResponseDto> {
      const seed =
        Date.now() +
        Math.max(0, Number(payload?.desiredPrice ?? 0)) +
        Math.max(0, Number(payload?.weightKg ?? 0));
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
