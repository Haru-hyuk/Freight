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
  listChecklistItems as listChecklistItemsGenerated,
} from "@/shared/api/generated/checklist-item-controller/checklist-item-controller";
import {
  createQuote as createQuoteGenerated,
  deleteQuote as deleteQuoteGenerated,
  getQuote as getQuoteGenerated,
  listQuotes as listQuotesGenerated,
  updateQuote as updateQuoteGenerated,
  validateQuote as validateQuoteGenerated,
} from "@/shared/api/generated/quote-controller/quote-controller";
import type { ChecklistItemResponse } from "@/shared/api/generated/schemas/checklistItemResponse";
import { getShipperQuoteCreatePath, isMockMode as isApiMockMode } from "@/shared/lib/config/env";
import {
  DEFAULT_LOAD_METHOD,
  DEFAULT_UNLOAD_METHOD,
  isActorOnlyWorkMethod,
  toActorOnlyWorkMethod,
} from "@/features/quote/model/workMethod";
import {
  createMockFlowShipperQuote,
  deleteMockFlowShipperQuote,
  getMockFlowShipperQuoteDetail,
  getMockFlowShipperQuoteDetailByIdentifier,
  listMockFlowShipperQuotes,
  updateMockFlowShipperQuote,
  waitRandom,
} from "@/shared/lib/mock-flow";

export type QuotePricePreview = {
  estimatedWeightedPrice?: number;
  estimatedMinPrice?: number;
  estimatedMaxPrice?: number;
  aiSummary?: string;
};

export interface QuoteApi {
  listShipperQuotes: () => Promise<QuoteListItem[]>;
  getShipperQuoteDetail: (quoteId: number) => Promise<QuoteDetailResponse>;
  getShipperQuoteDetailByIdentifier: (quoteIdentifier: string) => Promise<QuoteDetailResponse>;
  previewShipperQuote: (payload: QuoteCreateRequestDto) => Promise<QuotePricePreview | null>;
  createShipperQuote: (payload: QuoteCreateRequestDto) => Promise<QuoteCreateResponseDto>;
  updateShipperQuote: (quoteId: number, payload: QuoteUpdateRequestDto) => Promise<QuoteUpdateResponse>;
  deleteShipperQuote: (quoteId: number) => Promise<void>;
}

const SHIPPER_QUOTES_PATH = getShipperQuoteCreatePath();

function isMockMode(): boolean {
  return isApiMockMode();
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
type QuoteCreateTransportPayload = QuoteCreateRequestDto & { basePrice?: number };
type ChecklistMasterItem = { checklistItemId: number; name: string };

let checklistMasterCache: ChecklistMasterItem[] | null = null;
let checklistMasterPromise: Promise<ChecklistMasterItem[]> | null = null;

const QUOTE_STATUS: QuoteStatusApi[] = [
  "OPEN",
  "NEGOTIATING",
  "ASSIGNED",
  "ACCEPTED",
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

function pickFirstStringFrom(objects: AnyObj[], keys: string[], fallback = ""): string {
  for (const obj of objects) {
    for (const key of keys) {
      const value = safeString(obj?.[key], "");
      if (value) return value;
    }
  }
  return fallback;
}

function parseStatus(input: unknown): QuoteStatusApi {
  const raw = safeString(input, "").toUpperCase();
  if (!raw) return "UNKNOWN";
  if (raw === "READY" || raw === "REQUESTED") return "OPEN";
  if (raw === "ASSIGNED_CONFIRMED") return "ASSIGNED";
  if (raw === "ACCEPTED") return "ACCEPTED";
  if (raw === "CANCELLED" || raw === "CANCEL" || raw === "CANCELED") return "CANCELED";
  if (raw === "COMPLETED" || raw === "DONE" || raw === "FINISHED") return "DROPOFF";
  return QUOTE_STATUS.find((status) => status === raw) ?? raw;
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

function normalizeText(input: unknown): string {
  return safeString(input, "").replace(/\s+/g, "").toLowerCase();
}

function normalizeChecklistMasterItems(input: unknown): ChecklistMasterItem[] {
  const list = pickListPayload(input);
  const normalized = list
    .map((item) => {
      const source = asObject(item as ChecklistItemResponse);
      const checklistItemId = safeInt(source.checklistItemId, 0);
      const name = safeString(source.name, "");
      if (checklistItemId <= 0 || !name) return null;
      return { checklistItemId, name };
    })
    .filter((item): item is ChecklistMasterItem => Boolean(item));

  if (!normalized.length) return [];
  return normalized;
}

async function parseChecklistMasterResponse(raw: unknown): Promise<ChecklistMasterItem[]> {
  if (raw instanceof Blob) {
    const text = await raw.text();
    if (!text.trim()) return [];
    try {
      return normalizeChecklistMasterItems(JSON.parse(text));
    } catch {
      return [];
    }
  }

  if (typeof raw === "string") {
    try {
      return normalizeChecklistMasterItems(JSON.parse(raw));
    } catch {
      return [];
    }
  }

  return normalizeChecklistMasterItems(raw);
}

async function fetchChecklistMaster(): Promise<ChecklistMasterItem[]> {
  if (checklistMasterCache) return checklistMasterCache;
  if (checklistMasterPromise) return checklistMasterPromise;

  checklistMasterPromise = (async () => {
    try {
      const raw = await listChecklistItemsGenerated();
      const items = await parseChecklistMasterResponse(raw);
      checklistMasterCache = items;
      return items;
    } catch {
      checklistMasterCache = [];
      return [];
    } finally {
      checklistMasterPromise = null;
    }
  })();

  return checklistMasterPromise;
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

  const mapped: Array<QuoteDetailResponse["checklistItems"][number] | null> = input
    .slice(0, 100)
    .map((item) => {
      const source = asObject(item as QuoteChecklistItemDto);
      const checklistItemId = safeInt(source.checklistItemId, 0);
      if (checklistItemId <= 0) return null;
      return {
        checklistItemId,
        extraInput: safeString(source.extraInput, ""),
        extraFee: Math.max(0, safeInt(source.extraFee, 0)),
      };
    });

  return mapped.filter((item): item is QuoteDetailResponse["checklistItems"][number] => item !== null);
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

  const mapped: Array<QuoteChecklistItemDto | null> = input
    .slice(0, 100)
    .map((item) => {
      const source = asObject(item as QuoteChecklistItemDto);
      const checklistItemId = safeInt(source.checklistItemId, 0);
      if (checklistItemId <= 0) return null;
      return {
        checklistItemId,
        extraInput: safeString(source.extraInput, ""),
        extraFee: Math.max(0, safeInt(source.extraFee, 0)),
      };
    });

  return mapped.filter((item): item is QuoteChecklistItemDto => item !== null);
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

async function resolveChecklistItemsForRequest(input: unknown): Promise<QuoteChecklistItemDto[]> {
  if (!Array.isArray(input) || input.length === 0) return [];
  const masterItems = await fetchChecklistMaster();
  if (!masterItems.length) return [];

  const byName = new Map<string, number>();
  for (const item of masterItems) {
    byName.set(normalizeText(item.name), item.checklistItemId);
  }

  const mapped: Array<QuoteChecklistItemDto | null> = input
    .slice(0, 100)
    .map((item) => {
      const source = asObject(item as QuoteChecklistItemDto);
      const directId = safeInt(source.checklistItemId, 0);
      let checklistItemId = directId > 0 ? directId : 0;

      if (checklistItemId <= 0) {
        const key = normalizeText(source.extraInput);
        checklistItemId = key ? safeInt(byName.get(key), 0) : 0;
      }

      if (checklistItemId <= 0) return null;
      return {
        checklistItemId,
        extraInput: safeString(source.extraInput, ""),
        extraFee: Math.max(0, safeInt(source.extraFee, 0)),
      };
    });

  return mapped.filter((item): item is QuoteChecklistItemDto => item !== null);
}

function sanitizeQuotePayload(payload: QuoteCreateTransportPayload): QuoteCreateTransportPayload {
  const source = asObject(payload as unknown as AnyObj) as Partial<QuoteCreateTransportPayload>;
  const loadMethod = toActorOnlyWorkMethod(source.loadMethod, DEFAULT_LOAD_METHOD);
  const unloadMethod = toActorOnlyWorkMethod(source.unloadMethod, DEFAULT_UNLOAD_METHOD);

  const sanitized: Partial<QuoteCreateTransportPayload> = {
    ...(payload as QuoteCreateTransportPayload),
    loadMethod,
    unloadMethod,
    checklistItems: sanitizeChecklistItems(source.checklistItems),
    stops: sanitizeStopsForRequest(source.stops),
  };

  const normalizedDistance = safeNumber(source.distanceKm, NaN);
  if (Number.isFinite(normalizedDistance) && normalizedDistance > 0) {
    sanitized.distanceKm = normalizedDistance;
  } else {
    delete sanitized.distanceKm;
  }

  const basePriceRaw = safeNumber(source.basePrice, NaN);
  if (Number.isFinite(basePriceRaw) && basePriceRaw > 0) {
    sanitized.basePrice = Math.trunc(basePriceRaw);
  } else {
    delete sanitized.basePrice;
  }

  const truckId = safeInt(source.truckId, NaN);
  if (Number.isFinite(truckId) && truckId > 0) {
    sanitized.truckId = truckId;
  } else {
    delete sanitized.truckId;
  }

  return sanitized as QuoteCreateTransportPayload;
}

async function prepareQuotePayload(payload: QuoteCreateTransportPayload): Promise<QuoteCreateTransportPayload> {
  const source = asObject(payload as unknown as AnyObj) as Partial<QuoteCreateTransportPayload>;
  const resolvedChecklistItems = await resolveChecklistItemsForRequest(source.checklistItems);
  return sanitizeQuotePayload({
    ...(payload as QuoteCreateTransportPayload),
    checklistItems: resolvedChecklistItems,
  });
}

function needsLegacyWorkMethodFallback(payload: QuoteCreateTransportPayload): boolean {
  const load = safeString(payload?.loadMethod, "");
  const unload = safeString(payload?.unloadMethod, "");
  return !isActorOnlyWorkMethod(load) || !isActorOnlyWorkMethod(unload);
}

function isValidationStatusError(error: unknown): boolean {
  const status = Number((error as { response?: { status?: unknown } } | undefined)?.response?.status ?? 0);
  return status === 400 || status === 422;
}

function toLegacyWorkMethodPayload(payload: QuoteCreateTransportPayload): QuoteCreateTransportPayload {
  return {
    ...payload,
    loadMethod: toActorOnlyWorkMethod(payload?.loadMethod, DEFAULT_LOAD_METHOD),
    unloadMethod: toActorOnlyWorkMethod(payload?.unloadMethod, DEFAULT_UNLOAD_METHOD),
  };
}

function toMockQuoteCreateRequest(payload: QuoteCreateTransportPayload): QuoteCreateTransportPayload {
  const stops = Array.isArray(payload?.stops)
    ? payload.stops
        .map((stop, index) => {
          const source = asObject(stop as AnyObj) as Partial<QuoteStopRequestDto>;
          const address = safeString(source.address, "");
          return {
            seq: Math.max(1, safeInt(source.seq, index + 1)),
            address,
            lat: safeNumber(source.lat, 0),
            lng: safeNumber(source.lng, 0),
            contactName: safeString(source.contactName, ""),
            contactPhone: safeString(source.contactPhone, ""),
            deptName: safeString(source.deptName, ""),
            managerName: safeString(source.managerName, ""),
          };
        })
        .filter((stop) => Boolean(stop.address.trim()))
    : undefined;

  const rawBasePrice = safeNumber(payload?.basePrice, NaN);
  const basePrice = Number.isFinite(rawBasePrice) ? Math.max(0, Math.trunc(rawBasePrice)) : 0;

  return {
    ...payload,
    basePrice,
    stops,
  };
}

function toQuoteCreateResponse(input: unknown): QuoteCreateResponseDto {
  const payload = asObject(pickPayload(input));
  const quoteId = pickQuoteId(payload, 0);
  const quotePublicId = pickFirstStringFrom([payload], ["quotePublicId", "quoteIdentifier", "quote_identifier"]);

  const basePrice = safeInt(payload.basePrice, NaN);
  const distancePrice = safeInt(payload.distancePrice, NaN);
  const extraPrice = safeInt(payload.extraPrice, NaN);
  const desiredPrice = safeInt(payload.desiredPrice, NaN);
  const finalPrice = safeInt(payload.finalPrice, NaN);

  return {
    quoteId,
    quotePublicId: quotePublicId || undefined,
    ...(Number.isFinite(basePrice) ? { basePrice: Math.max(0, basePrice) } : {}),
    ...(Number.isFinite(distancePrice) ? { distancePrice: Math.max(0, distancePrice) } : {}),
    ...(Number.isFinite(extraPrice) ? { extraPrice: Math.max(0, extraPrice) } : {}),
    ...(Number.isFinite(desiredPrice) ? { desiredPrice: Math.max(0, desiredPrice) } : {}),
    ...(Number.isFinite(finalPrice) ? { finalPrice: Math.max(0, finalPrice) } : {}),
  };
}

function toQuotePricePreview(input: unknown): QuotePricePreview | null {
  const payload = asObject(pickPayload(input));
  const estimatedWeightedPrice = safeInt(payload.estimatedWeightedPrice, NaN);
  const estimatedMinPrice = safeInt(payload.estimatedMinPrice, NaN);
  const estimatedMaxPrice = safeInt(payload.estimatedMaxPrice, NaN);
  const aiSummary = safeString(payload.aiSummary, "");

  const preview: QuotePricePreview = {
    ...(Number.isFinite(estimatedWeightedPrice) ? { estimatedWeightedPrice: Math.max(0, estimatedWeightedPrice) } : {}),
    ...(Number.isFinite(estimatedMinPrice) ? { estimatedMinPrice: Math.max(0, estimatedMinPrice) } : {}),
    ...(Number.isFinite(estimatedMaxPrice) ? { estimatedMaxPrice: Math.max(0, estimatedMaxPrice) } : {}),
    ...(aiSummary ? { aiSummary } : {}),
  };

  return Object.keys(preview).length > 0 ? preview : null;
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
  const originObject = asObject(source.origin);
  const destinationObject = asObject(source.destination);
  const senderObject = asObject(source.sender);
  const receiverObject = asObject(source.receiver);

  const originAddressDetail = pickFirstStringFrom(
    [source, originObject],
    ["originAddressDetail", "originDetailAddress", "originDetail", "startAddrDetail", "startAddressDetail", "detailAddress"]
  );
  const destinationAddressDetail = pickFirstStringFrom(
    [source, destinationObject],
    [
      "destinationAddressDetail",
      "destinationDetailAddress",
      "destinationDetail",
      "endAddrDetail",
      "endAddressDetail",
      "detailAddress",
    ]
  );

  const senderName = pickFirstStringFrom(
    [source, senderObject, originObject],
    ["senderName", "originContactName", "pickupContactName", "contactName", "name"]
  );
  const senderPhone = pickFirstStringFrom(
    [source, senderObject, originObject],
    ["senderPhone", "originContactPhone", "pickupContactPhone", "contactPhone", "phone"]
  );
  const receiverName = pickFirstStringFrom(
    [source, receiverObject, destinationObject],
    ["receiverName", "destinationContactName", "dropoffContactName", "contactName", "name"]
  );
  const receiverPhone = pickFirstStringFrom(
    [source, receiverObject, destinationObject],
    ["receiverPhone", "destinationContactPhone", "dropoffContactPhone", "contactPhone", "phone"]
  );

  return {
    quoteId,
    quotePublicId: quotePublicIdRaw ? quotePublicIdRaw : undefined,
    shipperId: Math.max(0, safeInt(source.shipperId, 0)),
    truckId: Math.max(0, safeInt(source.truckId, 0)),
    originAddress: safeString(source.originAddress, ""),
    originAddressDetail: originAddressDetail || undefined,
    destinationAddress: safeString(source.destinationAddress, ""),
    destinationAddressDetail: destinationAddressDetail || undefined,
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
    senderName: senderName || undefined,
    senderPhone: senderPhone || undefined,
    receiverName: receiverName || undefined,
    receiverPhone: receiverPhone || undefined,
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

    async previewShipperQuote(payload: QuoteCreateRequestDto): Promise<QuotePricePreview | null> {
      const safePayload = await prepareQuotePayload((payload ?? {}) as QuoteCreateTransportPayload);
      try {
        const data = await validateQuoteGenerated(
          safePayload as unknown as Parameters<typeof validateQuoteGenerated>[0]
        );
        return toQuotePricePreview(data);
      } catch (error) {
        quoteDebugLog("preview.error", {
          message: safeString((error as { message?: unknown })?.message, "preview-failed"),
        });
        return null;
      }
    },

    async createShipperQuote(payload: QuoteCreateRequestDto): Promise<QuoteCreateResponseDto> {
      const safePayload = await prepareQuotePayload((payload ?? {}) as QuoteCreateTransportPayload);
      quoteDebugLog("create.payload", {
        keys: Object.keys((safePayload ?? {}) as Record<string, unknown>),
        stopsLength: Array.isArray(safePayload?.stops) ? safePayload.stops.length : 0,
        distanceKm: safePayload?.distanceKm ?? null,
      });
      try {
        const data = await createQuoteGenerated(safePayload as unknown as Parameters<typeof createQuoteGenerated>[0]);
        return toQuoteCreateResponse(data);
      } catch (error) {
        if (!needsLegacyWorkMethodFallback(safePayload) || !isValidationStatusError(error)) {
          throw error;
        }

        const legacyPayload = toLegacyWorkMethodPayload(safePayload);
        const data = await createQuoteGenerated(legacyPayload as unknown as Parameters<typeof createQuoteGenerated>[0]);
        return toQuoteCreateResponse(data);
      }
    },

    async updateShipperQuote(quoteId: number, payload: QuoteUpdateRequestDto): Promise<QuoteUpdateResponse> {
      const safeQuoteId = normalizeQuoteId(quoteId);
      if (safeQuoteId <= 0) return toQuoteDetail({}, 0);

      const safePayload = await prepareQuotePayload((payload ?? {}) as QuoteCreateTransportPayload);
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

function createMockQuoteApi(): QuoteApi {
  return {
    async listShipperQuotes(): Promise<QuoteListItem[]> {
      await waitRandom();
      return toQuoteList(listMockFlowShipperQuotes());
    },

    async getShipperQuoteDetail(quoteId: number): Promise<QuoteDetailResponse> {
      await waitRandom();
      const safeQuoteId = normalizeQuoteId(quoteId);
      if (safeQuoteId <= 0) return toQuoteDetail({}, 0);

      return toQuoteDetail(getMockFlowShipperQuoteDetail(safeQuoteId), safeQuoteId);
    },

    async getShipperQuoteDetailByIdentifier(quoteIdentifier: string): Promise<QuoteDetailResponse> {
      await waitRandom();
      const safeIdentifier = normalizeQuoteIdentifier(quoteIdentifier);
      const fallbackQuoteId = normalizeQuoteId(Number(safeIdentifier));

      return toQuoteDetail(getMockFlowShipperQuoteDetailByIdentifier(safeIdentifier), fallbackQuoteId);
    },

    async previewShipperQuote(payload: QuoteCreateRequestDto): Promise<QuotePricePreview | null> {
      await waitRandom();
      const safePayload = sanitizeQuotePayload((payload ?? {}) as QuoteCreateTransportPayload);
      const desiredPrice = Math.max(0, safeInt(safePayload?.desiredPrice, 0));
      const fallbackPrice = desiredPrice > 0 ? desiredPrice : 100000;
      return {
        estimatedWeightedPrice: fallbackPrice,
        estimatedMinPrice: Math.max(0, Math.floor(fallbackPrice * 0.9)),
        estimatedMaxPrice: Math.max(0, Math.floor(fallbackPrice * 1.1)),
        aiSummary: "목업 미리보기 금액",
      };
    },

    async createShipperQuote(payload: QuoteCreateRequestDto): Promise<QuoteCreateResponseDto> {
      await waitRandom();
      const safePayload = sanitizeQuotePayload((payload ?? {}) as QuoteCreateTransportPayload);
      return toQuoteCreateResponse(
        createMockFlowShipperQuote(toMockQuoteCreateRequest(safePayload) as unknown as Parameters<typeof createMockFlowShipperQuote>[0])
      );
    },

    async updateShipperQuote(quoteId: number, payload: QuoteUpdateRequestDto): Promise<QuoteUpdateResponse> {
      await waitRandom();
      const safeQuoteId = normalizeQuoteId(quoteId);
      if (safeQuoteId <= 0) return toQuoteDetail({}, 0);

      const safePayload = sanitizeQuotePayload((payload ?? {}) as QuoteCreateTransportPayload);
      const updated = updateMockFlowShipperQuote(
        safeQuoteId,
        toMockQuoteCreateRequest(safePayload) as unknown as Parameters<typeof updateMockFlowShipperQuote>[1]
      );
      return toQuoteDetail(updated, safeQuoteId);
    },

    async deleteShipperQuote(quoteId: number): Promise<void> {
      await waitRandom();
      const safeQuoteId = normalizeQuoteId(quoteId);
      if (safeQuoteId <= 0) return;
      deleteMockFlowShipperQuote(safeQuoteId);
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

export function previewShipperQuote(payload: QuoteCreateRequestDto): Promise<QuotePricePreview | null> {
  return quoteApi.previewShipperQuote(payload);
}

export function updateShipperQuote(quoteId: number, payload: QuoteUpdateRequestDto): Promise<QuoteUpdateResponse> {
  return quoteApi.updateShipperQuote(quoteId, payload);
}

export function deleteShipperQuote(quoteId: number): Promise<void> {
  return quoteApi.deleteShipperQuote(quoteId);
}
