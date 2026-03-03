export type CancellationApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";
export type CancellationReviewAction = "APPROVE" | "REJECT";
export type CancellationStatusFilter = "ALL" | CancellationApprovalStatus;
export type CancellationRequesterRole = "SHIPPER" | "DRIVER" | "UNKNOWN";
export type CancellationDataSource = "API" | "DERIVED";

export type CancellationRequestRow = {
  requestId: string;
  quoteId: string;
  matchId: string;
  requestedByRole: CancellationRequesterRole;
  requestedByName: string;
  shipperId: string;
  shipperName: string;
  driverId: string;
  driverName: string;
  originAddress: string;
  destinationAddress: string;
  cargoName: string;
  cancelReason: string;
  requestedAt: string;
  approvalStatus: CancellationApprovalStatus;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewMemo?: string;
  source?: CancellationDataSource;
};

export type CancellationRequestQuery = {
  search?: string;
  status?: CancellationApprovalStatus;
  page: number;
  size: number;
};

export type CancellationRequestResponse = {
  items: CancellationRequestRow[];
  total: number;
};

export type CancellationReviewPayload = {
  requestId: string;
  action: CancellationReviewAction;
  reviewMemo?: string;
};

export type ParticipantInfo = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  status?: string;
};

export type QuoteInfo = {
  quoteId: string;
  status: string;
  originAddress: string;
  destinationAddress: string;
  cargoName: string;
  cargoType?: string;
  weightKg?: number | null;
  volumeCbm?: number | null;
  distanceKm?: number | null;
  finalPrice?: number | null;
  createdAt: string;
};

export type MatchInfo = {
  matchId: string;
  status: string;
  accepted: boolean;
  acceptedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type PaymentInfo = {
  status: string;
  totalAmount?: number | null;
  paidAt?: string;
};

export type SettlementInfo = {
  status: string;
  totalFare?: number | null;
  dueDate?: string;
  completedAt?: string;
};

export type CancellationRequestDetail = {
  request: CancellationRequestRow;
  shipper: ParticipantInfo;
  driver: ParticipantInfo;
  quote: QuoteInfo;
  match: MatchInfo;
  payment?: PaymentInfo;
  settlement?: SettlementInfo;
};

export type OrderMonitoringQuoteStatus =
  | "OPEN"
  | "MATCHED"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CANCELLED"
  | "UNKNOWN";
export type OrderMonitoringMatchStatus = "UNMATCHED" | "READY" | "IN_TRANSIT" | "COMPLETED" | "CANCELLED";
export type OrderMonitoringPaymentStatus = "UNKNOWN" | "PENDING" | "COMPLETED" | "FAILED";
export type OrderMonitoringSettlementStatus = "UNKNOWN" | "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
export type OrderRiskState = "NORMAL" | "WATCH" | "ACTION_REQUIRED";
export type OrderRiskFilter = "ALL" | OrderRiskState;

export type OrderMonitoringRow = {
  quoteId: string;
  matchId: string;
  quoteStatus: OrderMonitoringQuoteStatus;
  matchStatus: OrderMonitoringMatchStatus;
  paymentStatus: OrderMonitoringPaymentStatus;
  settlementStatus: OrderMonitoringSettlementStatus;
  shipperName: string;
  driverName: string;
  originAddress: string;
  destinationAddress: string;
  cargoName: string;
  requestedAt: string;
  totalFare: number;
  riskState: OrderRiskState;
};

export type OrderMonitoringSummary = {
  totalQuotes: number;
  matchedOrders: number;
  inTransitOrders: number;
  cancelledOrders: number;
  pendingPayments: number;
  pendingSettlements: number;
  actionRequired: number;
};

export type OrderMonitoringSnapshot = {
  rows: OrderMonitoringRow[];
  summary: OrderMonitoringSummary;
};
