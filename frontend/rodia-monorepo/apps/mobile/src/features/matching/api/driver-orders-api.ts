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

type DriverOrderFlags = {
  aiRecommended?: boolean;
  combined?: boolean;
  waypoint?: boolean;
  urgent?: boolean;
};

const FILTER_LABELS: Record<DriverOrderFilterKey, string> = {
  ALL: "전체",
  AI_RECOMMENDED: "AI추천",
  COMBINED: "합짐",
  WAYPOINT: "경유",
  URGENT: "긴급",
};

const MOCK_ORIGIN_POOL = [
  "경기 화성시 향남읍",
  "인천 연수구 송도동",
  "서울 강서구 마곡동",
  "경기 안산시 단원구",
  "경기 김포시 고촌읍",
];

const MOCK_DESTINATION_POOL = [
  "대전 대덕구 대화동",
  "부산 강서구 녹산동",
  "전북 군산시 소룡동",
  "충남 아산시 둔포면",
  "경북 칠곡군 왜관읍",
];

const MOCK_VEHICLE_POOL = ["1톤 카고", "2.5톤 윙바디", "5톤 탑차"];
const MOCK_METHOD_POOL = ["고객 상차 / 기사 하차", "기사 상차 / 지게차 하차", "기사 상차 / 기사 하차"];
const MOCK_CARGO_POOL = ["생활가전", "전자부품", "공산품"];
const MOCK_PICKUP_HINT_POOL = ["즉시 상차 가능", "30분 내 상차", "1시간 내 상차"];

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

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitRandom(minMs: number, maxMs: number): Promise<void> {
  const min = Math.max(0, Math.trunc(minMs));
  const max = Math.max(min, Math.trunc(maxMs));
  const next = min + Math.floor(Math.random() * (max - min + 1));
  await wait(next);
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

function buildMockFlags(seed: number): DriverOrderFlags {
  const mod = Math.abs(seed) % 5;
  if (mod === 0) return { aiRecommended: true, urgent: true };
  if (mod === 1) return { combined: true };
  if (mod === 2) return { waypoint: true };
  if (mod === 3) return { aiRecommended: true, combined: true };
  return { urgent: true };
}

function toTags(flags: DriverOrderFlags): DriverOrderTag[] {
  const tags: DriverOrderTag[] = [];

  if (flags.aiRecommended) tags.push({ key: "AI_RECOMMENDED", label: FILTER_LABELS.AI_RECOMMENDED });
  if (flags.combined) tags.push({ key: "COMBINED", label: FILTER_LABELS.COMBINED });
  if (flags.waypoint) tags.push({ key: "WAYPOINT", label: FILTER_LABELS.WAYPOINT });
  if (flags.urgent) tags.push({ key: "URGENT", label: FILTER_LABELS.URGENT });

  return tags;
}

function pickMockText(pool: string[], seed: number): string {
  if (pool.length <= 0) return "";
  return pool[Math.abs(seed) % pool.length] || "";
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

  const status = normalizeStatus(toText(match.status));
  const statusLabel = getDriverBadge(getDriverUiStateFromBackendStatus(status)).label;

  const requestedAtText = formatDateTime(match.createdAt);
  const defaultOrigin = mode === "mock" ? pickMockText(MOCK_ORIGIN_POOL, seed) : "";
  const defaultDestination = mode === "mock" ? pickMockText(MOCK_DESTINATION_POOL, seed + 1) : "";

  const originAddress = toOptionalText(quote?.originAddress) ?? toOptionalText(defaultOrigin);
  const destinationAddress = toOptionalText(quote?.destinationAddress) ?? toOptionalText(defaultDestination);
  const routeDistanceText = formatDistance(quote?.distanceKm);

  const vehicleText = buildVehicleText(quote) ?? (mode === "mock" ? pickMockText(MOCK_VEHICLE_POOL, seed) : undefined);
  const methodText = buildMethodText(quote) ?? (mode === "mock" ? pickMockText(MOCK_METHOD_POOL, seed + 2) : undefined);
  const cargoText = buildCargoText(quote) ?? (mode === "mock" ? pickMockText(MOCK_CARGO_POOL, seed + 3) : undefined);

  const basePrice = resolvePrice(quote);
  const fallbackPrice = mode === "mock" ? 120000 + (seed % 8) * 12000 : 0;
  const priceValue = basePrice.priceValue ?? (fallbackPrice > 0 ? fallbackPrice : undefined);
  const priceText = basePrice.priceText ?? (fallbackPrice > 0 ? formatPrice(fallbackPrice) : undefined);

  const mockFlags = mode === "mock" ? buildMockFlags(seed + (scope === "my" ? 7 : 0)) : {};
  const tags = toTags(mockFlags);

  const pickupTimeText = mode === "mock" ? pickMockText(MOCK_PICKUP_HINT_POOL, seed) : undefined;
  const emptyDistanceText =
    mode === "mock"
      ? `공차 ${formatDistance(2.1 + ((seed + 3) % 7) * 0.9) || "-"}`
      : undefined;

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
    await waitRandom(300, 700);
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

  await waitRandom(1200, 1800);

  const source = Array.isArray(sourceOrders) ? sourceOrders : [];
  const base = source.find((order) => !order.tags.some((tag) => tag.key === "AI_RECOMMENDED")) ?? source[0] ?? null;
  if (!base) return null;

  const nextPriceValue = (base.priceValue ?? 150000) + 15000;
  const tags = [
    { key: "AI_RECOMMENDED", label: FILTER_LABELS.AI_RECOMMENDED },
    ...base.tags.filter((tag) => tag.key !== "AI_RECOMMENDED"),
  ] as DriverOrderTag[];

  if (!tags.some((tag) => tag.key === "URGENT")) {
    tags.push({ key: "URGENT", label: FILTER_LABELS.URGENT });
  }

  return {
    ...base,
    cardKey: `ai-${base.matchId}-${Date.now()}`,
    pickupTimeText: "AI 추천: 즉시 상차 가능",
    emptyDistanceText: base.emptyDistanceText || "공차 2.3km",
    priceValue: nextPriceValue,
    priceText: formatPrice(nextPriceValue),
    tags,
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
