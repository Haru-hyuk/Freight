import { apiClient } from "@/shared/lib/api/apiClient";
import { isMockQuoteEnabled } from "@/shared/lib/config/env";
import {
  createCounterOffer as createDriverCounterOfferGenerated,
  getMyCounterOffers as getMyDriverCounterOffersGenerated,
} from "@/shared/api/generated/driver-counter-offer-controller/driver-counter-offer-controller";
import {
  acceptCounterOffer as acceptShipperCounterOfferGenerated,
  getCounterOffers as getShipperCounterOffersGenerated,
  rejectCounterOffer as rejectShipperCounterOfferGenerated,
} from "@/shared/api/generated/shipper-counter-offer-controller/shipper-counter-offer-controller";

type AnyObj = Record<string, unknown>;

export type CounterOfferActorRole = "DRIVER" | "SHIPPER" | "UNKNOWN";

export type CounterOfferItem = {
  counterOfferId: number;
  quoteId: number;
  driverId: number;
  proposedPrice: number;
  message: string;
  status: string;
  createdAt: string;
  respondedAt?: string;
  actorRole: CounterOfferActorRole;
};

export type DriverCounterOfferCreateInput = {
  proposedPrice: number;
  message: string;
};

const SHIPPER_COUNTER_OFFERS_PATH = "/api/shipper/counter-offers";

function isPlainObject(input: unknown): input is AnyObj {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function asObject(input: unknown): AnyObj {
  return isPlainObject(input) ? input : {};
}

function safeNumber(input: unknown, fallback = 0): number {
  const value = typeof input === "number" ? input : Number(input);
  return Number.isFinite(value) ? value : fallback;
}

function safeInt(input: unknown, fallback = 0): number {
  return Math.trunc(safeNumber(input, fallback));
}

function safeString(input: unknown, fallback = ""): string {
  if (typeof input === "string") return input.trim();
  if (typeof input === "number" || typeof input === "boolean") return String(input);
  return fallback;
}

function safeIsoDate(input: unknown, fallback: string): string {
  const raw = safeString(input, "");
  if (!raw) return fallback;
  const ts = Date.parse(raw);
  return Number.isFinite(ts) ? new Date(ts).toISOString() : fallback;
}

function normalizeQuoteId(quoteId: number): number {
  if (!Number.isFinite(quoteId)) return 0;
  return Math.max(0, Math.trunc(quoteId));
}

function normalizeOfferId(offerId: number): number {
  if (!Number.isFinite(offerId)) return 0;
  return Math.max(0, Math.trunc(offerId));
}

function normalizeProposedPrice(proposedPrice: number): number {
  if (!Number.isFinite(proposedPrice)) return 0;
  return Math.max(0, Math.trunc(proposedPrice));
}

function pickPayload(input: unknown): unknown {
  const root = asObject(input);
  if (typeof root.data !== "undefined" && root.data !== null) return root.data;
  if (typeof root.result !== "undefined" && root.result !== null) return root.result;
  return input;
}

function pickListPayload(input: unknown): unknown[] {
  const payload = pickPayload(input);
  if (Array.isArray(payload)) return payload;

  const obj = asObject(payload);
  const candidates = [obj.items, obj.list, obj.content, obj.data, obj.result];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
}

function resolveActorRole(source: AnyObj): CounterOfferActorRole {
  const rawRole = safeString(source.actorRole, safeString(source.createdByRole, safeString(source.offererRole, ""))).toUpperCase();
  if (rawRole === "DRIVER") return "DRIVER";
  if (rawRole === "SHIPPER") return "SHIPPER";
  const driverId = Math.max(0, safeInt(source.driverId, 0));
  if (driverId > 0) return "DRIVER";
  return "UNKNOWN";
}

function toCounterOfferItem(input: unknown): CounterOfferItem {
  const nowIso = new Date().toISOString();
  const source = asObject(input);

  const statusRaw = safeString(source.status, "UNKNOWN").toUpperCase();
  const normalizedStatus = statusRaw || "UNKNOWN";

  return {
    counterOfferId: Math.max(0, safeInt(source.counterOfferId, safeInt(source.offerId, 0))),
    quoteId: Math.max(0, safeInt(source.quoteId, 0)),
    driverId: Math.max(0, safeInt(source.driverId, 0)),
    proposedPrice: Math.max(0, safeInt(source.proposedPrice, safeInt(source.price, 0))),
    message: safeString(source.message, safeString(source.reason, "")),
    status: normalizedStatus,
    createdAt: safeIsoDate(source.createdAt, nowIso),
    respondedAt: safeString(source.respondedAt, "") || undefined,
    actorRole: resolveActorRole(source),
  };
}

function toCounterOfferList(input: unknown): CounterOfferItem[] {
  const list = pickListPayload(input);
  const mapped = list.map((item) => toCounterOfferItem(item));
  return mapped.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function toSingleCounterOffer(input: unknown): CounterOfferItem | null {
  const payload = pickPayload(input);
  if (Array.isArray(payload)) {
    if (payload.length <= 0) return null;
    return toCounterOfferItem(payload[0]);
  }

  const source = asObject(payload);
  const offerId = Math.max(0, safeInt(source.counterOfferId, safeInt(source.offerId, 0)));
  if (offerId <= 0) return null;

  return toCounterOfferItem(source);
}

function createMockCounterOffer(quoteId: number): CounterOfferItem {
  const safeQuoteId = normalizeQuoteId(quoteId);
  const nowIso = new Date().toISOString();
  return {
    counterOfferId: safeQuoteId + 1_000,
    quoteId: safeQuoteId,
    driverId: 1,
    proposedPrice: 120000,
    message: "목업 역제안",
    status: "PENDING",
    createdAt: nowIso,
    respondedAt: undefined,
    actorRole: "DRIVER",
  };
}

export async function listShipperCounterOffers(quoteId: number): Promise<CounterOfferItem[]> {
  const safeQuoteId = normalizeQuoteId(quoteId);
  if (safeQuoteId <= 0) return [];

  if (isMockQuoteEnabled()) {
    return [createMockCounterOffer(safeQuoteId)];
  }

  const data = await getShipperCounterOffersGenerated(String(safeQuoteId));
  return toCounterOfferList(data);
}

export async function acceptShipperCounterOffer(offerId: number): Promise<void> {
  const safeOfferId = normalizeOfferId(offerId);
  if (safeOfferId <= 0) return;

  if (isMockQuoteEnabled()) return;

  try {
    await acceptShipperCounterOfferGenerated(String(safeOfferId));
  } catch {
    await apiClient.patch(`${SHIPPER_COUNTER_OFFERS_PATH}/${safeOfferId}/accept`);
  }
}

export async function rejectShipperCounterOffer(offerId: number): Promise<void> {
  const safeOfferId = normalizeOfferId(offerId);
  if (safeOfferId <= 0) return;

  if (isMockQuoteEnabled()) return;

  try {
    await rejectShipperCounterOfferGenerated(String(safeOfferId));
  } catch {
    await apiClient.patch(`${SHIPPER_COUNTER_OFFERS_PATH}/${safeOfferId}/reject`);
  }
}

export async function createDriverCounterOffer(
  quoteId: number,
  input: DriverCounterOfferCreateInput
): Promise<CounterOfferItem | null> {
  const safeQuoteId = normalizeQuoteId(quoteId);
  const safeProposedPrice = normalizeProposedPrice(input?.proposedPrice ?? 0);
  const message = safeString(input?.message, "");

  if (safeQuoteId <= 0 || safeProposedPrice <= 0) return null;

  if (isMockQuoteEnabled()) {
    const mock = createMockCounterOffer(safeQuoteId);
    return {
      ...mock,
      proposedPrice: safeProposedPrice,
      message,
    };
  }

  const payload = {
    proposedPrice: safeProposedPrice,
    message,
  };

  try {
    const data = await createDriverCounterOfferGenerated(String(safeQuoteId), payload);
    return toSingleCounterOffer(data);
  } catch {
    const res = await apiClient.post(`/api/driver/quotes/${safeQuoteId}/counter-offers`, payload);
    return toSingleCounterOffer((res as { data?: unknown })?.data);
  }
}

export async function listMyDriverCounterOffers(): Promise<CounterOfferItem[]> {
  if (isMockQuoteEnabled()) {
    return [createMockCounterOffer(101)];
  }

  const data = await getMyDriverCounterOffersGenerated();
  return toCounterOfferList(data);
}

export async function listDriverCounterOffersByQuote(quoteId: number): Promise<CounterOfferItem[]> {
  const safeQuoteId = normalizeQuoteId(quoteId);
  if (safeQuoteId <= 0) return [];

  const list = await listMyDriverCounterOffers();
  return list.filter((item) => item.quoteId === safeQuoteId);
}

export async function listMyDriverCounterOffersByQuotes(quoteIds: number[]): Promise<Record<number, CounterOfferItem[]>> {
  const normalizedIds = Array.from(
    new Set(
      (Array.isArray(quoteIds) ? quoteIds : [])
        .map((id) => normalizeQuoteId(id))
        .filter((id) => id > 0)
    )
  );

  const grouped: Record<number, CounterOfferItem[]> = {};
  normalizedIds.forEach((id) => {
    grouped[id] = [];
  });

  if (normalizedIds.length <= 0) return grouped;

  const all = await listMyDriverCounterOffers();
  all.forEach((item) => {
    const safeQuoteId = normalizeQuoteId(item.quoteId);
    if (safeQuoteId <= 0) return;
    if (!grouped[safeQuoteId]) grouped[safeQuoteId] = [];
    grouped[safeQuoteId].push(item);
  });

  Object.keys(grouped).forEach((key) => {
    const quoteId = Number(key);
    const list = Array.isArray(grouped[quoteId]) ? grouped[quoteId] : [];
    grouped[quoteId] = list.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  });

  return grouped;
}

export function isCounterOfferPending(status: string): boolean {
  const normalized = safeString(status, "").toUpperCase();
  if (!normalized) return false;
  if (normalized.includes("ACCEPT")) return false;
  if (normalized.includes("REJECT")) return false;
  if (normalized.includes("CANCEL")) return false;
  return true;
}

export function normalizeCounterOfferStatus(status: string): string {
  const normalized = safeString(status, "").toUpperCase();
  if (!normalized) return "UNKNOWN";
  if (normalized === "CANCELLED") return "CANCELED";
  return normalized;
}
