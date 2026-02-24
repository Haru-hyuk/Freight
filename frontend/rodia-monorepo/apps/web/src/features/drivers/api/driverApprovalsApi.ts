import { DRIVER_APPROVAL_MOCK_ROWS } from "@/features/drivers/model/mockData";
import type { DriverApprovalReviewPayload, DriverApprovalRow } from "@/features/drivers/model/types";
import { apiClient } from "@/shared/lib/api/client";
import { appendActivityLog } from "@/shared/lib/activity-log";
import { isMockModeEnabled } from "@/shared/lib/mock-mode";

let driverRowsStore: DriverApprovalRow[] = [...DRIVER_APPROVAL_MOCK_ROWS];

export async function fetchDriverApprovals(): Promise<DriverApprovalRow[]> {
  if (isMockModeEnabled()) return [...driverRowsStore];

  try {
    const response = await apiClient.get<DriverApprovalRow[]>("/admin/drivers/approvals");
    return response.data;
  } catch {
    return [];
  }
}

export async function reviewDriverApproval(payload: DriverApprovalReviewPayload): Promise<void> {
  if (isMockModeEnabled()) {
    driverRowsStore = driverRowsStore.map((row) => {
      if (row.driverId !== payload.driverId) return row;
      return {
        ...row,
        approvalStatus: payload.action === "APPROVE" ? "APPROVED" : "REJECTED",
        reviewMemo: payload.reason?.trim() || undefined,
      };
    });

    appendActivityLog({
      action: "DRIVER_APPROVAL_REVIEWED",
      targetId: payload.driverId,
      mode: "MOCK",
      message: `차주 ${payload.driverId} 승인 심사를 ${payload.action === "APPROVE" ? "승인" : "거절"} 처리했습니다.`,
    });
    return;
  }

  try {
    await apiClient.post(`/admin/drivers/approvals/${payload.driverId}/review`, {
      action: payload.action,
      reason: payload.reason,
    });
    appendActivityLog({
      action: "DRIVER_APPROVAL_REVIEWED",
      targetId: payload.driverId,
      mode: "REAL",
      message: `차주 ${payload.driverId} 승인 심사를 ${payload.action === "APPROVE" ? "승인" : "거절"} 처리했습니다.`,
    });
  } catch {
    // no-op
  }
}
