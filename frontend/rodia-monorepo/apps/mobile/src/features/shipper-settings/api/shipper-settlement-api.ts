import {
  getMySettlements,
} from "@/shared/api/generated/shipper-settlement-controller/shipper-settlement-controller";
import { isMockMode } from "@/shared/lib/config/env";

type AnyObject = Record<string, unknown>;

export type SettlementItem = {
  settlementId: number;
  matchId: number;
  totalFare: number;
  platformFee: number;
  driverPayout: number;
  shipperPaymentStatus: string;
  shipperPaidAt?: string;
  settlementStatus: string;
  dueDate?: string;
  createdAt?: string;
  updatedAt?: string;
};

function asObject(v: unknown): AnyObject {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as AnyObject;
  return {};
}

function toPositiveInt(v: unknown): number {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

function toNonNegativeInt(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.trunc(n));
}

function toOptionalText(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t || undefined;
}

function unwrapPayload(v: unknown): unknown {
  const root = asObject(v);
  if (typeof root.data !== "undefined") return root.data;
  if (typeof root.result !== "undefined") return root.result;
  return v;
}

function unwrapListPayload(v: unknown): unknown[] {
  const payload = unwrapPayload(v);
  if (Array.isArray(payload)) return payload;
  const source = asObject(payload);
  if (Array.isArray(source.items)) return source.items;
  if (Array.isArray(source.list)) return source.list;
  if (Array.isArray(source.content)) return source.content;
  return [];
}

function parseSettlementItem(v: unknown): SettlementItem | null {
  const s = asObject(v);
  const settlementId = toPositiveInt(s.settlementId);
  if (settlementId <= 0) return null;

  return {
    settlementId,
    matchId: toPositiveInt(s.matchId),
    totalFare: toNonNegativeInt(s.totalFare),
    platformFee: toNonNegativeInt(s.platformFee),
    driverPayout: toNonNegativeInt(s.driverPayout),
    shipperPaymentStatus: toOptionalText(s.shipperPaymentStatus) ?? "PENDING",
    shipperPaidAt: toOptionalText(s.shipperPaidAt),
    settlementStatus: toOptionalText(s.settlementStatus) ?? "PENDING",
    dueDate: toOptionalText(s.dueDate),
    createdAt: toOptionalText(s.createdAt),
    updatedAt: toOptionalText(s.updatedAt),
  };
}

export async function listMyShipperSettlements(): Promise<SettlementItem[]> {
  if (isMockMode()) return [];

  try {
    const data = await getMySettlements();
    return unwrapListPayload(data)
      .map(parseSettlementItem)
      .filter((item): item is SettlementItem => item !== null)
      .sort((a, b) => {
        const aTs = Date.parse(a.createdAt ?? "");
        const bTs = Date.parse(b.createdAt ?? "");
        if (Number.isFinite(aTs) && Number.isFinite(bTs)) return bTs - aTs;
        return b.settlementId - a.settlementId;
      });
  } catch {
    return [];
  }
}
