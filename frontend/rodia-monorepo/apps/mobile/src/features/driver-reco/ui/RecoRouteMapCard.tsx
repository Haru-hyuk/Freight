import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  selectedStopOrder?: number | null;
  onRetry?(): void;
};

const MAP_MODAL_BASE_HEIGHT_RATIO = 0.8;
const MAP_MODAL_MAX_RAISE_RATIO = 0.12;
const MAP_MODAL_CLOSE_THRESHOLD_RATIO = 0.22;
const MAP_MODAL_MIN_HEIGHT = 360;
const MAP_MODAL_MIN_RAISE = 40;
const MAP_MODAL_MIN_CLOSE_THRESHOLD = 72;
const MAP_MODAL_OVERSCROLL_ALLOWANCE = 32;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const useStyles = createThemedStyles((theme) => {
  const spacing = safeNumber(theme?.layout?.spacing?.base, 4);
  const cBorder = safeString(theme?.colors?.borderDefault, "#E2E8F0");
  const cTextMain = safeString(theme?.colors?.textMain, "#0F172A");
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
      color: theme.colors.textOnBrand,
    },
    limitCaption: {
      color: theme.colors.textMuted,
    },
    mapPreviewWrap: {
      position: "relative",
    },
    mapPreviewDim: {
      opacity: 0.92,
    },
    mapExpandOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: tint(cTextMain, 0.22, cTextMain),
    },
    mapExpandChip: {
      borderRadius: 999,
      paddingHorizontal: spacing * 3,
      paddingVertical: spacing * 1.2,
      backgroundColor: tint(cTextMain, 0.78, cTextMain),
    },
    mapExpandChipText: {
      color: theme.colors.textOnBrand,
    },
    stopRow: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: "transparent",
      backgroundColor: theme.colors.bgSurface,
      paddingHorizontal: spacing * 1.5,
      paddingVertical: spacing,
      gap: spacing * 0.5,
    },
    stopRowSelected: {
      borderColor: tint(theme.colors.brandPrimary, 0.45, cBorder),
      backgroundColor: tint(theme.colors.brandPrimary, 0.08, theme.colors.bgSurface),
    },
    stopText: {
      color: theme.colors.textMain,
    },
    stopTextSelected: {
      color: theme.colors.brandPrimary,
    },
    stopCoord: {
      color: theme.colors.textMuted,
    },
    modalRoot: {
      flex: 1,
      justifyContent: "flex-end",
    },
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: tint(cTextMain, 0.42, cTextMain),
    },
    modalSheet: {
      backgroundColor: theme.colors.bgSurfaceAlt,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      overflow: "hidden",
    },
    modalDragArea: {
      height: spacing * 4,
      alignItems: "center",
      justifyContent: "center",
    },
    modalDragHandle: {
      width: 42,
      height: 4,
      borderRadius: 999,
      backgroundColor: tint(cTextMain, 0.25, cBorder),
    },
    modalHeader: {
      paddingHorizontal: spacing * 4,
      paddingTop: spacing * 2,
      paddingBottom: spacing * 2,
      borderBottomWidth: 1,
      borderBottomColor: tint(cBorder, 0.72, cBorder),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing * 2,
    },
    modalTitle: {
      flex: 1,
    },
    modalCloseBtn: {
      minHeight: 36,
      borderRadius: 999,
      paddingHorizontal: spacing * 3,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.bgSurface,
      borderWidth: 1,
      borderColor: tint(cBorder, 0.8, cBorder),
    },
    modalCloseText: {
      color: theme.colors.textMain,
    },
    modalMapWrap: {
      flex: 1,
    },
  });
});

export function RecoRouteMapCard({
  summaryText,
  stops,
  fallbackStops = [],
  isError = false,
  routeLoading = false,
  selectedStopOrder = null,
  onRetry,
}: RecoRouteMapCardProps) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [isExpanded, setIsExpanded] = useState(false);
  const sheetTranslateY = useRef(new Animated.Value(0)).current;
  const sheetTranslateSnapshotRef = useRef(0);
  const sheetDragStartRef = useRef(0);

  const modalBaseHeight = useMemo(
    () => Math.max(MAP_MODAL_MIN_HEIGHT, Math.round(windowHeight * MAP_MODAL_BASE_HEIGHT_RATIO)),
    [windowHeight]
  );
  const modalMaxRaise = useMemo(
    () => Math.max(MAP_MODAL_MIN_RAISE, Math.round(windowHeight * MAP_MODAL_MAX_RAISE_RATIO)),
    [windowHeight]
  );
  const modalCloseThreshold = useMemo(
    () => Math.max(MAP_MODAL_MIN_CLOSE_THRESHOLD, Math.round(modalBaseHeight * MAP_MODAL_CLOSE_THRESHOLD_RATIO)),
    [modalBaseHeight]
  );

  const animateSheetTo = useCallback(
    (toValue: number) => {
      Animated.spring(sheetTranslateY, {
        toValue,
        useNativeDriver: true,
        speed: 18,
        bounciness: 0,
      }).start();
    },
    [sheetTranslateY]
  );

  const openExpandedModal = useCallback(() => {
    if (isExpanded) return;
    setIsExpanded(true);
  }, [isExpanded]);

  const closeExpandedModal = useCallback(() => {
    Animated.timing(sheetTranslateY, {
      toValue: modalBaseHeight,
      duration: 180,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      setIsExpanded(false);
      sheetTranslateY.setValue(0);
      sheetTranslateSnapshotRef.current = 0;
    });
  }, [modalBaseHeight, sheetTranslateY]);

  useEffect(() => {
    const id = sheetTranslateY.addListener(({ value }) => {
      sheetTranslateSnapshotRef.current = value;
    });
    return () => {
      sheetTranslateY.removeListener(id);
    };
  }, [sheetTranslateY]);

  useEffect(() => {
    if (!isExpanded) return;
    sheetTranslateY.stopAnimation();
    sheetTranslateY.setValue(modalBaseHeight);
    sheetTranslateSnapshotRef.current = modalBaseHeight;
    const frameId = requestAnimationFrame(() => {
      animateSheetTo(0);
    });
    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [animateSheetTo, isExpanded, modalBaseHeight, sheetTranslateY]);

  useEffect(() => {
    return () => {
      sheetTranslateY.stopAnimation();
    };
  }, [sheetTranslateY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          const vertical = Math.abs(gestureState.dy);
          const horizontal = Math.abs(gestureState.dx);
          return vertical > 4 && vertical > horizontal;
        },
        onPanResponderGrant: () => {
          sheetDragStartRef.current = sheetTranslateSnapshotRef.current;
        },
        onPanResponderMove: (_, gestureState) => {
          const next = sheetDragStartRef.current + gestureState.dy;
          const clamped = clamp(
            next,
            -modalMaxRaise,
            modalCloseThreshold + MAP_MODAL_OVERSCROLL_ALLOWANCE
          );
          sheetTranslateY.setValue(clamped);
        },
        onPanResponderRelease: (_, gestureState) => {
          const current = sheetTranslateSnapshotRef.current;
          if (gestureState.vy > 1.1 || current > modalCloseThreshold) {
            closeExpandedModal();
            return;
          }
          if (gestureState.dy < -28 || current < -modalMaxRaise / 2) {
            animateSheetTo(-modalMaxRaise);
            return;
          }
          animateSheetTo(0);
        },
        onPanResponderTerminate: () => {
          const current = sheetTranslateSnapshotRef.current;
          if (current > modalCloseThreshold) {
            closeExpandedModal();
            return;
          }
          animateSheetTo(0);
        },
      }),
    [animateSheetTo, closeExpandedModal, modalCloseThreshold, modalMaxRaise, sheetTranslateY]
  );

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

        <View style={styles.mapPreviewWrap}>
          <View pointerEvents="none" style={styles.mapPreviewDim}>
            <RecoRouteWebView
              stops={effectiveStops}
              loading={false}
              externalUrl={kakaoRouteLink.url}
            />
          </View>
          <Pressable
            style={styles.mapExpandOverlay}
            onPress={openExpandedModal}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <View style={styles.mapExpandChip}>
              <AppText variant="caption" weight="900" style={styles.mapExpandChipText}>
                지도 확대 보기
              </AppText>
            </View>
          </Pressable>
        </View>

        {displayStops.map((stop, index) => {
          const stopOrder = index + 1;
          const isSelected = selectedStopOrder === stopOrder;
          const hasLat =
            typeof stop.lat === "number" &&
            Number.isFinite(stop.lat) &&
            stop.lat !== 0 &&
            stop.lat >= -90 &&
            stop.lat <= 90;
          const hasLng =
            typeof stop.lng === "number" &&
            Number.isFinite(stop.lng) &&
            stop.lng !== 0 &&
            stop.lng >= -180 &&
            stop.lng <= 180;
          const typeLabel = stop.type ? `[${stop.type}] ` : "";
          const title = stop.name || `지점 ${index + 1}`;
          const coordText =
            hasLat && hasLng
              ? `${Number(stop.lat).toFixed(5)}, ${Number(stop.lng).toFixed(5)}`
              : "";
          return (
            <View key={`route-stop-${stopOrder}`} style={[styles.stopRow, isSelected ? styles.stopRowSelected : null]}>
              <AppText variant="caption" weight="700" style={[styles.stopText, isSelected ? styles.stopTextSelected : null]}>
                {`${stopOrder}. ${typeLabel}${title}`}
              </AppText>
              {hasLat && hasLng ? (
                <AppText variant="caption" style={styles.stopCoord}>
                  {coordText}
                </AppText>
              ) : null}
            </View>
          );
        })}

        <Modal
          visible={isExpanded}
          animationType="fade"
          transparent
          statusBarTranslucent
          onRequestClose={closeExpandedModal}
        >
          <View style={styles.modalRoot}>
            <Pressable style={styles.modalBackdrop} onPress={closeExpandedModal} />
            <Animated.View
              style={[
                styles.modalSheet,
                {
                  height: modalBaseHeight,
                  paddingBottom: Math.max(insets.bottom, 8),
                  transform: [{ translateY: sheetTranslateY }],
                },
              ]}
            >
              <View style={styles.modalDragArea} {...panResponder.panHandlers}>
                <View style={styles.modalDragHandle} />
              </View>
              <View style={styles.modalHeader}>
                <AppText variant="detail" weight="800" color="textMain" style={styles.modalTitle}>
                  {displaySummary}
                </AppText>
                <Pressable style={styles.modalCloseBtn} onPress={closeExpandedModal}>
                  <AppText variant="caption" weight="800" style={styles.modalCloseText}>
                    닫기
                  </AppText>
                </Pressable>
              </View>
              <View style={styles.modalMapWrap}>
                <RecoRouteWebView
                  stops={effectiveStops}
                  loading={false}
                  externalUrl={kakaoRouteLink.url}
                  fill
                />
              </View>
            </Animated.View>
          </View>
        </Modal>
      </View>
    );
  }

  // --- Branch 4: no data, not loading, not error → hide ---
  return null;
}

export default RecoRouteMapCard;
