type LatLng = {
  lat: number;
  lng: number;
};

type ResolveAddressCoordinatesInput = {
  addressText?: string;
  placeId?: string;
  details?: unknown;
};

type ResolveAddressCoordinatesResult = {
  coordinates: LatLng | null;
  source: "details" | "place-details" | "geocoding" | "none";
  errorMessage?: string;
  debug?: ResolveAddressCoordinatesDebug;
};

type AnyObj = Record<string, unknown>;

type ResolveAddressCoordinatesDebug = {
  keyPresent: boolean;
  detailsCoordinateFound: boolean;
  placeIdProvided: boolean;
  addressProvided: boolean;
  placeDetailsStatus?: string;
  geocodingStatus?: string;
  placeDetailsHttpOk?: boolean;
  geocodingHttpOk?: boolean;
};

type GoogleLookupResult = {
  coordinates: LatLng | null;
  status: string;
  httpOk: boolean;
  errorMessage?: string;
};

const GOOGLE_KEY_CANDIDATES = [
  "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY",
  "EXPO_PUBLIC_GOOGLE_PLACES_API_KEY",
  "EXPO_PUBLIC_GOOGLE_API_KEY",
] as const;

function asObject(input: unknown): AnyObj {
  return typeof input === "object" && input !== null && !Array.isArray(input) ? (input as AnyObj) : {};
}

function safeString(input: unknown, fallback = ""): string {
  if (typeof input === "string") return input.trim();
  if (typeof input === "number" || typeof input === "boolean") return String(input);
  return fallback;
}

function safeNumber(input: unknown): number | null {
  const value = typeof input === "number" ? input : Number(input);
  return Number.isFinite(value) ? value : null;
}

function isValidCoordinate(lat: number, lng: number): boolean {
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  return true;
}

function toLatLng(lat: unknown, lng: unknown): LatLng | null {
  const safeLat = safeNumber(lat);
  const safeLng = safeNumber(lng);
  if (safeLat === null || safeLng === null) return null;
  if (!isValidCoordinate(safeLat, safeLng)) return null;
  return { lat: safeLat, lng: safeLng };
}

function readLatLngFromGoogleLocation(input: unknown): LatLng | null {
  const source = asObject(input);
  const latValue = source.lat;
  const lngValue = source.lng;

  const lat = typeof latValue === "function" ? safeNumber((latValue as () => unknown)()) : latValue;
  const lng = typeof lngValue === "function" ? safeNumber((lngValue as () => unknown)()) : lngValue;
  return toLatLng(lat, lng);
}

function extractLatLngFromDetails(details: unknown): LatLng | null {
  const source = asObject(details);
  const geometry = asObject(source.geometry);
  const location = geometry.location;
  return readLatLngFromGoogleLocation(location);
}

function getGoogleApiKey(): string {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } })?.process?.env ?? {};
  for (const key of GOOGLE_KEY_CANDIDATES) {
    const value = safeString(env?.[key], "");
    if (value) return value;
  }
  return "";
}

export function hasGoogleApiKeyConfigured(): boolean {
  return getGoogleApiKey().length > 0;
}

function buildUrl(base: string, params: Record<string, string>): string {
  const query = Object.entries(params)
    .filter(([, value]) => Boolean(value))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  return query ? `${base}?${query}` : base;
}

async function requestJson(url: string): Promise<{ payload: AnyObj; httpOk: boolean }> {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    const body = response.ok ? await response.json() : null;
    return {
      payload: asObject(body),
      httpOk: response.ok,
    };
  } catch {
    return {
      payload: { status: "NETWORK_ERROR" },
      httpOk: false,
    };
  }
}

async function fetchPlaceDetailsLatLng(placeId: string, apiKey: string): Promise<GoogleLookupResult> {
  const url = buildUrl("https://maps.googleapis.com/maps/api/place/details/json", {
    place_id: placeId,
    fields: "geometry/location,place_id,formatted_address",
    language: "ko",
    key: apiKey,
  });

  const result = await requestJson(url);
  const payload = result.payload;
  const status = safeString(payload.status, result.httpOk ? "UNKNOWN_STATUS" : "HTTP_ERROR");
  if (status !== "OK") {
    return {
      coordinates: null,
      status,
      httpOk: result.httpOk,
      errorMessage: safeString(payload.error_message, ""),
    };
  }

  return {
    coordinates: extractLatLngFromDetails(payload.result),
    status,
    httpOk: result.httpOk,
    errorMessage: safeString(payload.error_message, ""),
  };
}

async function fetchGeocodedLatLng(addressText: string, apiKey: string): Promise<GoogleLookupResult> {
  const url = buildUrl("https://maps.googleapis.com/maps/api/geocode/json", {
    address: addressText,
    language: "ko",
    key: apiKey,
  });

  const result = await requestJson(url);
  const payload = result.payload;
  const status = safeString(payload.status, result.httpOk ? "UNKNOWN_STATUS" : "HTTP_ERROR");
  if (status !== "OK") {
    return {
      coordinates: null,
      status,
      httpOk: result.httpOk,
      errorMessage: safeString(payload.error_message, ""),
    };
  }

  const results = Array.isArray(payload.results) ? payload.results : [];
  const first = results[0];
  const geometry = asObject(asObject(first).geometry);
  return {
    coordinates: readLatLngFromGoogleLocation(geometry.location),
    status,
    httpOk: result.httpOk,
    errorMessage: safeString(payload.error_message, ""),
  };
}

export async function resolveAddressCoordinates(
  input: ResolveAddressCoordinatesInput
): Promise<ResolveAddressCoordinatesResult> {
  const addressText = safeString(input?.addressText, "");
  const placeId = safeString(input?.placeId, "");

  const debug: ResolveAddressCoordinatesDebug = {
    keyPresent: false,
    detailsCoordinateFound: false,
    placeIdProvided: placeId.length > 0,
    addressProvided: addressText.length > 0,
  };

  const fromDetails = extractLatLngFromDetails(input?.details);
  if (fromDetails) {
    debug.detailsCoordinateFound = true;
    return { coordinates: fromDetails, source: "details", debug };
  }

  const apiKey = getGoogleApiKey();
  debug.keyPresent = apiKey.length > 0;
  if (!apiKey) {
    return {
      coordinates: null,
      source: "none",
      errorMessage: "지도 API 설정이 없어 좌표를 확인할 수 없습니다.",
      debug,
    };
  }

  if (placeId) {
    const fromPlaceDetails = await fetchPlaceDetailsLatLng(placeId, apiKey);
    debug.placeDetailsStatus = fromPlaceDetails.status;
    debug.placeDetailsHttpOk = fromPlaceDetails.httpOk;
    if (fromPlaceDetails.coordinates) {
      return { coordinates: fromPlaceDetails.coordinates, source: "place-details", debug };
    }
  }

  if (addressText) {
    const fromGeocoding = await fetchGeocodedLatLng(addressText, apiKey);
    debug.geocodingStatus = fromGeocoding.status;
    debug.geocodingHttpOk = fromGeocoding.httpOk;
    if (fromGeocoding.coordinates) {
      return { coordinates: fromGeocoding.coordinates, source: "geocoding", debug };
    }

    const serverError = (fromGeocoding.errorMessage ?? "").trim();
    if (serverError) {
      return {
        coordinates: null,
        source: "none",
        errorMessage: `좌표 조회 실패(${fromGeocoding.status})`,
        debug,
      };
    }
  }

  return {
    coordinates: null,
    source: "none",
    errorMessage: "선택한 주소의 좌표를 찾지 못했습니다.",
    debug,
  };
}

export type {
  LatLng,
  ResolveAddressCoordinatesDebug,
  ResolveAddressCoordinatesInput,
  ResolveAddressCoordinatesResult,
};
