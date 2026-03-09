import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Linking, StyleSheet, View } from "react-native";
import WebView from "react-native-webview";

import type { NormalizedRouteStop } from "@/features/driver-reco/model/routeSummary";
import { getDirections } from "@/shared/api/generated/kakao-directions/kakao-directions";
import { getPublicConfig } from "@/shared/api/generated/public-config/public-config";
import { safeNumber, safeString } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppText } from "@/shared/ui/kit/AppText";

type RecoRouteWebViewProps = {
  stops: NormalizedRouteStop[];
  loading: boolean;
  externalUrl?: string | null;
  markerIconUriByType?: Partial<Record<string, string>>;
  fill?: boolean;
};

type RouteStopPoint = {
  name: string;
  lat: number;
  lng: number;
  type?: string;
};

type RoutePathPoint = {
  lat: number;
  lng: number;
};

const MAP_HEIGHT = 240;
const ROUTE_PATH_CACHE_MAX = 40;

let cachedKakaoJsAppKey: string | null = null;
let kakaoJsAppKeyRequest: Promise<string> | null = null;
const routePathCache = new Map<string, RoutePathPoint[]>();
const routePathRequestCache = new Map<string, Promise<RoutePathPoint[]>>();

const useStyles = createThemedStyles((theme) => {
  const cBorder = safeString(theme?.colors?.borderDefault, "#E2E8F0");
  const spacing = safeNumber(theme?.layout?.spacing?.base, 4);
  return StyleSheet.create({
    frame: {
      height: MAP_HEIGHT,
      borderRadius: 10,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: cBorder,
      backgroundColor: theme.colors.bgSurface,
    },
    frameFill: {
      height: undefined,
      flex: 1,
      borderRadius: 0,
      borderWidth: 0,
    },
    webView: {
      flex: 1,
      backgroundColor: theme.colors.bgSurface,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.colors.bgSurface,
      gap: spacing,
      paddingHorizontal: spacing * 3,
    },
    externalLink: {
      color: theme.colors.brandPrimary,
      textDecorationLine: "underline" as const,
    },
  });
});

function toSafeStops(stops: NormalizedRouteStop[]): RouteStopPoint[] {
  return (Array.isArray(stops) ? stops : [])
    .map((stop, index) => {
      const lat = Number(stop.lat);
      const lng = Number(stop.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      if (lat === 0 || lng === 0) return null;
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
      const nextType = typeof stop.type === "string" ? stop.type : undefined;
      return {
        name: String(stop.name ?? `지점 ${index + 1}`).trim() || `지점 ${index + 1}`,
        lat,
        lng,
        ...(nextType ? { type: nextType } : {}),
      } as RouteStopPoint;
    })
    .filter((entry): entry is RouteStopPoint => entry !== null);
}

function parseDirectionsVertices(raw: unknown): RoutePathPoint[] {
  try {
    const json = (typeof raw === "string" ? JSON.parse(raw) : raw) as {
      routes?: Array<{
        sections?: Array<{
          roads?: Array<{ vertexes?: number[] }>;
        }>;
      }>;
    };

    const routes = Array.isArray(json?.routes) ? json.routes : [];
    const sections = Array.isArray(routes[0]?.sections) ? routes[0].sections : [];
    const result: RoutePathPoint[] = [];

    sections.forEach((section) => {
      const roads = Array.isArray(section?.roads) ? section.roads : [];
      roads.forEach((road) => {
        const vertexes = Array.isArray(road?.vertexes) ? road.vertexes : [];
        for (let i = 0; i + 1 < vertexes.length; i += 2) {
          const lng = Number(vertexes[i]);
          const lat = Number(vertexes[i + 1]);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
          const prev = result[result.length - 1];
          if (prev && Math.abs(prev.lat - lat) < 1e-7 && Math.abs(prev.lng - lng) < 1e-7) continue;
          result.push({ lat, lng });
        }
      });
    });

    return result;
  } catch {
    return [];
  }
}

function buildRoutePathCacheKey(stops: RouteStopPoint[]): string {
  if (stops.length < 2) return "";
  return stops
    .map((stop) => `${stop.type ?? ""}:${stop.lat.toFixed(6)},${stop.lng.toFixed(6)}`)
    .join("|");
}

function setRoutePathCache(cacheKey: string, path: RoutePathPoint[]): void {
  if (!cacheKey) return;
  if (routePathCache.has(cacheKey)) {
    routePathCache.delete(cacheKey);
  }
  routePathCache.set(cacheKey, path);
  if (routePathCache.size <= ROUTE_PATH_CACHE_MAX) return;
  const oldestKey = routePathCache.keys().next().value;
  if (!oldestKey) return;
  routePathCache.delete(oldestKey);
}

async function resolveKakaoJsAppKey(): Promise<string> {
  if (cachedKakaoJsAppKey) return cachedKakaoJsAppKey;
  if (!kakaoJsAppKeyRequest) {
    kakaoJsAppKeyRequest = getPublicConfig()
      .then((config) => String(config?.kakaoJsAppKey ?? "").trim())
      .catch(() => "")
      .finally(() => {
        kakaoJsAppKeyRequest = null;
      });
  }
  const key = await kakaoJsAppKeyRequest;
  if (key) {
    cachedKakaoJsAppKey = key;
  }
  return key;
}

async function loadRoutePathByStops(stops: RouteStopPoint[]): Promise<RoutePathPoint[]> {
  if (stops.length < 2) return [];

  const segments: RoutePathPoint[] = [];
  for (let i = 0; i < stops.length - 1; i += 1) {
    const from = stops[i];
    const to = stops[i + 1];

    try {
      const raw = await getDirections({
        origin: `${from.lng},${from.lat}`,
        destination: `${to.lng},${to.lat}`,
      });
      const path = parseDirectionsVertices(raw);
      if (path.length <= 0) continue;

      if (segments.length > 0) {
        const first = path[0];
        const last = segments[segments.length - 1];
        if (last && Math.abs(last.lat - first.lat) < 1e-7 && Math.abs(last.lng - first.lng) < 1e-7) {
          segments.push(...path.slice(1));
        } else {
          segments.push(...path);
        }
      } else {
        segments.push(...path);
      }
    } catch {
      // Segment failure is ignored; straight-line fallback will be used.
    }
  }

  return segments;
}

function buildKakaoMapHtml(
  appKey: string,
  safeStops: RouteStopPoint[],
  routePath: RoutePathPoint[],
  markerIconUriByType: Partial<Record<string, string>>
): string {
  const pointsJson = JSON.stringify(safeStops);
  const routePathJson = JSON.stringify(routePath);
  const markerIconUriByTypeJson = JSON.stringify(markerIconUriByType ?? {});
  const sdkUrl = `https://dapi.kakao.com/v2/maps/sdk.js?autoload=false&appkey=${encodeURIComponent(appKey)}`;

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <style>
      html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #fff; }
      .msg { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #64748b; font-size: 14px; }
    </style>
    <script src="${sdkUrl}"></script>
  </head>
  <body>
    <div id="map"></div>
    <script>
      (function () {
        const points = ${pointsJson};
        const routePath = ${routePathJson};
        const markerIconUriByType = ${markerIconUriByTypeJson};
        if (!window.kakao || !window.kakao.maps || points.length < 2) {
          document.getElementById("map").innerHTML = '<div class="msg">경로를 표시할 수 없습니다.</div>';
          return;
        }
        window.kakao.maps.load(function () {
          const mapNode = document.getElementById("map");
          const center = new kakao.maps.LatLng(points[0].lat, points[0].lng);
          const map = new kakao.maps.Map(mapNode, { center, level: 7 });
          const bounds = new kakao.maps.LatLngBounds();
          const path = [];

          if (Array.isArray(routePath) && routePath.length > 1) {
            routePath.forEach(function (p) {
              if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return;
              const pos = new kakao.maps.LatLng(p.lat, p.lng);
              bounds.extend(pos);
              path.push(pos);
            });
          }

          points.forEach(function (p, idx) {
            const pos = new kakao.maps.LatLng(p.lat, p.lng);
            bounds.extend(pos);

            const markerOptions = { map: map, position: pos, title: p.name };
            const markerType = typeof p.type === "string" ? p.type : "";
            const iconUri = markerType ? String(markerIconUriByType[markerType] || "").trim() : "";
            if (iconUri) {
              markerOptions.image = new kakao.maps.MarkerImage(
                iconUri,
                new kakao.maps.Size(30, 30),
                { offset: new kakao.maps.Point(15, 15) }
              );
            }
            new kakao.maps.Marker(markerOptions);
            new kakao.maps.CustomOverlay({
              map: map,
              position: pos,
              yAnchor: 1.6,
              content: '<div style="padding:2px 6px;border-radius:999px;background:#111827;color:#fff;font-size:11px;">' + (idx + 1) + '</div>'
            });
          });

          if (path.length <= 1) {
            points.forEach(function (p) {
              path.push(new kakao.maps.LatLng(p.lat, p.lng));
            });
          }

          new kakao.maps.Polyline({
            map: map,
            path: path,
            strokeWeight: 5,
            strokeColor: "#2563EB",
            strokeOpacity: 0.9,
            strokeStyle: "solid"
          });

          map.setBounds(bounds);
        });
      })();
    </script>
  </body>
</html>`;
}

export function RecoRouteWebView({
  stops,
  loading,
  externalUrl,
  markerIconUriByType = {},
  fill = false,
}: RecoRouteWebViewProps) {
  const theme = useAppTheme();
  const styles = useStyles();
  const [kakaoJsAppKey, setKakaoJsAppKey] = useState<string>("");
  const [webViewFailed, setWebViewFailed] = useState(false);
  const [routePath, setRoutePath] = useState<RoutePathPoint[]>([]);
  const safeStops = useMemo(() => toSafeStops(stops), [stops]);

  useEffect(() => {
    setWebViewFailed(false);
  }, [safeStops]);

  useEffect(() => {
    let cancelled = false;
    const loadConfig = async () => {
      const key = await resolveKakaoJsAppKey();
      if (cancelled) return;
      setKakaoJsAppKey(key);
    };
    void loadConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadRoutePath = async () => {
      if (safeStops.length < 2) {
        setRoutePath([]);
        return;
      }

      const cacheKey = buildRoutePathCacheKey(safeStops);
      if (!cacheKey) {
        setRoutePath([]);
        return;
      }

      const cachedPath = routePathCache.get(cacheKey);
      if (cachedPath) {
        setRoutePath(cachedPath);
        return;
      }

      let pendingRequest = routePathRequestCache.get(cacheKey);
      if (!pendingRequest) {
        pendingRequest = loadRoutePathByStops(safeStops)
          .then((path) => {
            setRoutePathCache(cacheKey, path);
            return path;
          })
          .finally(() => {
            routePathRequestCache.delete(cacheKey);
          });
        routePathRequestCache.set(cacheKey, pendingRequest);
      }

      const path = await pendingRequest;
      if (cancelled) return;
      setRoutePath(path);
    };

    void loadRoutePath();
    return () => {
      cancelled = true;
    };
  }, [safeStops]);

  const handleWebViewError = useCallback(() => {
    setWebViewFailed(true);
  }, []);

  const handleOpenExternal = useCallback(() => {
    const target = String(externalUrl ?? "").trim();
    if (!target) return;
    Linking.openURL(target).catch(() => {});
  }, [externalUrl]);

  const html = useMemo(() => {
    if (!kakaoJsAppKey || safeStops.length < 2) return "";
    return buildKakaoMapHtml(kakaoJsAppKey, safeStops, routePath, markerIconUriByType);
  }, [kakaoJsAppKey, markerIconUriByType, routePath, safeStops]);

  const showFallback = webViewFailed || !html;

  return (
    <View style={[styles.frame, fill ? styles.frameFill : null]}>
      {showFallback ? (
        <View style={styles.overlay}>
          <AppText variant="caption" color="textMuted">
            지도를 표시할 수 없습니다.
          </AppText>
          {externalUrl ? (
            <AppText variant="caption" style={styles.externalLink} onPress={handleOpenExternal}>
              외부 지도 열기
            </AppText>
          ) : null}
        </View>
      ) : (
        <WebView source={{ html }} style={styles.webView} onError={handleWebViewError} />
      )}

      {loading ? (
        <View style={styles.overlay}>
          <ActivityIndicator color={theme.colors.brandPrimary} />
        </View>
      ) : null}
    </View>
  );
}

export default RecoRouteWebView;
