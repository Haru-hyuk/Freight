// rodia-monorepo/apps/mobile/src/entities/quote/dto.ts
export type QuoteVehicleType =
  | "DAMAS"
  | "LABO"
  | "TON_1"
  | "TON_1_4"
  | "TON_2_5"
  | "TON_3_5"
  | "TON_5"
  | "TON_5_AXLE"
  | "TON_8"
  | "TON_11"
  | "TON_14"
  | "TON_15"
  | "TON_18"
  | "TON_25";
export type QuoteVehicleBodyType = "CARGO" | "WING_BODY" | "TOP_CAR";
export type QuoteCargoType = "GENERAL" | "FROZEN";
export type QuoteWorkMethod =
  | "SHIPPER"
  | "DRIVER"
  | "SHIPPER:MANUAL"
  | "DRIVER:MANUAL"
  | "DRIVER:FORKLIFT"
  | "DRIVER:LADDER"
  | "DRIVER:WAIST_BEAR";

export type QuoteChecklistItemDto = {
  checklistItemId: number;
  extraInput?: string;
  extraFee?: number;
};

export type QuoteItemDto = {
  quoteItemId?: number | string;
  itemName?: string;
  itemType?: string;
  itemDescription?: string;
  quantity?: number | string;
  lengthCm?: number | string;
  widthCm?: number | string;
  heightCm?: number | string;
  unitWeightKg?: number | string;
  unitVolumeCbm?: number | string;
  fragile?: boolean;
  upright?: boolean;
  noStack?: boolean;
  bottomOnly?: boolean;
  rotatable?: boolean;
  stackable?: boolean;
  maxStackWeightKg?: number | string;
  handlingTags?: string;
  sortOrder?: number | string;
};

export type QuoteStopDto = {
  quoteStopId?: number | string;
  seq?: number | string;
  address?: string;
  lat?: number | string;
  lng?: number | string;
  contactName?: string;
  contactPhone?: string;
  deptName?: string;
  managerName?: string;
};

export type QuoteStopResponseDto = QuoteStopDto;

export type QuoteStopRequestDto = {
  seq?: number | string;
  address?: string;
  lat?: number | string;
  lng?: number | string;
  contactName?: string;
  contactPhone?: string;
  deptName?: string;
  managerName?: string;
};

export type QuoteCreateRequestDto = {
  truckId?: number;
  originAddress: string;
  destinationAddress: string;
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  distanceKm?: number;
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
  quoteItems?: QuoteItemDto[] | null;
  stops?: QuoteStopRequestDto[] | null;
};

export type QuoteCreateResponseDto = {
  quoteId: number;
  quotePublicId?: string;
  originLat?: number;
  originLng?: number;
  destinationLat?: number;
  destinationLng?: number;
  stops?: QuoteStopDto[] | null;
  basePrice?: number;
  distancePrice?: number;
  extraPrice?: number;
  desiredPrice?: number;
  finalPrice?: number;
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
  quotePublicId?: string;
  shipperId?: number | string;
  truckId?: number | string;
  originAddress?: string;
  originAddressDetail?: string;
  destinationAddress?: string;
  destinationAddressDetail?: string;
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
  senderName?: string;
  senderPhone?: string;
  receiverName?: string;
  receiverPhone?: string;
  quoteItems?: QuoteItemDto[] | null;
  checklistItems?: QuoteChecklistItemDto[] | null;
  stops?: QuoteStopDto[] | null;
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
