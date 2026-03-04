import {
  createCounterOffer as createDriverCounterOfferGenerated,
  getMyCounterOffers as getMyDriverCounterOffersGenerated,
} from "@/shared/api/generated/driver-counter-offer-controller/driver-counter-offer-controller";
import {
  acceptCounterOffer as acceptShipperCounterOfferGenerated,
  getCounterOffers as getShipperCounterOffersGenerated,
  rejectCounterOffer as rejectShipperCounterOfferGenerated,
} from "@/shared/api/generated/shipper-counter-offer-controller/shipper-counter-offer-controller";
import type { CounterOfferAcceptResponse } from "@/shared/api/generated/schemas/counterOfferAcceptResponse";
import { isMockMode } from "@/shared/lib/config/env";
import {
  acceptMockFlowShipperCounterOffer,
  createMockFlowDriverCounterOffer,
  listMockFlowDriverCounterOffersByQuote,
  listMockFlowMyDriverCounterOffers,
  listMockFlowShipperCounterOffers,
  rejectMockFlowShipperCounterOffer,
  waitRandom,
} from "@/shared/lib/mock-flow";

type AnyObject = Record<string, unknown>;

export type CounterOfferActorRole = "DRIVER" | "SHIPPER" | "UNKNOWN";

export type CounterOfferItem = {
  counterOfferId: number;
  quoteId: number;
  driverId: number;
  proposedPrice: number;
  message: string;
  status: string;
  createdAt?: string;
  respondedAt?: string;
  actorRole: CounterOfferActorRole;
};

export type DriverCounterOfferCreateInput = {
  proposedPrice?: number;
  message?: string;
};

export type CounterOfferAcceptResult = CounterOfferAcceptResponse & {
  counterOfferStatus?: string;
  quoteStatus?: string;
  matchStatus?: string;
};

function asObject(value: unknown): AnyObject {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as AnyObject;
  }
  return {};
}

function toPositiveInt(value: unknown): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function toNonNegativeInt(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.trunc(parsed));
}

function toOptionalText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  return text ? text : undefined;
}

function toOptionalBoolean(value: unknown): boolean | undefined {
  if (typeof value !== "boolean") return undefined;
  return value;
}

function toStatusToken(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
}

function normalizeCounterOfferStatusValue(value: unknown): string {
  const token = toStatusToken(value);
  if (!token) return "UNKNOWN";
  if (token === "CANCELLED") return "CANCELED";
  if (token === "WAITING") return "PENDING";
  if (token === "APPROVED") return "ACCEPTED";
  if (token === "DECLINED") return "REJECTED";
  return token;
}

function unwrapPayload(value: unknown): unknown {
  const root = asObject(value);
  if (typeof root.data !== "undefined") return root.data;
  if (typeof root.result !== "undefined") return root.result;
  return value;
}

function unwrapListPayload(value: unknown): unknown[] {
  const payload = unwrapPayload(value);
  if (Array.isArray(payload)) return payload;

  const source = asObject(payload);
  if (Array.isArray(source.items)) return source.items;
  if (Array.isArray(source.list)) return source.list;
  if (Array.isArray(source.content)) return source.content;

  return [];
}

function toCounterOfferItem(value: unknown): CounterOfferItem | null {
  const source = asObject(value);
  const counterOfferId = toPositiveInt(source.counterOfferId);
  if (counterOfferId <= 0) return null;

  const quoteId = toPositiveInt(source.quoteId);
  const driverId = toPositiveInt(source.driverId);

  return {
    counterOfferId,
    quoteId,
    driverId,
    proposedPrice: toNonNegativeInt(source.proposedPrice),
    message: toOptionalText(source.message) ?? "",
    status: normalizeCounterOfferStatusValue(source.status),
    createdAt: toOptionalText(source.createdAt),
    respondedAt: toOptionalText(source.respondedAt),
    actorRole: driverId > 0 ? "DRIVER" : "UNKNOWN",
  };
}

function toCounterOfferList(value: unknown): CounterOfferItem[] {
  return unwrapListPayload(value)
    .map((item) => toCounterOfferItem(item))
    .filter((item): item is CounterOfferItem => item !== null)
    .sort((a, b) => {
      const aTs = Date.parse(a.createdAt ?? "");
      const bTs = Date.parse(b.createdAt ?? "");
      if (Number.isFinite(aTs) && Number.isFinite(bTs)) return bTs - aTs;
      if (Number.isFinite(bTs)) return 1;
      if (Number.isFinite(aTs)) return -1;
      return b.counterOfferId - a.counterOfferId;
    });
}

function toSingleCounterOffer(value: unknown): CounterOfferItem | null {
  const payload = unwrapPayload(value);
  if (Array.isArray(payload)) {
    if (payload.length <= 0) return null;
    return toCounterOfferItem(payload[0]);
  }

  return toCounterOfferItem(payload);
}

function toCounterOfferAcceptResult(value: unknown): CounterOfferAcceptResult | null {
  const source = asObject(unwrapPayload(value));
  const counterOfferId = toPositiveInt(source.counterOfferId);
  const quoteId = toPositiveInt(source.quoteId);
  const matchId = toPositiveInt(source.matchId);
  const driverId = toPositiveInt(source.driverId);
  const counterOfferStatus = normalizeCounterOfferStatusValue(source.counterOfferStatus);
  const quoteStatus = toStatusToken(source.quoteStatus);
  const matchStatus = toStatusToken(source.matchStatus);
  const nextAction = toOptionalText(source.nextAction);
  const paymentRequired = toOptionalBoolean(source.paymentRequired);

  if (
    counterOfferId <= 0 &&
    quoteId <= 0 &&
    matchId <= 0 &&
    counterOfferStatus === "UNKNOWN" &&
    !quoteStatus &&
    !matchStatus &&
    typeof paymentRequired === "undefined" &&
    !nextAction
  ) {
    return null;
  }

  return {
    ...(counterOfferId > 0 ? { counterOfferId } : {}),
    ...(quoteId > 0 ? { quoteId } : {}),
    ...(matchId > 0 ? { matchId } : {}),
    ...(driverId > 0 ? { driverId } : {}),
    ...(counterOfferStatus !== "UNKNOWN" ? { counterOfferStatus } : {}),
    ...(quoteStatus ? { quoteStatus } : {}),
    ...(matchStatus ? { matchStatus } : {}),
    ...(typeof paymentRequired !== "undefined" ? { paymentRequired } : {}),
    ...(nextAction ? { nextAction } : {}),
  };
}

export async function listShipperCounterOffers(quoteId: number): Promise<CounterOfferItem[]> {
  const safeQuoteId = toPositiveInt(quoteId);
  if (safeQuoteId <= 0) return [];

  if (isMockMode()) {
    await waitRandom();
    return toCounterOfferList(listMockFlowShipperCounterOffers(safeQuoteId));
  }

  const data = await getShipperCounterOffersGenerated(safeQuoteId);
  return toCounterOfferList(data);
}

export async function acceptShipperCounterOffer(offerId: number): Promise<CounterOfferAcceptResult | null> {
  const safeOfferId = toPositiveInt(offerId);
  if (safeOfferId <= 0) return null;

  if (isMockMode()) {
    await waitRandom();
    const accepted = acceptMockFlowShipperCounterOffer(safeOfferId);
    return {
      ...(toPositiveInt(accepted?.counterOfferId) > 0 ? { counterOfferId: toPositiveInt(accepted?.counterOfferId) } : {}),
      ...(toPositiveInt(accepted?.quoteId) > 0 ? { quoteId: toPositiveInt(accepted?.quoteId) } : {}),
      ...(toPositiveInt(accepted?.driverId) > 0 ? { driverId: toPositiveInt(accepted?.driverId) } : {}),
      counterOfferStatus: "ACCEPTED",
      quoteStatus: "ASSIGNED",
      matchStatus: "ASSIGNED",
      paymentRequired: true,
      nextAction: "PAY",
    };
  }

  const data = await acceptShipperCounterOfferGenerated(safeOfferId);
  return toCounterOfferAcceptResult(data);
}

export async function rejectShipperCounterOffer(offerId: number): Promise<void> {
  const safeOfferId = toPositiveInt(offerId);
  if (safeOfferId <= 0) return;

  if (isMockMode()) {
    await waitRandom();
    rejectMockFlowShipperCounterOffer(safeOfferId);
    return;
  }

  await rejectShipperCounterOfferGenerated(safeOfferId);
}

export async function createDriverCounterOffer(
  quoteId: number,
  input: DriverCounterOfferCreateInput
): Promise<CounterOfferItem | null> {
  const safeQuoteId = toPositiveInt(quoteId);
  if (safeQuoteId <= 0) return null;

  const proposedPrice = toNonNegativeInt(input?.proposedPrice);
  const message = toOptionalText(input?.message);
  if (proposedPrice <= 0 && !message) return null;

  const payload = {
    ...(proposedPrice > 0 ? { proposedPrice } : {}),
    ...(message ? { message } : {}),
  };

  if (isMockMode()) {
    await waitRandom();
    return toSingleCounterOffer(createMockFlowDriverCounterOffer(safeQuoteId, payload));
  }

  const data = await createDriverCounterOfferGenerated(safeQuoteId, payload);
  return toSingleCounterOffer(data);
}

export async function listMyDriverCounterOffers(): Promise<CounterOfferItem[]> {
  if (isMockMode()) {
    await waitRandom();
    return toCounterOfferList(listMockFlowMyDriverCounterOffers());
  }

  const data = await getMyDriverCounterOffersGenerated();
  return toCounterOfferList(data);
}

export async function listDriverCounterOffersByQuote(quoteId: number): Promise<CounterOfferItem[]> {
  const safeQuoteId = toPositiveInt(quoteId);
  if (safeQuoteId <= 0) return [];

  if (isMockMode()) {
    await waitRandom();
    return toCounterOfferList(listMockFlowDriverCounterOffersByQuote(safeQuoteId));
  }

  const list = await listMyDriverCounterOffers();
  return list.filter((item) => item.quoteId === safeQuoteId);
}

export async function listMyDriverCounterOffersByQuotes(quoteIds: number[]): Promise<Record<number, CounterOfferItem[]>> {
  const grouped: Record<number, CounterOfferItem[]> = {};
  const safeQuoteIds = Array.from(
    new Set((Array.isArray(quoteIds) ? quoteIds : []).map((quoteId) => toPositiveInt(quoteId)).filter((quoteId) => quoteId > 0))
  );

  safeQuoteIds.forEach((quoteId) => {
    grouped[quoteId] = [];
  });

  if (safeQuoteIds.length <= 0) return grouped;

  const list = await listMyDriverCounterOffers();
  list.forEach((item) => {
    if (!safeQuoteIds.includes(item.quoteId)) return;
    grouped[item.quoteId].push(item);
  });

  return grouped;
}

export function isCounterOfferPending(status: string): boolean {
  const token = normalizeCounterOfferStatusValue(status);
  if (!token || token === "UNKNOWN") return false;
  if (token === "PENDING" || token === "OPEN" || token === "REQUESTED" || token === "NEGOTIATING") return true;
  if (token.includes("ACCEPT")) return false;
  if (token.includes("APPROV")) return false;
  if (token.includes("REJECT")) return false;
  if (token.includes("DECLIN")) return false;
  if (token.includes("CANCEL")) return false;
  if (token.includes("EXPIRE")) return false;
  if (token.includes("FAIL")) return false;
  if (token === "MATCHED") return false;
  return false;
}

export function normalizeCounterOfferStatus(status: string): string {
  return normalizeCounterOfferStatusValue(status);
}
