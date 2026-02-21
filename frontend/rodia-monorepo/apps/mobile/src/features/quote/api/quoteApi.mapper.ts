import type {
  QuoteChecklistItemDto,
  QuoteCreateResponseDto,
  QuoteDetailResponseDto,
  QuoteListItemDto,
} from "@/entities/quote/dto";
import type { QuoteDetailResponse, QuoteListItem, QuoteStatusApi } from "@/entities/quote/model/quote.types";

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

export function toQuoteCreateResponse(input: unknown): QuoteCreateResponseDto {
  const payload = asObject(pickPayload(input));
  const quoteId = pickQuoteId(payload, 0);
  return { quoteId };
}

export function toQuoteListItem(input: unknown, fallbackId = 0): QuoteListItem {
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

export function toQuoteList(input: unknown): QuoteListItem[] {
  const list = pickListPayload(input);
  return list.map((item, index) => toQuoteListItem(item, index + 1));
}

export function toQuoteDetail(input: unknown, fallbackQuoteId = 0): QuoteDetailResponse {
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

