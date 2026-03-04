import type { QuoteStatusApi } from "@/entities/quote/model/quote.types";
import type { PaymentResponseStatus } from "@/shared/api/generated/schemas/paymentResponseStatus";

type EffectiveStatusInput = {
  quoteStatus?: unknown;
  matchStatus?: unknown;
  matchAccepted?: unknown;
  paymentStatus?: unknown;
};

const CANONICAL_QUOTE_STATUS: Readonly<Record<string, QuoteStatusApi>> = {
  OPEN: "OPEN",
  REQUESTED: "OPEN",
  NEGOTIATING: "NEGOTIATING",
  READY: "ASSIGNED",
  MATCHED: "ASSIGNED",
  ASSIGNED: "ASSIGNED",
  ASSIGNED_CONFIRMED: "ASSIGNED",
  ACCEPTED: "ACCEPTED",
  PREPARING: "PREPARING",
  PICKUP: "PICKUP",
  DRIVING: "DRIVING",
  TRANSIT: "TRANSIT",
  IN_TRANSIT: "TRANSIT",
  DROPOFF: "DROPOFF",
  DELIVERED: "DROPOFF",
  COMPLETED: "DROPOFF",
  DONE: "DROPOFF",
  FINISHED: "DROPOFF",
  CANCELED: "CANCELED",
  CANCELLED: "CANCELED",
  CANCEL: "CANCELED",
};

const PAYMENT_COMPLETED = "COMPLETED";

function toStatusToken(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
}

function toPaymentStatus(value: unknown): PaymentResponseStatus | null {
  const token = toStatusToken(value);
  if (token === "PENDING") return "PENDING";
  if (token === "COMPLETED") return "COMPLETED";
  if (token === "FAILED") return "FAILED";
  if (token === "REFUNDED") return "REFUNDED";
  return null;
}

function toPromotedMatchStatus(value: unknown, matchAccepted?: unknown): QuoteStatusApi | null {
  const token = toStatusToken(value);
  if (!token) return null;

  if (token === "READY" && matchAccepted !== true) {
    return null;
  }

  const mapped = CANONICAL_QUOTE_STATUS[token];
  return mapped ?? null;
}

export function normalizeQuoteStatusApi(rawStatus: unknown): QuoteStatusApi {
  const token = toStatusToken(rawStatus);
  if (!token) return "UNKNOWN";
  return CANONICAL_QUOTE_STATUS[token] ?? (token as QuoteStatusApi);
}

export function resolveEffectiveQuoteStatus(input: EffectiveStatusInput): QuoteStatusApi {
  const baseStatus = normalizeQuoteStatusApi(input.quoteStatus);
  const promotedByMatch = toPromotedMatchStatus(input.matchStatus, input.matchAccepted);

  let resolved: QuoteStatusApi = baseStatus;

  if (promotedByMatch) {
    if (promotedByMatch === "CANCELED" || promotedByMatch === "DROPOFF") {
      resolved = promotedByMatch;
    } else if (promotedByMatch === "PICKUP" || promotedByMatch === "TRANSIT" || promotedByMatch === "DRIVING") {
      resolved = promotedByMatch;
    } else if (promotedByMatch === "PREPARING") {
      if (resolved !== "PICKUP" && resolved !== "TRANSIT" && resolved !== "DROPOFF") {
        resolved = promotedByMatch;
      }
    } else if (promotedByMatch === "ASSIGNED") {
      if (resolved === "UNKNOWN" || resolved === "OPEN" || resolved === "NEGOTIATING" || resolved === "ACCEPTED" || resolved === "ASSIGNED") {
        resolved = promotedByMatch;
      }
    } else if (resolved === "UNKNOWN") {
      resolved = promotedByMatch;
    }
  }

  const paymentStatus = toPaymentStatus(input.paymentStatus);
  if (
    paymentStatus === PAYMENT_COMPLETED &&
    (resolved === "OPEN" || resolved === "NEGOTIATING" || resolved === "ASSIGNED" || resolved === "ACCEPTED")
  ) {
    return "PREPARING";
  }

  return resolved;
}

export function isPostPaymentQuoteStatus(status: unknown): boolean {
  const normalized = normalizeQuoteStatusApi(status);
  return normalized === "PREPARING" || normalized === "PICKUP" || normalized === "TRANSIT" || normalized === "DRIVING" || normalized === "DROPOFF";
}

export function resolveDeliveryTimelineIndex(status: unknown): number {
  const normalized = normalizeQuoteStatusApi(status);
  if (normalized === "PICKUP") return 1;
  if (normalized === "TRANSIT" || normalized === "DRIVING") return 2;
  if (normalized === "DROPOFF") return 3;
  return 0;
}
