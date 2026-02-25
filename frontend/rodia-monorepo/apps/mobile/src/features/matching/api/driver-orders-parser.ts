import type { QuoteDetailResponse } from "@/entities/quote/model/quote.types";
import { normalizeStatus } from "@/shared/lib/policy";

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
  originAddress?: string;
  destinationAddress?: string;
  distanceKm?: number;
  vehicleType?: string;
  vehicleBodyType?: string;
  loadMethod?: string;
  unloadMethod?: string;
  cargoName?: string;
  desiredPrice?: number;
  finalPrice?: number;
};

export type ParsedDriverOrderSource = {
  scope: DriverOrderScope;
  index: number;
  seed: number;
  matchId: number;
  quoteId?: number;
  status: string;
  createdAt?: string;
  quote: ParsedDriverOrderQuote | null;
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
    originAddress: toOptionalText(quote.originAddress),
    destinationAddress: toOptionalText(quote.destinationAddress),
    distanceKm: toOptionalDistance(quote.distanceKm),
    vehicleType: toOptionalText(quote.vehicleType),
    vehicleBodyType: toOptionalText(quote.vehicleBodyType),
    loadMethod: toOptionalText(quote.loadMethod),
    unloadMethod: toOptionalText(quote.unloadMethod),
    cargoName: toOptionalText(quote.cargoName),
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

  return {
    scope,
    index,
    seed,
    matchId,
    quoteId: quoteId > 0 ? quoteId : undefined,
    status: normalizeStatus(match.status ?? ""),
    createdAt: toOptionalText(match.createdAt),
    quote: parseDriverOrderQuote(quote),
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
