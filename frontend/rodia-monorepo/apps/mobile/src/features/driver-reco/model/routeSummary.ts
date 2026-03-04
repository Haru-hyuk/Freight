// OpenAPI grounding (route-assembly-controller.recommend):
// - POST /api/route-assembly/recommend → RouteAssemblyResponse
// - RouteAssemblyResponse.recommendations: RecommendedRoute[]
// - RecommendedRoute.visitOrder: CargoVisit[]
// - CargoVisit.location: Place { name, address, latitude, longitude }
// - CargoVisit.type: "PICKUP" | "DELIVERY"
// - CargoVisit.address: string (top-level fallback)
// All coordinate field names are schema-grounded: latitude / longitude (not lat/lng).

type AnyObject = Record<string, unknown>;

export type NormalizedRouteStop = {
  name?: string;
  lat?: number;
  lng?: number;
  type?: string;
};

export type NormalizedRouteSummary = {
  summary: string;
  stops: NormalizedRouteStop[];
};

export const ROUTE_INFO_UNAVAILABLE = "경로 정보 제공 없음";

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toOptionalText(value: unknown): string | undefined {
  const text = toText(value);
  return text || undefined;
}

function toPositiveInt(value: unknown): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function toOptionalFiniteNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function asObject(value: unknown): AnyObject {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as AnyObject) : {};
}

function toNormalizedPositiveIntList(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((entry) => toPositiveInt(entry))
        .filter((entry) => entry > 0)
    )
  ).sort((a, b) => a - b);
}

// BFS wrapper search: finds the first object that has a `recommendations` array,
// searching through common API response wrapper keys (data / result / payload / body).
// Handles both direct responses and wrapped responses without silently returning empty.
function findRecommendations(payload: unknown): AnyObject[] {
  const queue: unknown[] = [payload];
  const visited = new Set<AnyObject>();
  while (queue.length > 0) {
    const current = queue.shift();
    const obj = asObject(current);
    if (Object.keys(obj).length === 0) continue;
    if (visited.has(obj)) continue;
    visited.add(obj);
    if (Array.isArray(obj.recommendations)) {
      return obj.recommendations.map((entry) => asObject(entry));
    }
    const wrapperKeys = ["data", "result", "payload", "body", "response"];
    for (const key of wrapperKeys) {
      const nested = obj[key];
      if (nested !== null && nested !== undefined) queue.push(nested);
    }
  }
  return [];
}

export function buildEmptyRouteSummary(): NormalizedRouteSummary {
  return { summary: ROUTE_INFO_UNAVAILABLE, stops: [] };
}

export function normalizeRouteSummary(payload: unknown, selectedQuoteIds: readonly number[]): NormalizedRouteSummary {
  // BFS to find recommendations array regardless of response wrapper depth
  const recommendations = findRecommendations(payload);
  const normalizedSelectedQuoteIds = toNormalizedPositiveIntList(selectedQuoteIds);
  const matchedRecommendation = recommendations.find((recommendation) => {
    const quoteIds = toNormalizedPositiveIntList(recommendation.quoteIds);
    if (quoteIds.length <= 0 || normalizedSelectedQuoteIds.length <= 0) return false;
    if (quoteIds.length !== normalizedSelectedQuoteIds.length) return false;
    return quoteIds.every((quoteId, index) => quoteId === normalizedSelectedQuoteIds[index]);
  });
  // OpenAPI RecommendedRoute에는 selected 플래그가 없어서 quoteIds 매칭 우선으로 선택한다.
  // quoteIds가 없거나 매칭이 없으면 first recommendation fallback을 사용한다.
  const selectedRecommendation = matchedRecommendation ?? asObject(recommendations[0]);
  const visitOrder = Array.isArray(selectedRecommendation.visitOrder) ? selectedRecommendation.visitOrder : [];

  const stops = visitOrder
    .map((entry) => {
      const visit = asObject(entry);
      const location = asObject(visit.location);
      const rawType = toOptionalText(visit.type)?.toUpperCase();
      const type = rawType === "PICKUP" ? "pickup" : rawType === "DELIVERY" ? "dropoff" : undefined;
      // Grounded: Place.latitude / Place.longitude (OpenAPI schema field names)
      const lat =
        toOptionalFiniteNumber(location.latitude) ??
        toOptionalFiniteNumber(location.lat) ??
        toOptionalFiniteNumber(visit.latitude) ??
        toOptionalFiniteNumber(visit.lat);
      const lng =
        toOptionalFiniteNumber(location.longitude) ??
        toOptionalFiniteNumber(location.lng) ??
        toOptionalFiniteNumber(visit.longitude) ??
        toOptionalFiniteNumber(visit.lng);
      const name = toOptionalText(location.name ?? location.address ?? visit.address);

      if (!name && lat === undefined && lng === undefined && !type) return null;
      return { name, lat, lng, type } as NormalizedRouteStop;
    })
    .filter((entry): entry is NormalizedRouteStop => entry !== null);

  if (stops.length >= 2) {
    return {
      summary: `출발 → 도착 · 경유 ${Math.max(0, stops.length - 2)}`,
      stops,
    };
  }

  return buildEmptyRouteSummary();
}
