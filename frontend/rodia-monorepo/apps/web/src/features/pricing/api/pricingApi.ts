import type {
  AdditionalPricingRow,
  AdditionalPricingUpdatePayload,
  VehiclePricingRow,
  VehiclePricingUpdatePayload,
} from "@/features/pricing/model/types";
import { apiClient } from "@/shared/lib/api/client";
import { appendActivityLog } from "@/shared/lib/activity-log";
import { isMockModeEnabled } from "@/shared/lib/mock-mode";

const MOCK_VEHICLE_PRICING: VehiclePricingRow[] = [
  { vehiclePricingId: "VP-1001", tonnageLabel: "1톤", bodyType: "일반카고", baseFare: 95000, additionalFare: 12000, surchargeRate: 0.05, active: true, updatedBy: "최고관리자", updatedAt: "2026-02-19 10:20" },
  { vehiclePricingId: "VP-1002", tonnageLabel: "1톤", bodyType: "탑차", baseFare: 105000, additionalFare: 14000, surchargeRate: 0.06, active: true, updatedBy: "최고관리자", updatedAt: "2026-02-19 10:20" },
  { vehiclePricingId: "VP-1003", tonnageLabel: "2.5톤", bodyType: "윙바디", baseFare: 145000, additionalFare: 20000, surchargeRate: 0.08, active: true, updatedBy: "최고관리자", updatedAt: "2026-02-19 10:20" },
  { vehiclePricingId: "VP-1004", tonnageLabel: "5톤", bodyType: "냉장차", baseFare: 240000, additionalFare: 38000, surchargeRate: 0.12, active: true, updatedBy: "최고관리자", updatedAt: "2026-02-19 10:20" },
  { vehiclePricingId: "VP-1005", tonnageLabel: "3.5톤", bodyType: "사다리차", baseFare: 260000, additionalFare: 42000, surchargeRate: 0.11, active: true, updatedBy: "최고관리자", updatedAt: "2026-02-19 10:20" },
];

const MOCK_ADDITIONAL_PRICING: AdditionalPricingRow[] = [
  { additionalPricingId: "AP-3001", scope: "VEHICLE_OPTION", optionName: "냉장 설비 사용", additionalFare: 25000, rateDelta: 0.1, active: true, updatedBy: "최고관리자", updatedAt: "2026-02-19 10:25" },
  { additionalPricingId: "AP-3002", scope: "VEHICLE_OPTION", optionName: "사다리차 작업", additionalFare: 40000, rateDelta: 0.12, active: true, updatedBy: "최고관리자", updatedAt: "2026-02-19 10:25" },
  { additionalPricingId: "AP-3003", scope: "TRANSPORT_OPTION", optionName: "직접 수송", additionalFare: 30000, rateDelta: 0.08, active: true, updatedBy: "최고관리자", updatedAt: "2026-02-19 10:25" },
  { additionalPricingId: "AP-3004", scope: "LOAD_UNLOAD_TOOL", optionName: "지게차 상하차", additionalFare: 18000, rateDelta: 0.05, active: true, updatedBy: "최고관리자", updatedAt: "2026-02-19 10:25" },
  { additionalPricingId: "AP-3005", scope: "LOAD_UNLOAD_TOOL", optionName: "리프트게이트 사용", additionalFare: 15000, rateDelta: 0.04, active: true, updatedBy: "최고관리자", updatedAt: "2026-02-19 10:25" },
  { additionalPricingId: "AP-3006", scope: "COMBINE_RULE", optionName: "합짐(합침) 할인", additionalFare: 0, rateDelta: -0.07, active: true, updatedBy: "최고관리자", updatedAt: "2026-02-19 10:25" },
];

export async function fetchVehiclePricingRows(): Promise<VehiclePricingRow[]> {
  if (isMockModeEnabled()) return [...MOCK_VEHICLE_PRICING];

  try {
    const response = await apiClient.get<VehiclePricingRow[]>("/admin/pricing/vehicles");
    return response.data;
  } catch {
    return [];
  }
}

export async function fetchAdditionalPricingRows(): Promise<AdditionalPricingRow[]> {
  if (isMockModeEnabled()) return [...MOCK_ADDITIONAL_PRICING];

  try {
    const response = await apiClient.get<AdditionalPricingRow[]>("/admin/pricing/additional-options");
    return response.data;
  } catch {
    return [];
  }
}

export async function updateVehiclePricing(payload: VehiclePricingUpdatePayload): Promise<VehiclePricingRow | null> {
  if (isMockModeEnabled()) {
    const index = MOCK_VEHICLE_PRICING.findIndex((row) => row.vehiclePricingId === payload.vehiclePricingId);
    if (index < 0) return null;

    const next: VehiclePricingRow = {
      ...MOCK_VEHICLE_PRICING[index],
      ...payload,
      updatedBy: "최고관리자",
      updatedAt: "2026-02-19 12:45",
    };

    MOCK_VEHICLE_PRICING[index] = next;
    appendActivityLog({
      action: "PRICING_UPDATED",
      targetId: payload.vehiclePricingId,
      mode: "MOCK",
      message: `차량 금액 기준 ${payload.vehiclePricingId}을 수정했습니다.`,
    });
    return next;
  }

  try {
    const response = await apiClient.patch<VehiclePricingRow>(`/admin/pricing/vehicles/${payload.vehiclePricingId}`, payload);
    appendActivityLog({
      action: "PRICING_UPDATED",
      targetId: payload.vehiclePricingId,
      mode: "REAL",
      message: `차량 금액 기준 ${payload.vehiclePricingId}을 수정했습니다.`,
    });
    return response.data;
  } catch {
    return null;
  }
}

export async function updateAdditionalPricing(payload: AdditionalPricingUpdatePayload): Promise<AdditionalPricingRow | null> {
  if (isMockModeEnabled()) {
    const index = MOCK_ADDITIONAL_PRICING.findIndex((row) => row.additionalPricingId === payload.additionalPricingId);
    if (index < 0) return null;

    const next: AdditionalPricingRow = {
      ...MOCK_ADDITIONAL_PRICING[index],
      ...payload,
      updatedBy: "최고관리자",
      updatedAt: "2026-02-19 12:45",
    };

    MOCK_ADDITIONAL_PRICING[index] = next;
    appendActivityLog({
      action: "PRICING_UPDATED",
      targetId: payload.additionalPricingId,
      mode: "MOCK",
      message: `추가금/할인 기준 ${payload.additionalPricingId}을 수정했습니다.`,
    });
    return next;
  }

  try {
    const response = await apiClient.patch<AdditionalPricingRow>(`/admin/pricing/additional-options/${payload.additionalPricingId}`, payload);
    appendActivityLog({
      action: "PRICING_UPDATED",
      targetId: payload.additionalPricingId,
      mode: "REAL",
      message: `추가금/할인 기준 ${payload.additionalPricingId}을 수정했습니다.`,
    });
    return response.data;
  } catch {
    return null;
  }
}

export async function sendPricingUpdatedPush(pricingId: string): Promise<void> {
  if (isMockModeEnabled()) {
    appendActivityLog({
      action: "PRICING_NOTIFICATION_SENT",
      targetId: pricingId,
      mode: "MOCK",
      message: `금액 기준 ${pricingId} 수정 알림을 발송했습니다.`,
    });
    return;
  }

  try {
    await apiClient.post("/admin/notifications/pricing-updated", {
      pricingId,
      message: "관리자가 금액 기준을 수정했습니다.",
    });
    appendActivityLog({
      action: "PRICING_NOTIFICATION_SENT",
      targetId: pricingId,
      mode: "REAL",
      message: `금액 기준 ${pricingId} 수정 알림을 발송했습니다.`,
    });
  } catch {
    // no-op
  }
}

