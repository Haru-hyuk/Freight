import { DRIVER_APPROVAL_MOCK_ROWS } from "@/features/drivers/model/mockData";
import type { DriverApprovalReviewPayload, DriverApprovalRow } from "@/features/drivers/model/types";
import axios from "axios";
import { appendActivityLog } from "@/shared/lib/activity-log";
import { apiClient } from "@/shared/lib/api/client";
import { apiPaths } from "@/shared/lib/api/endpoints";
import { isMockModeEnabled } from "@/shared/lib/mock-mode";

type BackendTruck = {
  truckId: number | null;
  driverId: number | null;
  vehicleType: string | null;
  vehicleBodyType: string | null;
  name: string | null;
  approved: boolean | null;
  insurance: string | null;
  tonnage: number | null;
  maxWeight: number | null;
  maxVolume: number | null;
  createdAt: string | null;
  updatedAt: string | null;
};

const reviewOverrides = new Map<
  string,
  {
    approvalStatus: DriverApprovalRow["approvalStatus"];
    reviewMemo?: string;
  }
>();

let driverRowsStore: DriverApprovalRow[] = [...DRIVER_APPROVAL_MOCK_ROWS];
const USE_DRIVER_TRUCKS_FALLBACK =
  String(import.meta.env.VITE_USE_DRIVER_TRUCKS_FALLBACK ?? "").toLowerCase() === "true";

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

function toDisplayDate(value: string | null | undefined): string {
  if (!value) return "-";
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  return new Date(parsed).toISOString().slice(0, 16).replace("T", " ");
}

function parseDriverId(input: string): number | null {
  const prefixed = /^D-(\d+)$/i.exec(input.trim());
  if (prefixed) return Number(prefixed[1]);

  const parsed = Number(input);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapBackendTruck(raw: unknown): BackendTruck {
  const row = toRecord(raw);
  return {
    truckId: toNumberValue(row.truckId ?? row.truck_id ?? row.id),
    driverId: toNumberValue(row.driverId ?? row.driver_id),
    vehicleType: toStringValue(row.vehicleType ?? row.vehicle_type, "") || null,
    vehicleBodyType: toStringValue(row.vehicleBodyType ?? row.vehicle_body_type, "") || null,
    name: toStringValue(row.name, "") || null,
    approved: typeof row.approved === "boolean" ? row.approved : null,
    insurance: toStringValue(row.insurance, "") || null,
    tonnage: toNumberValue(row.tonnage),
    maxWeight: toNumberValue(row.maxWeight ?? row.max_weight),
    maxVolume: toNumberValue(row.maxVolume ?? row.max_volume),
    createdAt: toStringValue(row.createdAt ?? row.created_at, "") || null,
    updatedAt: toStringValue(row.updatedAt ?? row.updated_at, "") || null,
  };
}

function toVehicleSummary(truck: BackendTruck): string {
  const detail = [truck.vehicleType, truck.vehicleBodyType].filter(Boolean).join(" ").trim();
  return (truck.name ?? detail) || "미상 차량";
}

function compareByDateDesc(a: string | null | undefined, b: string | null | undefined): number {
  const aTime = Date.parse(a ?? "");
  const bTime = Date.parse(b ?? "");
  const safeA = Number.isFinite(aTime) ? aTime : 0;
  const safeB = Number.isFinite(bTime) ? bTime : 0;
  return safeB - safeA;
}

function deriveRowsFromTrucks(trucks: BackendTruck[]): DriverApprovalRow[] {
  const grouped = new Map<number, BackendTruck[]>();
  for (const truck of trucks) {
    if (typeof truck.driverId !== "number") continue;
    const rows = grouped.get(truck.driverId) ?? [];
    rows.push(truck);
    grouped.set(truck.driverId, rows);
  }

  const rows = Array.from(grouped.entries()).map(([driverId, items]) => {
    const sorted = [...items].sort((a, b) => compareByDateDesc(a.updatedAt ?? a.createdAt, b.updatedAt ?? b.createdAt));
    const latest = sorted[0];
    const allVerified = items.every((item) => Boolean(item.insurance && item.insurance.trim().length > 0));

    const anyApproved = items.some((item) => item.approved === true);
    const anyRejected = items.some((item) => item.approved === false);
    const defaultApprovalStatus: DriverApprovalRow["approvalStatus"] = anyApproved
      ? "APPROVED"
      : anyRejected
        ? "REJECTED"
        : "PENDING";

    const row: DriverApprovalRow = {
      driverId: `D-${driverId}`,
      requestedAt: toDisplayDate(latest?.createdAt ?? null),
      name: `Driver-${driverId}`,
      phone: "-",
      vehicleSummary: latest ? toVehicleSummary(latest) : "미상 차량",
      licenseStatus: allVerified ? "VERIFIED" : "UNVERIFIED",
      approvalStatus: defaultApprovalStatus,
      documents: undefined,
      reviewMemo: undefined,
    };

    const override = reviewOverrides.get(row.driverId);
    if (!override) return row;

    return {
      ...row,
      approvalStatus: override.approvalStatus,
      reviewMemo: override.reviewMemo,
    };
  });

  const statusRank: Record<DriverApprovalRow["approvalStatus"], number> = {
    PENDING: 0,
    REJECTED: 1,
    APPROVED: 2,
  };

  return rows.sort((a, b) => {
    const rankDiff = statusRank[a.approvalStatus] - statusRank[b.approvalStatus];
    if (rankDiff !== 0) return rankDiff;
    return compareByDateDesc(a.requestedAt, b.requestedAt);
  });
}

async function fetchBackendTrucks(): Promise<BackendTruck[]> {
  try {
    const response = await apiClient.get<unknown>(apiPaths.adminTrucksPending);
    return pickListPayload(response.data).map(mapBackendTruck);
  } catch (error) {
    if (!axios.isAxiosError(error) || error.response?.status !== 404) {
      return [];
    }
    if (!USE_DRIVER_TRUCKS_FALLBACK) {
      return [];
    }

    try {
      const response = await apiClient.get<unknown>(apiPaths.driverTrucks);
      return pickListPayload(response.data).map(mapBackendTruck);
    } catch {
      return [];
    }
  }
}

async function tryUpdateTruckApproval(truckId: number, approved: boolean): Promise<boolean> {
  try {
    await apiClient.patch(apiPaths.adminTruckApproval(String(truckId)), { approved });
    return true;
  } catch {
    return false;
  }
}

export async function fetchDriverApprovals(): Promise<DriverApprovalRow[]> {
  if (isMockModeEnabled()) return [...driverRowsStore];

  const trucks = await fetchBackendTrucks();
  return deriveRowsFromTrucks(trucks);
}

export async function reviewDriverApproval(payload: DriverApprovalReviewPayload): Promise<void> {
  const nextStatus: DriverApprovalRow["approvalStatus"] = payload.action === "APPROVE" ? "APPROVED" : "REJECTED";

  if (isMockModeEnabled()) {
    driverRowsStore = driverRowsStore.map((row) => {
      if (row.driverId !== payload.driverId) return row;
      return {
        ...row,
        approvalStatus: nextStatus,
        reviewMemo: payload.reason?.trim() || undefined,
      };
    });

    appendActivityLog({
      action: "DRIVER_APPROVAL_REVIEWED",
      targetId: payload.driverId,
      mode: "MOCK",
      message: `차주 ${payload.driverId} 승인 검토 ${payload.action === "APPROVE" ? "승인" : "반려"}`,
    });
    return;
  }

  reviewOverrides.set(payload.driverId, {
    approvalStatus: nextStatus,
    reviewMemo: payload.reason?.trim() || undefined,
  });

  const driverNumber = parseDriverId(payload.driverId);
  let remoteApplied = false;

  if (driverNumber !== null) {
    const trucks = await fetchBackendTrucks();
    const targetTrucks = trucks.filter((truck) => truck.driverId === driverNumber);

    if (targetTrucks.length > 0) {
      const results = await Promise.all(
        targetTrucks
          .filter((truck) => typeof truck.truckId === "number")
          .map((truck) => tryUpdateTruckApproval(truck.truckId as number, payload.action === "APPROVE")),
      );
      remoteApplied = results.some(Boolean);
    }
  }

  appendActivityLog({
    action: "DRIVER_APPROVAL_REVIEWED",
    targetId: payload.driverId,
    mode: "REAL",
    message: remoteApplied
      ? `차주 ${payload.driverId} 승인 검토 결과가 백엔드에 반영되었습니다.`
      : `차주 ${payload.driverId} 승인 검토 결과를 세션에만 반영했습니다(백엔드 API 미지원).`,
  });
}
