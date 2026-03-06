import {
  getByMatch1,
  getMySettlements1,
} from "@/shared/api/generated/driver-settlement-controller/driver-settlement-controller";
import type { SettlementResponse } from "@/shared/api/generated/schemas/settlementResponse";
import { isMockMode } from "@/shared/lib/config/env";

export type DriverSettlementItem = SettlementResponse;

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

export async function listDriverSettlementsMe(): Promise<DriverSettlementItem[]> {
  if (isMockMode()) return [];

  const settlements = await getMySettlements1();
  return [...settlements].sort((a, b) => {
    const byDate = resolveSettlementTimestamp(b) - resolveSettlementTimestamp(a);
    if (byDate !== 0) return byDate;
    return parsePositiveInt(b.settlementId) - parsePositiveInt(a.settlementId);
  });
}

export async function getDriverSettlementByMatch(matchId: number): Promise<SettlementResponse> {
  const safeMatchId = parsePositiveInt(matchId);
  if (safeMatchId <= 0) {
    throw new Error("유효하지 않은 매칭 ID입니다.");
  }
  if (isMockMode()) {
    throw new Error("모의 환경에서는 기사 정산 상세를 지원하지 않습니다.");
  }
  return getByMatch1({ matchId: safeMatchId });
}
