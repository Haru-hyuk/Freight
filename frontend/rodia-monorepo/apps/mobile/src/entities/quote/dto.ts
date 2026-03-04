import type {
  QuoteChecklistItemRequest,
  QuoteChecklistItemResponse,
  QuoteCreateRequest,
  QuoteCreateResponse,
  QuoteDetailResponse,
  QuoteItemRequest,
  QuoteItemResponse,
  QuoteListResponse,
  QuoteStopRequest,
  QuoteStopResponse,
  QuoteUpdateRequest,
} from "@/shared/api/generated/schemas";

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

type NumberLike = number | string;

/**
 * Raw DTO for tolerant parse/sanitize path.
 * API 송수신 타입 자체는 generated schema type alias(아래)로 고정한다.
 */
export type QuoteChecklistItemDto = QuoteChecklistItemRequest &
  QuoteChecklistItemResponse & {
    checklistItemId?: NumberLike;
    extraFee?: NumberLike;
  };

export type QuoteItemDto = QuoteItemRequest &
  QuoteItemResponse & {
    quoteItemId?: NumberLike;
    quantity?: NumberLike;
    lengthCm?: NumberLike;
    widthCm?: NumberLike;
    heightCm?: NumberLike;
    unitWeightKg?: NumberLike;
    unitVolumeCbm?: NumberLike;
    maxStackWeightKg?: NumberLike;
    sortOrder?: NumberLike;
  };

export type QuoteStopDto = QuoteStopRequest &
  QuoteStopResponse & {
    quoteStopId?: NumberLike;
    seq?: NumberLike;
    lat?: NumberLike;
    lng?: NumberLike;
  };

export type QuoteStopResponseDto = QuoteStopDto;
export type QuoteStopRequestDto = QuoteStopRequest &
  QuoteStopResponse & {
    seq?: NumberLike;
    lat?: NumberLike;
    lng?: NumberLike;
  };

export type QuoteCreateRequestDto = QuoteCreateRequest;
export type QuoteCreateResponseDto = QuoteCreateResponse;
export type QuoteListItemDto = QuoteListResponse;
export type QuoteDetailResponseDto = QuoteDetailResponse;
export type QuoteUpdateRequestDto = QuoteUpdateRequest;
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
