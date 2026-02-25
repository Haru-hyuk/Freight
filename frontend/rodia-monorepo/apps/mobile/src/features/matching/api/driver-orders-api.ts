import type { QuoteDetailResponse } from "@/entities/quote/model/quote.types";
import { getShipperQuoteDetailByIdentifier } from "@/features/quote/api";
import { formatWorkMethodLabel } from "@/features/quote/model/workMethod";
import { getDriverMatchMode } from "@/shared/lib/config/env";
import {
  BACKEND_STATUS,
  getDriverBadge,
  getDriverUiStateFromBackendStatus,
  normalizeStatus,
} from "@/shared/lib/policy";
import {
  selectMockFlowAiRecommendedDecoration,
  selectMockFlowDriverOrderDecoration,
  waitRandom,
  type MockFlowDriverOrderTagKey,
} from "@/shared/lib/mock-flow";

import {
  getDriverMatch,
  listMyDriverMatches,
  listOpenDriverMatches,
  type DriverMatchItem,
} from "./shipper-match-api";

type DriverOrderTagKey = "AI_RECOMMENDED" | "COMBINED" | "WAYPOINT" | "URGENT";

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
  statusLabel: string;
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
  tags: DriverOrderTag[];
};

export type DriverOrdersCapability = {
  supportsRichFilters: boolean;
  supportsAiFab: boolean;
};

export type DriverOrdersOverview = {
  marketOrders: DriverOrderCard[];
  myOrders: DriverOrderCard[];
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

function toPositiveInt(value: unknown): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toOptionalText(value: unknown): string | undefined {
  const text = toText(value);
  return text || undefined;
}

function toOptionalNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
}

function formatDateTime(value: unknown): string {
  const raw = toText(value);
  if (!raw) return "";
  const timestamp = Date.parse(raw);
  if (!Number.isFinite(timestamp)) return "";

  const date = new Date(timestamp);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${month}/${day} ${hour}:${minute}`;
}

function formatPrice(value: unknown): string {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return "";
  return `${Math.trunc(amount).toLocaleString("ko-KR")}원`;
}

function formatDistance(value: unknown): string {
  const km = Number(value);
  if (!Number.isFinite(km) || km <= 0) return "";
  return `${km.toFixed(1)}km`;
}

function normalizeVehicleType(value: unknown): string {
  const raw = toText(value).toUpperCase();
  if (raw === "TON_1") return "1톤";
  if (raw === "TON_2_5") return "2.5톤";
  if (raw === "TON_5") return "5톤";
  return toText(value);
}

function normalizeVehicleBodyType(value: unknown): string {
  const raw = toText(value).toUpperCase();
  if (raw === "CARGO") return "카고";
  if (raw === "WING_BODY") return "윙바디";
  if (raw === "TOP_CAR") return "탑차";
  return toText(value);
}

function buildVehicleText(quote: QuoteDetailResponse | null): string | undefined {
  if (!quote) return undefined;

  const ton = normalizeVehicleType(quote.vehicleType);
  const body = normalizeVehicleBodyType(quote.vehicleBodyType);
  const text = [ton, body].filter(Boolean).join(" ");
  return text || undefined;
}

function buildMethodText(quote: QuoteDetailResponse | null): string | undefined {
  if (!quote) return undefined;

  const load = toText(formatWorkMethodLabel(quote.loadMethod));
  const unload = toText(formatWorkMethodLabel(quote.unloadMethod));
  if (!load && !unload) return undefined;
  if (!load) return unload;
  if (!unload) return load;
  return `${load} / ${unload}`;
}

function buildCargoText(quote: QuoteDetailResponse | null): string | undefined {
  if (!quote) return undefined;
  return toOptionalText(quote.cargoName);
}

function resolvePrice(quote: QuoteDetailResponse | null): { priceValue?: number; priceText?: string } {
  if (!quote) return {};

  const finalPrice = toOptionalNumber(quote.finalPrice);
  const desiredPrice = toOptionalNumber(quote.desiredPrice);
  const value = (finalPrice && finalPrice > 0 ? finalPrice : desiredPrice) ?? 0;
  if (value <= 0) return {};

  return {
    priceValue: Math.trunc(value),
    priceText: formatPrice(value),
  };
}

function toDriverOrderTags(tagKeys: readonly MockFlowDriverOrderTagKey[]): DriverOrderTag[] {
  return Array.from(new Set(tagKeys))
    .map((key) => ({ key, label: FILTER_LABELS[key] }))
    .filter((item): item is DriverOrderTag => Boolean(item.label));
}

async function loadQuoteDetailsByIds(quoteIds: number[]): Promise<Map<number, QuoteDetailResponse>> {
  const map = new Map<number, QuoteDetailResponse>();
  const safeQuoteIds = Array.from(new Set(quoteIds.map((quoteId) => toPositiveInt(quoteId)).filter((quoteId) => quoteId > 0)));
  if (safeQuoteIds.length <= 0) return map;

  const entries = await Promise.all(
    safeQuoteIds.map(async (quoteId) => {
      try {
        const quote = await getShipperQuoteDetailByIdentifier(String(quoteId));
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

function mapDriverOrderCard(
  match: DriverMatchItem,
  quote: QuoteDetailResponse | null,
  mode: "mock" | "server",
  scope: DriverOrdersTabKey,
  index: number
): DriverOrderCard {
  const safeMatchId = toPositiveInt(match.matchId);
  const safeQuoteId = toPositiveInt(match.quoteId);
  const seed = safeMatchId || safeQuoteId || index + 1;
  const mockDecoration = mode === "mock" ? selectMockFlowDriverOrderDecoration(seed, scope) : null;

  const status = normalizeStatus(toText(match.status));
  const statusLabel = getDriverBadge(getDriverUiStateFromBackendStatus(status)).label;

  const requestedAtText = formatDateTime(match.createdAt);

  const originAddress = toOptionalText(quote?.originAddress) ?? toOptionalText(mockDecoration?.fallbackOriginAddress);
  const destinationAddress =
    toOptionalText(quote?.destinationAddress) ?? toOptionalText(mockDecoration?.fallbackDestinationAddress);
  const routeDistanceText = formatDistance(quote?.distanceKm);

  const vehicleText = buildVehicleText(quote) ?? toOptionalText(mockDecoration?.fallbackVehicleText);
  const methodText = buildMethodText(quote) ?? toOptionalText(mockDecoration?.fallbackMethodText);
  const cargoText = buildCargoText(quote) ?? toOptionalText(mockDecoration?.fallbackCargoText);

  const basePrice = resolvePrice(quote);
  const fallbackPrice = mode === "mock" ? Number(mockDecoration?.fallbackPriceValue ?? 0) : 0;
  const priceValue = basePrice.priceValue ?? (fallbackPrice > 0 ? fallbackPrice : undefined);
  const priceText = basePrice.priceText ?? (fallbackPrice > 0 ? formatPrice(fallbackPrice) : undefined);

  const tags = toDriverOrderTags(mockDecoration?.tagKeys ?? []);
  const pickupTimeText = toOptionalText(mockDecoration?.pickupTimeText);
  const emptyDistanceText = toOptionalText(mockDecoration?.emptyDistanceText);

  return {
    cardKey: `${scope}-${safeMatchId}-${index}`,
    matchId: safeMatchId,
    quoteId: safeQuoteId > 0 ? safeQuoteId : undefined,
    status,
    statusLabel,
    requestedAtText: requestedAtText || undefined,
    pickupTimeText: pickupTimeText || undefined,
    originAddress,
    destinationAddress,
    routeDistanceText: routeDistanceText || undefined,
    vehicleText,
    methodText,
    cargoText,
    emptyDistanceText,
    priceText,
    priceValue,
    tags,
  };
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

function sortByStatusAndUpdatedAt(items: DriverOrderCard[]): DriverOrderCard[] {
  return [...items].sort((a, b) => {
    const statusWeight = (status: string): number => {
      if (status === BACKEND_STATUS.READY || status === BACKEND_STATUS.OPEN) return 0;
      if (status === BACKEND_STATUS.NEGOTIATING) return 1;
      if (status === BACKEND_STATUS.ASSIGNED || status === BACKEND_STATUS.ACCEPTED) return 2;
      if (status === BACKEND_STATUS.PICKUP) return 3;
      if (status === BACKEND_STATUS.TRANSIT) return 4;
      return 5;
    };

    const byStatus = statusWeight(a.status) - statusWeight(b.status);
    if (byStatus !== 0) return byStatus;
    return b.matchId - a.matchId;
  });
}

export function getDriverOrderFilterLabel(filter: DriverOrderFilterKey): string {
  return FILTER_LABELS[filter] ?? filter;
}

export function matchesDriverOrderFilter(card: DriverOrderCard, filter: DriverOrderFilterKey): boolean {
  if (filter === "ALL") return true;
  return card.tags.some((tag) => tag.key === filter);
}

export function buildDriverOrderDetailParams(card: DriverOrderCard): Record<string, string> {
  const params: Record<string, string> = {
    id: String(card.matchId),
    matchId: String(card.matchId),
  };

  if (card.quoteId && card.quoteId > 0) {
    params.quoteId = String(card.quoteId);
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

  const [marketMatches, myMatches] = await Promise.all([listOpenDriverMatches(), listMyDriverMatches()]);

  const quoteIds = [...marketMatches, ...myMatches].map((match) => toPositiveInt(match.quoteId));
  const quoteMap = await loadQuoteDetailsByIds(quoteIds);

  const marketOrders = marketMatches.map((match, index) => {
    const quoteId = toPositiveInt(match.quoteId);
    const quote = quoteId > 0 ? quoteMap.get(quoteId) ?? null : null;
    return mapDriverOrderCard(match, quote, mode, "market", index);
  });

  const myOrders = myMatches.map((match, index) => {
    const quoteId = toPositiveInt(match.quoteId);
    const quote = quoteId > 0 ? quoteMap.get(quoteId) ?? null : null;
    return mapDriverOrderCard(match, quote, mode, "my", index);
  });

  const availableFilters = resolveAvailableFilters(capability, marketOrders);

  return {
    marketOrders: sortByStatusAndUpdatedAt(marketOrders),
    myOrders: sortByStatusAndUpdatedAt(myOrders),
    myCount: myOrders.length,
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
    priceText: formatPrice(aiDecoration.priceValue),
    tags: toDriverOrderTags(Array.from(nextTagKeys)),
  };
}

export async function probeDriverOrderDetailAccess(matchId: number): Promise<DriverOrderDetailAccess> {
  const safeMatchId = toPositiveInt(matchId);
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
