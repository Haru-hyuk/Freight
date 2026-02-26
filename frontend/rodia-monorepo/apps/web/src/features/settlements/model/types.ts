export type SettlementApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";
export type SettlementProgressStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export type SettlementApprovalRow = {
  settlementId: string;
  matchId: string;
  driverId: string;
  driverName: string;
  shipperName: string;
  dueDate: string;
  totalFare: number;
  platformFee?: number;
  fastFee?: number;
  driverPayout: number;
  settlementStatus: SettlementProgressStatus;
  approvalStatus: SettlementApprovalStatus;
  shipperPaymentStatus?: string;
  shipperPaymentMethod?: string;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  reviewMemo?: string;
};

export type SettlementReviewPayload = {
  settlementId: string;
  action: "APPROVE" | "REJECT";
  reason?: string;
};
