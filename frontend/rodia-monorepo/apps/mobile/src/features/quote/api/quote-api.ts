// rodia-monorepo/apps/mobile/src/features/quote/api/quote-api.ts
import type {
  QuoteChecklistItemDto,
  QuoteCreateRequestDto,
  QuoteCreateResponseDto,
  QuoteDetailResponseDto,
  QuoteListItemDto,
  QuoteStopDto,
  QuoteStopRequestDto,
  QuoteUpdateRequestDto,
} from "@/entities/quote/dto";
import type {
  QuoteDetailResponse,
  QuoteListItem,
  QuoteStatusApi,
  QuoteUpdateResponse,
} from "@/entities/quote/model/quote.types";
import { apiClient } from "@/shared/lib/api/apiClient";
import {
  createQuote as createQuoteGenerated,
  deleteQuote as deleteQuoteGenerated,
  getQuote as getQuoteGenerated,
  listQuotes as listQuotesGenerated,
  updateQuote as updateQuoteGenerated,
} from "@/shared/api/generated/quote-controller/quote-controller";
import { getShipperQuoteCreatePath, isMockQuoteEnabled } from "@/shared/lib/config/env";

export interface QuoteApi {
  listShipperQuotes: () => Promise<QuoteListItem[]>;
  getShipperQuoteDetail: (quoteId: number) => Promise<QuoteDetailResponse>;
  getShipperQuoteDetailByIdentifier: (quoteIdentifier: string) => Promise<QuoteDetailResponse>;
  createShipperQuote: (payload: QuoteCreateRequestDto) => Promise<QuoteCreateResponseDto>;
  updateShipperQuote: (quoteId: number, payload: QuoteUpdateRequestDto) => Promise<QuoteUpdateResponse>;
  deleteShipperQuote: (quoteId: number) => Promise<void>;
}

const SHIPPER_QUOTES_PATH = getShipperQuoteCreatePath();

function isMockMode(): boolean {
  return isMockQuoteEnabled();
}

function isQuoteDebugEnabled(): boolean {
  const devFlag = typeof __DEV__ !== "undefined" && __DEV__;

  let envFlag = false;
  try {
    const v = String((globalThis as any)?.process?.env?.EXPO_PUBLIC_DEBUG_LOGS ?? "").trim().toLowerCase();
    envFlag = v === "1" || v === "true" || v === "yes" || v === "on";
  } catch {
    envFlag = false;
  }

  return devFlag || envFlag;
}

function quoteDebugLog(event: string, payload: Record<string, unknown>) {
  if (!isQuoteDebugEnabled()) return;
  // eslint-disable-next-line no-console
  console.log(`[quote-api] ${event}`, payload);
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
  if (raw === "CANCELLED" || raw === "CANCEL" || raw === "CANCELED") return "CANCELED";
  if (raw === "COMPLETED" || raw === "DONE" || raw === "FINISHED") return "DROPOFF";
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

function mapStops(input: unknown): QuoteDetailResponse["stops"] {
  if (!Array.isArray(input)) return [];

  const mapped = input.slice(0, 100).map((item, index) => {
    const source = asObject(item as QuoteStopDto);
    const quoteStopId = Math.max(0, safeInt(source.quoteStopId, 0));
    const seq = Math.max(1, safeInt(source.seq, index + 1));

    return {
      quoteStopId,
      seq,
      address: safeString(source.address, ""),
      lat: safeNumber(source.lat, 0),
      lng: safeNumber(source.lng, 0),
      contactName: safeString(source.contactName, ""),
      contactPhone: safeString(source.contactPhone, ""),
      deptName: safeString(source.deptName, ""),
      managerName: safeString(source.managerName, ""),
    };
  });

  return mapped
    .filter((stop) => Boolean(stop.address.trim()))
    .sort((a, b) => {
      const bySeq = a.seq - b.seq;
      if (bySeq !== 0) return bySeq;
      return a.quoteStopId - b.quoteStopId;
    });
}

function sanitizeChecklistItems(input: unknown): QuoteChecklistItemDto[] {
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

function sanitizeStopsForRequest(input: unknown): QuoteStopRequestDto[] {
  if (!Array.isArray(input)) return [];

  const mapped = input.slice(0, 100).map((item, index) => {
    const source = asObject(item as QuoteStopRequestDto);
    return {
      seq: Math.max(1, safeInt(source.seq, index + 1)),
      address: safeString(source.address, ""),
      lat: safeNumber(source.lat, 0),
      lng: safeNumber(source.lng, 0),
      contactName: safeString(source.contactName, ""),
      contactPhone: safeString(source.contactPhone, ""),
      deptName: safeString(source.deptName, ""),
      managerName: safeString(source.managerName, ""),
    };
  });

  return mapped
    .filter((stop) => Boolean(stop.address.trim()))
    .sort((a, b) => a.seq - b.seq)
    .map((stop, index) => ({
      ...stop,
      seq: index + 1,
    }));
}

function sanitizeQuotePayload(payload: QuoteCreateRequestDto, strictDistance: boolean): QuoteCreateRequestDto {
  const source = asObject(payload as unknown as AnyObj) as Partial<QuoteCreateRequestDto>;
  const normalizedDistance = safeInt(source.distanceKm, 0);

  if (strictDistance && normalizedDistance < 1) {
    throw new Error("distanceKm must be >= 1");
  }

  const distanceKm = strictDistance ? normalizedDistance : Math.max(1, normalizedDistance);

  return {
    truckId: Math.max(1, safeInt(source.truckId, 1)),
    originAddress: safeString(source.originAddress, ""),
    destinationAddress: safeString(source.destinationAddress, ""),
    originLat: safeNumber(source.originLat, 0),
    originLng: safeNumber(source.originLng, 0),
    destinationLat: safeNumber(source.destinationLat, 0),
    destinationLng: safeNumber(source.destinationLng, 0),
    distanceKm,
    weightKg: Math.max(0, safeInt(source.weightKg, 0)),
    volumeCbm: Math.max(0, Math.trunc(safeNumber(source.volumeCbm, 0))),
    vehicleType: (safeString(source.vehicleType, "TON_1") || "TON_1") as QuoteCreateRequestDto["vehicleType"],
    vehicleBodyType: (safeString(source.vehicleBodyType, "CARGO") || "CARGO") as QuoteCreateRequestDto["vehicleBodyType"],
    cargoName: safeString(source.cargoName, ""),
    cargoType: (safeString(source.cargoType, "GENERAL") || "GENERAL") as QuoteCreateRequestDto["cargoType"],
    cargoDesc: safeString(source.cargoDesc, ""),
    desiredPrice: Math.max(0, safeInt(source.desiredPrice, 0)),
    allowCombine: Boolean(source.allowCombine),
    loadMethod: (safeString(source.loadMethod, "DRIVER") || "DRIVER") as QuoteCreateRequestDto["loadMethod"],
    unloadMethod: (safeString(source.unloadMethod, "DRIVER") || "DRIVER") as QuoteCreateRequestDto["unloadMethod"],
    checklistItems: sanitizeChecklistItems(source.checklistItems),
    stops: sanitizeStopsForRequest(source.stops),
  };
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
  const quotePublicIdRaw = safeString(source.quotePublicId, "");

  return {
    quoteId,
    quotePublicId: quotePublicIdRaw ? quotePublicIdRaw : undefined,
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
  const quotePublicIdRaw = safeString(source.quotePublicId, "");

  return {
    quoteId,
    quotePublicId: quotePublicIdRaw ? quotePublicIdRaw : undefined,
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
    stops: mapStops(source.stops),
  };
}

function normalizeQuoteId(quoteId: number): number {
  if (!Number.isFinite(quoteId)) return 0;
  return Math.max(0, Math.trunc(quoteId));
}

function normalizeQuoteIdentifier(input: unknown): string {
  if (typeof input === "string") return input.trim();
  const numeric = normalizeQuoteId(safeNumber(input, 0));
  if (numeric > 0) return String(numeric);
  return "";
}

function buildQuoteDetailPath(quoteId: number): string {
  const safeQuoteId = normalizeQuoteId(quoteId);
  return safeQuoteId > 0 ? `${SHIPPER_QUOTES_PATH}/${safeQuoteId}` : SHIPPER_QUOTES_PATH;
}

function createRealQuoteApi(): QuoteApi {
  const fetchQuoteDetailByIdentifier = async (quoteIdentifier: string): Promise<QuoteDetailResponse> => {
    const safeIdentifier = normalizeQuoteIdentifier(quoteIdentifier);
    if (!safeIdentifier) return toQuoteDetail({}, 0);
    const fallbackQuoteId = normalizeQuoteId(Number(safeIdentifier));

    const data = await getQuoteGenerated(safeIdentifier);
    const detailRaw = (data ?? {}) as { stops?: unknown };
    const detailStopsLength = Array.isArray(detailRaw.stops) ? detailRaw.stops.length : 0;
    quoteDebugLog("detail.response", {
      quoteIdentifier: safeIdentifier,
      stopsLength: detailStopsLength,
    });
    return toQuoteDetail(data, fallbackQuoteId);
  };

  return {
    async listShipperQuotes(): Promise<QuoteListItem[]> {
      const data = await listQuotesGenerated();
      return toQuoteList(data);
    },

    async getShipperQuoteDetail(quoteId: number): Promise<QuoteDetailResponse> {
      const safeQuoteId = normalizeQuoteId(quoteId);
      if (safeQuoteId <= 0) return toQuoteDetail({}, 0);
      return fetchQuoteDetailByIdentifier(String(safeQuoteId));
    },

    async getShipperQuoteDetailByIdentifier(quoteIdentifier: string): Promise<QuoteDetailResponse> {
      return fetchQuoteDetailByIdentifier(quoteIdentifier);
    },

    async createShipperQuote(payload: QuoteCreateRequestDto): Promise<QuoteCreateResponseDto> {
      const safePayload = sanitizeQuotePayload((payload ?? {}) as QuoteCreateRequestDto, true);
      quoteDebugLog("create.payload", {
        keys: Object.keys((safePayload ?? {}) as Record<string, unknown>),
        stopsLength: Array.isArray(safePayload?.stops) ? safePayload.stops.length : 0,
        distanceKm: safePayload?.distanceKm ?? null,
      });
      const data = await createQuoteGenerated(safePayload as unknown as Parameters<typeof createQuoteGenerated>[0]);
      return toQuoteCreateResponse(data);
    },

    async updateShipperQuote(quoteId: number, payload: QuoteUpdateRequestDto): Promise<QuoteUpdateResponse> {
      const safeQuoteId = normalizeQuoteId(quoteId);
      if (safeQuoteId <= 0) return toQuoteDetail({}, 0);

      const safePayload = sanitizeQuotePayload((payload ?? {}) as QuoteUpdateRequestDto, true);
      try {
        const data = await updateQuoteGenerated(
          String(safeQuoteId),
          safePayload as unknown as Parameters<typeof updateQuoteGenerated>[1]
        );
        return toQuoteDetail(data, safeQuoteId);
      } catch {
        const res = await apiClient.put(buildQuoteDetailPath(safeQuoteId), safePayload);
        return toQuoteDetail((res as { data?: unknown })?.data, safeQuoteId);
      }
    },

    async deleteShipperQuote(quoteId: number): Promise<void> {
      const safeQuoteId = normalizeQuoteId(quoteId);
      if (safeQuoteId <= 0) return;
      try {
        await deleteQuoteGenerated(String(safeQuoteId));
      } catch {
        await apiClient.delete(buildQuoteDetailPath(safeQuoteId));
      }
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
    quotePublicId: `mock-quote-${safeQuoteId}`,
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

  const originAddress = String(payload?.originAddress ?? "서울특별시 강남구");
  const destinationAddress = String(payload?.destinationAddress ?? "경기도 성남시 분당구");
  const payloadStops = sanitizeStopsForRequest(payload?.stops);
  const mockStops: QuoteDetailResponse["stops"] = payloadStops.length
    ? payloadStops.map((stop, index) => ({
        quoteStopId: index + 1,
        seq: index + 1,
        address: String(stop.address ?? ""),
        lat: Number(stop.lat ?? 0),
        lng: Number(stop.lng ?? 0),
        contactName: String(stop.contactName ?? ""),
        contactPhone: String(stop.contactPhone ?? ""),
        deptName: String(stop.deptName ?? ""),
        managerName: String(stop.managerName ?? ""),
      }))
    : [
        {
          quoteStopId: 1,
          seq: 1,
          address: "인천광역시 연수구 (목업 경유지)",
          lat: 37.4563,
          lng: 126.7052,
          contactName: "담당자A",
          contactPhone: "010-0000-0000",
          deptName: "물류팀",
          managerName: "매니저A",
        },
      ];

  return {
    quoteId: safeQuoteId,
    quotePublicId: undefined,
    shipperId: 1,
    truckId: Math.max(1, normalizeQuoteId(payload?.truckId ?? 1)),
    originAddress,
    destinationAddress,
    originLat: Number(payload?.originLat ?? 0),
    originLng: Number(payload?.originLng ?? 0),
    destinationLat: Number(payload?.destinationLat ?? 0),
    destinationLng: Number(payload?.destinationLng ?? 0),
    distanceKm: Math.max(1, Math.trunc(Number(payload?.distanceKm ?? 18))),
    weightKg: Math.max(0, Number(payload?.weightKg ?? 0)),
    volumeCbm: Math.max(0, Math.trunc(Number(payload?.volumeCbm ?? 0))),
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
    stops: mockStops,
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

    async getShipperQuoteDetailByIdentifier(quoteIdentifier: string): Promise<QuoteDetailResponse> {
      const safeIdentifier = normalizeQuoteIdentifier(quoteIdentifier);
      const parsedQuoteId = normalizeQuoteId(Number(safeIdentifier));
      const fallbackQuoteId = parsedQuoteId > 0 ? parsedQuoteId : 1;
      return buildMockDetail(fallbackQuoteId);
    },

    async createShipperQuote(payload: QuoteCreateRequestDto): Promise<QuoteCreateResponseDto> {
      const safePayload = sanitizeQuotePayload((payload ?? {}) as QuoteCreateRequestDto, false);
      const seed =
        Date.now() +
        Math.max(0, Number(safePayload?.desiredPrice ?? 0)) +
        Math.max(0, Number(safePayload?.weightKg ?? 0));
      const quoteId = Math.max(1, Math.trunc(seed % 9_000_000));
      return { quoteId };
    },

    async updateShipperQuote(quoteId: number, payload: QuoteUpdateRequestDto): Promise<QuoteUpdateResponse> {
      const safePayload = sanitizeQuotePayload((payload ?? {}) as QuoteUpdateRequestDto, false);
      return buildMockDetail(quoteId, safePayload);
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

export function getShipperQuoteDetailByIdentifier(quoteIdentifier: string): Promise<QuoteDetailResponse> {
  return quoteApi.getShipperQuoteDetailByIdentifier(quoteIdentifier);
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
