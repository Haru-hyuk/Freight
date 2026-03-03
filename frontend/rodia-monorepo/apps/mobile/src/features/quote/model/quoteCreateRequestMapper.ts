import type {
  QuoteCargoType,
  QuoteChecklistItemDto,
  QuoteCreateRequestDto,
  QuoteStopRequestDto,
  QuoteVehicleBodyType,
  QuoteVehicleType,
} from "@/entities/quote/dto";
import { EXTRA_OPTIONS, type QuoteCreateDraft } from "@/features/quote/model/quoteCreateDraft";
import { DEFAULT_LOAD_METHOD, DEFAULT_UNLOAD_METHOD, toActorOnlyWorkMethod } from "@/features/quote/model/workMethod";

const VEHICLE_TYPE_BY_TON_INDEX: QuoteVehicleType[] = [
  "DAMAS",
  "LABO",
  "TON_1",
  "TON_1_4",
  "TON_2_5",
  "TON_3_5",
  "TON_5",
  "TON_5_AXLE",
  "TON_8",
  "TON_11",
  "TON_14",
  "TON_15",
  "TON_18",
  "TON_25",
];
const VEHICLE_BODY_BY_TYPE_INDEX: QuoteVehicleBodyType[] = ["CARGO", "WING_BODY", "TOP_CAR"];
type QuoteCreateRequestPayload = Omit<QuoteCreateRequestDto, "basePrice"> & { basePrice?: number };
const CARGO_CATEGORY_LABELS: Readonly<Record<string, string>> = {
  BOX: "박스",
  PALLET: "파렛트",
  FURNITURE: "가구",
};

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

function readFirstFiniteNumber(source: Record<string, unknown>, keys: string[], fallback = 0) {
  for (const key of keys) {
    const value = source[key];
    const parsed = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
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

function resolveCargoItemName(item: QuoteCreateDraft["cargoList"][number]): string {
  const typedName = String(item?.type ?? "").trim();
  if (typedName) return typedName;

  const category = String(item?.itemCategory ?? "")
    .trim()
    .toUpperCase();
  return CARGO_CATEGORY_LABELS[category] ?? "화물";
}

function summarizeCargoName(draft: QuoteCreateDraft) {
  const firstItem = (draft.cargoList ?? [])[0];
  if (firstItem) return resolveCargoItemName(firstItem);

  const firstNamed = (draft.cargoList ?? []).find((item) => resolveCargoItemName(item).trim().length > 0);
  if (firstNamed) return resolveCargoItemName(firstNamed).trim();
  return "일반 화물";
}

function summarizeCargoDesc(draft: QuoteCreateDraft) {
  const names = (draft.cargoList ?? [])
    .map((item) => {
      const name = resolveCargoItemName(item);
      const quantity = Math.max(toInt(item?.quantity, 1), 1);
      return quantity > 1 ? `${name} x${quantity}` : name;
    })
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

function resolveBasePrice(draft: QuoteCreateDraft) {
  const extendedDraft = draft as QuoteCreateDraft & { basePrice?: unknown; desiredPrice?: unknown };
  const raw = extendedDraft.basePrice ?? extendedDraft.desiredPrice ?? 0;
  const safeRaw = typeof raw === "string" || typeof raw === "number" ? raw : 0;
  return Math.max(0, toInt(safeRaw, 0));
}

function buildChecklistItems(draft: QuoteCreateDraft): QuoteChecklistItemDto[] {
  const selected = Array.isArray(draft?.selectedOpts) ? draft.selectedOpts : [];
  if (!selected.length) return [];

  return selected
    .map((optionId) => {
      const option = EXTRA_OPTIONS.find((item) => item.id === optionId);
      if (!option) return null;
      return {
        checklistItemId: 0,
        extraInput: option.title,
        extraFee: Math.max(0, Math.trunc(option.price)),
      } as QuoteChecklistItemDto;
    })
    .filter((item): item is QuoteChecklistItemDto => Boolean(item));
}

export function buildQuoteCreateRequest(draft: QuoteCreateDraft): QuoteCreateRequestPayload {
  const originAddress = joinAddress(draft.startAddr, draft.startAddrDetail);
  const destinationAddress = joinAddress(draft.endAddr, draft.endAddrDetail);
  const extendedDraft = draft as QuoteCreateDraft & Record<string, unknown>;
  const originLat = readFirstFiniteNumber(extendedDraft, ["originLat", "startLat", "srcLat"], 0);
  const originLng = readFirstFiniteNumber(extendedDraft, ["originLng", "startLng", "srcLng"], 0);
  const destinationLat = readFirstFiniteNumber(extendedDraft, ["destinationLat", "endLat", "destLat"], 0);
  const destinationLng = readFirstFiniteNumber(extendedDraft, ["destinationLng", "endLng", "destLng"], 0);
  
  const truckId = toInt(draft.truckId, 0);
  const distanceKm = readFirstFiniteNumber(extendedDraft, ["distanceKm", "distance"], 0);
  const basePrice = resolveBasePrice(draft);

  const payload: QuoteCreateRequestPayload = {
    originAddress,
    destinationAddress,
    originLat,
    originLng,
    destinationLat,
    destinationLng,
    weightKg: calculateWeightKg(draft),
    volumeCbm: Math.max(0, calculateVolumeCbm(draft)),
    vehicleType: mapVehicleType(draft.tonIdx),
    vehicleBodyType: mapVehicleBodyType(draft.typeIdx),
    cargoName: summarizeCargoName(draft),
    cargoType: mapCargoType(draft.isFrozen),
    cargoDesc: summarizeCargoDesc(draft),
    desiredPrice: resolveDesiredPrice(draft),
    allowCombine: !!draft.isPool,
    loadMethod: toActorOnlyWorkMethod(draft.loadMethod, DEFAULT_LOAD_METHOD),
    unloadMethod: toActorOnlyWorkMethod(draft.unloadMethod, DEFAULT_UNLOAD_METHOD),
    checklistItems: buildChecklistItems(draft),
    stops: buildStops(draft),
  };

if (truckId > 0) {
    payload.truckId = truckId;
  } else {
    // 확실히 하기 위해 삭제
    delete (payload as any).truckId;
  }
  if (distanceKm > 0) payload.distanceKm = distanceKm;
  if (basePrice > 0) payload.basePrice = basePrice;

  return payload;
}
