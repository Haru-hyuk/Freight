import type {
  QuoteCargoType,
  QuoteCreateRequestDto,
  QuoteVehicleBodyType,
  QuoteVehicleType,
  QuoteWorkMethod,
} from "@/entities/quote/dto";
import { computeQuotePricing, type QuoteCreateDraft } from "@/features/quote/model/quoteCreateDraft";

const VEHICLE_TYPE_BY_TON_INDEX: QuoteVehicleType[] = ["TON_1", "TON_2_5", "TON_5"];
const VEHICLE_BODY_BY_TYPE_INDEX: QuoteVehicleBodyType[] = ["CARGO", "WING_BODY", "TOP_CAR"];

function digitsOnly(input?: string) {
  return (input ?? "").replace(/[^\d]/g, "");
}

function toInt(input?: string | number, fallback = 0) {
  if (typeof input === "number" && Number.isFinite(input)) return Math.floor(input);
  const parsed = parseInt(digitsOnly(String(input ?? "")), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNumber(input: unknown, fallback = 0) {
  const value = typeof input === "number" ? input : Number(input);
  return Number.isFinite(value) ? value : fallback;
}

function clampIndex(index: number, length: number) {
  if (length <= 0) return 0;
  if (!Number.isFinite(index)) return 0;
  return Math.min(Math.max(Math.floor(index), 0), length - 1);
}

function joinAddress(addr?: string, detail?: string) {
  const left = (addr ?? "").trim();
  const right = (detail ?? "").trim();
  if (!left) return "";
  if (!right) return left;
  return `${left} ${right}`.trim();
}

function mapWorkMethod(method?: string): QuoteWorkMethod {
  return method === "수작업" ? "SHIPPER" : "DRIVER";
}

function mapCargoType(isFrozen?: boolean): QuoteCargoType {
  return isFrozen ? "FROZEN" : "GENERAL";
}

function mapVehicleType(tonIdx?: number): QuoteVehicleType {
  const idx = clampIndex(toNumber(tonIdx, 0), VEHICLE_TYPE_BY_TON_INDEX.length);
  return VEHICLE_TYPE_BY_TON_INDEX[idx] ?? "TON_1";
}

function mapVehicleBodyType(typeIdx?: number): QuoteVehicleBodyType {
  const idx = clampIndex(toNumber(typeIdx, 0), VEHICLE_BODY_BY_TYPE_INDEX.length);
  return VEHICLE_BODY_BY_TYPE_INDEX[idx] ?? "CARGO";
}

function summarizeCargoName(draft: QuoteCreateDraft) {
  const firstNamed = (draft.cargoList ?? []).find((item) => (item?.type ?? "").trim().length > 0);
  if (firstNamed?.type) return firstNamed.type.trim();
  return "일반 화물";
}

function summarizeCargoDesc(draft: QuoteCreateDraft) {
  const names = (draft.cargoList ?? [])
    .map((item) => (item?.type ?? "").trim())
    .filter((name) => name.length > 0);
  if (!names.length) return "화물 정보 미입력";
  return names.slice(0, 5).join(", ");
}

function calculateVolumeCbm(draft: QuoteCreateDraft) {
  const sum = (draft.cargoList ?? []).reduce((acc, item) => {
    const l = toInt(item?.lengthCm, 0);
    const w = toInt(item?.widthCm, 0);
    const h = toInt(item?.heightCm, 0);
    const q = Math.max(toInt(item?.quantity, 1), 1);
    if (l <= 0 || w <= 0 || h <= 0) return acc;
    return acc + (l / 100) * (w / 100) * (h / 100) * q;
  }, 0);
  return Number(sum.toFixed(2));
}

function calculateWeightKg(draft: QuoteCreateDraft) {
  return (draft.cargoList ?? []).reduce((acc, item) => acc + Math.max(0, toInt(item?.weight, 0)), 0);
}

function resolveDesiredPrice(draft: QuoteCreateDraft) {
  const input = toInt(draft.budget, 0);
  if (input > 0) return input;
  const pricing = computeQuotePricing(draft);
  return Math.max(0, toNumber(pricing.finalPrice, 0));
}

export function buildQuoteCreateRequest(draft: QuoteCreateDraft): QuoteCreateRequestDto {
  const originAddress = joinAddress(draft.startAddr, draft.startAddrDetail);
  const destinationAddress = joinAddress(draft.endAddr, draft.endAddrDetail);

  return {
    truckId: Math.max(1, toInt(draft.truckId, 1)),
    originAddress,
    destinationAddress,
    originLat: toNumber(draft.originLat, 0),
    originLng: toNumber(draft.originLng, 0),
    destinationLat: toNumber(draft.destinationLat, 0),
    destinationLng: toNumber(draft.destinationLng, 0),
    distanceKm: Math.max(0, toNumber(draft.distanceKm, 0)),
    weightKg: calculateWeightKg(draft),
    volumeCbm: calculateVolumeCbm(draft),
    vehicleType: mapVehicleType(draft.tonIdx),
    vehicleBodyType: mapVehicleBodyType(draft.typeIdx),
    cargoName: summarizeCargoName(draft),
    cargoType: mapCargoType(draft.isFrozen),
    cargoDesc: summarizeCargoDesc(draft),
    desiredPrice: resolveDesiredPrice(draft),
    allowCombine: !!draft.isPool,
    loadMethod: mapWorkMethod(draft.loadMethod),
    unloadMethod: mapWorkMethod(draft.unloadMethod),
    checklistItems: [],
  };
}