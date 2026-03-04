import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Linking, StyleSheet, View } from "react-native";
import WebView from "react-native-webview";

import {
  KAKAO_LINK_MAX_POINTS,
  buildKakaoDirectionsUrl,
} from "@/features/driver-reco/model/routeKakaoLink";
import type { NormalizedRouteStop } from "@/features/driver-reco/model/routeSummary";
import { safeNumber, safeString, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppText } from "@/shared/ui/kit/AppText";

type RecoRouteMapCardProps = {
  summaryText: string;
  stops: NormalizedRouteStop[];
};

const useStyles = createThemedStyles((theme) => {
  const spacing = safeNumber(theme?.layout?.spacing?.base, 4);
  const cBorder = safeString(theme?.colors?.borderDefault, "#E2E8F0");
  return StyleSheet.create({
    routeSummaryWrap: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: tint(cBorder, 0.72, cBorder),
      backgroundColor: tint(cBorder, 0.24, theme.colors.bgSurfaceAlt),
      paddingHorizontal: spacing * 2,
      paddingVertical: spacing * 1.5,
      gap: spacing,
    },
    limitCaption: {
      color: theme.colors.textMuted,
    },
    mapFrame: {
      height: 300,
      borderRadius: 10,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: tint(cBorder, 0.9, cBorder),
      backgroundColor: theme.colors.bgSurface,
    },
    mapWebView: {
      flex: 1,
      backgroundColor: theme.colors.bgSurface,
    },
    routeStopRow: {
      borderRadius: 8,
      backgroundColor: theme.colors.bgSurface,
      paddingHorizontal: spacing * 1.5,
      paddingVertical: spacing,
      gap: spacing * 0.5,
    },
    routeStopText: {
      color: theme.colors.textMain,
    },
    routeStopCoord: {
      color: theme.colors.textMuted,
    },
  });
});

export function RecoRouteMapCard({ summaryText, stops }: RecoRouteMapCardProps) {
  const theme = useAppTheme();
  const styles = useStyles();
  const [didFallbackOpen, setDidFallbackOpen] = useState(false);

  // OpenAPI RouteAssemblyResponse.recommendations[].visitOrder[].location.latitude/longitude 좌표를 사용한다.
  // route-assembly 스키마에는 mapLink/polyline 필드가 없어 client에서 Kakao link/by URL을 생성한다.
  // 최대 7개 지점 제한은 Kakao 링크 포맷의 UI 제약이며 OpenAPI 계약 필드는 아니다.
  const kakaoRouteLink = useMemo(() => buildKakaoDirectionsUrl(stops), [stops]);

  useEffect(() => {
    setDidFallbackOpen(false);
  }, [kakaoRouteLink.url]);

  const handleWebViewError = useCallback(() => {
    if (didFallbackOpen) return;
    const routeUrl = kakaoRouteLink.url;
    if (!routeUrl) return;
    setDidFallbackOpen(true);
    Linking.openURL(routeUrl).catch(() => {
      Alert.alert("지도 열기 실패", "지도를 열 수 없습니다. 잠시 후 다시 시도해 주세요.");
    });
  }, [didFallbackOpen, kakaoRouteLink.url]);

  const titleText = summaryText.trim() || "경로 정보 제공 없음";

  return (
    <View style={styles.routeSummaryWrap}>
      <AppText variant="caption" weight="800" color="textMain">
        {titleText}
      </AppText>

      {kakaoRouteLink.totalPoints > KAKAO_LINK_MAX_POINTS ? (
        <AppText variant="caption" style={[styles.limitCaption, { color: theme.colors.textMuted }]}>
          카카오 길찾기는 최대 7개 지점까지 표시됩니다. 앞 7개 지점으로 안내합니다.
        </AppText>
      ) : null}

      {kakaoRouteLink.url ? (
        <View style={styles.mapFrame}>
          <WebView source={{ uri: kakaoRouteLink.url }} style={styles.mapWebView} onError={handleWebViewError} />
        </View>
      ) : null}

      {stops.map((stop, index) => {
        const hasLat = typeof stop.lat === "number" && Number.isFinite(stop.lat);
        const hasLng = typeof stop.lng === "number" && Number.isFinite(stop.lng);
        const typeLabel = stop.type ? `[${stop.type}] ` : "";
        const title = stop.name || `지점 ${index + 1}`;
        const lat = hasLat ? Number(stop.lat) : 0;
        const lng = hasLng ? Number(stop.lng) : 0;
        const coordText = hasLat && hasLng ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : "";
        return (
          <View key={`route-stop-${index + 1}`} style={styles.routeStopRow}>
            <AppText variant="caption" weight="700" style={styles.routeStopText}>
              {`${index + 1}. ${typeLabel}${title}`}
            </AppText>
            {hasLat && hasLng ? (
              <AppText variant="caption" style={styles.routeStopCoord}>
                {coordText}
              </AppText>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

export default RecoRouteMapCard;
