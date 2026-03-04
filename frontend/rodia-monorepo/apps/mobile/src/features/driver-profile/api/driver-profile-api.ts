import { apiClient } from "@/shared/lib/api/apiClient";

type AnyObj = Record<string, any>;

function asObj(v: unknown): AnyObj {
  return v && typeof v === "object" ? (v as AnyObj) : {};
}

function unwrapApiData(res: any): any {
  const root = asObj(res?.data);
  return root?.data ?? root?.result ?? root;
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

export async function listDriverTrucks(): Promise<DriverTruck[]> {
  const res = await apiClient.get("/api/driver/trucks");
  const source = unwrapApiData(res);

  const arr = Array.isArray(source)
    ? source
    : Array.isArray(source?.trucks)
      ? source.trucks
      : Array.isArray(source?.items)
        ? source.items
        : [];

  return (arr as any[]).map((it) => ({
    truckId: typeof it?.truckId === "number" ? it.truckId : (typeof it?.truck_id === "number" ? it.truck_id : undefined),
    approved: pickBool(it?.approved),
    tonnage: typeof it?.tonnage === "number" ? it.tonnage : (typeof it?.tonnage === "string" ? Number(it.tonnage) : undefined),
    name: typeof it?.name === "string" ? it.name : undefined,
    vehicleType: typeof it?.vehicleType === "string" ? it.vehicleType : (typeof it?.vehicle_type === "string" ? it.vehicle_type : undefined),
    vehicleBodyType: typeof it?.vehicleBodyType === "string" ? it.vehicleBodyType : (typeof it?.vehicle_body_type === "string" ? it.vehicle_body_type : undefined),
  }));
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
  const res = await apiClient.get("/api/reference/truck-specs", { params });
  const source = unwrapApiData(res);

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
  }));
}

export async function createDriverTruck(input: DriverTruckCreateInput): Promise<number | null> {
  const payload = {
    vehicleType: toText(input.vehicleType),
    vehicleBodyType: toText(input.vehicleBodyType),
    tonnage: Number(input.tonnage),
    maxWeight: Number(input.maxWeight),
    name: toText(input.name),
    insurance: toText(input.insurance),
    approved: typeof input.approved === "boolean" ? input.approved : false,
  };

  const res = await apiClient.post("/api/driver/trucks", payload);
  const data = unwrapApiData(res);
  const truckId = Number(data?.truckId ?? data?.id ?? 0);
  return Number.isInteger(truckId) && truckId > 0 ? truckId : null;
}
