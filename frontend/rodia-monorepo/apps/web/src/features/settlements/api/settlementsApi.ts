import { SETTLEMENT_APPROVAL_MOCK_ROWS } from "@/features/settlements/model/mockData";
import type {
  SettlementApprovalRow,
  SettlementApprovalStatus,
  SettlementProgressStatus,
  SettlementReviewPayload,
} from "@/features/settlements/model/types";
import { appendActivityLog } from "@/shared/lib/activity-log";
import { apiClient } from "@/shared/lib/api/client";
import { apiPaths } from "@/shared/lib/api/endpoints";
import { isMockModeEnabled } from "@/shared/lib/mock-mode";

type SettlementListPayload = {
  items?: unknown[];
  total?: number;
};

let settlementsStore: SettlementApprovalRow[] = [...SETTLEMENT_APPROVAL_MOCK_ROWS];

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function toStringValue(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function toNumberValue(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function toDateText(value: unknown, fallback = "-"): string {
  const text = toStringValue(value, "").trim();
  if (!text) return fallback;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return date.toISOString().slice(0, 16).replace("T", " ");
}

function normalizeProgressStatus(value: unknown): SettlementProgressStatus {
  const status = toStringValue(value).toUpperCase();
  if (status === "PROCESSING") return "PROCESSING";
  if (status === "COMPLETED") return "COMPLETED";
  if (status === "FAILED") return "FAILED";
  return "PENDING";
}

function normalizeApprovalStatus(value: unknown, progress: SettlementProgressStatus): SettlementApprovalStatus {
  const status = toStringValue(value).toUpperCase();
  if (status === "APPROVED") return "APPROVED";
  if (status === "REJECTED") return "REJECTED";
  if (status === "PENDING") return "PENDING";
  if (progress === "COMPLETED") return "APPROVED";
  if (progress === "FAILED") return "REJECTED";
  return "PENDING";
}

function mapLiveSettlement(raw: unknown, index: number): SettlementApprovalRow {
  const row = toRecord(raw);

  const settlementIdValue = row.settlementId ?? row.id ?? `AUTO-${Date.now()}-${index}`;
  const matchIdValue = row.matchId ?? row.orderId ?? row.quoteId ?? "-";
  const driverIdValue = row.driverId ?? row.driverUserId ?? "-";

  const settlementStatus = normalizeProgressStatus(row.settlementStatus ?? row.status);
  const approvalStatus = normalizeApprovalStatus(row.approvalStatus ?? row.reviewStatus, settlementStatus);

  return {
    settlementId: toStringValue(settlementIdValue),
    matchId: toStringValue(matchIdValue, "-"),
    driverId: toStringValue(driverIdValue, "-"),
    driverName: toStringValue(row.driverName, "-"),
    shipperName: toStringValue(row.shipperName, "-"),
    dueDate: toDateText(row.dueDate ?? row.settlementDate),
    totalFare: toNumberValue(row.totalFare),
    platformFee: toNumberValue(row.platformFee, 0),
    fastFee: toNumberValue(row.fastFee, 0),
    driverPayout: toNumberValue(row.driverPayout),
    settlementStatus,
    approvalStatus,
    shipperPaymentStatus: toStringValue(row.shipperPaymentStatus, "") || undefined,
    shipperPaymentMethod: toStringValue(row.shipperPaymentMethod, "") || undefined,
    completedAt: toDateText(row.completedAt, "") || undefined,
    createdAt: toDateText(row.createdAt, "") || undefined,
    updatedAt: toDateText(row.updatedAt, "") || undefined,
    reviewMemo: toStringValue(row.reviewMemo ?? row.reason, "") || undefined,
  };
}

function extractRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const record = toRecord(payload);
  const items = record.items;
  if (Array.isArray(items)) return items;
  return [];
}

function sortRows(rows: SettlementApprovalRow[]): SettlementApprovalRow[] {
  return [...rows].sort((a, b) => {
    const aTime = new Date(a.dueDate).getTime();
    const bTime = new Date(b.dueDate).getTime();
    if (Number.isNaN(aTime) && Number.isNaN(bTime)) return a.settlementId.localeCompare(b.settlementId);
    if (Number.isNaN(aTime)) return 1;
    if (Number.isNaN(bTime)) return -1;
    return bTime - aTime;
  });
}

function mergeUniqueRows(rows: SettlementApprovalRow[]): SettlementApprovalRow[] {
  const map = new Map<string, SettlementApprovalRow>();
  for (const row of rows) {
    if (!row.settlementId) continue;
    map.set(row.settlementId, row);
  }
  return sortRows(Array.from(map.values()));
}

function resolveSettlementMePath(basePath: string): string {
  const base = basePath.replace(/\/$/, "");
  return base.endsWith("/me") ? base : `${base}/me`;
}

async function fetchRowsByPath(path: string): Promise<SettlementApprovalRow[]> {
  try {
    const response = await apiClient.get<SettlementListPayload | unknown[]>(path);
    return extractRows(response.data)
      .map((item, index) => mapLiveSettlement(item, index))
      .filter((row) => row.settlementId.length > 0);
  } catch {
    return [];
  }
}

async function fetchRoleSettlementRows(): Promise<SettlementApprovalRow[]> {
  const [shipperRows, driverRows] = await Promise.all([
    fetchRowsByPath(resolveSettlementMePath(apiPaths.shipperSettlements)),
    fetchRowsByPath(resolveSettlementMePath(apiPaths.driverSettlements)),
  ]);

  return mergeUniqueRows([...shipperRows, ...driverRows]);
}

async function fetchLiveSettlementRows(): Promise<SettlementApprovalRow[]> {
  const roleRows = await fetchRoleSettlementRows();
  if (roleRows.length > 0) return roleRows;

  const [approvals, history] = await Promise.all([
    fetchRowsByPath(apiPaths.adminSettlementApprovals),
    fetchRowsByPath(apiPaths.adminSettlementHistory),
  ]);

  return mergeUniqueRows([...approvals, ...history]);
}

function toMatchIdParam(matchId: string | undefined): string | null {
  if (!matchId) return null;
  const trimmed = matchId.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) return trimmed;

  const digits = trimmed.match(/\d+/g)?.join("") ?? "";
  if (!digits || !/^\d+$/.test(digits)) return null;
  return String(Number(digits));
}

function updateMockStore(payload: SettlementReviewPayload) {
  settlementsStore = settlementsStore.map((row) => {
    if (row.settlementId !== payload.settlementId) return row;
    return {
      ...row,
      approvalStatus: payload.action === "APPROVE" ? "APPROVED" : "REJECTED",
      settlementStatus: payload.action === "APPROVE" ? "COMPLETED" : "FAILED",
      reviewMemo: payload.reason?.trim() || undefined,
      completedAt: payload.action === "APPROVE" ? new Date().toISOString() : row.completedAt,
      updatedAt: new Date().toISOString(),
    };
  });
}

export async function fetchSettlementApprovals(): Promise<SettlementApprovalRow[]> {
  if (isMockModeEnabled()) {
    return sortRows(settlementsStore.filter((row) => row.approvalStatus === "PENDING"));
  }

  const rows = await fetchLiveSettlementRows();
  return rows.filter((row) => row.approvalStatus === "PENDING");
}

export async function fetchSettlementApprovalHistory(): Promise<SettlementApprovalRow[]> {
  if (isMockModeEnabled()) {
    return sortRows(settlementsStore.filter((row) => row.approvalStatus !== "PENDING"));
  }

  const rows = await fetchLiveSettlementRows();
  return rows.filter((row) => row.approvalStatus !== "PENDING");
}

export async function fetchSettlementById(settlementId: string): Promise<SettlementApprovalRow | null> {
  if (isMockModeEnabled()) {
    return settlementsStore.find((row) => row.settlementId === settlementId) ?? null;
  }

  const rows = await fetchLiveSettlementRows();
  return rows.find((row) => row.settlementId === settlementId) ?? null;
}

export async function reviewSettlement(payload: SettlementReviewPayload): Promise<void> {
  if (isMockModeEnabled()) {
    updateMockStore(payload);
    appendActivityLog({
      action: "SETTLEMENT_REVIEWED",
      targetId: payload.settlementId,
      mode: "MOCK",
      message: `정산 ${payload.settlementId} 검토 ${payload.action === "APPROVE" ? "승인" : "반려"}`,
    });
    return;
  }

  let reviewed = false;

  try {
    await apiClient.post(apiPaths.adminSettlementReview(payload.settlementId), {
      action: payload.action,
      reason: payload.reason,
    });
    reviewed = true;
  } catch {
    // fallback below
  }

  if (!reviewed && payload.action === "APPROVE") {
    const target = await fetchSettlementById(payload.settlementId);
    const matchId = toMatchIdParam(target?.matchId);
    if (matchId) {
      try {
        await apiClient.post(apiPaths.shipperSettlementConfirm(matchId));
        reviewed = true;
      } catch {
        // no-op
      }
    }
  }

  if (!reviewed) return;

  appendActivityLog({
    action: "SETTLEMENT_REVIEWED",
    targetId: payload.settlementId,
    mode: "REAL",
    message: `정산 ${payload.settlementId} 검토 ${payload.action === "APPROVE" ? "승인" : "반려"}`,
  });
}

