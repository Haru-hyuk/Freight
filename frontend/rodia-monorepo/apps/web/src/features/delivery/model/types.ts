export type DeliveryMatchStatus = "READY" | "IN_TRANSIT" | "COMPLETED" | "CANCELLED";
export type DeliverySettlementStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export type DeliveryHistoryRow = {
  matchId: string;
  quoteId: string;
  shipperName: string;
  driverName: string;
  originAddress: string;
  destinationAddress: string;
  departAt: string;
  arriveAt?: string;
  matchStatus: DeliveryMatchStatus;
  settlementStatus: DeliverySettlementStatus;
  totalFare: number;
  driverPayout: number;
};

export type DeliveryHistoryQuery = {
  q?: string;
  status?: DeliveryMatchStatus;
  page: number;
  size: number;
};

export type DeliveryHistoryResponse = {
  items: DeliveryHistoryRow[];
  total: number;
};

// === 배송 실시간 모니터링 ===
export type LiveDelivery = {
  id: string;
  orderNo: string;
  shipper: { name: string; phone: string };
  driver: { id: string; name: string; phone: string; vehicleNo: string };
  status: "IN_TRANSIT" | "ARRIVED";
  origin: { address: string; lat: number; lng: number };
  destination: { address: string; lat: number; lng: number };
  currentLocation?: { lat: number; lng: number };
  distance: number;
  estimatedTime: number; // minutes
  elapsedTime: number; // minutes
  fare: number;
  startedAt: string;
};

// === 견적 관리 ===
export enum QuoteStatus {
  PENDING = "PENDING",
  QUOTED = "QUOTED",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
  EXPIRED = "EXPIRED",
}

export type Quote = {
  id: string;
  quoteNo: string;
  shipper: { id: string; name: string };
  route: { origin: string; destination: string; distance: number };
  cargo: { type: string; weight: number; volume?: number };
  baseFare: number;
  surcharge: number;
  totalFare: number;
  status: QuoteStatus;
  expiresAt: string;
  createdAt: string;
  acceptedAt?: string;
};

// === 배차 관리 ===
export enum DispatchStatus {
  OPEN = "OPEN",
  ASSIGNED = "ASSIGNED",
  DISPATCHED = "DISPATCHED",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export type DispatchRequest = {
  id: string;
  deliveryId: string;
  orderNo: string;
  status: DispatchStatus;
  proposedDriver?: { id: string; name: string; rating: number };
  route: { origin: string; destination: string; distance: number };
  cargo: { type: string; weight: number };
  estimatedFare: number;
  createdAt: string;
};

// === 매칭 관리 ===
export enum MatchingStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELED = "CANCELED",
}

export type Matching = {
  id: string;
  matchNo: string;
  orderNo: string;
  shipper: { id: string; name: string };
  driver?: { id: string; name: string; rating: number };
  status: MatchingStatus;
  route: { origin: string; destination: string; distance: number };
  fare: number;
  commission: number;
  confirmedAt?: string;
  completedAt?: string;
  createdAt: string;
};
