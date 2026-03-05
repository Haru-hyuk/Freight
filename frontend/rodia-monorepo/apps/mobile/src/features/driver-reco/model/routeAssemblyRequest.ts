// OpenAPI grounding:
// - Quote { quoteId, origin: Place, destination: Place, volumeCbm, weightKg, allowCombine, combineAllowed,
//           finalPrice, scheduledDate, lengthCm, widthCm, heightCm, rotatable, stackable, fragile,
//           noStack, bottomOnly, maxStackWeight, status, handling }
// - Place { name?, address?, latitude?, longitude? }
// - RouteAssemblyRequest { selectedQuoteIds?, candidateQuotes?: Quote[], mode?: "SIMPLE"|"SMART" }
// - candidateQuotes with origin.latitude/longitude is required at runtime (server 500 without it)

import type { QuoteDetailResponse } from "@/entities/quote/model/quote.types";
import type { Quote, RouteAssemblyRequest } from "@/shared/api/generated/schemas";

function toOptionalFinite(v: unknown): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function toOptionalStr(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function toFinite(v: unknown, fallback?: number): number | undefined {
  const n = Number(v);
  if (Number.isFinite(n)) return n;
  return fallback;
}

/** Maps QuoteDetailResponse → generated Quote schema type (schema-grounded fields only). */
export function buildCandidateQuote(q: QuoteDetailResponse): Quote {
  return {
    quoteId: q.quoteId,
    origin: {
      name: toOptionalStr(q.originAddress),
      address: toOptionalStr(q.originAddress),
      latitude: toOptionalFinite(q.originLat),
      longitude: toOptionalFinite(q.originLng),
    },
    destination: {
      name: toOptionalStr(q.destinationAddress),
      address: toOptionalStr(q.destinationAddress),
      latitude: toOptionalFinite(q.destinationLat),
      longitude: toOptionalFinite(q.destinationLng),
    },
    volumeCbm: toOptionalFinite(q.volumeCbm),
    weightKg: toOptionalFinite(q.weightKg),
    allowCombine: q.allowCombine,
    combineAllowed: q.allowCombine,
    finalPrice: toOptionalFinite(q.finalPrice),
    status: q.status,
  };
}

/** Builds a RouteAssemblyRequest grounded in schema.
 *  Populates candidateQuotes so the server can resolve route geometry. */
export function buildRouteAssemblyRequest(params: {
  selectedQuoteIds: number[];
  quotes: QuoteDetailResponse[];
}): RouteAssemblyRequest {
  const { selectedQuoteIds, quotes } = params;
  const selectedIdSet = new Set(selectedQuoteIds);
  const candidateQuotes = quotes
    .filter((q) => selectedIdSet.has(q.quoteId))
    .map(buildCandidateQuote);

  const firstQuote = quotes[0];
  const lastQuote = quotes[quotes.length - 1];
  const currentLat = toFinite(firstQuote?.originLat, 37.5665);
  const currentLng = toFinite(firstQuote?.originLng, 126.978);
  const endLat = toFinite(lastQuote?.destinationLat);
  const endLng = toFinite(lastQuote?.destinationLng);
  const truckId = Number(firstQuote?.truckId);

  const routeMode: RouteAssemblyRequest["mode"] =
    selectedQuoteIds.length > 1 ? "SMART" : "SIMPLE";

  return {
    selectedQuoteIds,
    mode: routeMode,
    driverState: {
      currentLocation: {
        name: toOptionalStr(firstQuote?.originAddress),
        address: toOptionalStr(firstQuote?.originAddress),
        latitude: currentLat,
        longitude: currentLng,
      },
      ...(Number.isFinite(endLat) && Number.isFinite(endLng)
        ? {
            endLocation: {
              name: toOptionalStr(lastQuote?.destinationAddress),
              address: toOptionalStr(lastQuote?.destinationAddress),
              latitude: endLat,
              longitude: endLng,
            },
          }
        : {}),
      ...(Number.isInteger(truckId) && truckId > 0 ? { truckId } : {}),
    },
    ...(candidateQuotes.length > 0 ? { candidateQuotes } : {}),
  };
}
