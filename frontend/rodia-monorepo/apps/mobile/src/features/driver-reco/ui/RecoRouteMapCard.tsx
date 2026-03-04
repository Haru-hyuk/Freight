import React, { useMemo } from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from "react-native";

import {
  KAKAO_LINK_MAX_POINTS,
  buildKakaoDirectionsUrl,
} from "@/features/driver-reco/model/routeKakaoLink";
import type { NormalizedRouteStop } from "@/features/driver-reco/model/routeSummary";
import RecoRouteWebView from "@/features/driver-reco/ui/RecoRouteWebView";
import { safeNumber, safeString, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles } from "@/shared/theme/useAppTheme";
import { AppText } from "@/shared/ui/kit/AppText";

type RecoRouteMapCardProps = {
  /** Summary text from routeSummary (visitOrder-based). */
  summaryText: string;
  /** Stops from routeSummary.visitOrder — used for Kakao URL + stop list. */
  stops: NormalizedRouteStop[];
  /** Fallback stops from quote origin/destination — used when stops.length < 2.
   *  Allows map to render even when route-assembly visitOrder is unavailable. */
  fallbackStops?: NormalizedRouteStop[];
  /** true = server/network error → show retry. */
  isError?: boolean;
  routeLoading?: boolean;
  onRetry?(): void;
};

const useStyles = createThemedStyles((theme) => {
  const spacing = safeNumber(theme?.layout?.spacing?.base, 4);
  const cBorder = safeString(theme?.colors?.borderDefault, "#E2E8F0");
  return StyleSheet.create({
    card: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: tint(cBorder, 0.72, cBorder),
      backgroundColor: tint(cBorder, 0.24, theme.colors.bgSurfaceAlt),
      paddingHorizontal: spacing * 2,
      paddingVertical: spacing * 1.5,
      gap: spacing,
    },
    loadingRow: {
      paddingVertical: spacing * 2,
      alignItems: "center",
    },
    errorRow: {
      gap: spacing,
    },
    retryBtn: {
      alignSelf: "flex-start",
      paddingHorizontal: spacing * 3,
      paddingVertical: spacing * 1.5,
      borderRadius: 8,
      backgroundColor: theme.colors.brandPrimary,
    },
    retryBtnText: {
      color: "#fff",
    },
    limitCaption: {
      color: theme.colors.textMuted,
    },
    stopRow: {
      borderRadius: 8,
      backgroundColor: theme.colors.bgSurface,
      paddingHorizontal: spacing * 1.5,
      paddingVertical: spacing,
      gap: spacing * 0.5,
    },
    stopText: {
      color: theme.colors.textMain,
    },
    stopCoord: {
      color: theme.colors.textMuted,
    },
  });
});

export function RecoRouteMapCard({
  summaryText,
  stops,
  fallbackStops = [],
  isError = false,
  routeLoading = false,
  onRetry,
}: RecoRouteMapCardProps) {
  const styles = useStyles();

  // OpenAPI: route-assembly 스키마에 polyline/mapLink 없음 → client에서 Kakao link/by URL 생성.
  // stops(visitOrder 기반) 우선; 없으면 fallbackStops(quote origin/dest 기반) 사용.
  // 카카오 웹이 폴리라인을 직접 계산하므로 서버 route-assembly가 없어도 지도 표시 가능.
  const effectiveStops = stops.length >= 2 ? stops : fallbackStops;
  const kakaoRouteLink = useMemo(() => buildKakaoDirectionsUrl(effectiveStops), [effectiveStops]);

  // --- Branch 1: loading ---
  if (routeLoading) {
    return (
      <View style={styles.card}>
        <View style={styles.loadingRow}>
          <ActivityIndicator />
        </View>
      </View>
    );
  }

  // --- Branch 2: server/network error ---
  if (isError) {
    return (
      <View style={styles.card}>
        <View style={styles.errorRow}>
          <AppText variant="caption" color="textMuted">
            경로 계산 실패(서버 오류)
          </AppText>
          <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
            <AppText variant="caption" weight="700" style={styles.retryBtnText}>
              다시 시도
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- Branch 3: map available ---
  if (kakaoRouteLink.url) {
    const usingFallback = stops.length < 2;
    const displaySummary = usingFallback ? "출발 → 도착" : summaryText;
    const displayStops = usingFallback ? effectiveStops : stops;

    return (
      <View style={styles.card}>
        <AppText variant="caption" weight="800" color="textMain">
          {displaySummary}
        </AppText>

        {kakaoRouteLink.totalPoints > KAKAO_LINK_MAX_POINTS ? (
          <AppText variant="caption" style={styles.limitCaption}>
            경유지 제한으로 일부 지점만 표시
          </AppText>
        ) : null}

        <RecoRouteWebView
          stops={effectiveStops}
          loading={false}
          externalUrl={kakaoRouteLink.url}
        />

        {displayStops.map((stop, index) => {
          const hasLat = typeof stop.lat === "number" && Number.isFinite(stop.lat);
          const hasLng = typeof stop.lng === "number" && Number.isFinite(stop.lng);
          const typeLabel = stop.type ? `[${stop.type}] ` : "";
          const title = stop.name || `지점 ${index + 1}`;
          const coordText =
            hasLat && hasLng
              ? `${Number(stop.lat).toFixed(5)}, ${Number(stop.lng).toFixed(5)}`
              : "";
          return (
            <View key={`route-stop-${index + 1}`} style={styles.stopRow}>
              <AppText variant="caption" weight="700" style={styles.stopText}>
                {`${index + 1}. ${typeLabel}${title}`}
              </AppText>
              {hasLat && hasLng ? (
                <AppText variant="caption" style={styles.stopCoord}>
                  {coordText}
                </AppText>
              ) : null}
            </View>
          );
        })}
      </View>
    );
  }

  // --- Branch 4: no data, not loading, not error → hide ---
  return null;
}

export default RecoRouteMapCard;
