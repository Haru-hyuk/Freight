import { SETTLEMENT_APPROVAL_MOCK_ROWS } from "@/features/settlements/model/mockData";
import type { SettlementApprovalRow, SettlementReviewPayload } from "@/features/settlements/model/types";
import { apiClient } from "@/shared/lib/api/client";
import { appendActivityLog } from "@/shared/lib/activity-log";
import { isMockModeEnabled } from "@/shared/lib/mock-mode";

let settlementsStore: SettlementApprovalRow[] = [...SETTLEMENT_APPROVAL_MOCK_ROWS];

export async function fetchSettlementApprovals(): Promise<SettlementApprovalRow[]> {
  if (isMockModeEnabled()) return settlementsStore.filter((row) => row.approvalStatus === "PENDING");

  try {
    const response = await apiClient.get<SettlementApprovalRow[]>("/admin/settlements/approvals");
    return response.data;
  } catch {
    return [];
  }
}

export async function fetchSettlementApprovalHistory(): Promise<SettlementApprovalRow[]> {
  if (isMockModeEnabled()) return settlementsStore.filter((row) => row.approvalStatus !== "PENDING");

  try {
    const response = await apiClient.get<SettlementApprovalRow[]>("/admin/settlements/approval-history");
    return response.data;
  } catch {
    return [];
  }
}

export async function reviewSettlement(payload: SettlementReviewPayload): Promise<void> {
  if (isMockModeEnabled()) {
    settlementsStore = settlementsStore.map((row) => {
      if (row.settlementId !== payload.settlementId) return row;
      return {
        ...row,
        approvalStatus: payload.action === "APPROVE" ? "APPROVED" : "REJECTED",
        settlementStatus: payload.action === "APPROVE" ? "COMPLETED" : row.settlementStatus,
        reviewMemo: payload.reason?.trim() || undefined,
      };
    });

    appendActivityLog({
      action: "SETTLEMENT_REVIEWED",
      targetId: payload.settlementId,
      mode: "MOCK",
      message: `정산 ${payload.settlementId} 승인 심사를 ${payload.action === "APPROVE" ? "승인" : "거절"} 처리했습니다.`,
    });
    return;
  }

  try {
    await apiClient.post(`/admin/settlements/${payload.settlementId}/review`, {
      action: payload.action,
      reason: payload.reason,
    });
    appendActivityLog({
      action: "SETTLEMENT_REVIEWED",
      targetId: payload.settlementId,
      mode: "REAL",
      message: `정산 ${payload.settlementId} 승인 심사를 ${payload.action === "APPROVE" ? "승인" : "거절"} 처리했습니다.`,
    });
  } catch {
    // no-op
  }
}
