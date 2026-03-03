import { TRUCK_APPROVAL_MOCK_ROWS } from "@/features/trucks/model/mockData";
import type { TruckApprovalReviewPayload, TruckApprovalRow } from "@/features/trucks/model/types";
import { apiPaths } from "@/shared/lib/api/endpoints";
import { apiClient } from "@/shared/lib/api/client";
import { appendActivityLog } from "@/shared/lib/activity-log";
import { isMockModeEnabled } from "@/shared/lib/mock-mode";

type BackendTruck = {
  truckId: number | null;
  driverId: number | null;
  vehicleType: string | null;
  vehicleBodyType: string | null;
  tonnage: number | null;
  maxWeight: number | null;
  maxVolume: number | null;
  name: string | null;
  approved: boolean | null;
  insurance: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

const reviewOverrides = new Map<
  string,
  {
    approvalStatus: TruckApprovalRow["approvalStatus"];
    reviewMemo?: string;
  }
>();

let truckRowsStore: TruckApprovalRow[] = [...TRUCK_APPROVAL_MOCK_ROWS];

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
  const candidates = [
    row.items,
    row.data,
    row.content,
    row.list,
    row.result,
    row.trucks,
    row.pending,
    row.pendingTrucks,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
    const nested = toRecord(candidate);
    if (Array.isArray(nested.items)) return nested.items;
    if (Array.isArray(nested.content)) return nested.content;
    if (Array.isArray(nested.list)) return nested.list;
    if (Array.isArray(nested.trucks)) return nested.trucks;
    if (Array.isArray(nested.pending)) return nested.pending;
    if (Array.isArray(nested.pendingTrucks)) return nested.pendingTrucks;
  }
  return [];
}

function toDisplayDate(value: string | null | undefined): string {
  if (!value) return "-";
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  return new Date(parsed).toISOString().slice(0, 16).replace("T", " ");
}

function parseTruckId(input: string): number | null {
  const prefixed = /^T-(\d+)$/i.exec(input.trim());
  if (prefixed) return Number(prefixed[1]);
  const parsed = Number(input);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapBackendTruck(raw: unknown): BackendTruck {
  const row = toRecord(raw);
  return {
    truckId: toNumberValue(row.truckId ?? row.id),
    driverId: toNumberValue(row.driverId),
    vehicleType: toStringValue(row.vehicleType, "") || null,
    vehicleBodyType: toStringValue(row.vehicleBodyType, "") || null,
    tonnage: toNumberValue(row.tonnage),
    maxWeight: toNumberValue(row.maxWeight),
    maxVolume: toNumberValue(row.maxVolume),
    name: toStringValue(row.name, "") || null,
    approved: typeof row.approved === "boolean" ? row.approved : null,
    insurance: toStringValue(row.insurance, "") || null,
    createdAt: toStringValue(row.createdAt, "") || null,
    updatedAt: toStringValue(row.updatedAt, "") || null,
  };
}

function toTruckRow(truck: BackendTruck): TruckApprovalRow | null {
  if (typeof truck.truckId !== "number") return null;
  const truckId = `T-${truck.truckId}`;
  const base: TruckApprovalRow = {
    truckId,
    driverId: typeof truck.driverId === "number" ? `D-${truck.driverId}` : "-",
    driverName: typeof truck.driverId === "number" ? `기사-${truck.driverId}` : "미확인",
    requestedAt: toDisplayDate(truck.createdAt),
    plateNumber: truck.name ?? `TRUCK-${truck.truckId}`,
    vehicleType: [truck.vehicleType, truck.vehicleBodyType].filter(Boolean).join(" ").trim() || "미확인",
    capacity: truck.maxWeight ?? truck.maxVolume ?? 0,
    manufacturingYear: 0,
    insuranceStatus: truck.insurance ? "VERIFIED" : "UNVERIFIED",
    approvalStatus: truck.approved ? "APPROVED" : "PENDING",
    reviewMemo: undefined,
  };

  const override = reviewOverrides.get(truckId);
  if (!override) return base;
  return {
    ...base,
    approvalStatus: override.approvalStatus,
    reviewMemo: override.reviewMemo,
  };
}

async function fetchBackendTrucks(): Promise<BackendTruck[]> {
  try {
    const response = await apiClient.get<unknown>(apiPaths.adminTrucksPending);
    const pending = pickListPayload(response.data).map(mapBackendTruck);
    if (pending.length > 0) return pending;

    // Fallback: some environments do not expose pending endpoint yet.
    const allResponse = await apiClient.get<unknown>(apiPaths.driverTrucks);
    return pickListPayload(allResponse.data)
      .map(mapBackendTruck)
      .filter((truck) => truck.approved !== true);
  } catch {
    try {
      const allResponse = await apiClient.get<unknown>(apiPaths.driverTrucks);
      return pickListPayload(allResponse.data)
        .map(mapBackendTruck)
        .filter((truck) => truck.approved !== true);
    } catch {
      return [];
    }
  }
}

async function tryUpdateTruckApproval(truckId: number, approved: boolean): Promise<boolean> {
  try {
    await apiClient.patch(apiPaths.adminTruckApproval(String(truckId)), {
      approved,
    });
    return true;
  } catch {
    return false;
  }
}

export async function fetchTruckApprovals(): Promise<TruckApprovalRow[]> {
  if (isMockModeEnabled()) return [...truckRowsStore];

  const trucks = await fetchBackendTrucks();
  return trucks
    .map(toTruckRow)
    .filter((row): row is TruckApprovalRow => row !== null)
    .sort((a, b) => Date.parse(b.requestedAt) - Date.parse(a.requestedAt));
}

export async function reviewTruckApproval(payload: TruckApprovalReviewPayload): Promise<void> {
  if (isMockModeEnabled()) {
    truckRowsStore = truckRowsStore.map((row) => {
      if (row.truckId !== payload.truckId) return row;
      return {
        ...row,
        approvalStatus: payload.action === "APPROVE" ? "APPROVED" : "REJECTED",
        reviewMemo: payload.reason?.trim() || undefined,
      };
    });

    appendActivityLog({
      action: "TRUCK_APPROVAL_REVIEWED",
      targetId: payload.truckId,
      mode: "MOCK",
      message: `차량 ${payload.truckId} 승인 ${payload.action === "APPROVE" ? "승인" : "거절"} 처리`,
    });
    return;
  }

  const nextStatus: TruckApprovalRow["approvalStatus"] = payload.action === "APPROVE" ? "APPROVED" : "REJECTED";
  reviewOverrides.set(payload.truckId, {
    approvalStatus: nextStatus,
    reviewMemo: payload.reason?.trim() || undefined,
  });

  const numericTruckId = parseTruckId(payload.truckId);
  const remoteApplied =
    numericTruckId !== null ? await tryUpdateTruckApproval(numericTruckId, payload.action === "APPROVE") : false;

  appendActivityLog({
    action: "TRUCK_APPROVAL_REVIEWED",
    targetId: payload.truckId,
    mode: "REAL",
    message: remoteApplied
      ? `차량 ${payload.truckId} 승인 상태 반영 완료`
      : `차량 ${payload.truckId} 승인 처리 실패`,
  });
}
