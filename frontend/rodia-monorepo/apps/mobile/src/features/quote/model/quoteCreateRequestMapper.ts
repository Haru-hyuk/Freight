import type {
  QuoteCargoType,
  QuoteCreateRequestDto,
  QuoteStopRequestDto,
  QuoteVehicleBodyType,
  QuoteVehicleType,
  QuoteWorkMethod,
} from "@/entities/quote/dto";
import { EXTRA_OPTIONS, type QuoteCreateDraft } from "@/features/quote/model/quoteCreateDraft";

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

function buildStops(draft: QuoteCreateDraft): QuoteStopRequestDto[] {
  const waypoints = Array.isArray(draft?.waypoints) ? draft.waypoints : [];

  return waypoints
    .map((waypoint, index) => {
      const address = joinAddress(waypoint?.addr, waypoint?.detail);
      if (!address) return null;

      return {
        seq: index + 1,
        address,
        lat: toNumber(waypoint?.lat, 0),
        lng: toNumber(waypoint?.lng, 0),
        contactName: (waypoint?.name ?? "").trim(),
        contactPhone: (waypoint?.phone ?? "").trim(),
        deptName: "",
        managerName: "",
      } as QuoteStopRequestDto;
    })
    .filter((stop): stop is QuoteStopRequestDto => Boolean(stop));
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
  return 0;
}

function buildChecklistItems(draft: QuoteCreateDraft): QuoteCreateRequestDto["checklistItems"] {
  const selected = Array.isArray(draft?.selectedOpts) ? draft.selectedOpts : [];
  if (selected.length === 0) return [];

  return selected.map((optionId, index) => {
    const option = EXTRA_OPTIONS.find((item) => item?.id === optionId);
    const title = String(option?.title ?? optionId ?? "").trim();
    const extraFee = Math.max(0, toInt(option?.price, 0));

    return {
      checklistItemId: index + 1,
      extraInput: title || `옵션 ${index + 1}`,
      extraFee,
    };
  });
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
    distanceKm: Math.max(1, Math.trunc(toNumber(draft.distanceKm, 0))),
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
    checklistItems: buildChecklistItems(draft),
    stops: buildStops(draft),
  };
}
