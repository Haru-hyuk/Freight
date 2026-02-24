export type QuoteStatus = "DRAFT" | "OPEN" | "MATCHED" | "CANCELLED";

export type QuoteRow = {
  quoteId: string;
  shipperName: string;
  originAddress: string;
  destinationAddress: string;
  distanceKm: number;
  weightKg: number;
  volumeCbm: number;
  cargoType: string;
  desiredPrice: number;
  finalPrice?: number;
  status: QuoteStatus;
  allowCombine: boolean;
  loadMethod: "SHIPPER" | "DRIVER";
  unloadMethod: "SHIPPER" | "DRIVER";
  deadlineAt?: string;
  checklistSummary: string;
  createdAt: string;
  updatedAt: string;
};

export type QuoteQuery = {
  q?: string;
  status?: QuoteStatus;
  allowCombine?: boolean;
  page: number;
  size: number;
};

export type QuoteResponse = {
  items: QuoteRow[];
  total: number;
};

export type QuoteUpdatePayload = {
  quoteId: string;
  status: QuoteStatus;
  cargoType: string;
  desiredPrice: number;
  finalPrice?: number;
  distanceKm: number;
  weightKg: number;
  volumeCbm: number;
  originAddress: string;
  destinationAddress: string;
  allowCombine: boolean;
  loadMethod: "SHIPPER" | "DRIVER";
  unloadMethod: "SHIPPER" | "DRIVER";
  deadlineAt?: string;
  checklistSummary: string;
};
