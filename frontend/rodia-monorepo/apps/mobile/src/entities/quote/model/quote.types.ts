export type QuoteId = number;

export type QuoteStatusApi =
  | "OPEN"
  | "NEGOTIATING"
  | "ASSIGNED"
  | "PICKUP"
  | "TRANSIT"
  | "DROPOFF"
  | "CANCELED";

export type QuoteChecklistItem = {
  checklistItemId: number;
  extraInput: string;
  extraFee: number;
};

export type QuoteCreateRequest = {
  truckId: number;
  originAddress: string;
  destinationAddress: string;
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  distanceKm: number;
  weightKg: number;
  volumeCbm: number;
  vehicleType: string;
  vehicleBodyType: string;
  cargoName: string;
  cargoType: string;
  cargoDesc: string;
  desiredPrice: number;
  allowCombine: boolean;
  loadMethod: string;
  unloadMethod: string;
  checklistItems: QuoteChecklistItem[];
};

export type QuoteCreateResponse = {
  quoteId: number;
};

export type QuoteListItem = {
  quoteId: number;
  truckId: number;
  originAddress: string;
  destinationAddress: string;
  distanceKm: number;
  vehicleType: string;
  vehicleBodyType: string;
  cargoName: string;
  desiredPrice: number;
  finalPrice: number;
  status: QuoteStatusApi;
  createdAt: string;
};

export type QuoteDetailResponse = {
  quoteId: number;
  shipperId: number;
  truckId: number;
  originAddress: string;
  destinationAddress: string;
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  distanceKm: number;
  weightKg: number;
  volumeCbm: number;
  vehicleType: string;
  vehicleBodyType: string;
  cargoName: string;
  cargoType: string;
  cargoDesc: string;
  basePrice: number;
  distancePrice: number;
  extraPrice: number;
  desiredPrice: number;
  finalPrice: number;
  allowCombine: boolean;
  loadMethod: string;
  unloadMethod: string;
  status: QuoteStatusApi;
  createdAt: string;
  updatedAt: string;
  checklistItems: QuoteChecklistItem[];
};

export type QuoteUpdateRequest = QuoteCreateRequest;

export type QuoteUpdateResponse = QuoteDetailResponse;

export type QuoteDeleteResponse = void;
