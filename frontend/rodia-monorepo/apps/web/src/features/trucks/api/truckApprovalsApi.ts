import { TRUCK_APPROVAL_MOCK_ROWS } from "@/features/trucks/model/mockData";
import type { TruckApprovalReviewPayload, TruckApprovalRow } from "@/features/trucks/model/types";
import { apiClient } from "@/shared/lib/api/client";
import { appendActivityLog } from "@/shared/lib/activity-log";
import { isMockModeEnabled } from "@/shared/lib/mock-mode";

let truckRowsStore: TruckApprovalRow[] = [...TRUCK_APPROVAL_MOCK_ROWS];

export async function fetchTruckApprovals(): Promise<TruckApprovalRow[]> {
  if (isMockModeEnabled()) return [...truckRowsStore];

  try {
    const response = await apiClient.get<TruckApprovalRow[]>("/admin/trucks/approvals");
    return response.data;
  } catch {
    return [];
  }
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
      message: `차량 ${payload.truckId} 승인 심사를 ${payload.action === "APPROVE" ? "승인" : "거절"} 처리했습니다.`,
    });
    return;
  }

  try {
    await apiClient.post(`/admin/trucks/approvals/${payload.truckId}/review`, {
      action: payload.action,
      reason: payload.reason,
    });
    appendActivityLog({
      action: "TRUCK_APPROVAL_REVIEWED",
      targetId: payload.truckId,
      mode: "REAL",
      message: `차량 ${payload.truckId} 승인 심사를 ${payload.action === "APPROVE" ? "승인" : "거절"} 처리했습니다.`,
    });
  } catch {
    // no-op
  }
}
