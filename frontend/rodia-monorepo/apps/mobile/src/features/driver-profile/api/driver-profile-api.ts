import { getTruckSpecs } from "@/shared/api/generated/reference-catalog/reference-catalog";
import type { TruckCreateRequest } from "@/shared/api/generated/schemas/truckCreateRequest";
import { createTruck, listTrucks } from "@/shared/api/generated/truck/truck";

type AnyObj = Record<string, any>;
type StableTruckCreatePayload = Pick<
  TruckCreateRequest,
  "vehicleType" | "vehicleBodyType" | "tonnage" | "maxWeight" | "name" | "insurance" | "approved"
>;

function asObj(v: unknown): AnyObj {
  return v && typeof v === "object" ? (v as AnyObj) : {};
}

function unwrapApiData(value: unknown): any {
  if (Array.isArray(value)) return value;

  const root = asObj(value);
  const looksLikeAxiosResponse =
    "status" in root || "headers" in root || "config" in root || "request" in root;
  if (looksLikeAxiosResponse) {
    return unwrapApiData(root.data);
  }

  if (Array.isArray(root?.data)) return root.data;
  if (Array.isArray(root?.result)) return root.result;

  const dataObj = asObj(root?.data);
  if (Object.keys(dataObj).length > 0) return dataObj?.data ?? dataObj?.result ?? dataObj;

  const resultObj = asObj(root?.result);
  if (Object.keys(resultObj).length > 0) return resultObj;

  return root;
}

function pickBool(v: unknown): boolean | undefined {
  return typeof v === "boolean" ? v : undefined;
}

export type DriverTruck = {
  truckId?: number;
  approved?: boolean;
  tonnage?: number;
  name?: string;
  vehicleType?: string;
  vehicleBodyType?: string;
};

export type TruckSpecReference = {
  vehicleType?: string;
  vehicleBodyType?: string;
  tonnage?: number;
  maxWeight?: number;
  maxWeightDisplay?: string;
  maxVolume?: number;
};

export type DriverTruckCreateInput = {
  vehicleType: string;
  vehicleBodyType: string;
  tonnage: number;
  maxWeight: number;
  name: string;
  insurance: string;
  approved?: boolean;
};

function toDriverTruck(source: unknown): DriverTruck {
  const it = asObj(source);
  return {
    truckId: typeof it?.truckId === "number" ? it.truckId : (typeof it?.truck_id === "number" ? it.truck_id : undefined),
    approved: pickBool(it?.approved),
    tonnage: typeof it?.tonnage === "number" ? it.tonnage : (typeof it?.tonnage === "string" ? Number(it.tonnage) : undefined),
    name: typeof it?.name === "string" ? it.name : undefined,
    vehicleType: typeof it?.vehicleType === "string" ? it.vehicleType : (typeof it?.vehicle_type === "string" ? it.vehicle_type : undefined),
    vehicleBodyType: typeof it?.vehicleBodyType === "string" ? it.vehicleBodyType : (typeof it?.vehicle_body_type === "string" ? it.vehicle_body_type : undefined),
  };
}

export async function listDriverTrucks(): Promise<DriverTruck[]> {
  const raw = await listTrucks();
  const source = unwrapApiData(raw);

  const arr = Array.isArray(source)
    ? source
    : Array.isArray(source?.trucks)
      ? source.trucks
      : Array.isArray(source?.items)
        ? source.items
        : [];

  return (arr as any[]).map(toDriverTruck);
}

export async function getDriverTruckApproved(): Promise<boolean | null> {
  try {
    const trucks = await listDriverTrucks();
    const v = trucks.find((t) => typeof t.approved === "boolean")?.approved;
    return typeof v === "boolean" ? v : null;
  } catch {
    return null;
  }
}

function toText(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function toNumber(v: unknown): number | undefined {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export async function listTruckSpecCatalog(vehicleType?: string): Promise<TruckSpecReference[]> {
  const params = toText(vehicleType) ? { vehicleType: toText(vehicleType) } : undefined;
  const raw = await getTruckSpecs(params);
  const source = unwrapApiData(raw);

  const arr = Array.isArray(source)
    ? source
    : Array.isArray(source?.items)
      ? source.items
      : Array.isArray(source?.list)
        ? source.list
        : [];

  return (arr as any[]).map((it) => ({
    vehicleType: toText(it?.vehicleType) || undefined,
    vehicleBodyType: toText(it?.vehicleBodyType) || undefined,
    tonnage: toNumber(it?.tonnage),
    maxWeight: toNumber(it?.maxWeight),
    maxWeightDisplay: toText(it?.maxWeightDisplay) || undefined,
    maxVolume: toNumber(it?.maxVolume),
  }));
}

export async function createDriverTruck(input: DriverTruckCreateInput): Promise<number | null> {
  const payload: StableTruckCreatePayload = {
    vehicleType: toText(input.vehicleType),
    vehicleBodyType: toText(input.vehicleBodyType),
    tonnage: Number(input.tonnage),
    maxWeight: Number(input.maxWeight),
    name: toText(input.name),
    insurance: toText(input.insurance),
    approved: typeof input.approved === "boolean" ? input.approved : false,
    // TODO: maxVolume/cargoLength/cargoWidth/cargoHeight are excluded until server contract is verified.
  };

  const raw = await createTruck(payload);
  const data = asObj(unwrapApiData(raw));
  const truckId = Number(data?.truckId ?? data?.id ?? 0);
  return Number.isInteger(truckId) && truckId > 0 ? truckId : null;
}
