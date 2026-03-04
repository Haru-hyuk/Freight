import type { NormalizedRouteStop } from "@/features/driver-reco/model/routeSummary";

export type KakaoRouteLinkBuild = {
  url: string | null;
  totalPoints: number;
  usedPoints: number;
};

type KakaoRoutePoint = {
  name: string;
  lat: number;
  lng: number;
};

export const KAKAO_LINK_MAX_POINTS = 7; // 출발 + 경유 5 + 도착

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toOptionalText(value: unknown): string | undefined {
  const text = toText(value);
  return text || undefined;
}

function toOptionalFiniteNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toKakaoRoutePoints(stops: readonly NormalizedRouteStop[]): KakaoRoutePoint[] {
  return stops
    .map((stop, index) => {
      const lat = toOptionalFiniteNumber(stop.lat);
      const lng = toOptionalFiniteNumber(stop.lng);
      if (lat === undefined || lng === undefined) return null;
      return {
        name: toOptionalText(stop.name) ?? `지점 ${index + 1}`,
        lat,
        lng,
      } satisfies KakaoRoutePoint;
    })
    .filter((entry): entry is KakaoRoutePoint => entry !== null);
}

export function buildKakaoDirectionsUrl(stops: readonly NormalizedRouteStop[]): KakaoRouteLinkBuild {
  const points = toKakaoRoutePoints(stops);
  if (points.length < 2) {
    return { url: null, totalPoints: points.length, usedPoints: points.length };
  }

  const limitedPoints = points.slice(0, KAKAO_LINK_MAX_POINTS);
  const path = limitedPoints
    .map((point) => `${encodeURIComponent(point.name)},${point.lat},${point.lng}`)
    .join("/");

  return {
    url: `https://map.kakao.com/link/by/car/${path}`,
    totalPoints: points.length,
    usedPoints: limitedPoints.length,
  };
}
