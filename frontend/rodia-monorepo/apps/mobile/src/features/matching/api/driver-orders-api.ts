import type { QuoteDetailResponse } from "@/entities/quote/model/quote.types";
import { getQuoteSummary, type DriverQuoteSummaryResponse } from "@/shared/api/generated";
import { getDriverMatchMode } from "@/shared/lib/config/env";
import type { BadgeTone } from "@/shared/lib/policy";
import {
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
  statusLabel: string;
  statusTone: BadgeTone;
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

function toOptionalText(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() || undefined : undefined;
}

function toOptionalNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

async function parseDriverQuoteSummaryPayload(payload: unknown): Promise<DriverQuoteSummaryResponse | null> {
  if (!payload) return null;

  if (typeof payload === "object") {
    if (typeof Blob !== "undefined" && payload instanceof Blob) {
      try {
        const text = (await payload.text()).trim();
        if (!text) return null;
        const parsed = JSON.parse(text);
        return parsed && typeof parsed === "object" ? (parsed as DriverQuoteSummaryResponse) : null;
      } catch {
        return null;
      }
    }

    return payload as DriverQuoteSummaryResponse;
  }

  if (typeof payload === "string") {
    const text = payload.trim();
    if (!text) return null;

    try {
      const parsed = JSON.parse(text);
      return parsed && typeof parsed === "object" ? (parsed as DriverQuoteSummaryResponse) : null;
    } catch {
      return null;
    }
  }

  return null;
}

function toQuoteDetailFromDriverSummary(
  summary: DriverQuoteSummaryResponse,
  fallbackQuoteId: number
): QuoteDetailResponse | null {
  const resolvedQuoteId = parseDriverOrderPositiveInt(summary.quoteId) || fallbackQuoteId;
  if (resolvedQuoteId <= 0) return null;

  const finalPrice = toOptionalNumber(summary.finalPrice) ?? 0;

  return {
    quoteId: resolvedQuoteId,
    quotePublicId: undefined,
    shipperId: 0,
    truckId: 0,
    originAddress: toOptionalText(summary.originAddress) ?? "",
    originAddressDetail: undefined,
    destinationAddress: toOptionalText(summary.destinationAddress) ?? "",
    destinationAddressDetail: undefined,
    originLat: toOptionalNumber(summary.originLat) ?? 0,
    originLng: toOptionalNumber(summary.originLng) ?? 0,
    destinationLat: toOptionalNumber(summary.destinationLat) ?? 0,
    destinationLng: toOptionalNumber(summary.destinationLng) ?? 0,
    distanceKm: toOptionalNumber(summary.distanceKm) ?? 0,
    weightKg: toOptionalNumber(summary.weightKg) ?? 0,
    volumeCbm: toOptionalNumber(summary.volumeCbm) ?? 0,
    vehicleType: toOptionalText(summary.vehicleType) ?? "",
    vehicleBodyType: toOptionalText(summary.vehicleBodyType) ?? "",
    cargoName: toOptionalText(summary.cargoName) ?? "",
    cargoType: toOptionalText(summary.cargoType) ?? "",
    cargoDesc: toOptionalText(summary.cargoDesc) ?? "",
    basePrice: finalPrice,
    distancePrice: 0,
    extraPrice: 0,
    desiredPrice: finalPrice,
    finalPrice,
    allowCombine: Boolean(summary.allowCombine),
    loadMethod: toOptionalText(summary.loadMethod) ?? "",
    unloadMethod: toOptionalText(summary.unloadMethod) ?? "",
    status: "OPEN",
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

  const [marketMatches, myMatches] = await Promise.all([listOpenDriverMatches(), listMyDriverMatches()]);

  const quoteIds = collectDriverOrderQuoteIds([...marketMatches, ...myMatches]);
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

  const myOrders = myMatches.map((match, index) => {
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

  const availableFilters = resolveAvailableFilters(capability, marketOrders);

  return {
    marketOrders: sortDriverOrderCards(marketOrders),
    myOrders: sortDriverOrderCards(myOrders),
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
