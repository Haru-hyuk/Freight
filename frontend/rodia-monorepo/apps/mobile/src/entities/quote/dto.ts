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
