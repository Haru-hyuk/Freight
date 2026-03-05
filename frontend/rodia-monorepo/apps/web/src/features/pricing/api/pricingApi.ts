import type {
  AdditionalPricingRow,
  AdditionalPricingScope,
  AdditionalPricingUpdatePayload,
  VehiclePricingRow,
  VehiclePricingUpdatePayload,
} from "@/features/pricing/model/types";
import { apiPaths } from "@/shared/lib/api/endpoints";
import { apiClient } from "@/shared/lib/api/client";
import { appendActivityLog } from "@/shared/lib/activity-log";
import { isMockModeEnabled } from "@/shared/lib/mock-mode";

type BackendPricingRate = {
  rangeKey: string | null;
  minDistanceKm: number | null;
  maxDistanceKm: number | null;
  vehicleType: string | null;
  baseRateWon: number | null;
  sourceName: string | null;
};

type BackendChecklist = {
  checklistItemId: number | null;
  category: string | null;
  name: string | null;
  hasExtraFee: boolean;
  baseExtraFee: number | null;
};

type BackendTruckSpec = {
  vehicleType: string | null;
  vehicleBodyType: string | null;
  categoryKr: string | null;
};

const FALLBACK_VEHICLE_ROWS: VehiclePricingRow[] = [
  {
    vehiclePricingId: "VP-TRUCK-WING",
    tonnageLabel: "5t",
    bodyType: "윙바디",
    baseFare: 240000,
    additionalFare: 30000,
    surchargeRate: 0.12,
    active: true,
    updatedBy: "fallback",
    updatedAt: new Date().toISOString(),
  },
  {
    vehiclePricingId: "VP-TRUCK-BOX",
    tonnageLabel: "11t",
    bodyType: "탑차",
    baseFare: 310000,
    additionalFare: 42000,
    surchargeRate: 0.13,
    active: true,
    updatedBy: "fallback",
    updatedAt: new Date().toISOString(),
  },
];

const FALLBACK_ADDITIONAL_ROWS: AdditionalPricingRow[] = [
  {
    additionalPricingId: "AP-1001",
    scope: "LOAD_UNLOAD_TOOL",
    optionName: "지게차 상하차",
    additionalFare: 20000,
    rateDelta: 0.05,
    active: true,
    updatedBy: "fallback",
    updatedAt: new Date().toISOString(),
  },
  {
    additionalPricingId: "AP-1002",
    scope: "TRANSPORT_OPTION",
    optionName: "야간 운송",
    additionalFare: 30000,
    rateDelta: 0.08,
    active: true,
    updatedBy: "fallback",
    updatedAt: new Date().toISOString(),
  },
];

const MOBILE_STEP3_BODY_TYPES: VehiclePricingRow["bodyType"][] = ["일반카고", "윙바디", "탑차"];

const BODY_TYPE_SORT_ORDER: Record<VehiclePricingRow["bodyType"], number> = {
  일반카고: 0,
  윙바디: 1,
  탑차: 2,
  냉장차: 3,
  사다리차: 4,
  추레라: 5,
};

const vehicleOverrides = new Map<string, VehiclePricingUpdatePayload>();
const additionalOverrides = new Map<string, AdditionalPricingUpdatePayload>();

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function toStringValue(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function toNumberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function pickListPayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const row = toRecord(payload);
  const candidates = [row.items, row.data, row.content, row.list, row.result];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

function mapBackendPricingRate(raw: unknown): BackendPricingRate {
  const row = toRecord(raw);
  return {
    rangeKey: toStringValue(row.rangeKey ?? row.range_key, "") || null,
    minDistanceKm: toNumberValue(row.minDistanceKm ?? row.min_distance_km),
    maxDistanceKm: toNumberValue(row.maxDistanceKm ?? row.max_distance_km),
    vehicleType: toStringValue(row.vehicleType ?? row.vehicle_type, "") || null,
    baseRateWon: toNumberValue(row.baseRateWon ?? row.base_rate_won),
    sourceName: toStringValue(row.sourceName ?? row.source_name, "") || null,
  };
}

function mapBackendChecklist(raw: unknown): BackendChecklist {
  const row = toRecord(raw);
  return {
    checklistItemId: toNumberValue(row.checklistItemId ?? row.id),
    category: toStringValue(row.category, "") || null,
    name: toStringValue(row.name, "") || null,
    hasExtraFee: Boolean(row.hasExtraFee),
    baseExtraFee: toNumberValue(row.baseExtraFee),
  };
}

function mapBackendTruckSpec(raw: unknown): BackendTruckSpec {
  const row = toRecord(raw);
  return {
    vehicleType: toStringValue(row.vehicleType ?? row.vehicle_type, "") || null,
    vehicleBodyType: toStringValue(row.vehicleBodyType ?? row.vehicle_body_type, "") || null,
    categoryKr: toStringValue(row.categoryKr ?? row.category_kr, "") || null,
  };
}

function normalizeVehicleKey(vehicleType: string | null, bodyType: string | null): string {
  const type = (vehicleType ?? "UNKNOWN").trim().toUpperCase();
  const body = (bodyType ?? "GENERAL").trim().toUpperCase();
  return `${type}__${body}`;
}

function inferScope(category: string | null): AdditionalPricingScope {
  const text = (category ?? "").toLowerCase();
  if (text.includes("vehicle")) return "VEHICLE_OPTION";
  if (text.includes("load") || text.includes("unload")) return "LOAD_UNLOAD_TOOL";
  if (text.includes("combine")) return "COMBINE_RULE";
  return "TRANSPORT_OPTION";
}

async function fetchBackendPricingRates(): Promise<BackendPricingRate[]> {
  try {
    const response = await apiClient.get<unknown>("/api/reference/pricing-rates");
    return pickListPayload(response.data).map(mapBackendPricingRate);
  } catch {
    return [];
  }
}

async function fetchBackendChecklistItems(): Promise<BackendChecklist[]> {
  try {
    const response = await apiClient.get<unknown>("/api/checklist-items");
    return pickListPayload(response.data).map(mapBackendChecklist);
  } catch {
    return [];
  }
}

async function fetchBackendTruckSpecs(): Promise<BackendTruckSpec[]> {
  try {
    const response = await apiClient.get<unknown>("/api/reference/truck-specs");
    return pickListPayload(response.data).map(mapBackendTruckSpec);
  } catch {
    return [];
  }
}

function normalizeBodyType(
  vehicleBodyType: string | null,
  categoryKr: string | null
): VehiclePricingRow["bodyType"] | null {
  const body = (vehicleBodyType ?? "").trim().toUpperCase();
  if (body === "CARGO") return "일반카고";
  if (body === "WINGBODY") return "윙바디";
  if (body === "TOP") return "탑차";

  const category = (categoryKr ?? "").trim();
  if (category.includes("카고")) return "일반카고";
  if (category.includes("윙")) return "윙바디";
  if (category.includes("탑") || category.includes("냉장") || category.includes("냉동")) return "탑차";
  return null;
}

function applyVehicleOverrides(rows: VehiclePricingRow[]): VehiclePricingRow[] {
  return rows.map((row) => {
    const override = vehicleOverrides.get(row.vehiclePricingId);
    if (!override) return row;
    return {
      ...row,
      baseFare: override.baseFare,
      additionalFare: override.additionalFare,
      surchargeRate: override.surchargeRate,
      active: override.active,
      updatedBy: "admin-session",
      updatedAt: new Date().toISOString(),
    };
  });
}

function applyAdditionalOverrides(rows: AdditionalPricingRow[]): AdditionalPricingRow[] {
  return rows.map((row) => {
    const override = additionalOverrides.get(row.additionalPricingId);
    if (!override) return row;
    return {
      ...row,
      additionalFare: override.additionalFare,
      rateDelta: override.rateDelta,
      active: override.active,
      updatedBy: "admin-session",
      updatedAt: new Date().toISOString(),
    };
  });
}

export async function fetchVehiclePricingRows(): Promise<VehiclePricingRow[]> {
  if (isMockModeEnabled()) return applyVehicleOverrides([...FALLBACK_VEHICLE_ROWS]);

  const [pricingRates, truckSpecs] = await Promise.all([fetchBackendPricingRates(), fetchBackendTruckSpecs()]);
  if (pricingRates.length === 0) return applyVehicleOverrides([...FALLBACK_VEHICLE_ROWS]);

  const grouped = new Map<
    string,
    {
      vehicleType: string;
      baseFare: number;
      minDistanceKm: number;
      sourceName: string;
    }
  >();

  for (const rate of pricingRates) {
    const vehicleType = (rate.vehicleType ?? "").trim().toUpperCase();
    const baseRateWon = rate.baseRateWon;
    if (!vehicleType || baseRateWon === null) continue;

    const current = grouped.get(vehicleType);
    const minDistanceKm = rate.minDistanceKm ?? Number.MAX_SAFE_INTEGER;
    if (!current || minDistanceKm < current.minDistanceKm) {
      grouped.set(vehicleType, {
        vehicleType,
        baseFare: baseRateWon,
        minDistanceKm,
        sourceName: rate.sourceName ?? "pricing-rate-catalog",
      });
    }
  }

  if (grouped.size === 0) return applyVehicleOverrides([...FALLBACK_VEHICLE_ROWS]);

  const bodyTypesByVehicle = new Map<string, Set<VehiclePricingRow["bodyType"]>>();
  for (const spec of truckSpecs) {
    const vehicleType = (spec.vehicleType ?? "").trim().toUpperCase();
    const bodyType = normalizeBodyType(spec.vehicleBodyType, spec.categoryKr);
    if (!vehicleType || !bodyType) continue;
    const bucket = bodyTypesByVehicle.get(vehicleType) ?? new Set<VehiclePricingRow["bodyType"]>();
    bucket.add(bodyType);
    bodyTypesByVehicle.set(vehicleType, bucket);
  }

  const rows: VehiclePricingRow[] = Array.from(grouped.values()).flatMap((group) => {
    const resolvedBodyTypes = Array.from(bodyTypesByVehicle.get(group.vehicleType) ?? []);
    const mobileStep3BodyTypes = resolvedBodyTypes.filter((bodyType) => MOBILE_STEP3_BODY_TYPES.includes(bodyType));
    const bodyTypes = mobileStep3BodyTypes.length > 0 ? mobileStep3BodyTypes : [...MOBILE_STEP3_BODY_TYPES];

    return bodyTypes.map((bodyType) => {
      const bodyKey = bodyType === "일반카고" ? "CARGO" : bodyType === "윙바디" ? "WINGBODY" : "TOP";
      return {
        vehiclePricingId: `VP-${group.vehicleType.replace(/[^A-Z0-9_]/g, "_")}-${bodyKey}`,
        tonnageLabel: group.vehicleType,
        bodyType,
        baseFare: group.baseFare,
        additionalFare: 0,
        surchargeRate: 0,
        active: true,
        updatedBy: group.sourceName,
        updatedAt: new Date().toISOString(),
      } satisfies VehiclePricingRow;
    });
  });

  return applyVehicleOverrides(rows).sort((a, b) => {
    const tonnageCompare = a.tonnageLabel.localeCompare(b.tonnageLabel);
    if (tonnageCompare !== 0) return tonnageCompare;
    return (BODY_TYPE_SORT_ORDER[a.bodyType] ?? 999) - (BODY_TYPE_SORT_ORDER[b.bodyType] ?? 999);
  });
}

export async function fetchAdditionalPricingRows(): Promise<AdditionalPricingRow[]> {
  if (isMockModeEnabled()) return applyAdditionalOverrides([...FALLBACK_ADDITIONAL_ROWS]);

  const items = await fetchBackendChecklistItems();
  if (items.length === 0) return applyAdditionalOverrides([]);

  const rows = items
    .filter((item) => item.hasExtraFee || (item.baseExtraFee ?? 0) > 0)
    .map((item) => {
      const baseFee = item.baseExtraFee ?? 0;
      return {
        additionalPricingId: `AP-${item.checklistItemId ?? Math.floor(Math.random() * 100000)}`,
        scope: inferScope(item.category),
        optionName: item.name ?? "옵션",
        additionalFare: baseFee,
        rateDelta: 0,
        active: true,
        updatedBy: "checklist",
        updatedAt: new Date().toISOString(),
      } satisfies AdditionalPricingRow;
    });

  if (rows.length === 0) return applyAdditionalOverrides([]);
  return applyAdditionalOverrides(rows);
}

export async function updateVehiclePricing(payload: VehiclePricingUpdatePayload): Promise<VehiclePricingRow | null> {
  if (isMockModeEnabled()) {
    vehicleOverrides.set(payload.vehiclePricingId, payload);
    const rows = await fetchVehiclePricingRows();
    return rows.find((row) => row.vehiclePricingId === payload.vehiclePricingId) ?? null;
  }

  vehicleOverrides.set(payload.vehiclePricingId, payload);
  appendActivityLog({
    action: "PRICING_UPDATED",
    targetId: payload.vehiclePricingId,
    mode: "REAL",
    message: `가격 기준 ${payload.vehiclePricingId} 수정 - 서버 전용 가격 API 미지원으로 세션에 반영`,
  });

  const rows = await fetchVehiclePricingRows();
  return rows.find((row) => row.vehiclePricingId === payload.vehiclePricingId) ?? null;
}

export async function updateAdditionalPricing(payload: AdditionalPricingUpdatePayload): Promise<AdditionalPricingRow | null> {
  if (isMockModeEnabled()) {
    additionalOverrides.set(payload.additionalPricingId, payload);
    const rows = await fetchAdditionalPricingRows();
    return rows.find((row) => row.additionalPricingId === payload.additionalPricingId) ?? null;
  }

  additionalOverrides.set(payload.additionalPricingId, payload);
  appendActivityLog({
    action: "PRICING_UPDATED",
    targetId: payload.additionalPricingId,
    mode: "REAL",
    message: `추가 요금 ${payload.additionalPricingId} 수정 - 서버 전용 가격 API 미지원으로 세션에 반영`,
  });

  const rows = await fetchAdditionalPricingRows();
  return rows.find((row) => row.additionalPricingId === payload.additionalPricingId) ?? null;
}

export async function sendPricingUpdatedPush(pricingId: string): Promise<void> {
  appendActivityLog({
    action: "PRICING_NOTIFICATION_SENT",
    targetId: pricingId,
    mode: isMockModeEnabled() ? "MOCK" : "REAL",
    message: isMockModeEnabled()
      ? `가격 기준 ${pricingId} 알림 전송`
      : `가격 기준 ${pricingId} 알림 요청 - 서버 전용 알림 API 미지원으로 로그만 기록`,
  });
}
