export const BACKEND_STATUS = {
  // Quote 상태
  OPEN: "OPEN",
  MATCHED: "MATCHED",
  IN_TRANSIT: "IN_TRANSIT",
  DELIVERED: "DELIVERED",
  
  // Match 상태 (또는 겹치는 부분)
  READY: "READY",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  
  UNKNOWN: "UNKNOWN",
} as const;

export type BackendStatus = (typeof BACKEND_STATUS)[keyof typeof BACKEND_STATUS];

export const CUSTOMER_UI_STATE = {
  REQUESTED: "REQUESTED",
  NEGOTIATION_REQUIRED: "NEGOTIATION_REQUIRED",
  PAYMENT_REQUIRED: "PAYMENT_REQUIRED",
  PICKUP_IN_PROGRESS: "PICKUP_IN_PROGRESS",
  TRANSIT_IN_PROGRESS: "TRANSIT_IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELED: "CANCELED",
  UNKNOWN: "UNKNOWN",
} as const;

export type CustomerUiState = (typeof CUSTOMER_UI_STATE)[keyof typeof CUSTOMER_UI_STATE];

export const DRIVER_UI_STATE = {
  READY_TO_ACCEPT: "READY_TO_ACCEPT",
  NEGOTIATING: "NEGOTIATING",
  ASSIGNED: "ASSIGNED",
  PICKUP_IN_PROGRESS: "PICKUP_IN_PROGRESS",
  TRANSIT_IN_PROGRESS: "TRANSIT_IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELED: "CANCELED",
  UNKNOWN: "UNKNOWN",
} as const;

export type DriverUiState = (typeof DRIVER_UI_STATE)[keyof typeof DRIVER_UI_STATE];

export const CTA_VARIANT = {
  PRIMARY: "primary",
  SECONDARY: "secondary",
  DESTRUCTIVE: "destructive",
  DISABLED: "disabled",
} as const;

export type CtaVariant = (typeof CTA_VARIANT)[keyof typeof CTA_VARIANT];

export const CUSTOMER_CTA_ID = {
  VIEW_DETAIL: "VIEW_DETAIL",
  REVIEW_OFFER: "REVIEW_OFFER",
  PAY: "PAY",
  TRACK_PICKUP: "TRACK_PICKUP",
  TRACK_TRANSIT: "TRACK_TRANSIT",
  VIEW_RECEIPT: "VIEW_RECEIPT",
  RE_REQUEST: "RE_REQUEST",
} as const;

export type CustomerCtaId = (typeof CUSTOMER_CTA_ID)[keyof typeof CUSTOMER_CTA_ID];

export type CustomerCtaConfig = {
  id: CustomerCtaId;
  label: string;
  variant: CtaVariant;
  enabled: boolean;
};

export const DRIVER_CTA_ID = {
  ACCEPT_MATCH: "ACCEPT_MATCH",
  SEND_OFFER: "SEND_OFFER",
  START_DRIVE: "START_DRIVE",
  PAYMENT_PENDING: "PAYMENT_PENDING",
  PHOTO_GATE_PENDING: "PHOTO_GATE_PENDING",
  MARK_DROPOFF: "MARK_DROPOFF",
  VIEW_RESULT: "VIEW_RESULT",
} as const;

export type DriverCtaId = (typeof DRIVER_CTA_ID)[keyof typeof DRIVER_CTA_ID];

export type DriverCtaConfig = {
  id: DriverCtaId;
  label: string;
  variant: CtaVariant;
  enabled: boolean;
};

export const BADGE_TONE = {
  ATTENTION: "ATTENTION",
  PROGRESS: "PROGRESS",
  CLOSED: "CLOSED",
  NEUTRAL: "NEUTRAL",
} as const;

export type BadgeTone = (typeof BADGE_TONE)[keyof typeof BADGE_TONE];

export type StateBadgePolicy = {
  label: string;
  tone: BadgeTone;
};

export type ProgressStep = {
  key: string;
  label: string;
};

export const INVOICE_UI_STATE = {
  UNAVAILABLE: "UNAVAILABLE",
  PENDING: "PENDING",
  ISSUED: "ISSUED",
} as const;

export type InvoiceUiState = (typeof INVOICE_UI_STATE)[keyof typeof INVOICE_UI_STATE];

export const API_ERROR_CODE = {
  NETWORK: "NETWORK",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  VALIDATION: "VALIDATION",
  SERVER: "SERVER",
  UNKNOWN: "UNKNOWN",
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODE)[keyof typeof API_ERROR_CODE];
