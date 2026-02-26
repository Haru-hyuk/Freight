// rodia-monorepo/apps/mobile/src/entities/quote/model/quote.types.ts
export type QuoteId = number;

export type QuoteStatusApi =
  | "OPEN"
  | "NEGOTIATING"
  | "ASSIGNED"
  | "ACCEPTED"
  | "PICKUP"
  | "TRANSIT"
  | "DROPOFF"
  | "CANCELED"
  | (string & {});

export type QuoteChecklistItem = {
  checklistItemId: number;
  extraInput: string;
  extraFee: number;
};

export type QuoteStop = {
  quoteStopId: number;
  seq: number;
  address: string;
  lat: number;
  lng: number;
  contactName: string;
  contactPhone: string;
  deptName: string;
  managerName: string;
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
  stops?: QuoteStop[];
};

export type QuoteCreateResponse = {
  quoteId: number;
  quotePublicId?: string;
  basePrice?: number;
  distancePrice?: number;
  extraPrice?: number;
  desiredPrice?: number;
  finalPrice?: number;
};

export type QuoteListItem = {
  quoteId: number;
  quotePublicId?: string;
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
  quotePublicId?: string;
  shipperId: number;
  truckId: number;
  originAddress: string;
  originAddressDetail?: string;
  destinationAddress: string;
  destinationAddressDetail?: string;
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
  senderName?: string;
  senderPhone?: string;
  receiverName?: string;
  receiverPhone?: string;
  checklistItems: QuoteChecklistItem[];
  stops: QuoteStop[];
};

export type QuoteUpdateRequest = QuoteCreateRequest;

export type QuoteUpdateResponse = QuoteDetailResponse;

export type QuoteDeleteResponse = void;
