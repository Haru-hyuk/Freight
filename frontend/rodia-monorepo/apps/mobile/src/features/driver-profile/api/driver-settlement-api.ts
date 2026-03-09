import {
  getByMatch1,
  getMySettlements1,
  getMySettlementSummary,
} from "@/shared/api/generated/driver-settlement/driver-settlement";
import type { DriverSettlementSummaryResponse } from "@/shared/api/generated/schemas/driverSettlementSummaryResponse";
import type { SettlementResponse } from "@/shared/api/generated/schemas/settlementResponse";
import { isMockMode } from "@/shared/lib/config/env";

// ─── 타입 재공개 ──────────────────────────────────────────────────────────────

export type { SettlementResponse };
export type DriverSettlementItem = SettlementResponse;
export type DriverSettlementSummary = {
  driverId?: number;
  totalSettlementCount: number;
  pendingSettlementCount: number;
  completedSettlementCount: number;
  failedSettlementCount: number;
  totalPayoutAmount: number;
  pendingPayoutAmount: number;
  completedPayoutAmount: number;
  failedPayoutAmount: number;
  monthPayoutAmount: number;
  weekCompletedCount: number;
  weekCompletedPayoutAmount: number;
  calculatedAt?: string;
};

const DRIVER_SETTLEMENT_MOCK_ITEMS: ReadonlyArray<SettlementResponse> = [
  {
    settlementId: 91001,
    matchId: 700101,
    driverId: 3101,
    shipperId: 2201,
    totalFare: 215000,
    platformFee: 18000,
    fastFee: 5000,
    driverPayout: 192000,
    shipperPaymentStatus: "PAID",
    shipperPaymentMethod: "CARD",
    shipperPaidAt: "2026-03-05T11:10:00+09:00",
    settlementType: "FAST",
    settlementStatus: "COMPLETED",
    dueDate: "2026-03-07T23:59:00+09:00",
    completedAt: "2026-03-05T11:22:00+09:00",
    createdAt: "2026-03-05T10:42:00+09:00",
    updatedAt: "2026-03-05T11:24:00+09:00",
  },
  {
    settlementId: 91002,
    matchId: 700102,
    driverId: 3101,
    shipperId: 2204,
    totalFare: 168000,
    platformFee: 14000,
    fastFee: 0,
    driverPayout: 154000,
    shipperPaymentStatus: "PENDING",
    shipperPaymentMethod: "BANK_TRANSFER",
    settlementType: "STANDARD",
    settlementStatus: "PENDING",
    dueDate: "2026-03-08T23:59:00+09:00",
    createdAt: "2026-03-06T08:20:00+09:00",
    updatedAt: "2026-03-06T08:35:00+09:00",
  },
  {
    settlementId: 91003,
    matchId: 700103,
    driverId: 3101,
    shipperId: 2209,
    totalFare: 302000,
    platformFee: 27000,
    fastFee: 0,
    driverPayout: 275000,
    shipperPaymentStatus: "PAID",
    shipperPaymentMethod: "TOSS_PAY",
    shipperPaidAt: "2026-03-04T18:10:00+09:00",
    settlementType: "STANDARD",
    settlementStatus: "COMPLETED",
    dueDate: "2026-03-06T23:59:00+09:00",
    completedAt: "2026-03-04T18:25:00+09:00",
    createdAt: "2026-03-04T17:42:00+09:00",
    updatedAt: "2026-03-04T18:26:00+09:00",
  },
];

function parsePositiveInt(value: unknown): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function toNonNegativeNumber(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return parsed > 0 ? parsed : 0;
}

function toObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function unwrapApiData(value: unknown): unknown {
  if (Array.isArray(value)) return value;

  const root = toObject(value);
  const data = toObject(root.data);
  const result = toObject(root.result);

  if (Array.isArray(root.data)) return root.data;
  if (Array.isArray(root.result)) return root.result;
  if (Object.keys(data).length > 0) return data.data ?? data.result ?? data;
  if (Object.keys(result).length > 0) return result;
  return root;
}

function toOptionalText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  return text || undefined;
}

function toOptionalNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toSettlementResponse(value: unknown): SettlementResponse | null {
  const source = toObject(value);
  if (Object.keys(source).length <= 0) return null;

  const settlementId = parsePositiveInt(source.settlementId ?? source.settlement_id);
  const matchId = parsePositiveInt(source.matchId ?? source.match_id);
  if (settlementId <= 0 && matchId <= 0) return null;

  return {
    settlementId: settlementId > 0 ? settlementId : undefined,
    matchId: matchId > 0 ? matchId : undefined,
    driverId: parsePositiveInt(source.driverId ?? source.driver_id) || undefined,
    shipperId: parsePositiveInt(source.shipperId ?? source.shipper_id) || undefined,
    totalFare: toOptionalNumber(source.totalFare ?? source.total_fare),
    platformFee: toOptionalNumber(source.platformFee ?? source.platform_fee),
    fastFee: toOptionalNumber(source.fastFee ?? source.fast_fee),
    routeDistanceKm: toOptionalNumber(source.routeDistanceKm ?? source.route_distance_km),
    fuelCost: toOptionalNumber(source.fuelCost ?? source.fuel_cost),
    tollFee: toOptionalNumber(source.tollFee ?? source.toll_fee),
    driverPayout: toOptionalNumber(source.driverPayout ?? source.driver_payout),
    shipperPaymentStatus: toOptionalText(source.shipperPaymentStatus ?? source.shipper_payment_status),
    shipperPaymentMethod: toOptionalText(source.shipperPaymentMethod ?? source.shipper_payment_method),
    shipperPaidAt: toOptionalText(source.shipperPaidAt ?? source.shipper_paid_at),
    settlementType: toOptionalText(source.settlementType ?? source.settlement_type),
    settlementStatus: toOptionalText(source.settlementStatus ?? source.settlement_status),
    dueDate: toOptionalText(source.dueDate ?? source.due_date),
    completedAt: toOptionalText(source.completedAt ?? source.completed_at),
    createdAt: toOptionalText(source.createdAt ?? source.created_at),
    updatedAt: toOptionalText(source.updatedAt ?? source.updated_at),
  };
}

function toSettlementArray(value: unknown): SettlementResponse[] {
  const source = unwrapApiData(value);

  const fromArray = Array.isArray(source)
    ? source.map(toSettlementResponse).filter((item): item is SettlementResponse => item !== null)
    : [];
  if (fromArray.length > 0) return fromArray;

  const root = toObject(source);
  const arrayCandidates = [root.items, root.list, root.content, root.data, root.result];
  for (const candidate of arrayCandidates) {
    if (!Array.isArray(candidate)) continue;
    const normalized = candidate
      .map(toSettlementResponse)
      .filter((item): item is SettlementResponse => item !== null);
    if (normalized.length > 0) return normalized;
  }

  const single = toSettlementResponse(root);
  return single ? [single] : [];
}

function resolveSettlementTimestamp(settlement: SettlementResponse): number {
  const candidate =
    settlement.shipperPaidAt ??
    settlement.completedAt ??
    settlement.updatedAt ??
    settlement.createdAt ??
    "";
  const parsed = Date.parse(candidate);
  return Number.isFinite(parsed) ? parsed : 0;
}

function createMockSettlementFallback(matchId: number): SettlementResponse {
  const now = new Date().toISOString();
  return {
    ...DRIVER_SETTLEMENT_MOCK_ITEMS[0],
    settlementId: 990000 + matchId,
    matchId,
    shipperPaymentStatus: "PENDING",
    settlementStatus: "PENDING",
    shipperPaidAt: undefined,
    completedAt: undefined,
    createdAt: now,
    updatedAt: now,
  };
}

function sortSettlementsDesc(input: ReadonlyArray<SettlementResponse>): SettlementResponse[] {
  return [...input].sort((a, b) => {
    const byDate = resolveSettlementTimestamp(b) - resolveSettlementTimestamp(a);
    if (byDate !== 0) return byDate;
    return parsePositiveInt(b.settlementId) - parsePositiveInt(a.settlementId);
  });
}

function getWeekStart(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  const offset = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - offset);
  return copy;
}

function resolveSummaryDate(settlement: SettlementResponse): Date | null {
  const raw = settlement.completedAt ?? settlement.updatedAt ?? settlement.createdAt ?? "";
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? new Date(parsed) : null;
}

function isWithinRange(target: Date, from: Date, to: Date): boolean {
  const at = target.getTime();
  return at >= from.getTime() && at < to.getTime();
}

function toSettlementSummary(source: DriverSettlementSummaryResponse | unknown): DriverSettlementSummary {
  const obj = toObject(unwrapApiData(source));
  return {
    driverId: parsePositiveInt(obj.driverId) || undefined,
    totalSettlementCount: parsePositiveInt(obj.totalSettlementCount),
    pendingSettlementCount: parsePositiveInt(obj.pendingSettlementCount),
    completedSettlementCount: parsePositiveInt(obj.completedSettlementCount),
    failedSettlementCount: parsePositiveInt(obj.failedSettlementCount),
    totalPayoutAmount: toNonNegativeNumber(obj.totalPayoutAmount),
    pendingPayoutAmount: toNonNegativeNumber(obj.pendingPayoutAmount),
    completedPayoutAmount: toNonNegativeNumber(obj.completedPayoutAmount),
    failedPayoutAmount: toNonNegativeNumber(obj.failedPayoutAmount),
    monthPayoutAmount: toNonNegativeNumber(obj.monthPayoutAmount),
    weekCompletedCount: parsePositiveInt(obj.weekCompletedCount),
    weekCompletedPayoutAmount: toNonNegativeNumber(obj.weekCompletedPayoutAmount),
    calculatedAt: typeof obj.calculatedAt === "string" ? obj.calculatedAt : undefined,
  };
}

function buildSummaryFromSettlements(settlements: ReadonlyArray<SettlementResponse>): DriverSettlementSummary {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const weekStart = getWeekStart(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  let totalSettlementCount = 0;
  let pendingSettlementCount = 0;
  let completedSettlementCount = 0;
  let failedSettlementCount = 0;
  let totalPayoutAmount = 0;
  let pendingPayoutAmount = 0;
  let completedPayoutAmount = 0;
  let failedPayoutAmount = 0;
  let monthPayoutAmount = 0;
  let weekCompletedCount = 0;
  let weekCompletedPayoutAmount = 0;

  settlements.forEach((settlement) => {
    totalSettlementCount += 1;

    const payout = toNonNegativeNumber(settlement.driverPayout);
    totalPayoutAmount += payout;

    const statusToken = String(settlement.settlementStatus ?? "")
      .trim()
      .toUpperCase();
    if (statusToken === "PENDING") {
      pendingSettlementCount += 1;
      pendingPayoutAmount += payout;
    } else if (statusToken === "COMPLETED") {
      completedSettlementCount += 1;
      completedPayoutAmount += payout;
    } else if (statusToken === "FAILED") {
      failedSettlementCount += 1;
      failedPayoutAmount += payout;
    }

    const settlementDate = resolveSummaryDate(settlement);
    if (!settlementDate) return;

    if (isWithinRange(settlementDate, monthStart, nextMonthStart)) {
      monthPayoutAmount += payout;
    }
    if (statusToken === "COMPLETED" && isWithinRange(settlementDate, weekStart, weekEnd)) {
      weekCompletedCount += 1;
      weekCompletedPayoutAmount += payout;
    }
  });

  return {
    driverId: parsePositiveInt(settlements[0]?.driverId) || undefined,
    totalSettlementCount,
    pendingSettlementCount,
    completedSettlementCount,
    failedSettlementCount,
    totalPayoutAmount,
    pendingPayoutAmount,
    completedPayoutAmount,
    failedPayoutAmount,
    monthPayoutAmount,
    weekCompletedCount,
    weekCompletedPayoutAmount,
    calculatedAt: now.toISOString(),
  };
}

export async function listDriverSettlementsMe(): Promise<DriverSettlementItem[]> {
  if (isMockMode()) {
    return sortSettlementsDesc(DRIVER_SETTLEMENT_MOCK_ITEMS);
  }

  const raw = await getMySettlements1();
  const settlements = toSettlementArray(raw);
  return sortSettlementsDesc(settlements);
}

export async function getDriverSettlementByMatch(matchId: number): Promise<SettlementResponse> {
  const safeMatchId = parsePositiveInt(matchId);
  if (safeMatchId <= 0) {
    throw new Error("유효하지 않은 매칭 ID입니다.");
  }
  if (isMockMode()) {
    const found = DRIVER_SETTLEMENT_MOCK_ITEMS.find(
      (item) => parsePositiveInt(item.matchId) === safeMatchId
    );
    return found ?? createMockSettlementFallback(safeMatchId);
  }

  const raw = await getByMatch1({ matchId: safeMatchId });
  const directCandidates = toSettlementArray(raw);
  const exactMatched = directCandidates.find((item) => parsePositiveInt(item.matchId) === safeMatchId);
  if (exactMatched) return exactMatched;

  const firstDirect = directCandidates[0];
  if (firstDirect && parsePositiveInt(firstDirect.matchId) <= 0) {
    return { ...firstDirect, matchId: safeMatchId };
  }

  const settlements = await listDriverSettlementsMe();
  const fallbackMatched = settlements.find((item) => parsePositiveInt(item.matchId) === safeMatchId);
  if (fallbackMatched) return fallbackMatched;

  throw new Error("정산 정보를 찾을 수 없습니다.");
}

export async function getDriverSettlementSummaryMe(): Promise<DriverSettlementSummary> {
  if (isMockMode()) {
    return buildSummaryFromSettlements(DRIVER_SETTLEMENT_MOCK_ITEMS);
  }

  try {
    const raw = await getMySettlementSummary();
    return toSettlementSummary(raw);
  } catch {
    const settlements = await listDriverSettlementsMe();
    return buildSummaryFromSettlements(settlements);
  }
}
