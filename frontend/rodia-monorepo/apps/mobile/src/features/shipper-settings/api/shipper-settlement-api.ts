import {
  getByMatch as getByMatchGenerated,
  getMySettlements as getMySettlementsGenerated,
} from "@/shared/api/generated/shipper-settlement/shipper-settlement";
import type { SettlementResponse as SettlementResponseRaw } from "@/shared/api/generated/schemas/settlementResponse";
import { isMockMode } from "@/shared/lib/config/env";

type AnyObject = Record<string, unknown>;
export type SettlementResponse = SettlementResponseRaw;

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

function toOptionalNumber(v: unknown): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
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

function toSettlementResponse(v: unknown): SettlementResponse | null {
  const s = asObject(v);
  if (Object.keys(s).length <= 0) return null;

  const settlementId = toPositiveInt(s.settlementId ?? s.settlement_id);
  const matchId = toPositiveInt(s.matchId ?? s.match_id);
  if (settlementId <= 0 && matchId <= 0) return null;

  return {
    settlementId: settlementId > 0 ? settlementId : undefined,
    matchId: matchId > 0 ? matchId : undefined,
    driverId: toPositiveInt(s.driverId ?? s.driver_id) || undefined,
    shipperId: toPositiveInt(s.shipperId ?? s.shipper_id) || undefined,
    totalFare: toOptionalNumber(s.totalFare ?? s.total_fare),
    platformFee: toOptionalNumber(s.platformFee ?? s.platform_fee),
    fastFee: toOptionalNumber(s.fastFee ?? s.fast_fee),
    routeDistanceKm: toOptionalNumber(s.routeDistanceKm ?? s.route_distance_km),
    fuelCost: toOptionalNumber(s.fuelCost ?? s.fuel_cost),
    tollFee: toOptionalNumber(s.tollFee ?? s.toll_fee),
    driverPayout: toOptionalNumber(s.driverPayout ?? s.driver_payout),
    shipperPaymentStatus: toOptionalText(s.shipperPaymentStatus ?? s.shipper_payment_status) ?? "PENDING",
    shipperPaymentMethod: toOptionalText(s.shipperPaymentMethod ?? s.shipper_payment_method),
    shipperPaidAt: toOptionalText(s.shipperPaidAt ?? s.shipper_paid_at),
    settlementType: toOptionalText(s.settlementType ?? s.settlement_type),
    settlementStatus: toOptionalText(s.settlementStatus ?? s.settlement_status) ?? "PENDING",
    dueDate: toOptionalText(s.dueDate ?? s.due_date),
    completedAt: toOptionalText(s.completedAt ?? s.completed_at),
    createdAt: toOptionalText(s.createdAt ?? s.created_at),
    updatedAt: toOptionalText(s.updatedAt ?? s.updated_at),
  };
}

function parseSettlementItem(v: unknown): SettlementItem | null {
  const settlement = toSettlementResponse(v);
  if (!settlement) return null;
  const settlementId = toPositiveInt(settlement.settlementId);
  if (settlementId <= 0) return null;

  const createdAt = settlement.createdAt ?? settlement.updatedAt ?? settlement.shipperPaidAt;

  return {
    settlementId,
    matchId: toPositiveInt(settlement.matchId),
    totalFare: toNonNegativeInt(settlement.totalFare),
    platformFee: toNonNegativeInt(settlement.platformFee),
    driverPayout: toNonNegativeInt(settlement.driverPayout),
    shipperPaymentStatus: toOptionalText(settlement.shipperPaymentStatus) ?? "PENDING",
    shipperPaidAt: toOptionalText(settlement.shipperPaidAt),
    settlementStatus: toOptionalText(settlement.settlementStatus) ?? "PENDING",
    dueDate: toOptionalText(settlement.dueDate),
    createdAt,
    updatedAt: settlement.updatedAt,
  };
}

export async function listMyShipperSettlements(): Promise<SettlementItem[]> {
  if (isMockMode()) return [];

  try {
    const data = await getMySettlementsGenerated();
    return unwrapListPayload(data)
      .map(parseSettlementItem)
      .filter((item): item is SettlementItem => item !== null)
      .sort((a, b) => {
        const aTs = Date.parse(a.createdAt ?? a.updatedAt ?? a.shipperPaidAt ?? "");
        const bTs = Date.parse(b.createdAt ?? b.updatedAt ?? b.shipperPaidAt ?? "");
        if (Number.isFinite(aTs) && Number.isFinite(bTs)) return bTs - aTs;
        return b.settlementId - a.settlementId;
      });
  } catch {
    return [];
  }
}

export async function getShipperSettlementByMatch(matchId: number): Promise<SettlementResponse> {
  const safeMatchId = toPositiveInt(matchId);
  if (safeMatchId <= 0) {
    throw new Error("유효하지 않은 매칭 ID입니다.");
  }

  if (isMockMode()) {
    throw new Error("모의 환경에서는 정산 영수증 상세를 지원하지 않습니다.");
  }

  const data = await getByMatchGenerated({ matchId: safeMatchId });
  const settlement = toSettlementResponse(unwrapPayload(data));
  if (!settlement) {
    throw new Error("정산 상세 정보를 찾을 수 없습니다.");
  }
  return settlement;
}
