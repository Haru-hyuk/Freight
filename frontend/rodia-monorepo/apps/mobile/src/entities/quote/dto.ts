export type QuoteVehicleType = "TON_1" | "TON_2_5" | "TON_5";
export type QuoteVehicleBodyType = "CARGO" | "WING_BODY" | "TOP_CAR";
export type QuoteCargoType = "GENERAL" | "FROZEN";
export type QuoteWorkMethod = "SHIPPER" | "DRIVER";

export type QuoteChecklistItemDto = {
  checklistItemId: number;
  extraInput?: string;
  extraFee?: number;
};

export type QuoteCreateRequestDto = {
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
  vehicleType: QuoteVehicleType;
  vehicleBodyType: QuoteVehicleBodyType;
  cargoName: string;
  cargoType: QuoteCargoType;
  cargoDesc: string;
  desiredPrice: number;
  allowCombine: boolean;
  loadMethod: QuoteWorkMethod;
  unloadMethod: QuoteWorkMethod;
  checklistItems: QuoteChecklistItemDto[];
};

export type QuoteCreateResponseDto = {
  quoteId: number;
};

export type QuoteListItemDto = {
  quoteId?: number | string;
  truckId?: number | string;
  originAddress?: string;
  destinationAddress?: string;
  distanceKm?: number | string;
  vehicleType?: string;
  vehicleBodyType?: string;
  cargoName?: string;
  desiredPrice?: number | string;
  finalPrice?: number | string;
  status?: string;
  createdAt?: string;
};

export type QuoteDetailResponseDto = {
  quoteId?: number | string;
  shipperId?: number | string;
  truckId?: number | string;
  originAddress?: string;
  destinationAddress?: string;
  originLat?: number | string;
  originLng?: number | string;
  destinationLat?: number | string;
  destinationLng?: number | string;
  distanceKm?: number | string;
  weightKg?: number | string;
  volumeCbm?: number | string;
  vehicleType?: string;
  vehicleBodyType?: string;
  cargoName?: string;
  cargoType?: string;
  cargoDesc?: string;
  basePrice?: number | string;
  distancePrice?: number | string;
  extraPrice?: number | string;
  desiredPrice?: number | string;
  finalPrice?: number | string;
  allowCombine?: boolean;
  loadMethod?: string;
  unloadMethod?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  checklistItems?: QuoteChecklistItemDto[] | null;
};

export type QuoteUpdateRequestDto = QuoteCreateRequestDto;
export type QuoteUpdateResponseDto = QuoteDetailResponseDto;

export type QuoteListEnvelopeDto = {
  data?: QuoteListItemDto[] | null;
  result?: QuoteListItemDto[] | null;
  items?: QuoteListItemDto[] | null;
  list?: QuoteListItemDto[] | null;
};

export type QuoteDetailEnvelopeDto = {
  data?: QuoteDetailResponseDto | null;
  result?: QuoteDetailResponseDto | null;
};
