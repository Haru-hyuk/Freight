import { formatWorkMethodLabel } from "@/features/quote/model/workMethod";
import {
  getDriverCta,
  getDriverBadge,
  getDriverOrderSortPriority,
  getDriverUiStateFromStatusPayload,
  resolveDriverRawStatus,
} from "@/shared/lib/policy";
import { formatDateTime, formatDistance, formatKrw } from "@/shared/lib/format/display";
import {
  selectMockFlowDriverOrderDecoration,
  type MockFlowDriverOrderTagKey,
} from "@/shared/lib/mock-flow";

import type { DriverOrderCard, DriverOrderTag, DriverOrderTagKey } from "./driver-orders-api";
import type { ParsedDriverOrderQuote, ParsedDriverOrderSource } from "./driver-orders-parser";

/**
 * Driver orders mapper boundary
 * - parser가 정규화한 source를 UI 카드 모델로 변환한다.
 * - 상태 배지, 카드 텍스트, 태그, 정렬 순서 같은 표현/파생 계산을 담당한다.
 * - 입력 안전성 보정은 parser 책임으로 유지한다.
 */
type DriverOrderTagLabelMap = Readonly<Record<DriverOrderTagKey, string>>;

type DriverOrderCardMapperInput = {
  source: ParsedDriverOrderSource;
  mode: "mock" | "server";
  filterLabels: DriverOrderTagLabelMap;
};

type StatusCarrier = {
  status?: unknown;
};

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toOptionalText(value: unknown): string | undefined {
  const text = toText(value);
  return text || undefined;
}

function toSortTimestamp(value: unknown): number {
  const raw = toText(value);
  if (!raw) return 0;
  const timestamp = Date.parse(raw);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function resolveDriverOrderRawStatus(status: unknown, quote: ParsedDriverOrderQuote | null): string {
  const matchStatus = typeof status === "string" ? status.trim() : "";
  const quoteStatus =
    quote && typeof (quote as ParsedDriverOrderQuote & StatusCarrier).status === "string"
      ? String((quote as ParsedDriverOrderQuote & StatusCarrier).status).trim()
      : "";
  return resolveDriverRawStatus({
    matchStatus,
    quoteStatus,
  });
}

export function formatDriverOrderPrice(value: unknown): string {
  return formatKrw(value, "");
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

function buildVehicleText(quote: ParsedDriverOrderQuote | null): string | undefined {
  if (!quote) return undefined;

  const ton = normalizeVehicleType(quote.vehicleType);
  const body = normalizeVehicleBodyType(quote.vehicleBodyType);
  const text = [ton, body].filter(Boolean).join(" ");
  return text || undefined;
}

function buildMethodText(quote: ParsedDriverOrderQuote | null): string | undefined {
  if (!quote) return undefined;

  const load = toText(formatWorkMethodLabel(quote.loadMethod ?? ""));
  const unload = toText(formatWorkMethodLabel(quote.unloadMethod ?? ""));
  if (!load && !unload) return undefined;
  if (!load) return unload;
  if (!unload) return load;
  return `${load} / ${unload}`;
}

function buildCargoText(quote: ParsedDriverOrderQuote | null): string | undefined {
  if (!quote) return undefined;
  return toOptionalText(quote.cargoName) ?? toOptionalText(quote.cargoDesc) ?? toOptionalText(quote.cargoType);
}

function resolvePrice(quote: ParsedDriverOrderQuote | null): { priceValue?: number; priceText?: string } {
  if (!quote) return {};

  const finalPrice = Number.isFinite(quote.finalPrice) ? quote.finalPrice : undefined;
  const desiredPrice = Number.isFinite(quote.desiredPrice) ? quote.desiredPrice : undefined;
  const basePrice = Number.isFinite(quote.basePrice) ? quote.basePrice : undefined;
  const value =
    (finalPrice && finalPrice > 0 ? finalPrice : undefined) ??
    (desiredPrice && desiredPrice > 0 ? desiredPrice : undefined) ??
    (basePrice && basePrice > 0 ? basePrice : undefined) ??
    0;
  if (value <= 0) return {};

  return {
    priceValue: Math.trunc(value),
    priceText: formatDriverOrderPrice(value),
  };
}

export function buildDriverOrderTags(
  tagKeys: readonly MockFlowDriverOrderTagKey[],
  filterLabels: DriverOrderTagLabelMap
): DriverOrderTag[] {
  return Array.from(new Set(tagKeys))
    .map((key) => ({ key, label: filterLabels[key] }))
    .filter((item): item is DriverOrderTag => Boolean(item.label));
}

export function mapDriverOrderCard(input: DriverOrderCardMapperInput): DriverOrderCard {
  const { source, mode, filterLabels } = input;
  const { matchId, quoteId, status, accepted, createdAt, updatedAt, quote, scope, index, seed } = source;
  const mockDecoration = mode === "mock" ? selectMockFlowDriverOrderDecoration(seed, scope) : null;

  const rawStatus = resolveDriverOrderRawStatus(status, quote);
  const uiState = getDriverUiStateFromStatusPayload({
    scope,
    accepted,
    matchStatus: status,
    quoteStatus: quote?.status,
  });
  const statusBadge = getDriverBadge(uiState);
  const cta = getDriverCta(uiState, true);
  const statusLabel = statusBadge.label;
  const requestedAtText = formatDateTime(createdAt, "");

  const originAddress = toOptionalText(quote?.originAddress) ?? toOptionalText(mockDecoration?.fallbackOriginAddress);
  const destinationAddress =
    toOptionalText(quote?.destinationAddress) ?? toOptionalText(mockDecoration?.fallbackDestinationAddress);
  const routeDistanceText = formatDistance(quote?.distanceKm, "", 1);

  const vehicleText = buildVehicleText(quote) ?? toOptionalText(mockDecoration?.fallbackVehicleText);
  const methodText = buildMethodText(quote) ?? toOptionalText(mockDecoration?.fallbackMethodText);
  const cargoText = buildCargoText(quote) ?? toOptionalText(mockDecoration?.fallbackCargoText);

  const basePrice = resolvePrice(quote);
  const fallbackPrice = mode === "mock" ? Number(mockDecoration?.fallbackPriceValue ?? 0) : 0;
  const priceValue = basePrice.priceValue ?? (fallbackPrice > 0 ? fallbackPrice : undefined);
  const priceText = basePrice.priceText ?? (fallbackPrice > 0 ? formatDriverOrderPrice(fallbackPrice) : undefined);

  const tags = buildDriverOrderTags(mockDecoration?.tagKeys ?? [], filterLabels);
  const pickupTimeText = toOptionalText(mockDecoration?.pickupTimeText);
  const emptyDistanceText = toOptionalText(mockDecoration?.emptyDistanceText);
  const sortTimestamp = toSortTimestamp(updatedAt) || toSortTimestamp(createdAt);

  return {
    cardKey: `${scope}-${matchId}-${index}`,
    matchId,
    quoteId,
    status: rawStatus,
    uiState,
    statusLabel,
    statusTone: statusBadge.tone,
    cta,
    requestedAtText: requestedAtText || undefined,
    pickupTimeText: pickupTimeText || undefined,
    originAddress,
    destinationAddress,
    originLat: quote?.originLat,
    originLng: quote?.originLng,
    destinationLat: quote?.destinationLat,
    destinationLng: quote?.destinationLng,
    routeDistanceText: routeDistanceText || undefined,
    weightKg: quote?.weightKg,
    volumeCbm: quote?.volumeCbm,
    allowCombine: quote?.allowCombine,
    vehicleText,
    methodText,
    cargoText,
    emptyDistanceText,
    priceText,
    priceValue,
    sortTimestamp,
    tags,
  };
}

export function sortDriverOrderCards(items: DriverOrderCard[]): DriverOrderCard[] {
  return [...items].sort((a, b) => {
    const byStatus = getDriverOrderSortPriority(a.uiState) - getDriverOrderSortPriority(b.uiState);
    if (byStatus !== 0) return byStatus;
    const byTime = (b.sortTimestamp ?? 0) - (a.sortTimestamp ?? 0);
    if (byTime !== 0) return byTime;
    return b.matchId - a.matchId;
  });
}
