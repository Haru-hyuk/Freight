import type { QuoteDetailResponse } from "@/entities/quote/model/quote.types";
import {
  isCounterOfferPending,
  listMyDriverCounterOffers,
  type CounterOfferItem,
} from "@/features/counter-offer/api";
import { getQuoteSummary } from "@/shared/api/generated";
import { getDriverMatchMode } from "@/shared/lib/config/env";
import {
  BACKEND_STATUS,
  DRIVER_UI_STATE,
  getDriverBadge,
  getDriverCta,
  normalizeStatus,
  type BadgeTone,
  type DriverCtaConfig,
  type DriverUiState,
} from "@/shared/lib/policy";
import {
  getMockFlowShipperQuoteDetail,
  selectMockFlowAiRecommendedDecoration,
  waitRandom,
  type MockFlowDriverOrderTagKey,
} from "@/shared/lib/mock-flow";
import {
  buildDriverOrderTags,
  formatDriverOrderPrice,
  mapDriverOrderCard,
  sortDriverOrderCards,
} from "./driver-orders-mapper";
import {
  collectDriverOrderQuoteIds,
  parseDriverOrderPositiveInt,
  parseDriverOrderSource,
} from "./driver-orders-parser";

import {
  getDriverMatch,
  listMyDriverMatches,
  listOpenDriverMatches,
} from "./shipper-match-api";

export type DriverOrderTagKey = "AI_RECOMMENDED" | "COMBINED" | "WAYPOINT" | "URGENT";

export type DriverOrderFilterKey = "ALL" | DriverOrderTagKey;
export type DriverOrdersTabKey = "market" | "my";

export type DriverOrderTag = {
  key: DriverOrderTagKey;
  label: string;
};

export type DriverOrderCard = {
  cardKey: string;
  matchId: number;
  quoteId?: number;
  status: string;
  uiState: DriverUiState;
  statusLabel: string;
  statusTone: BadgeTone;
  cta: DriverCtaConfig;
  requestedAtText?: string;
  pickupTimeText?: string;
  originAddress?: string;
  destinationAddress?: string;
  routeDistanceText?: string;
  vehicleText?: string;
  methodText?: string;
  cargoText?: string;
  emptyDistanceText?: string;
  priceText?: string;
  priceValue?: number;
  counterOfferProposedPrice?: number;
  counterOfferMessage?: string;
  counterOfferStatus?: string;
  sortTimestamp?: number;
  tags: DriverOrderTag[];
};

export type DriverOrdersCapability = {
  supportsRichFilters: boolean;
  supportsAiFab: boolean;
};

export type DriverOrdersOverview = {
  marketOrders: DriverOrderCard[];
  myOrders: DriverOrderCard[];
  runOrders: DriverOrderCard[];
  myCount: number;
  availableFilters: DriverOrderFilterKey[];
  capability: DriverOrdersCapability;
};

export type DriverOrderDetailAccess = "ok" | "forbidden" | "error";

const FILTER_LABELS: Record<DriverOrderFilterKey, string> = {
  ALL: "전체",
  AI_RECOMMENDED: "AI추천",
  COMBINED: "합짐",
  WAYPOINT: "경유",
  URGENT: "긴급",
};

type AnyObject = Record<string, unknown>;

const RUN_MATCH_STATUS_TOKENS: ReadonlySet<string> = new Set([
  "READY",
  "PICKUP",
  "TRANSIT",
  "DROPOFF",
  "IN_TRANSIT",
  "DELIVERED",
  "COMPLETED",
]);

function asObject(value: unknown): AnyObject {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as AnyObject;
  }
  return {};
}

function toStatusToken(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
}

function toOptionalText(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() || undefined : undefined;
}

function toOptionalNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toOptionalBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1 ? true : value === 0 ? false : undefined;
  if (typeof value !== "string") return undefined;

  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized === "true" || normalized === "yes" || normalized === "y" || normalized === "1") return true;
  if (normalized === "false" || normalized === "no" || normalized === "n" || normalized === "0") return false;
  return undefined;
}

function normalizeCounterOfferMessage(value: unknown): string | undefined {
  return toOptionalText(value);
}

function buildPendingCounterOfferByQuoteId(
  offers: readonly CounterOfferItem[]
): Map<number, CounterOfferItem> {
  const byQuoteId = new Map<number, CounterOfferItem>();
  offers.forEach((offer) => {
    const quoteId = parseDriverOrderPositiveInt(offer.quoteId);
    if (quoteId <= 0) return;
    if (!isCounterOfferPending(offer.status)) return;
    if (byQuoteId.has(quoteId)) return;
    byQuoteId.set(quoteId, offer);
  });
  return byQuoteId;
}

function applyPendingCounterOfferOverlay(
  card: DriverOrderCard,
  pendingOffer: CounterOfferItem | undefined
): DriverOrderCard {
  if (!pendingOffer) return card;

  const negotiatingBadge = getDriverBadge(DRIVER_UI_STATE.NEGOTIATING);
  const proposedPrice =
    Number.isFinite(pendingOffer.proposedPrice) && pendingOffer.proposedPrice > 0
      ? Math.trunc(pendingOffer.proposedPrice)
      : undefined;

  return {
    ...card,
    uiState: DRIVER_UI_STATE.NEGOTIATING,
    statusLabel: negotiatingBadge.label,
    statusTone: negotiatingBadge.tone,
    cta: getDriverCta(DRIVER_UI_STATE.NEGOTIATING, true),
    counterOfferProposedPrice: proposedPrice,
    counterOfferMessage: normalizeCounterOfferMessage(pendingOffer.message),
    counterOfferStatus: pendingOffer.status,
  };
}

function collectCandidateObjects(input: unknown): AnyObject[] {
  const queue: unknown[] = [input];
  const out: AnyObject[] = [];
  const seen = new Set<AnyObject>();

  while (queue.length > 0) {
    const current = queue.shift();
    const source = asObject(current);
    if (!source || Object.keys(source).length <= 0) continue;
    if (!seen.has(source)) {
      seen.add(source);
      out.push(source);
    }

    const nestedKeys = ["data", "result", "payload", "quote", "summary", "item"];
    nestedKeys.forEach((key) => {
      const nested = source[key];
      if (Array.isArray(nested)) {
        if (nested.length > 0) {
          queue.push(nested[0]);
        }
        return;
      }
      if (nested && typeof nested === "object") {
        queue.push(nested);
      }
    });
  }

  return out;
}

function hasAnySummaryField(source: AnyObject): boolean {
  const fieldKeys = [
    "quoteId",
    "quote_id",
    "originAddress",
    "destinationAddress",
    "distanceKm",
    "cargoName",
    "finalPrice",
    "basePrice",
    "desiredPrice",
    "loadMethod",
    "unloadMethod",
  ];
  return fieldKeys.some((key) => typeof source[key] !== "undefined");
}

function pickFirstText(candidates: AnyObject[], keys: string[]): string | undefined {
  for (const candidate of candidates) {
    for (const key of keys) {
      const value = toOptionalText(candidate[key]);
      if (value) return value;
    }
  }
  return undefined;
}

function pickFirstNumber(candidates: AnyObject[], keys: string[]): number | undefined {
  for (const candidate of candidates) {
    for (const key of keys) {
      const value = toOptionalNumber(candidate[key]);
      if (typeof value === "number") return value;
    }
  }
  return undefined;
}

function pickFirstBoolean(candidates: AnyObject[], keys: string[]): boolean | undefined {
  for (const candidate of candidates) {
    for (const key of keys) {
      const value = toOptionalBoolean(candidate[key]);
      if (typeof value === "boolean") return value;
    }
  }
  return undefined;
}

function normalizeSummaryPayload(input: unknown): AnyObject | null {
  const candidates = collectCandidateObjects(input);
  if (candidates.length <= 0) return null;

  const withSummaryField = candidates.find((candidate) => hasAnySummaryField(candidate));
  return withSummaryField ?? candidates[0] ?? null;
}

async function parseDriverQuoteSummaryPayload(payload: unknown): Promise<AnyObject | null> {
  if (!payload) return null;

  if (typeof payload === "object") {
    if (typeof Blob !== "undefined" && payload instanceof Blob) {
      try {
        const text = (await payload.text()).trim();
        if (!text) return null;
        const parsed = JSON.parse(text);
        return normalizeSummaryPayload(parsed);
      } catch {
        return null;
      }
    }

    return normalizeSummaryPayload(payload);
  }

  if (typeof payload === "string") {
    const text = payload.trim();
    if (!text) return null;

    try {
      const parsed = JSON.parse(text);
      return normalizeSummaryPayload(parsed);
    } catch {
      return null;
    }
  }

  return null;
}

function toQuoteDetailFromDriverSummary(
  summary: AnyObject,
  fallbackQuoteId: number
): QuoteDetailResponse | null {
  const candidates = collectCandidateObjects(summary);
  const resolvedQuoteId =
    parseDriverOrderPositiveInt(pickFirstNumber(candidates, ["quoteId", "quote_id", "id"])) || fallbackQuoteId;
  if (resolvedQuoteId <= 0) return null;

  const finalPrice = Math.max(
    0,
    pickFirstNumber(candidates, ["finalPrice", "final_price", "price", "amount"]) ?? 0
  );
  const desiredPrice = Math.max(
    0,
    pickFirstNumber(candidates, ["desiredPrice", "desired_price", "basePrice", "base_price"]) ?? 0
  );
  const basePrice = Math.max(
    0,
    pickFirstNumber(candidates, ["basePrice", "base_price", "desiredPrice", "desired_price", "finalPrice"]) ??
      desiredPrice ??
      finalPrice
  );
  const cargoName =
    pickFirstText(candidates, ["cargoName", "cargo_name", "itemName", "item_name", "cargo"]) ??
    pickFirstText(candidates, ["cargoDesc", "cargo_desc", "cargoDescription", "description"]) ??
    pickFirstText(candidates, ["cargoType", "cargo_type"]) ??
    "";
  const cargoDesc =
    pickFirstText(candidates, ["cargoDesc", "cargo_desc", "cargoDescription", "description"]) ?? cargoName;

  return {
    quoteId: resolvedQuoteId,
    quotePublicId: pickFirstText(candidates, ["quotePublicId", "quoteIdentifier", "quote_identifier"]),
    shipperId: 0,
    truckId: 0,
    originAddress: pickFirstText(candidates, ["originAddress", "origin_address", "startAddress"]) ?? "",
    originAddressDetail: undefined,
    destinationAddress:
      pickFirstText(candidates, ["destinationAddress", "destination_address", "endAddress", "dropoffAddress"]) ?? "",
    destinationAddressDetail: undefined,
    originLat: pickFirstNumber(candidates, ["originLat", "origin_lat", "startLat"]) ?? 0,
    originLng: pickFirstNumber(candidates, ["originLng", "origin_lng", "startLng"]) ?? 0,
    destinationLat: pickFirstNumber(candidates, ["destinationLat", "destination_lat", "endLat"]) ?? 0,
    destinationLng: pickFirstNumber(candidates, ["destinationLng", "destination_lng", "endLng"]) ?? 0,
    distanceKm: Math.max(0, pickFirstNumber(candidates, ["distanceKm", "distance_km", "distance"]) ?? 0),
    weightKg: Math.max(0, pickFirstNumber(candidates, ["weightKg", "weight_kg", "weight"]) ?? 0),
    volumeCbm: Math.max(0, pickFirstNumber(candidates, ["volumeCbm", "volume_cbm", "volume"]) ?? 0),
    vehicleType: pickFirstText(candidates, ["vehicleType", "vehicle_type", "tonType", "ton_type"]) ?? "",
    vehicleBodyType:
      pickFirstText(candidates, ["vehicleBodyType", "vehicle_body_type", "bodyType", "body_type"]) ?? "",
    cargoName,
    cargoType: pickFirstText(candidates, ["cargoType", "cargo_type"]) ?? "",
    cargoDesc,
    basePrice,
    distancePrice: Math.max(0, pickFirstNumber(candidates, ["distancePrice", "distance_price"]) ?? 0),
    extraPrice: Math.max(0, pickFirstNumber(candidates, ["extraPrice", "extra_price"]) ?? 0),
    desiredPrice,
    finalPrice,
    allowCombine: pickFirstBoolean(candidates, ["allowCombine", "allow_combine"]) ?? false,
    loadMethod: pickFirstText(candidates, ["loadMethod", "load_method"]) ?? "",
    unloadMethod: pickFirstText(candidates, ["unloadMethod", "unload_method"]) ?? "",
    status: pickFirstText(candidates, ["status"]) as unknown as QuoteDetailResponse["status"],
    createdAt: "",
    updatedAt: "",
    senderName: undefined,
    senderPhone: undefined,
    receiverName: undefined,
    receiverPhone: undefined,
    checklistItems: [],
    stops: [],
  };
}

export async function getDriverQuoteSummaryDetail(quoteId: number): Promise<QuoteDetailResponse | null> {
  const safeQuoteId = parseDriverOrderPositiveInt(quoteId);
  if (safeQuoteId <= 0) return null;

  if (getDriverMatchMode() === "mock") {
    const mockQuoteDetail = getMockFlowShipperQuoteDetail(safeQuoteId);
    if (!mockQuoteDetail) return null;
    return mockQuoteDetail as unknown as QuoteDetailResponse;
  }

  try {
    const raw = (await getQuoteSummary(safeQuoteId)) as unknown;
    const summary = await parseDriverQuoteSummaryPayload(raw);
    if (!summary) return null;
    return toQuoteDetailFromDriverSummary(summary, safeQuoteId);
  } catch {
    return null;
  }
}

async function loadQuoteDetailsByIds(quoteIds: number[]): Promise<Map<number, QuoteDetailResponse>> {
  const map = new Map<number, QuoteDetailResponse>();
  const safeQuoteIds = Array.from(
    new Set(quoteIds.map((quoteId) => parseDriverOrderPositiveInt(quoteId)).filter((quoteId) => quoteId > 0))
  );
  if (safeQuoteIds.length <= 0) return map;

  const entries = await Promise.all(
    safeQuoteIds.map(async (quoteId) => {
      try {
        const quote = await getDriverQuoteSummaryDetail(quoteId);
        if (!quote) return null;
        return [quoteId, quote] as const;
      } catch {
        return null;
      }
    })
  );

  entries.forEach((entry) => {
    if (!entry) return;
    map.set(entry[0], entry[1]);
  });

  return map;
}

function resolveAvailableFilters(capability: DriverOrdersCapability, marketOrders: DriverOrderCard[]): DriverOrderFilterKey[] {
  if (!capability.supportsRichFilters) return ["ALL"];

  const filters: DriverOrderFilterKey[] = ["ALL"];
  const tagChecks: Array<{ key: DriverOrderFilterKey; tagKey: DriverOrderTagKey }> = [
    { key: "AI_RECOMMENDED", tagKey: "AI_RECOMMENDED" },
    { key: "COMBINED", tagKey: "COMBINED" },
    { key: "WAYPOINT", tagKey: "WAYPOINT" },
    { key: "URGENT", tagKey: "URGENT" },
  ];

  tagChecks.forEach((entry) => {
    const exists = marketOrders.some((order) => order.tags.some((tag) => tag.key === entry.tagKey));
    if (exists) filters.push(entry.key);
  });

  return filters;
}

export function getDriverOrderFilterLabel(filter: DriverOrderFilterKey): string {
  return FILTER_LABELS[filter] ?? filter;
}

export function matchesDriverOrderFilter(card: DriverOrderCard, filter: DriverOrderFilterKey): boolean {
  if (filter === "ALL") return true;
  return card.tags.some((tag) => tag.key === filter);
}

export function buildDriverOrderDetailParams(card: DriverOrderCard): Record<string, string> {
  const safeMatchId = parseDriverOrderPositiveInt(card.matchId);
  const params: Record<string, string> = {
    id: String(safeMatchId),
    matchId: String(safeMatchId),
  };

  const safeQuoteId = parseDriverOrderPositiveInt(card.quoteId);
  if (safeQuoteId > 0) {
    params.quoteId = String(safeQuoteId);
  }

  if (card.status) {
    params.status = card.status;
  }

  return params;
}

export async function loadDriverOrdersOverview(): Promise<DriverOrdersOverview> {
  const mode = getDriverMatchMode();
  const capability: DriverOrdersCapability = {
    supportsRichFilters: mode === "mock",
    supportsAiFab: mode === "mock",
  };

  if (mode === "mock") {
    await waitRandom();
  }

  const [openMatches, myMatches, myCounterOffers] = await Promise.all([
    listOpenDriverMatches(),
    listMyDriverMatches(),
    listMyDriverCounterOffers(),
  ]);
  const pendingCounterOfferByQuoteId = buildPendingCounterOfferByQuoteId(myCounterOffers);

  const marketMatches = openMatches.filter((match) => {
    if (parseDriverOrderPositiveInt(match.driverId) > 0) return false;
    const quoteId = parseDriverOrderPositiveInt(match.quoteId);
    if (quoteId > 0 && pendingCounterOfferByQuoteId.has(quoteId)) return false;
    return true;
  });
  const runMatches = myMatches.filter((match) => {
    if (match.accepted === true) return true;
    // run 탭은 결제 이후 상태(PICKUP/TRANSIT/DROPOFF)를 반드시 포함한다.
    const statusToken = toStatusToken(match.status);
    if (RUN_MATCH_STATUS_TOKENS.has(statusToken)) return true;

    const normalized = normalizeStatus(match.status ?? "");
    return normalized === BACKEND_STATUS.READY || normalized === BACKEND_STATUS.IN_TRANSIT;
  });
  const myPendingMatches = myMatches.filter((match) => !runMatches.includes(match));
  const negotiatingMarketMatches = openMatches.filter((match) => {
    if (parseDriverOrderPositiveInt(match.driverId) > 0) return false;
    const quoteId = parseDriverOrderPositiveInt(match.quoteId);
    return quoteId > 0 && pendingCounterOfferByQuoteId.has(quoteId);
  });
  const myMatchesForBoard: typeof myMatches = [...myPendingMatches];
  const seenMyMatchIds = new Set(myMatchesForBoard.map((match) => parseDriverOrderPositiveInt(match.matchId)));
  negotiatingMarketMatches.forEach((match) => {
    const safeMatchId = parseDriverOrderPositiveInt(match.matchId);
    if (safeMatchId <= 0) return;
    if (seenMyMatchIds.has(safeMatchId)) return;
    seenMyMatchIds.add(safeMatchId);
    myMatchesForBoard.push(match);
  });

  const quoteIds = collectDriverOrderQuoteIds([...marketMatches, ...myMatches, ...negotiatingMarketMatches]);
  const quoteMap = await loadQuoteDetailsByIds(quoteIds);

  const marketOrders = marketMatches.map((match, index) => {
    const quoteId = parseDriverOrderPositiveInt(match.quoteId);
    const quote = quoteId > 0 ? quoteMap.get(quoteId) ?? null : null;
    const source = parseDriverOrderSource({
      match,
      quote,
      scope: "market",
      index,
    });
    return mapDriverOrderCard({
      source,
      mode,
      filterLabels: FILTER_LABELS,
    });
  });

  const runOrders = runMatches.map((match, index) => {
    const quoteId = parseDriverOrderPositiveInt(match.quoteId);
    const quote = quoteId > 0 ? quoteMap.get(quoteId) ?? null : null;
    const source = parseDriverOrderSource({
      match,
      quote,
      scope: "my",
      index,
    });
    return mapDriverOrderCard({
      source,
      mode,
      filterLabels: FILTER_LABELS,
    });
  });

  const myOrdersWithNegotiating = myMatchesForBoard.map((match, index) => {
    const quoteId = parseDriverOrderPositiveInt(match.quoteId);
    const quote = quoteId > 0 ? quoteMap.get(quoteId) ?? null : null;
    const source = parseDriverOrderSource({
      match,
      quote,
      scope: "my",
      index,
    });
    const baseCard = mapDriverOrderCard({
      source,
      mode,
      filterLabels: FILTER_LABELS,
    });
    return applyPendingCounterOfferOverlay(baseCard, pendingCounterOfferByQuoteId.get(quoteId));
  });

  const availableFilters = resolveAvailableFilters(capability, marketOrders);

  return {
    marketOrders: sortDriverOrderCards(marketOrders),
    myOrders: sortDriverOrderCards(myOrdersWithNegotiating),
    runOrders: sortDriverOrderCards(runOrders),
    myCount: myOrdersWithNegotiating.length,
    availableFilters,
    capability,
  };
}

export async function requestAiRecommendedOrder(sourceOrders: DriverOrderCard[]): Promise<DriverOrderCard | null> {
  if (getDriverMatchMode() !== "mock") {
    return null;
  }

  await waitRandom();

  const source = Array.isArray(sourceOrders) ? sourceOrders : [];
  const base = source.find((order) => !order.tags.some((tag) => tag.key === "AI_RECOMMENDED")) ?? source[0] ?? null;
  if (!base) return null;

  const aiDecoration = selectMockFlowAiRecommendedDecoration(base.matchId, base.priceValue ?? 150000);
  const nextTagKeys = new Set<MockFlowDriverOrderTagKey>(
    base.tags.map((tag) => tag.key as MockFlowDriverOrderTagKey)
  );
  nextTagKeys.add("AI_RECOMMENDED");
  if (aiDecoration.addUrgentTag) nextTagKeys.add("URGENT");

  return {
    ...base,
    cardKey: `ai-${base.matchId}-${Date.now()}`,
    pickupTimeText: aiDecoration.pickupTimeText,
    emptyDistanceText: base.emptyDistanceText || aiDecoration.emptyDistanceText,
    priceValue: aiDecoration.priceValue,
    priceText: formatDriverOrderPrice(aiDecoration.priceValue),
    tags: buildDriverOrderTags(Array.from(nextTagKeys), FILTER_LABELS),
  };
}

export async function probeDriverOrderDetailAccess(matchId: number): Promise<DriverOrderDetailAccess> {
  const safeMatchId = parseDriverOrderPositiveInt(matchId);
  if (safeMatchId <= 0) return "error";

  try {
    const result = await getDriverMatch(safeMatchId);
    return result ? "ok" : "error";
  } catch (error: unknown) {
    const status = Number((error as { response?: { status?: unknown } } | undefined)?.response?.status ?? 0);
    if (status === 403) return "forbidden";
    return "error";
  }
}
