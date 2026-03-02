import { apiClient } from "@/shared/lib/api/apiClient";

type AnyObj = Record<string, any>;

function asObj(v: unknown): AnyObj {
  return v && typeof v === "object" ? (v as AnyObj) : {};
}

function unwrapApiData(res: any): any {
  const root = asObj(res?.data);
  return root?.data ?? root?.result ?? root;
}

function toOptNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function toOptString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

export type DriverSettlementItem = {
  settlementId?: number;
  totalFare?: number;
  settlementType?: string;
  settlementStatus?: string;
  createdAt?: string;
};

export async function listDriverSettlementsMe(): Promise<DriverSettlementItem[]> {
  const res = await apiClient.get("/api/driver/settlements/me");
  const source = unwrapApiData(res);

  const arr = Array.isArray(source) ? source : Array.isArray(source?.items) ? source.items : [];

  return (arr as any[]).map((it) => ({
    settlementId: toOptNumber(it?.settlementId),
    totalFare: toOptNumber(it?.totalFare),
    settlementType: toOptString(it?.settlementType),
    settlementStatus: toOptString(it?.settlementStatus),
    createdAt: toOptString(it?.createdAt),
  }));
}
