import type {
  QuoteCreateRequest as QuoteCreateRequestSchema,
  QuoteCreateResponse as QuoteCreateResponseSchema,
  QuoteDetailResponse as QuoteDetailResponseSchema,
  QuoteListResponse as QuoteListResponseSchema,
  QuoteUpdateRequest as QuoteUpdateRequestSchema,
} from "@/shared/api/generated/schemas";

export type QuoteId = number;

export type QuoteStatusApi =
  | "OPEN"
  | "NEGOTIATING"
  | "ASSIGNED"
  | "PREPARING"
  | "DRIVING"
  | "ACCEPTED"
  | "PICKUP"
  | "TRANSIT"
  | "DROPOFF"
  | "CANCELED"
  | "UNKNOWN"
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

export type QuoteItem = {
  quoteItemId: number;
  itemName: string;
  itemType: string;
  itemDescription: string;
  quantity: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  unitWeightKg: number;
  unitVolumeCbm: number;
  fragile: boolean;
  upright: boolean;
  noStack: boolean;
  bottomOnly: boolean;
  rotatable: boolean;
  stackable: boolean;
  maxStackWeightKg: number;
  handlingTags: string;
  sortOrder: number;
};

export type QuoteCreateRequest = QuoteCreateRequestSchema;
export type QuoteUpdateRequest = QuoteUpdateRequestSchema;

export type QuoteCreateResponseApi = QuoteCreateResponseSchema;
export type QuoteListResponseApi = QuoteListResponseSchema;
export type QuoteDetailResponseApi = QuoteDetailResponseSchema;

/**
 * UI 합성 응답 타입
 * - API 스키마에 없는 필드는 별도 UI 조합 필드로 분리한다.
 */
export type QuoteCreateResponse = QuoteCreateResponseApi & {
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

export type QuoteDetailResponse = QuoteDetailResponseApi & {
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
  quoteItems: QuoteItem[];
  checklistItems: QuoteChecklistItem[];
  stops: QuoteStop[];
  /**
   * UI 합성 필드 (API 스키마 외)
   */
  originAddressDetail?: string;
  destinationAddressDetail?: string;
  senderName?: string;
  senderPhone?: string;
  receiverName?: string;
  receiverPhone?: string;
};

export type QuoteUpdateResponse = QuoteDetailResponse;
export type QuoteDeleteResponse = void;
