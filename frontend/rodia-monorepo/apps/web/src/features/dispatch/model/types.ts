export type DispatchMatchStatus = "READY" | "IN_TRANSIT" | "COMPLETED" | "CANCELLED";
export type DispatchPaymentStatus = "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
export type DispatchSettlementStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
export type DeviationSeverity = "NONE" | "MODERATE" | "SEVERE";

export type DispatchRow = {
  matchId: string;
  quoteId: string;
  shipperName: string;
  cargoType: string;
  originAddress: string;
  destinationAddress: string;
  requestedAt: string;
  departAt?: string;
  arriveAt?: string;
  driverName?: string;
  truckName?: string;
  matchStatus: DispatchMatchStatus;
  accepted: boolean;
  currentVolumeCbm: number;
  remainingVolumeCbm: number;
  routeDistanceKm: number;
  totalFare: number;
  driverPayout: number;
  platformFee: number;
  paymentStatus: DispatchPaymentStatus;
  settlementStatus: DispatchSettlementStatus;
  unreadNotificationCount: number;
  deviationSeverity: DeviationSeverity;
};

export type DispatchQuery = {
  q?: string;
  status?: DispatchMatchStatus;
  dispatchState?: "WAITING" | "ASSIGNED";
  paymentStatus?: DispatchPaymentStatus;
  settlementStatus?: DispatchSettlementStatus;
  page: number;
  size: number;
};

export type DispatchResponse = {
  items: DispatchRow[];
  total: number;
};

export type DispatchDriverOption = {
  driverId: string;
  driverName: string;
  truckName: string;
  maxVolumeCbm: number;
  currentVolumeCbm: number;
};

export type DispatchForceAssignPayload = {
  matchId: string;
  driverId: string;
};
