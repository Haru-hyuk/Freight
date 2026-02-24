export type LatLng = { lat: number; lng: number };

const EARTH_RADIUS_KM = 6371;

function toFiniteNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function isValidCoord(lat: unknown, lng: unknown): boolean {
  const la = toFiniteNumber(lat);
  const ln = toFiniteNumber(lng);
  if (la == null || ln == null) return false;
  if (Math.abs(la) > 90 || Math.abs(ln) > 180) return false;
  if (Math.abs(la) < 1e-9 && Math.abs(ln) < 1e-9) return false;
  return true;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversineKm(a: LatLng, b: LatLng): number {
  if (!isValidCoord(a?.lat, a?.lng) || !isValidCoord(b?.lat, b?.lng)) return 0;

  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);

  const s =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  const km = EARTH_RADIUS_KM * c;

  return Number.isFinite(km) && km > 0 ? km : 0;
}

export function estimateRouteKm(points: LatLng[]): number {
  if (!Array.isArray(points) || points.length < 2) return 0;

  const validPoints = points.filter((p) => isValidCoord(p?.lat, p?.lng));
  if (validPoints.length < 2) return 0;

  let total = 0;
  for (let i = 1; i < validPoints.length; i += 1) {
    total += haversineKm(validPoints[i - 1], validPoints[i]);
  }

  return Number.isFinite(total) && total > 0 ? total : 0;
}
