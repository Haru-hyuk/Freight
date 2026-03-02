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
    approved: pickBool(it?.approved),
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
