import { formatWorkMethodLabel } from "@/features/quote/model/workMethod";
import {
  BACKEND_STATUS,
  getDriverBadge,
  getDriverUiStateFromBackendStatus,
} from "@/shared/lib/policy";
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
 * TODO: 거리/시간/가격 포맷 공통 유틸 후보는 중복 확인 후 별도 PR에서 분리한다.
 */
type DriverOrderTagLabelMap = Readonly<Record<DriverOrderTagKey, string>>;

type DriverOrderCardMapperInput = {
  source: ParsedDriverOrderSource;
  mode: "mock" | "server";
  filterLabels: DriverOrderTagLabelMap;
};

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toOptionalText(value: unknown): string | undefined {
  const text = toText(value);
  return text || undefined;
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

export function formatDriverOrderPrice(value: unknown): string {
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
  return toOptionalText(quote.cargoName);
}

function resolvePrice(quote: ParsedDriverOrderQuote | null): { priceValue?: number; priceText?: string } {
  if (!quote) return {};

  const finalPrice = Number.isFinite(quote.finalPrice) ? quote.finalPrice : undefined;
  const desiredPrice = Number.isFinite(quote.desiredPrice) ? quote.desiredPrice : undefined;
  const value = (finalPrice && finalPrice > 0 ? finalPrice : desiredPrice) ?? 0;
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
  const { matchId, quoteId, status, createdAt, quote, scope, index, seed } = source;
  const mockDecoration = mode === "mock" ? selectMockFlowDriverOrderDecoration(seed, scope) : null;

  const statusLabel = getDriverBadge(getDriverUiStateFromBackendStatus(status)).label;
  const requestedAtText = formatDateTime(createdAt);

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
  const priceText = basePrice.priceText ?? (fallbackPrice > 0 ? formatDriverOrderPrice(fallbackPrice) : undefined);

  const tags = buildDriverOrderTags(mockDecoration?.tagKeys ?? [], filterLabels);
  const pickupTimeText = toOptionalText(mockDecoration?.pickupTimeText);
  const emptyDistanceText = toOptionalText(mockDecoration?.emptyDistanceText);

  return {
    cardKey: `${scope}-${matchId}-${index}`,
    matchId,
    quoteId,
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

export function sortDriverOrderCards(items: DriverOrderCard[]): DriverOrderCard[] {
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
