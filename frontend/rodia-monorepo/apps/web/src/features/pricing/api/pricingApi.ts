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

type BackendQuote = {
  quoteId: number | null;
  vehicleType: string | null;
  vehicleBodyType: string | null;
  tonnage: number | null;
  desiredPrice: number | null;
  finalPrice: number | null;
  createdAt: string | null;
};

type BackendChecklist = {
  checklistItemId: number | null;
  category: string | null;
  name: string | null;
  hasExtraFee: boolean;
  baseExtraFee: number | null;
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

function mapBackendQuote(raw: unknown): BackendQuote {
  const row = toRecord(raw);
  const vehicle = toRecord(row.vehicle);
  const truck = toRecord(row.truck);
  return {
    quoteId: toNumberValue(row.quoteId ?? row.quote_id ?? row.id),
    vehicleType:
      toStringValue(
        row.vehicleType ??
          row.vehicle_type ??
          row.truckType ??
          row.truck_type ??
          vehicle.vehicleType ??
          vehicle.vehicle_type ??
          truck.vehicleType ??
          truck.vehicle_type,
        "",
      ) || null,
    vehicleBodyType:
      toStringValue(
        row.vehicleBodyType ??
          row.vehicle_body_type ??
          row.bodyType ??
          row.body_type ??
          vehicle.vehicleBodyType ??
          vehicle.vehicle_body_type ??
          truck.vehicleBodyType ??
          truck.vehicle_body_type,
        "",
      ) || null,
    tonnage: toNumberValue(
      row.tonnage ??
        row.tonnageTon ??
        row.tonnage_ton ??
        row.vehicleTonnage ??
        row.vehicle_tonnage ??
        vehicle.tonnage ??
        truck.tonnage,
    ),
    desiredPrice: toNumberValue(row.desiredPrice ?? row.desired_price ?? row.basePrice ?? row.base_price),
    finalPrice: toNumberValue(row.finalPrice ?? row.final_price ?? row.totalPrice ?? row.total_price),
    createdAt: toStringValue(row.createdAt ?? row.created_at ?? row.updatedAt ?? row.updated_at, "") || null,
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

function normalizeVehicleKey(vehicleType: string | null, bodyType: string | null): string {
  const type = (vehicleType ?? "UNKNOWN").trim().toUpperCase();
  const body = (bodyType ?? "GENERAL").trim().toUpperCase();
  return `${type}__${body}`;
}

function normalizeVehicleTypeLabel(value: string | null): string {
  const text = (value ?? "").trim().toUpperCase();
  return text.length > 0 ? text : "TRUCK";
}

function normalizeBodyTypeLabel(value: string | null): string {
  const text = (value ?? "").trim().toUpperCase();
  return text.length > 0 ? text : "GENERAL";
}

function inferTonnageLabelFromPrice(price: number | null): string {
  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) return "5t";
  if (price < 250000) return "1t";
  if (price < 450000) return "5t";
  if (price < 700000) return "11t";
  return "25t";
}

function deriveTonnageLabel(tonnage: number | null, vehicleType: string | null, price: number | null): string {
  if (typeof tonnage === "number" && Number.isFinite(tonnage) && tonnage > 0) {
    const rounded = Number.isInteger(tonnage) ? tonnage : Number(tonnage.toFixed(1));
    return `${rounded}t`;
  }

  const type = (vehicleType ?? "").trim();
  if (type.length === 0) return "UNKNOWN";

  const matched = type.match(/(\d+(?:\.\d+)?)/);
  if (matched?.[1]) {
    const parsed = Number(matched[1]);
    if (Number.isFinite(parsed) && parsed > 0) {
      const rounded = Number.isInteger(parsed) ? parsed : Number(parsed.toFixed(1));
      return `${rounded}t`;
    }
  }

  if (type.length > 0) return type;
  return inferTonnageLabelFromPrice(price);
}

function inferScope(category: string | null): AdditionalPricingScope {
  const text = (category ?? "").toLowerCase();
  if (text.includes("vehicle")) return "VEHICLE_OPTION";
  if (text.includes("load") || text.includes("unload")) return "LOAD_UNLOAD_TOOL";
  if (text.includes("combine")) return "COMBINE_RULE";
  return "TRANSPORT_OPTION";
}

function toHttpStatus(error: unknown): number | undefined {
  const maybeResponse = (error as { response?: { status?: number } } | null | undefined)?.response;
  return typeof maybeResponse?.status === "number" ? maybeResponse.status : undefined;
}

async function fetchBackendQuotes(): Promise<BackendQuote[]> {
  try {
    const response = await apiClient.get<unknown>(apiPaths.adminTransportQuotes);
    return pickListPayload(response.data).map(mapBackendQuote);
  } catch (error) {
    if (toHttpStatus(error) !== 404) {
      return [];
    }
  }

  if (apiPaths.adminTransportQuotes === apiPaths.shipperQuotes) {
    return [];
  }

  try {
    const response = await apiClient.get<unknown>(apiPaths.shipperQuotes);
    return pickListPayload(response.data).map(mapBackendQuote);
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

  const quotes = await fetchBackendQuotes();
  if (quotes.length === 0) return applyVehicleOverrides([...FALLBACK_VEHICLE_ROWS]);

  const grouped = new Map<
    string,
    {
      vehicleType: string;
      vehicleBodyType: string;
      tonnageLabel: string;
      prices: number[];
      additional: number[];
      latest: number;
    }
  >();

  for (const quote of quotes) {
    const vehicleType = normalizeVehicleTypeLabel(quote.vehicleType);
    const bodyType = normalizeBodyTypeLabel(quote.vehicleBodyType);
    const tonnageLabel = deriveTonnageLabel(quote.tonnage, quote.vehicleType, quote.finalPrice ?? quote.desiredPrice ?? null);
    const key = normalizeVehicleKey(vehicleType, bodyType);
    const current = grouped.get(key) ?? {
      vehicleType,
      vehicleBodyType: bodyType,
      tonnageLabel,
      prices: [],
      additional: [],
      latest: 0,
    };

    if (current.tonnageLabel === "UNKNOWN" && tonnageLabel !== "UNKNOWN") {
      current.tonnageLabel = tonnageLabel;
    }

    const base = quote.desiredPrice ?? quote.finalPrice ?? 0;
    const final = quote.finalPrice ?? quote.desiredPrice ?? base;
    current.prices.push(base);
    current.additional.push(Math.max(0, final - base));
    current.latest = Math.max(current.latest, Date.parse(quote.createdAt ?? "") || 0);
    grouped.set(key, current);
  }

  const rows: VehiclePricingRow[] = Array.from(grouped.entries()).map(([key, group]) => {
    const avgBase = Math.round(group.prices.reduce((sum, value) => sum + value, 0) / Math.max(group.prices.length, 1));
    const avgAdditional = Math.round(
      group.additional.reduce((sum, value) => sum + value, 0) / Math.max(group.additional.length, 1),
    );
    const surchargeRate = avgBase > 0 ? Number((avgAdditional / avgBase).toFixed(2)) : 0;

    return {
      vehiclePricingId: `VP-${key.replace(/[^A-Z0-9_]/g, "_")}`,
      tonnageLabel: group.tonnageLabel,
      bodyType: group.vehicleBodyType as VehiclePricingRow["bodyType"],
      baseFare: avgBase,
      additionalFare: avgAdditional,
      surchargeRate,
      active: true,
      updatedBy: "quotes-aggregate",
      updatedAt: group.latest > 0 ? new Date(group.latest).toISOString() : new Date().toISOString(),
    };
  });

  return applyVehicleOverrides(rows);
}

export async function fetchAdditionalPricingRows(): Promise<AdditionalPricingRow[]> {
  if (isMockModeEnabled()) return applyAdditionalOverrides([...FALLBACK_ADDITIONAL_ROWS]);

  const items = await fetchBackendChecklistItems();
  if (items.length === 0) return applyAdditionalOverrides([...FALLBACK_ADDITIONAL_ROWS]);

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

  if (rows.length === 0) return applyAdditionalOverrides([...FALLBACK_ADDITIONAL_ROWS]);
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
