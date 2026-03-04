import type { QuoteDetailResponse } from "@/entities/quote/model/quote.types";
import type { LoadPlanResponse } from "@/shared/api/generated/schemas/loadPlanResponse";
import type { TruckSpecReferenceResponse } from "@/shared/api/generated/schemas/truckSpecReferenceResponse";

import type { DriverMatchItem } from "./shipper-match-api";

/**
 * Driver orders parser boundary
 * - Generated/API 응답에서 들어온 match/quote 원본을 최소 정규화한다.
 * - nullable/basic coercion(id, status, date source, 숫자 안전값)만 담당한다.
 * - 카드 문구/태그/정렬 같은 표현 정책은 mapper로 넘긴다.
 * - parser는 UI 파생값을 만들지 않는다.
 */
export type DriverOrderScope = "market" | "my";

export type ParsedDriverOrderQuote = {
  status?: string;
  originAddress?: string;
  destinationAddress?: string;
  originLat?: number;
  originLng?: number;
  destinationLat?: number;
  destinationLng?: number;
  distanceKm?: number;
  weightKg?: number;
  volumeCbm?: number;
  allowCombine?: boolean;
  vehicleType?: string;
  vehicleBodyType?: string;
  loadMethod?: string;
  unloadMethod?: string;
  cargoName?: string;
  cargoType?: string;
  cargoDesc?: string;
  basePrice?: number;
  desiredPrice?: number;
  finalPrice?: number;
};

export type ParsedDriverOrderSource = {
  scope: DriverOrderScope;
  index: number;
  seed: number;
  matchId: number;
  quoteId?: number;
  accepted?: boolean;
  status: string;
  matchGroupKey?: string;
  matchGroupType?: string;
  matchGroupOrder?: number;
  createdAt?: string;
  updatedAt?: string;
  quote: ParsedDriverOrderQuote | null;
  /** 적재 계획 — 매칭 응답에 포함된 경우에만 존재 */
  loadPlan?: LoadPlanResponse;
  /** 차량 스펙 — 매칭 응답에 포함된 경우에만 존재 */
  truckSpec?: TruckSpecReferenceResponse;
};

export function parseDriverOrderPositiveInt(value: unknown): number {
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

function toOptionalDistance(value: unknown): number | undefined {
  const distance = Number(value);
  if (!Number.isFinite(distance) || distance <= 0) return undefined;
  return distance;
}

function parseDriverOrderQuote(quote: QuoteDetailResponse | null): ParsedDriverOrderQuote | null {
  if (!quote) return null;

  return {
    status: toOptionalText(quote.status),
    originAddress: toOptionalText(quote.originAddress),
    destinationAddress: toOptionalText(quote.destinationAddress),
    originLat: toOptionalNumber(quote.originLat),
    originLng: toOptionalNumber(quote.originLng),
    destinationLat: toOptionalNumber(quote.destinationLat),
    destinationLng: toOptionalNumber(quote.destinationLng),
    distanceKm: toOptionalDistance(quote.distanceKm),
    weightKg: toOptionalNumber(quote.weightKg),
    volumeCbm: toOptionalNumber(quote.volumeCbm),
    allowCombine: typeof quote.allowCombine === "boolean" ? quote.allowCombine : undefined,
    vehicleType: toOptionalText(quote.vehicleType),
    vehicleBodyType: toOptionalText(quote.vehicleBodyType),
    loadMethod: toOptionalText(quote.loadMethod),
    unloadMethod: toOptionalText(quote.unloadMethod),
    cargoName: toOptionalText(quote.cargoName),
    cargoType: toOptionalText(quote.cargoType),
    cargoDesc: toOptionalText(quote.cargoDesc),
    basePrice: toOptionalNumber(quote.basePrice),
    desiredPrice: toOptionalNumber(quote.desiredPrice),
    finalPrice: toOptionalNumber(quote.finalPrice),
  };
}

export function parseDriverOrderSource(input: {
  match: DriverMatchItem;
  quote: QuoteDetailResponse | null;
  scope: DriverOrderScope;
  index: number;
}): ParsedDriverOrderSource {
  const { match, quote, scope, index } = input;
  const matchId = parseDriverOrderPositiveInt(match.matchId);
  const quoteIdFromMatch = parseDriverOrderPositiveInt(match.quoteId);
  const quoteIdFromQuote = parseDriverOrderPositiveInt(quote?.quoteId);
  const quoteId = quoteIdFromMatch || quoteIdFromQuote || 0;
  const seed = matchId || quoteId || index + 1;
  const rawStatus = typeof match.status === "string" ? match.status.trim() : "";
  const matchGroupOrder = parseDriverOrderPositiveInt(match.matchGroupOrder);

  return {
    scope,
    index,
    seed,
    matchId,
    quoteId: quoteId > 0 ? quoteId : undefined,
    accepted: typeof match.accepted === "boolean" ? match.accepted : undefined,
    status: rawStatus,
    matchGroupKey: toOptionalText(match.matchGroupKey),
    matchGroupType: toOptionalText(match.matchGroupType),
    matchGroupOrder: matchGroupOrder > 0 ? matchGroupOrder : undefined,
    createdAt: toOptionalText(match.createdAt),
    updatedAt: toOptionalText(match.updatedAt),
    quote: parseDriverOrderQuote(quote),
    loadPlan: match.loadPlan,
    truckSpec: match.truckSpec,
  };
}

export function collectDriverOrderQuoteIds(matches: readonly DriverMatchItem[]): number[] {
  return Array.from(
    new Set(
      matches
        .map((match) => parseDriverOrderPositiveInt(match.quoteId))
        .filter((quoteId) => quoteId > 0)
    )
  );
}
