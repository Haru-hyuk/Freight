import type { QuoteDetailResponse } from "@/entities/quote/model/quote.types";
import {
  isCounterOfferPending,
  listMyDriverCounterOffers,
  type CounterOfferItem,
} from "@/features/counter-offer/api";
import { getQuoteSummary } from "@/shared/api/generated";
import { recommendRoutes as recommendRoutesGenerated } from "@/shared/api/generated/driver-optimization-controller/driver-optimization-controller";
import type { DriverQuoteSummaryResponse } from "@/shared/api/generated/schemas/driverQuoteSummaryResponse";
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
  matchGroupKey?: string;
  matchGroupType?: string;
  matchGroupOrder?: number;
  status: string;
  uiState: DriverUiState;
  statusLabel: string;
  statusTone: BadgeTone;
  cta: DriverCtaConfig;
  requestedAtText?: string;
  pickupTimeText?: string;
  originAddress?: string;
  destinationAddress?: string;
  originLat?: number;
  originLng?: number;
  destinationLat?: number;
  destinationLng?: number;
  routeDistanceText?: string;
  weightKg?: number;
  volumeCbm?: number;
  allowCombine?: boolean;
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
export type DriverRouteRecommendationMode = "SINGLE" | "BUNDLED";

export type DriverRouteRecommendation = {
  key: string;
  rank: number;
  quoteIds: number[];
  routeType: DriverRouteRecommendationMode | "HOME_ROUTE" | "UNKNOWN";
  totalRevenue: number;
  estimatedTotalDistanceKm: number;
  emptyRunDistanceKm: number;
  profitPerKm: number;
  totalCbm: number;
  totalWeight: number;
  finalScore: number;
  pathLabel: string;
};

export type DriverRouteRecommendationAnalysis = {
  mode: DriverRouteRecommendationMode;
  maxQuotesPerRoute: number;
  source: "server" | "heuristic";
  elapsedMs: number;
  totalQuotes: number;
  combinableQuotes: number;
  evaluatedCombos: number;
  recommendedCount: number;
  routes: DriverRouteRecommendation[];
};

type DriverRouteRecommendInput = {
  orders: DriverOrderCard[];
  mode: DriverRouteRecommendationMode;
  maxQuotesPerRoute: number;
};

const ROUTE_RECOMMEND_MAX_QUOTES_MIN = 2;
const ROUTE_RECOMMEND_MAX_QUOTES_MAX = 5;
const ROUTE_RECOMMEND_LIMIT = 15;

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

function buildQuoteItemsFromSummary(
  candidates: AnyObject[],
  cargoName: string,
  cargoType: string,
  weightKg: number,
  volumeCbm: number
): QuoteDetailResponse["quoteItems"] {
  const rawItemCount = Math.trunc(
    pickFirstNumber(candidates, ["itemCount", "item_count", "cargoCount", "cargo_count"]) ?? 0
  );
  const itemCount = Math.max(0, Math.min(30, rawItemCount));
  const normalizedCount = itemCount > 0 ? itemCount : cargoName ? 1 : 0;
  if (normalizedCount <= 0) return [];

  const safeWeightPerItem = weightKg > 0 ? Number((weightKg / normalizedCount).toFixed(2)) : 0;
  const safeVolumePerItem = volumeCbm > 0 ? Number((volumeCbm / normalizedCount).toFixed(4)) : 0;
  const estimatedEdgeCm = safeVolumePerItem > 0 ? Math.max(30, Math.round(Math.cbrt(safeVolumePerItem) * 100)) : 100;
  const baseName = cargoName.trim() || "화물";

  return Array.from({ length: normalizedCount }, (_, index) => ({
    quoteItemId: index + 1,
    itemName: normalizedCount > 1 ? `${baseName} ${index + 1}` : baseName,
    itemType: cargoType || "GENERAL",
    itemDescription: normalizedCount > 1 ? `${index + 1}/${normalizedCount}` : baseName,
    quantity: 1,
    lengthCm: estimatedEdgeCm,
    widthCm: estimatedEdgeCm,
    heightCm: estimatedEdgeCm,
    unitWeightKg: safeWeightPerItem,
    unitVolumeCbm: safeVolumePerItem,
    fragile: false,
    upright: false,
    noStack: false,
    bottomOnly: false,
    rotatable: true,
    stackable: true,
    maxStackWeightKg: safeWeightPerItem > 0 ? Math.round(safeWeightPerItem * 2) : 0,
    handlingTags: "",
    sortOrder: index + 1,
  }));
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

function toFiniteNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toPositiveNumber(value: unknown, fallback = 0): number {
  const parsed = toFiniteNumber(value, fallback);
  return parsed > 0 ? parsed : fallback;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseDistanceKmFromText(distanceText: string | undefined): number {
  const text = String(distanceText ?? "").trim().toLowerCase();
  if (!text) return 0;
  const match = text.match(/(\d+(?:\.\d+)?)/);
  if (!match) return 0;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (text.includes("m") && !text.includes("km")) return value / 1000;
  return value;
}

function normalizeRouteType(value: unknown): DriverRouteRecommendation["routeType"] {
  const token = toStatusToken(value);
  if (token === "SINGLE") return "SINGLE";
  if (token === "BUNDLED") return "BUNDLED";
  if (token === "HOME_ROUTE") return "HOME_ROUTE";
  return "UNKNOWN";
}

function parseQuoteIdList(input: unknown): number[] {
  if (!Array.isArray(input)) return [];
  return Array.from(
    new Set(
      input
        .map((entry) => parseDriverOrderPositiveInt(entry))
        .filter((entry) => entry > 0)
    )
  );
}

function toRoutePathLabel(route: AnyObject): string {
  const visitOrder = Array.isArray(route.visitOrder) ? route.visitOrder : [];
  if (visitOrder.length <= 0) return "출발 → 복귀";

  const visits = visitOrder
    .map((entry) => asObject(entry))
    .map((entry) => {
      const typeToken = toStatusToken(entry.type);
      const quoteId = parseDriverOrderPositiveInt(entry.quoteId);
      if (typeToken === "PICKUP") return `상#${quoteId || "?"}`;
      if (typeToken === "DELIVERY") return `하#${quoteId || "?"}`;
      return quoteId > 0 ? `Q#${quoteId}` : "";
    })
    .filter(Boolean);

  if (visits.length <= 0) return "출발 → 복귀";
  return ["출발", ...visits, "복귀"].join(" → ");
}

function parseRecommendedRoute(
  route: unknown,
  index: number
): DriverRouteRecommendation | null {
  const source = asObject(route);
  if (Object.keys(source).length <= 0) return null;
  const routeType = normalizeRouteType(
    source.routeType ?? (source.single === true ? "SINGLE" : source.bundled === true ? "BUNDLED" : undefined)
  );

  const quoteIdsFromPrimary = parseQuoteIdList(source.quoteIds);
  const quoteIdsFromSelected = parseQuoteIdList(source.selectedQuoteIds);
  const quoteIdsFromFallback = parseQuoteIdList(source.quotes);
  const quoteIds =
    quoteIdsFromPrimary.length > 0
      ? quoteIdsFromPrimary
      : quoteIdsFromSelected.length > 0
        ? quoteIdsFromSelected
        : quoteIdsFromFallback;
  if (quoteIds.length <= 0) {
    const visits = Array.isArray(source.visitOrder) ? source.visitOrder : [];
    const visitQuoteIds = Array.from(
      new Set(
        visits
          .map((visit) => parseDriverOrderPositiveInt(asObject(visit).quoteId))
          .filter((quoteId) => quoteId > 0)
      )
    );
    if (visitQuoteIds.length > 0) {
      return {
        key: toOptionalText(source.calibrationId) ?? `server-${index + 1}-${visitQuoteIds.join("-")}`,
        rank: Math.max(1, Math.trunc(toPositiveNumber(source.rank, index + 1))),
        quoteIds: visitQuoteIds,
        routeType,
        totalRevenue: toPositiveNumber(source.totalRevenue, 0),
        estimatedTotalDistanceKm: toPositiveNumber(source.estimatedTotalDistanceM, 0) / 1000,
        emptyRunDistanceKm: toPositiveNumber(source.emptyRunDistanceM, 0) / 1000,
        profitPerKm: toPositiveNumber(source.profitPerKm, 0),
        totalCbm: toPositiveNumber(source.totalCbm, 0),
        totalWeight: toPositiveNumber(source.totalWeight, 0),
        finalScore: toPositiveNumber(source.finalScore, 0),
        pathLabel: toRoutePathLabel(source),
      };
    }
    return null;
  }

  return {
    key: toOptionalText(source.calibrationId) ?? `server-${index + 1}-${quoteIds.join("-")}`,
    rank: Math.max(1, Math.trunc(toPositiveNumber(source.rank, index + 1))),
    quoteIds,
    routeType,
    totalRevenue: toPositiveNumber(source.totalRevenue, 0),
    estimatedTotalDistanceKm: toPositiveNumber(source.estimatedTotalDistanceM, 0) / 1000,
    emptyRunDistanceKm: toPositiveNumber(source.emptyRunDistanceM, 0) / 1000,
    profitPerKm: toPositiveNumber(source.profitPerKm, 0),
    totalCbm: toPositiveNumber(source.totalCbm, 0),
    totalWeight: toPositiveNumber(source.totalWeight, 0),
    finalScore: toPositiveNumber(source.finalScore, 0),
    pathLabel: toRoutePathLabel(source),
  };
}

function collectRouteArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;

  const queue: unknown[] = [payload];
  const visited = new Set<AnyObject>();
  while (queue.length > 0) {
    const current = queue.shift();
    if (Array.isArray(current)) {
      const first = current[0];
      if (typeof first === "object" && first !== null) return current;
      continue;
    }

    const source = asObject(current);
    if (Object.keys(source).length <= 0) continue;
    if (visited.has(source)) continue;
    visited.add(source);

    const listCandidates = ["routes", "recommendations", "items", "list", "content", "result", "data"];
    for (const key of listCandidates) {
      const value = source[key];
      if (Array.isArray(value) && value.length > 0) {
        const first = value[0];
        if (typeof first === "object" && first !== null) return value;
      }
    }

    Object.values(source).forEach((value) => {
      if (value && typeof value === "object") queue.push(value);
    });
  }

  return [];
}

function estimateCombinationCount(total: number, maxSelection: number): number {
  const n = Math.max(0, Math.trunc(total));
  const limit = Math.max(1, Math.trunc(maxSelection));
  if (n <= 1) return n;

  let count = 0;
  const safeUpper = Math.min(limit, n);
  for (let r = 1; r <= safeUpper; r += 1) {
    let numerator = 1;
    let denominator = 1;
    for (let i = 1; i <= r; i += 1) {
      numerator *= n - (i - 1);
      denominator *= i;
    }
    count += Math.round(numerator / denominator);
    if (count > 500000) return 500000;
  }
  return count;
}

function buildHeuristicRouteRecommendations(
  orders: DriverOrderCard[],
  mode: DriverRouteRecommendationMode,
  maxQuotesPerRoute: number
): DriverRouteRecommendation[] {
  const candidates = orders
    .filter((order) => parseDriverOrderPositiveInt(order.quoteId) > 0)
    .map((order) => ({
      ...order,
      quoteId: parseDriverOrderPositiveInt(order.quoteId),
      priceValue: toPositiveNumber(order.priceValue, 0),
      routeDistanceKm: parseDistanceKmFromText(order.routeDistanceText),
      volumeCbm: toPositiveNumber(order.volumeCbm, 0),
      weightKg: toPositiveNumber(order.weightKg, 0),
    }))
    .sort((a, b) => {
      const byPrice = (b.priceValue ?? 0) - (a.priceValue ?? 0);
      if (byPrice !== 0) return byPrice;
      const byDistance = (a.routeDistanceKm ?? 0) - (b.routeDistanceKm ?? 0);
      if (byDistance !== 0) return byDistance;
      return b.matchId - a.matchId;
    });

  if (candidates.length <= 0) return [];

  if (mode === "SINGLE") {
    return candidates.slice(0, ROUTE_RECOMMEND_LIMIT).map((order, index) => {
      const distance = toPositiveNumber(order.routeDistanceKm, 1);
      const price = toPositiveNumber(order.priceValue, 0);
      return {
        key: `single-${order.quoteId}`,
        rank: index + 1,
        quoteIds: [order.quoteId],
        routeType: "SINGLE",
        totalRevenue: price,
        estimatedTotalDistanceKm: distance,
        emptyRunDistanceKm: Math.max(0, Number((distance * 0.3).toFixed(1))),
        profitPerKm: distance > 0 ? Math.round(price / distance) : 0,
        totalCbm: toPositiveNumber(order.volumeCbm, 0),
        totalWeight: toPositiveNumber(order.weightKg, 0),
        finalScore: Math.max(0, Math.round((price / Math.max(distance, 1)) / 100)),
        pathLabel: "출발 → 상차 → 하차 → 복귀",
      };
    });
  }

  const chunkSize = clampNumber(maxQuotesPerRoute, ROUTE_RECOMMEND_MAX_QUOTES_MIN, ROUTE_RECOMMEND_MAX_QUOTES_MAX);
  const routes: DriverRouteRecommendation[] = [];
  for (let i = 0; i < candidates.length; i += chunkSize) {
    const chunk = candidates.slice(i, i + chunkSize);
    if (chunk.length <= 0) continue;
    if (chunk.length <= 1) continue;

    const quoteIds = chunk.map((item) => item.quoteId);
    const totalRevenue = chunk.reduce((sum, item) => sum + toPositiveNumber(item.priceValue, 0), 0);
    const totalDistance = chunk.reduce((sum, item) => sum + Math.max(1, toPositiveNumber(item.routeDistanceKm, 0)), 0);
    const totalCbm = chunk.reduce((sum, item) => sum + toPositiveNumber(item.volumeCbm, 0), 0);
    const totalWeight = chunk.reduce((sum, item) => sum + toPositiveNumber(item.weightKg, 0), 0);
    const emptyRunDistanceKm = Math.max(0, Number((totalDistance * 0.12).toFixed(1)));

    routes.push({
      key: `bundle-${quoteIds.join("-")}`,
      rank: routes.length + 1,
      quoteIds,
      routeType: "BUNDLED",
      totalRevenue,
      estimatedTotalDistanceKm: Number(totalDistance.toFixed(1)),
      emptyRunDistanceKm,
      profitPerKm: totalDistance > 0 ? Math.round(totalRevenue / totalDistance) : 0,
      totalCbm: Number(totalCbm.toFixed(2)),
      totalWeight: Math.round(totalWeight),
      finalScore: Math.max(0, Math.round((totalRevenue / Math.max(totalDistance, 1)) / 120)),
      pathLabel: `출발 → 상차${chunk.length}건 → 하차${chunk.length}건 → 복귀`,
    });

    if (routes.length >= ROUTE_RECOMMEND_LIMIT) break;
  }

  return routes;
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
  const cargoType = pickFirstText(candidates, ["cargoType", "cargo_type"]) ?? "";
  const weightKg = Math.max(0, pickFirstNumber(candidates, ["weightKg", "weight_kg", "weight"]) ?? 0);
  const volumeCbm = Math.max(0, pickFirstNumber(candidates, ["volumeCbm", "volume_cbm", "volume"]) ?? 0);
  const quoteItems = buildQuoteItemsFromSummary(candidates, cargoName, cargoType, weightKg, volumeCbm);

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
    weightKg,
    volumeCbm,
    vehicleType: pickFirstText(candidates, ["vehicleType", "vehicle_type", "tonType", "ton_type"]) ?? "",
    vehicleBodyType:
      pickFirstText(candidates, ["vehicleBodyType", "vehicle_body_type", "bodyType", "body_type"]) ?? "",
    cargoName,
    cargoType,
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
    quoteItems,
    checklistItems: [],
    stops: [],
  };
}

function toDriverQuoteSummaryResponse(
  summary: AnyObject,
  fallbackQuoteId: number
): DriverQuoteSummaryResponse | null {
  const candidates = collectCandidateObjects(summary);
  const quoteId =
    parseDriverOrderPositiveInt(pickFirstNumber(candidates, ["quoteId", "quote_id", "id"])) || fallbackQuoteId;
  if (quoteId <= 0) return null;

  const result: DriverQuoteSummaryResponse = { quoteId };

  const originAddress = pickFirstText(candidates, ["originAddress", "origin_address", "startAddress"]);
  const destinationAddress = pickFirstText(candidates, ["destinationAddress", "destination_address", "endAddress", "dropoffAddress"]);
  const originLat = pickFirstNumber(candidates, ["originLat", "origin_lat", "startLat"]);
  const originLng = pickFirstNumber(candidates, ["originLng", "origin_lng", "startLng"]);
  const destinationLat = pickFirstNumber(candidates, ["destinationLat", "destination_lat", "endLat"]);
  const destinationLng = pickFirstNumber(candidates, ["destinationLng", "destination_lng", "endLng"]);
  const cargoName = pickFirstText(candidates, ["cargoName", "cargo_name", "itemName", "item_name", "cargo"]);
  const cargoType = pickFirstText(candidates, ["cargoType", "cargo_type"]);
  const cargoDesc = pickFirstText(candidates, ["cargoDesc", "cargo_desc", "cargoDescription", "description"]);
  const finalPrice = pickFirstNumber(candidates, ["finalPrice", "final_price", "price", "amount"]);
  const distanceKm = pickFirstNumber(candidates, ["distanceKm", "distance_km", "distance"]);
  const weightKg = pickFirstNumber(candidates, ["weightKg", "weight_kg", "weight"]);
  const volumeCbm = pickFirstNumber(candidates, ["volumeCbm", "volume_cbm", "volume"]);
  const itemCount = pickFirstNumber(candidates, ["itemCount", "item_count", "cargoCount", "cargo_count"]);
  const allowCombine = pickFirstBoolean(candidates, ["allowCombine", "allow_combine"]);
  const vehicleType = pickFirstText(candidates, ["vehicleType", "vehicle_type", "tonType", "ton_type"]);
  const vehicleBodyType = pickFirstText(candidates, ["vehicleBodyType", "vehicle_body_type", "bodyType", "body_type"]);
  const loadMethod = pickFirstText(candidates, ["loadMethod", "load_method"]);
  const unloadMethod = pickFirstText(candidates, ["unloadMethod", "unload_method"]);

  if (originAddress) result.originAddress = originAddress;
  if (destinationAddress) result.destinationAddress = destinationAddress;
  if (Number.isFinite(originLat ?? NaN)) result.originLat = originLat;
  if (Number.isFinite(originLng ?? NaN)) result.originLng = originLng;
  if (Number.isFinite(destinationLat ?? NaN)) result.destinationLat = destinationLat;
  if (Number.isFinite(destinationLng ?? NaN)) result.destinationLng = destinationLng;
  if (cargoName) result.cargoName = cargoName;
  if (cargoType) result.cargoType = cargoType;
  if (cargoDesc) result.cargoDesc = cargoDesc;
  if (Number.isFinite(finalPrice ?? NaN)) result.finalPrice = Math.max(0, finalPrice ?? 0);
  if (Number.isFinite(distanceKm ?? NaN)) result.distanceKm = Math.max(0, distanceKm ?? 0);
  if (Number.isFinite(weightKg ?? NaN)) result.weightKg = Math.max(0, weightKg ?? 0);
  if (Number.isFinite(volumeCbm ?? NaN)) result.volumeCbm = Math.max(0, volumeCbm ?? 0);
  if (Number.isFinite(itemCount ?? NaN)) result.itemCount = Math.max(0, Math.trunc(itemCount ?? 0));
  if (typeof allowCombine === "boolean") result.allowCombine = allowCombine;
  if (vehicleType) result.vehicleType = vehicleType;
  if (vehicleBodyType) result.vehicleBodyType = vehicleBodyType;
  if (loadMethod) result.loadMethod = loadMethod;
  if (unloadMethod) result.unloadMethod = unloadMethod;

  return result;
}

export async function getDriverQuoteSummaryByQuoteId(quoteId: number): Promise<DriverQuoteSummaryResponse | null> {
  const safeQuoteId = parseDriverOrderPositiveInt(quoteId);
  if (safeQuoteId <= 0) return null;

  if (getDriverMatchMode() === "mock") {
    const mockQuoteDetail = getMockFlowShipperQuoteDetail(safeQuoteId);
    if (!mockQuoteDetail) return null;
    return toDriverQuoteSummaryResponse(mockQuoteDetail as unknown as AnyObject, safeQuoteId);
  }

  try {
    const raw = (await getQuoteSummary(safeQuoteId)) as unknown;
    const summary = await parseDriverQuoteSummaryPayload(raw);
    if (!summary) return null;
    return toDriverQuoteSummaryResponse(summary, safeQuoteId);
  } catch {
    return null;
  }
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

export async function recommendDriverOrderRoutes(
  input: DriverRouteRecommendInput
): Promise<DriverRouteRecommendationAnalysis> {
  const safeOrders = Array.isArray(input.orders)
    ? input.orders.filter(
        (order) =>
          order.uiState === DRIVER_UI_STATE.READY_TO_ACCEPT &&
          parseDriverOrderPositiveInt(order.quoteId) > 0
      )
    : [];
  const safeMode: DriverRouteRecommendationMode =
    input.mode === "BUNDLED" ? "BUNDLED" : "SINGLE";
  const safeMaxQuotesPerRoute = clampNumber(
    Math.trunc(toPositiveNumber(input.maxQuotesPerRoute, ROUTE_RECOMMEND_MAX_QUOTES_MAX)),
    ROUTE_RECOMMEND_MAX_QUOTES_MIN,
    ROUTE_RECOMMEND_MAX_QUOTES_MAX
  );

  const totalQuotes = safeOrders.length;
  const combinableQuotes = safeOrders.filter(
    (order) => order.allowCombine === true || order.tags.some((tag) => tag.key === "COMBINED")
  ).length;

  if (totalQuotes <= 0) {
    return {
      mode: safeMode,
      maxQuotesPerRoute: safeMaxQuotesPerRoute,
      source: "heuristic",
      elapsedMs: 0,
      totalQuotes: 0,
      combinableQuotes: 0,
      evaluatedCombos: 0,
      recommendedCount: 0,
      routes: [],
    };
  }

  const startedAt = Date.now();
  const quoteIdToOrder = new Map<number, DriverOrderCard>();
  safeOrders.forEach((order) => {
    const quoteId = parseDriverOrderPositiveInt(order.quoteId);
    if (quoteId > 0) quoteIdToOrder.set(quoteId, order);
  });

  let source: "server" | "heuristic" = "heuristic";
  let routes: DriverRouteRecommendation[] = [];

  try {
    if (getDriverMatchMode() === "mock") {
      await waitRandom();
      routes = buildHeuristicRouteRecommendations(safeOrders, safeMode, safeMaxQuotesPerRoute);
    } else {
      const firstWithOrigin = safeOrders.find(
        (order) =>
          Number.isFinite(order.originLat) &&
          Number.isFinite(order.originLng) &&
          Number(order.originLat) !== 0 &&
          Number(order.originLng) !== 0
      );
      const firstWithDestination = safeOrders.find(
        (order) =>
          Number.isFinite(order.destinationLat) &&
          Number.isFinite(order.destinationLng) &&
          Number(order.destinationLat) !== 0 &&
          Number(order.destinationLng) !== 0
      );

      const payload = {
        currentLat: Number(firstWithOrigin?.originLat ?? 37.5665),
        currentLng: Number(firstWithOrigin?.originLng ?? 126.978),
        ...(Number.isFinite(firstWithDestination?.destinationLat)
          ? { endLat: Number(firstWithDestination?.destinationLat) }
          : {}),
        ...(Number.isFinite(firstWithDestination?.destinationLng)
          ? { endLng: Number(firstWithDestination?.destinationLng) }
          : {}),
        combinePreference: safeMode,
        mode: safeMode,
        loadedWeightKg: Math.max(
          0,
          Math.round(
            safeOrders.reduce((sum, order) => sum + toPositiveNumber(order.weightKg, 0), 0)
          )
        ),
        loadedVolumeCbm: Number(
          safeOrders
            .reduce((sum, order) => sum + toPositiveNumber(order.volumeCbm, 0), 0)
            .toFixed(2)
        ),
        maxPickupDistanceKm: 60,
        selectedQuoteIds: safeOrders
          .map((order) => parseDriverOrderPositiveInt(order.quoteId))
          .filter((quoteId) => quoteId > 0),
      };

      const raw = await recommendRoutesGenerated(payload as any);
      const routeArray = collectRouteArray(raw);
      const parsed = routeArray
        .map((route, index) => parseRecommendedRoute(route, index))
        .filter((route): route is DriverRouteRecommendation => route !== null)
        .slice(0, ROUTE_RECOMMEND_LIMIT);
      const parsedByMode =
        safeMode === "BUNDLED"
          ? parsed.filter((route) => route.quoteIds.length > 1)
          : parsed;

      if (parsedByMode.length > 0) {
        source = "server";
        routes = parsedByMode.map((route, index) => {
          const quoteOrders = route.quoteIds
            .map((quoteId) => quoteIdToOrder.get(quoteId))
            .filter((order): order is DriverOrderCard => Boolean(order));
          const fallbackRevenue = quoteOrders.reduce(
            (sum, order) => sum + toPositiveNumber(order.priceValue, 0),
            0
          );
          const fallbackDistance = quoteOrders.reduce(
            (sum, order) => sum + Math.max(1, parseDistanceKmFromText(order.routeDistanceText)),
            0
          );
          const fallbackWeight = quoteOrders.reduce(
            (sum, order) => sum + toPositiveNumber(order.weightKg, 0),
            0
          );
          const fallbackVolume = quoteOrders.reduce(
            (sum, order) => sum + toPositiveNumber(order.volumeCbm, 0),
            0
          );

          const totalRevenue = route.totalRevenue > 0 ? route.totalRevenue : fallbackRevenue;
          const estimatedTotalDistanceKm =
            route.estimatedTotalDistanceKm > 0 ? route.estimatedTotalDistanceKm : fallbackDistance;
          const emptyRunDistanceKm =
            route.emptyRunDistanceKm > 0
              ? route.emptyRunDistanceKm
              : Number((estimatedTotalDistanceKm * 0.15).toFixed(1));
          const totalWeight = route.totalWeight > 0 ? route.totalWeight : fallbackWeight;
          const totalCbm = route.totalCbm > 0 ? route.totalCbm : fallbackVolume;
          const profitPerKm =
            route.profitPerKm > 0
              ? route.profitPerKm
              : estimatedTotalDistanceKm > 0
                ? Math.round(totalRevenue / estimatedTotalDistanceKm)
                : 0;

          return {
            ...route,
            key: route.key || `server-${index + 1}-${route.quoteIds.join("-")}`,
            rank: route.rank > 0 ? route.rank : index + 1,
            totalRevenue: Math.round(totalRevenue),
            estimatedTotalDistanceKm: Number(estimatedTotalDistanceKm.toFixed(1)),
            emptyRunDistanceKm: Number(emptyRunDistanceKm.toFixed(1)),
            totalWeight: Math.round(totalWeight),
            totalCbm: Number(totalCbm.toFixed(2)),
            profitPerKm,
            pathLabel:
              route.pathLabel && route.pathLabel !== "출발 → 복귀"
                ? route.pathLabel
                : `출발 → 상차${route.quoteIds.length}건 → 하차${route.quoteIds.length}건 → 복귀`,
          };
        });
      } else {
        routes = buildHeuristicRouteRecommendations(safeOrders, safeMode, safeMaxQuotesPerRoute);
      }
    }
  } catch {
    routes = buildHeuristicRouteRecommendations(safeOrders, safeMode, safeMaxQuotesPerRoute);
  }

  if (safeMode === "BUNDLED") {
    routes = routes.filter((route) => route.quoteIds.length > 1);
  }

  routes = routes
    .sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
      return b.totalRevenue - a.totalRevenue;
    })
    .slice(0, ROUTE_RECOMMEND_LIMIT)
    .map((route, index) => ({ ...route, rank: index + 1 }));

  return {
    mode: safeMode,
    maxQuotesPerRoute: safeMaxQuotesPerRoute,
    source,
    elapsedMs: Math.max(0, Date.now() - startedAt),
    totalQuotes,
    combinableQuotes,
    evaluatedCombos: estimateCombinationCount(
      totalQuotes,
      safeMode === "SINGLE" ? 1 : safeMaxQuotesPerRoute
    ),
    recommendedCount: routes.length,
    routes,
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
