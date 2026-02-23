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
