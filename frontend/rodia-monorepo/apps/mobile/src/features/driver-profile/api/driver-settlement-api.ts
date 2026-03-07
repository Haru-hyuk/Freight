import {
  getByMatch1,
  getMySettlements1,
} from "@/shared/api/generated/driver-settlement/driver-settlement";
import type { SettlementResponse } from "@/shared/api/generated/schemas/settlementResponse";
import { isMockMode } from "@/shared/lib/config/env";

// ─── 타입 재공개 ──────────────────────────────────────────────────────────────

export type { SettlementResponse };
export type DriverSettlementItem = SettlementResponse;

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

export async function listDriverSettlementsMe(): Promise<DriverSettlementItem[]> {
  if (isMockMode()) {
    return sortSettlementsDesc(DRIVER_SETTLEMENT_MOCK_ITEMS);
  }

  const settlements = await getMySettlements1();
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
  return getByMatch1({ matchId: safeMatchId });
}
