import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useActiveOrder } from "@/entities/order/model/active-order.store";
import {
  acceptDriverMatch,
  buildDriverOrderDetailParams,
  getDriverOrderFilterLabel,
  getDriverQuoteSummaryDetail,
  loadDriverOrdersOverview,
  matchesDriverOrderFilter,
  postCounterOffer,
  probeDriverOrderDetailAccess,
  recommendDriverOrderRoutes,
  type DriverOrderCard,
  type DriverOrderFilterKey,
  type DriverRouteRecommendation,
  type DriverRouteRecommendationAnalysis,
  type DriverRouteRecommendationMode,
  type DriverOrdersOverview,
  type DriverOrdersTabKey,
} from "@/features/matching/api";
import {
  getDriverAcceptedRunGroups,
  pruneDriverAcceptedRunGroups,
} from "@/features/driver-orders/model/acceptedRunGroups";
import { setDriverMarketRecommendationSelection } from "@/features/driver-orders/model/marketRecommendationSelection";
import { DriverOrderUnifiedCard } from "@/features/driver-orders/ui/cards/DriverOrderUnifiedCard";
import {
  DriverRunGroupCard,
  type DriverRunGroupCardModel,
} from "@/features/driver-orders/ui/cards/DriverRunGroupCard";
import CounterOfferModal, { type CounterOfferSubmitPayload } from "@/features/matching/ui/CounterOfferModal";
import { DRIVER_ROUTE_PATH } from "@/features/matching/model/driverRunUiApiGrounding";
import {
  DRIVER_RUN_SYNC_EVENT,
  publishDriverRunSyncEvent,
  subscribeDriverRunSyncEvent,
} from "@/features/matching/model/driverRunSyncEvents";
import { formatKrw } from "@/shared/lib/format/display";
import { readApiErrorMessage } from "@/shared/lib/api/readApiErrorMessage";
import {
  API_ERROR_CODE,
  BADGE_TONE,
  DRIVER_CTA_ID,
  DRIVER_UI_STATE,
  getApiErrorCode,
  type BadgeTone,
  type DriverUiState,
} from "@/shared/lib/policy";
import { safeNumber, safeString, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppEmptyState } from "@/shared/ui/kit/AppEmptyState";
import { AppErrorState } from "@/shared/ui/kit/AppErrorState";
import { AppSpinner } from "@/shared/ui/kit/AppSpinner";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

type DriverOrdersBoardProps = {
  assignedOnly?: boolean;
};

type ToastState = {
  visible: boolean;
  message: string;
};

const NETWORK_ERROR_TEXT = "네트워크 요청이 실패했습니다. 잠시 후 다시 시도해 주세요.";
const TOAST_DURATION_MS = 2000;
const FOCUS_REFETCH_THROTTLE_MS = 1500;
const ROUTE_RECOMMEND_STEPS = [2, 3, 4, 5] as const;
const ROUTE_RECOMMEND_STEP_HINT: Record<(typeof ROUTE_RECOMMEND_STEPS)[number], string> = {
  2: "빠른 운행",
  3: "균형 추천",
  4: "수익 우선",
  5: "최대 탐색",
};
const RUN_STATUS_FILTER_ORDER = ["ALL", "ASSIGNED", "PICKUP", "TRANSIT", "COMPLETED"] as const;

type RunStatusFilterKey = (typeof RUN_STATUS_FILTER_ORDER)[number];
type DriverOrdersListItem =
  | {
      kind: "group";
      key: string;
      group: DriverRunGroupCardModel;
    }
  | {
      kind: "order";
      key: string;
      order: DriverOrderCard;
    };

const RUN_STATUS_FILTER_LABELS: Record<RunStatusFilterKey, string> = {
  ALL: "전체",
  ASSIGNED: "배차완료",
  PICKUP: "상차중",
  TRANSIT: "운송중",
  COMPLETED: "완료",
};

function formatOneDecimal(value: unknown): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return "0.0";
  return num.toLocaleString("ko-KR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function resolveRunStatusFilter(item: DriverOrderCard): RunStatusFilterKey {
  if (item.uiState === DRIVER_UI_STATE.PICKUP_IN_PROGRESS) return "PICKUP";
  if (item.uiState === DRIVER_UI_STATE.TRANSIT_IN_PROGRESS) return "TRANSIT";
  if (item.uiState === DRIVER_UI_STATE.COMPLETED) return "COMPLETED";
  return "ASSIGNED";
}

const EMPTY_OVERVIEW: DriverOrdersOverview = {
  marketOrders: [],
  myOrders: [],
  runOrders: [],
  myCount: 0,
  availableFilters: ["ALL"],
  capability: { supportsRichFilters: false, supportsAiFab: false },
};

function resolveStatusPalette(tone: BadgeTone, colors: Record<string, string>) {
  if (tone === BADGE_TONE.ATTENTION) {
    return {
      bg: tint(colors.brandPrimary, 0.1, colors.bgSurface),
      text: colors.brandPrimary,
    };
  }
  if (tone === BADGE_TONE.PROGRESS) {
    return {
      bg: tint(colors.semanticSuccess, 0.1, colors.bgSurface),
      text: colors.semanticSuccess,
    };
  }
  if (tone === BADGE_TONE.CLOSED) {
    return {
      bg: tint(colors.semanticInfo, 0.1, colors.bgSurface),
      text: colors.semanticInfo,
    };
  }
  return {
    bg: tint(colors.textMuted, 0.1, colors.bgSurface),
    text: colors.textMuted,
  };
}

const useStyles = createThemedStyles((theme) => {
  const spacing = safeNumber(theme?.layout?.spacing?.base, 4);
  const radii = theme?.layout?.radii;
  const buttonSm = theme?.components?.button?.sizes?.sm;
  const buttonLg = theme?.components?.button?.sizes?.lg;
  const cardPaddingMd = safeNumber(theme?.components?.card?.paddingMd, spacing * 5);

  const detailScale = theme?.typography?.scale?.detail;
  const captionScale = theme?.typography?.scale?.caption;
  const titleScale = theme?.typography?.scale?.title;

  const radiusCard = safeNumber(
    theme?.components?.card?.radius,
    safeNumber(radii?.card, spacing * 4)
  );
  const radiusControl = safeNumber(radii?.control, spacing * 3);
  const radiusPill = safeNumber(radii?.pill, 999);

  const cSurface = safeString(theme?.colors?.bgSurface, "#FFFFFF");
  const cSurfaceAlt = safeString(theme?.colors?.bgSurfaceAlt, "#F1F5F9");
  const cLine = safeString(theme?.colors?.borderDefault, "#E2E8F0");
  const cTextMain = safeString(theme?.colors?.textMain, "#0F172A");
  const cTextSub = safeString(theme?.colors?.textSub, "#334155");
  const cTextMuted = safeString(theme?.colors?.textMuted, "#64748B");
  const cPrimary = safeString(theme?.colors?.brandPrimary, "#FF6A00");
  const cOnBrand = safeString(theme?.colors?.textOnBrand, "#FFFFFF");
  const cInfo = safeString(theme?.colors?.semanticInfo, "#3B82F6");
  const cToastBg = tint(cTextMain, 0.9, cTextMain);

  const iosRaised = theme?.elevation?.iosCardRaised;
  const androidRaised = theme?.elevation?.androidCardRaised;

  const createElevation = (opacityScale: number, radiusScale: number, heightScale: number) =>
    Platform.select({
      ios: {
        shadowColor: safeString(iosRaised?.shadowColor, "#000000"),
        shadowOpacity: safeNumber(iosRaised?.shadowOpacity, 0.08) * opacityScale,
        shadowRadius: Math.max(1, safeNumber(iosRaised?.shadowRadius, 8) * radiusScale),
        shadowOffset: {
          width: safeNumber(iosRaised?.shadowOffset?.width, 0),
          height: Math.max(1, safeNumber(iosRaised?.shadowOffset?.height, 2) * heightScale),
        },
      },
      android: {
        elevation: Math.max(1, Math.round(safeNumber(androidRaised?.elevation, 2) * opacityScale)),
      },
      default: {},
    }) ?? {};

  const raisedSoft = createElevation(0.5, 0.5, 0.5);
  const raisedCard = createElevation(1, 1, 1);

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: cSurfaceAlt },

    tabsContainer: {
      flexDirection: "row",
      backgroundColor: tint(cLine, 0.3, cSurfaceAlt),
      borderRadius: radiusControl,
      padding: safeNumber(buttonSm?.paddingY, spacing),
      marginHorizontal: spacing * 4,
      marginTop: spacing * 4,
      marginBottom: spacing * 2,
    },
    tabBtn: {
      flex: 1,
      minHeight: safeNumber(buttonSm?.minHeight, spacing * 9),
      paddingHorizontal: safeNumber(buttonSm?.paddingX, spacing * 4),
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: spacing * 1.5,
      borderRadius: radiusControl,
    },
    tabBtnActive: {
      backgroundColor: cSurface,
      ...(raisedSoft as any),
    },
    tabLabel: {
      color: cTextMuted,
      fontSize: safeNumber(detailScale?.size, 14),
      lineHeight: safeNumber(detailScale?.lineHeight, 20),
      letterSpacing: safeNumber(detailScale?.letterSpacing, 0),
      fontWeight: "700",
    },
    tabLabelActive: { color: cTextMain, fontWeight: "900" },

    tabBadge: {
      backgroundColor: cPrimary,
      paddingHorizontal: spacing * 2,
      paddingVertical: spacing,
      borderRadius: radiusPill,
      minWidth: safeNumber(buttonSm?.minHeight, 36) - spacing * 3,
      alignItems: "center",
    },
    tabBadgeText: {
      color: cOnBrand,
      fontSize: safeNumber(captionScale?.size, 12),
      lineHeight: safeNumber(captionScale?.lineHeight, 16),
      letterSpacing: safeNumber(captionScale?.letterSpacing, 0),
      fontWeight: "900",
    },

    listContent: {
      paddingHorizontal: spacing * 4,
      paddingTop: spacing * 2,
      paddingBottom: spacing * 24,
    },
    separator: { height: spacing * 4 },

    flex1: { flex: 1 },

    cardPressable: {},
    cardWrap: {
      borderRadius: radiusCard,
      padding: cardPaddingMd,
      borderWidth: 0,
    },
    cardPressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },

    // Layout & Alignment (badge + meta)
    cardTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "flex-start",
      marginBottom: cardPaddingMd,
      gap: spacing * 2,
    },
    badge: {
      paddingHorizontal: spacing * 2.5,
      paddingVertical: spacing * 1.5,
      borderRadius: radiusControl,
      flexShrink: 0,
      alignSelf: "flex-start",
    },
    cardTopMeta: {
      flex: 1,
      minWidth: 0,
      marginLeft: spacing * 4,
      alignItems: "flex-end",
      gap: spacing * 0.5,
    },
    timeText: {
      textAlign: "right",
      flexShrink: 1,
    },

    timelineWrap: {
      flexDirection: "row",
      alignItems: "stretch",
      marginBottom: cardPaddingMd,
    },
    rail: { width: spacing * 6, alignItems: "center", marginRight: spacing * 3 },
    dotStart: {
      width: spacing * 3,
      height: spacing * 3,
      borderRadius: spacing * 1.5,
      backgroundColor: cInfo,
      zIndex: 2,
      borderWidth: Math.max(1, Math.round(spacing / 2)),
      borderColor: tint(cInfo, 0.2, cSurface),
    },
    dotEnd: {
      width: spacing * 3,
      height: spacing * 3,
      borderRadius: spacing * 1.5,
      backgroundColor: cPrimary,
      zIndex: 2,
      borderWidth: Math.max(1, Math.round(spacing / 2)),
      borderColor: tint(cPrimary, 0.2, cSurface),
    },
    line: {
      width: Math.max(1, Math.round(spacing / 2)),
      flex: 1,
      backgroundColor: tint(cLine, 0.5, cSurfaceAlt),
      marginVertical: spacing * 0.5,
    },

    addressWrap: { flex: 1, justifyContent: "space-between" },
    addressSpacer: { height: cardPaddingMd },
    distanceWrap: {
      position: "absolute",
      left: spacing * 8,
      top: "50%",
      marginTop: -safeNumber(captionScale?.lineHeight, 16),
    },
    addressBlock: { gap: spacing },
    addressLabel: { color: cTextMuted },
    addressText: { color: cTextMain },

    distanceChip: {
      backgroundColor: tint(cTextMuted, 0.08, cSurface),
      paddingHorizontal: spacing * 2,
      paddingVertical: spacing,
      borderRadius: radiusPill,
    },

    cardBottom: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
      paddingTop: cardPaddingMd,
      borderTopWidth: 1,
      borderTopColor: tint(cLine, 0.5, cSurfaceAlt),
    },
    tagWrap: {
      flex: 1,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing * 1.5,
      paddingRight: spacing * 3,
    },
    specPill: {
      backgroundColor: tint(cTextMuted, 0.06, cSurfaceAlt),
      paddingHorizontal: spacing * 2,
      paddingVertical: spacing,
      borderRadius: radiusControl,
      minHeight: safeNumber(buttonSm?.minHeight, 36) - spacing * 4,
      justifyContent: "center",
    },

    priceWrap: { alignItems: "flex-end", gap: spacing * 0.5 },

    prepareWrap: { marginTop: spacing * 4 },
    prepareBtn: {
      minHeight: safeNumber(buttonLg?.minHeight, spacing * 13),
      borderRadius: safeNumber(buttonLg?.radius, radiusControl),
    },
    dualCtaRow: {
      marginTop: spacing * 4,
      flexDirection: "row",
      gap: spacing * 2,
    },
    dualCtaButton: {
      flex: 1,
      minHeight: safeNumber(buttonLg?.minHeight, spacing * 13),
      borderRadius: safeNumber(buttonLg?.radius, radiusControl),
    },
    negotiatingMetaWrap: {
      marginTop: spacing * 4,
      padding: spacing * 3,
      borderRadius: radiusControl,
      backgroundColor: tint(cTextMuted, 0.06, cSurfaceAlt),
      gap: spacing * 1.5,
    },
    negotiatingMetaRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: spacing * 2,
    },
    negotiatingMetaLabel: {
      flexShrink: 0,
    },
    negotiatingMetaValue: {
      flex: 1,
      textAlign: "right",
    },
    negotiatingMetaMessage: {
      flex: 1,
      textAlign: "right",
    },

    marketRecommendWrap: {
      gap: spacing * 3,
      paddingHorizontal: spacing * 4,
      paddingTop: spacing * 2,
      paddingBottom: spacing * 2,
    },
    marketModeTabs: {
      flexDirection: "row",
      backgroundColor: tint(cLine, 0.3, cSurfaceAlt),
      borderRadius: radiusControl,
      padding: spacing,
      gap: spacing,
    },
    marketModeBtn: {
      flex: 1,
      minHeight: safeNumber(buttonSm?.minHeight, 36),
      borderRadius: radiusControl,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: spacing * 1.5,
    },
    marketModeBtnActive: {
      backgroundColor: cSurface,
      ...(raisedSoft as any),
    },
    marketModeLabel: {
      color: cTextMuted,
      fontSize: safeNumber(detailScale?.size, 14),
      fontWeight: "800",
    },
    marketModeLabelActive: {
      color: cTextMain,
    },
    marketScaleCard: {
      borderRadius: radiusControl,
      borderWidth: 1,
      borderColor: tint(cPrimary, 0.4, cLine),
      backgroundColor: tint(cPrimary, 0.08, cSurface),
      paddingHorizontal: spacing * 3,
      paddingVertical: spacing * 2.5,
      gap: spacing * 2,
    },
    marketScaleHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing * 2,
    },
    marketScaleCaption: {
      color: cTextSub,
      fontSize: safeNumber(captionScale?.size, 12),
      lineHeight: safeNumber(captionScale?.lineHeight, 16),
      fontWeight: "700",
    },
    marketScaleStepRow: {
      flexDirection: "row",
      gap: spacing * 1.5,
    },
    marketScaleStep: {
      flex: 1,
      minHeight: safeNumber(buttonSm?.minHeight, 36),
      borderRadius: radiusPill,
      borderWidth: 1,
      borderColor: tint(cLine, 0.8, cLine),
      backgroundColor: cSurface,
      alignItems: "center",
      justifyContent: "center",
      gap: spacing * 0.5,
    },
    marketScaleStepActive: {
      borderColor: cPrimary,
      backgroundColor: cPrimary,
    },
    marketScaleStepText: {
      color: cTextSub,
      fontSize: safeNumber(captionScale?.size, 12),
      fontWeight: "800",
    },
    marketScaleStepTextActive: {
      color: cOnBrand,
    },
    marketScaleStepHint: {
      color: cTextMuted,
      fontSize: safeNumber(captionScale?.size, 12),
      fontWeight: "700",
    },
    marketScaleStepHintActive: {
      color: tint(cOnBrand, 0.2, cSurface),
    },
    marketRecommendHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing * 2,
      paddingHorizontal: spacing,
    },
    marketRouteList: {
      gap: spacing * 2,
    },
    marketLoadingText: {
      color: cTextMuted,
      fontSize: safeNumber(captionScale?.size, 12),
      fontWeight: "700",
    },
    marketRouteCard: {
      borderRadius: radiusControl,
      borderWidth: 1,
      borderColor: tint(cLine, 0.8, cLine),
      backgroundColor: cSurface,
      paddingHorizontal: spacing * 3,
      paddingVertical: spacing * 2.5,
      gap: spacing * 1.5,
    },
    marketRouteCardSelected: {
      borderColor: cPrimary,
      backgroundColor: tint(cPrimary, 0.08, cSurface),
    },
    marketRouteTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing * 2,
    },
    marketRouteBadge: {
      borderRadius: radiusPill,
      paddingHorizontal: spacing * 2,
      paddingVertical: spacing,
      backgroundColor: tint(cPrimary, 0.2, cSurface),
    },
    marketRouteStatRow: {
      flexDirection: "row",
      gap: spacing * 1.5,
    },
    marketRouteStatChip: {
      flex: 1,
      borderRadius: radiusControl,
      backgroundColor: tint(cLine, 0.3, cSurfaceAlt),
      paddingHorizontal: spacing * 1.5,
      paddingVertical: spacing * 1.2,
      alignItems: "center",
      gap: spacing * 0.5,
    },
    marketRouteHintCard: {
      borderRadius: radiusControl,
      backgroundColor: tint(cInfo, 0.1, cSurface),
      borderWidth: 1,
      borderColor: tint(cInfo, 0.3, cLine),
      paddingHorizontal: spacing * 3,
      paddingVertical: spacing * 2,
    },
    runStatusTabs: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing * 1.5,
      paddingHorizontal: spacing * 4,
      paddingVertical: spacing * 2,
    },
    runStatusBtn: {
      minHeight: safeNumber(buttonSm?.minHeight, 36),
      paddingHorizontal: safeNumber(buttonSm?.paddingX, spacing * 4),
      borderRadius: radiusPill,
      borderWidth: 1,
      borderColor: tint(cLine, 0.8, cLine),
      backgroundColor: cSurface,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: spacing,
      ...(raisedSoft as any),
    },
    runStatusBtnActive: {
      borderColor: cPrimary,
      backgroundColor: tint(cPrimary, 0.08, cSurface),
    },
    runStatusBtnLabel: {
      color: cTextSub,
      fontSize: safeNumber(captionScale?.size, 12),
      lineHeight: safeNumber(captionScale?.lineHeight, 16),
      fontWeight: "800",
    },
    runStatusBtnLabelActive: {
      color: cPrimary,
    },
    runStatusBtnCount: {
      minWidth: spacing * 5,
      paddingHorizontal: spacing,
      paddingVertical: spacing * 0.3,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: tint(cTextMuted, 0.2, cSurfaceAlt),
    },
    runStatusBtnCountActive: {
      backgroundColor: tint(cPrimary, 0.2, cSurface),
    },

    filterScroll: {
      flexDirection: "row",
      paddingHorizontal: spacing * 4,
      paddingVertical: spacing * 2,
    },
    filterChip: {
      minHeight: safeNumber(buttonSm?.minHeight, 36),
      paddingHorizontal: safeNumber(buttonSm?.paddingX, spacing * 4),
      borderRadius: radiusPill,
      borderWidth: 1,
      borderColor: tint(cLine, 0.8, cLine),
      backgroundColor: cSurface,
      alignItems: "center",
      justifyContent: "center",
      marginRight: spacing * 2,
      ...(raisedSoft as any),
    },
    filterChipActive: { borderColor: cTextMain, backgroundColor: cTextMain },
    filterChipText: {
      color: cTextSub,
      fontSize: safeNumber(detailScale?.size, 14),
      lineHeight: safeNumber(detailScale?.lineHeight, 20),
      letterSpacing: safeNumber(detailScale?.letterSpacing, 0),
      fontWeight: "700",
    },
    filterChipTextActive: { color: cOnBrand, fontWeight: "900" },

    errorWrap: { paddingHorizontal: spacing * 5, paddingTop: spacing * 8 },
    refreshBtn: { padding: spacing },

    toastWrap: {
      position: "absolute",
      left: 0,
      right: 0,
      alignItems: "center",
      zIndex: 45,
      pointerEvents: "none",
    },
    toastCard: {
      borderRadius: 999,
      minHeight: safeNumber(buttonSm?.minHeight, 40),
      paddingHorizontal: cardPaddingMd,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: cToastBg,
      ...(raisedCard as any),
    },
    toastText: {
      color: cOnBrand,
      fontSize: safeNumber(detailScale?.size, 14),
      lineHeight: safeNumber(detailScale?.lineHeight, 20),
      letterSpacing: safeNumber(detailScale?.letterSpacing, 0),
      fontWeight: "800",
    },

    // kept for AppText variant="title" parity
    priceValText: {
      color: cPrimary,
      fontSize: safeNumber(titleScale?.size, 22),
      lineHeight: safeNumber(titleScale?.lineHeight, 30),
      fontWeight: "900",
      letterSpacing: safeNumber(titleScale?.letterSpacing, -0.1),
    },
  });
});

type DriverOrdersBoardStyles = ReturnType<typeof useStyles>;

function DriverOrderCardView({
  item,
  onPress,
  onAcceptClick,
  onOfferClick,
  acceptingMatchId,
  isSubmittingOffer,
  activeTab,
  onPrepareClick,
  styles,
  colors,
}: {
  item: DriverOrderCard;
  onPress: (card: DriverOrderCard) => void;
  onAcceptClick: (card: DriverOrderCard) => void;
  onOfferClick: (card: DriverOrderCard) => void;
  acceptingMatchId?: number | null;
  isSubmittingOffer: boolean;
  activeTab: DriverOrdersTabKey;
  onPrepareClick: (card: DriverOrderCard) => void;
  styles: DriverOrdersBoardStyles;
  colors: Record<string, string>;
}) {
  const pal = resolveStatusPalette(item.statusTone, colors);

  const ctaPolicy = item.cta;
  const ctaVariant =
    ctaPolicy.variant === "primary"
      ? "primary"
      : ctaPolicy.variant === "destructive"
        ? "destructive"
        : "secondary";
  const counterOfferPriceText =
    Number.isFinite(item.counterOfferProposedPrice) && Number(item.counterOfferProposedPrice) > 0
      ? formatKrw(Number(item.counterOfferProposedPrice))
      : undefined;
  const counterOfferMessage =
    typeof item.counterOfferMessage === "string" && item.counterOfferMessage.trim()
      ? item.counterOfferMessage.trim()
      : undefined;

  return (
    <Pressable
      onPress={() => onPress(item)}
      style={({ pressed }) => [styles.cardPressable, pressed ? styles.cardPressed : null]}
    >
      <AppCard style={styles.cardWrap} outlined={false} elevated>
        <View style={styles.cardTop}>
          <View style={[styles.badge, { backgroundColor: pal.bg }]}>
            <AppText variant="caption" weight="800" color={pal.text}>
              {item.statusLabel}
            </AppText>
          </View>

          <View style={styles.cardTopMeta}>
            <AppText
              variant="caption"
              weight="700"
              color="textMuted"
              numberOfLines={1}
              style={styles.timeText}
            >
              {item.requestedAtText || ""}
            </AppText>
          </View>
        </View>

        <View style={styles.timelineWrap}>
          <View style={styles.rail}>
            <View style={styles.dotStart} />
            <View style={styles.line} />
            <View style={styles.dotEnd} />
          </View>

          <View style={styles.addressWrap}>
            <View style={styles.addressBlock}>
              <AppText variant="caption" weight="800" color="textMuted" style={styles.addressLabel}>
                출발
              </AppText>
              <AppText
                variant="heading"
                weight="900"
                color="textMain"
                numberOfLines={1}
                style={styles.addressText}
              >
                {item.originAddress || "-"}
              </AppText>
            </View>

            <View style={styles.addressSpacer} />

            <View style={styles.addressBlock}>
              <AppText variant="caption" weight="800" color="textMuted" style={styles.addressLabel}>
                도착
              </AppText>
              <AppText
                variant="heading"
                weight="900"
                color="textMain"
                numberOfLines={1}
                style={styles.addressText}
              >
                {item.destinationAddress || "-"}
              </AppText>
            </View>
          </View>

          {item.routeDistanceText ? (
            <View style={styles.distanceWrap}>
              <View style={styles.distanceChip}>
                <AppText variant="caption" weight="800" color="textSub">
                  {item.routeDistanceText}
                </AppText>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.cardBottom}>
          <View style={styles.tagWrap}>
            {item.tags.map((tag, idx) => (
              <View key={`${tag.label}-${idx}`} style={styles.specPill}>
                <AppText variant="caption" weight="700" color="textSub" numberOfLines={1}>
                  {tag.label}
                </AppText>
              </View>
            ))}
          </View>

          <View style={styles.priceWrap}>
            <AppText variant="caption" weight="800" color="textMuted">
              총 운임
            </AppText>
            <AppText variant="title" weight="900" color="brandPrimary" style={styles.priceValText}>
              {item.priceText || "-"}
            </AppText>
          </View>
        </View>

        {activeTab === "my" && item.uiState === DRIVER_UI_STATE.NEGOTIATING ? (
          <View style={styles.negotiatingMetaWrap}>
            <View style={styles.negotiatingMetaRow}>
              <AppText
                variant="caption"
                weight="800"
                color="textMuted"
                numberOfLines={1}
                style={styles.negotiatingMetaLabel}
              >
                제안 금액
              </AppText>
              <AppText
                variant="detail"
                weight="900"
                color="brandPrimary"
                numberOfLines={1}
                style={styles.negotiatingMetaValue}
              >
                {counterOfferPriceText ?? "-"}
              </AppText>
            </View>
            <View style={styles.negotiatingMetaRow}>
              <AppText
                variant="caption"
                weight="800"
                color="textMuted"
                numberOfLines={1}
                style={styles.negotiatingMetaLabel}
              >
                제안 사유
              </AppText>
              <AppText
                variant="caption"
                weight="700"
                color="textSub"
                numberOfLines={2}
                style={styles.negotiatingMetaMessage}
              >
                {counterOfferMessage ?? "-"}
              </AppText>
            </View>
          </View>
        ) : null}

        {activeTab === "my" &&
        item.uiState === DRIVER_UI_STATE.ASSIGNED &&
        item.cta?.id !== DRIVER_CTA_ID.START_DRIVE ? (
          <View style={styles.prepareWrap}>
            <AppButton
              onPress={ctaPolicy.enabled ? () => onPrepareClick(item) : undefined}
              variant={ctaPolicy.enabled ? ctaVariant : "secondary"}
              disabled={!ctaPolicy.enabled}
              style={styles.prepareBtn}
              title={ctaPolicy.label}
              textStyle={{ fontWeight: "900" }}
            />
          </View>
        ) : activeTab === "market" && item.uiState === DRIVER_UI_STATE.READY_TO_ACCEPT ? (
          <View style={styles.dualCtaRow}>
            <AppButton
              onPress={() => onOfferClick(item)}
              variant="secondary"
              style={styles.dualCtaButton}
              disabled={isSubmittingOffer || acceptingMatchId === item.matchId}
              title="운임 제안"
              textStyle={{ fontWeight: "900" }}
            />
            <AppButton
              onPress={ctaPolicy.enabled ? () => onAcceptClick(item) : undefined}
              variant={ctaPolicy.enabled ? ctaVariant : "secondary"}
              disabled={!ctaPolicy.enabled}
              loading={acceptingMatchId === item.matchId}
              style={styles.dualCtaButton}
              title={ctaPolicy.label}
              textStyle={{ fontWeight: "900" }}
            />
          </View>
        ) : null}
      </AppCard>
    </Pressable>
  );
}

export function DriverOrdersBoard({
  assignedOnly,
}: DriverOrdersBoardProps) {
  const router = useRouter();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { setActiveOrder } = useActiveOrder();

  const [overview, setOverview] = useState<DriverOrdersOverview>(EMPTY_OVERVIEW);
  const [activeFilter, setActiveFilter] = useState<DriverOrderFilterKey>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [acceptingMatchId, setAcceptingMatchId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>({ visible: false, message: "" });
  const [isOfferOpen, setIsOfferOpen] = useState(false);
  const [offerTargetCard, setOfferTargetCard] = useState<DriverOrderCard | null>(null);
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const [offerErrorMessage, setOfferErrorMessage] = useState<string | null>(null);
  const [recommendMode, setRecommendMode] = useState<DriverRouteRecommendationMode>("SINGLE");
  const [maxQuotesPerRoute, setMaxQuotesPerRoute] = useState<number>(5);
  const [isRecommending, setIsRecommending] = useState(false);
  const [recommendAnalysis, setRecommendAnalysis] = useState<DriverRouteRecommendationAnalysis | null>(null);
  const [selectedRecommendKey, setSelectedRecommendKey] = useState<string | null>(null);
  const [runStatusFilter, setRunStatusFilter] = useState<RunStatusFilterKey>("ALL");

  const resolvedActiveTab: DriverOrdersTabKey = assignedOnly ? "my" : "market";
  const refreshIconColor = safeString(
    theme.colors?.textSub,
    safeString(theme.colors?.textMain, safeString(theme.colors?.brandPrimary, ""))
  );

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardNavLockRef = useRef(false);
  const lastCardNavIdRef = useRef(0);
  const isFetchInFlightRef = useRef(false);
  const isRecommendingRef = useRef(false);
  const focusRefetchMetaRef = useRef({ hasFocusedOnce: false, lastRefetchAt: 0 });
  const themeColors = theme.colors as Record<string, string>;

  const spacing = safeNumber(theme?.layout?.spacing?.base, 4);
  const toastBottom = (insets?.bottom ?? 0) + spacing * 7;

  const showToast = useCallback((message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ visible: true, message });
    toastTimerRef.current = setTimeout(() => {
      setToast({ visible: false, message: "" });
      toastTimerRef.current = null;
    }, TOAST_DURATION_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const loadOrders = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (isFetchInFlightRef.current) return;
    isFetchInFlightRef.current = true;

    if (mode === "refresh") setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const nextOverview = await loadDriverOrdersOverview();
      setOverview(nextOverview);
      setActiveFilter((prev) => (nextOverview.availableFilters.includes(prev) ? prev : "ALL"));
      setRecommendAnalysis(null);
      setSelectedRecommendKey(null);
      setErrorMessage(null);
    } catch {
      setOverview(EMPTY_OVERVIEW);
      setErrorMessage(NETWORK_ERROR_TEXT);
    } finally {
      isFetchInFlightRef.current = false;
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders("initial");
  }, [loadOrders]);

  useEffect(() => {
    if (!assignedOnly) return;
    setActiveFilter("ALL");
    setRunStatusFilter("ALL");
  }, [assignedOnly]);

  useEffect(() => {
    return subscribeDriverRunSyncEvent((event) => {
      if (
        event.type !== DRIVER_RUN_SYNC_EVENT.COUNTER_OFFER_SUBMITTED &&
        event.type !== DRIVER_RUN_SYNC_EVENT.MATCH_ACCEPTED
      ) {
        return;
      }
      void loadOrders("refresh");
    });
  }, [loadOrders]);

  useFocusEffect(
    useCallback(() => {
      const meta = focusRefetchMetaRef.current;
      if (!meta.hasFocusedOnce) {
        meta.hasFocusedOnce = true;
        return undefined;
      }

      const now = Date.now();
      if (now - meta.lastRefetchAt < FOCUS_REFETCH_THROTTLE_MS) {
        return undefined;
      }

      meta.lastRefetchAt = now;
      void loadOrders("refresh");
      return undefined;
    }, [loadOrders])
  );

  const baseMarketOrders = useMemo(
    () =>
      overview.marketOrders.filter(
        (item) => item.uiState === DRIVER_UI_STATE.READY_TO_ACCEPT && matchesDriverOrderFilter(item, activeFilter)
      ),
    [activeFilter, overview.marketOrders]
  );

  const selectedRecommendation = useMemo(() => {
    if (!recommendAnalysis || recommendAnalysis.routes.length <= 0) return null;
    if (!selectedRecommendKey) return recommendAnalysis.routes[0] ?? null;
    return recommendAnalysis.routes.find((route) => route.key === selectedRecommendKey) ?? null;
  }, [recommendAnalysis, selectedRecommendKey]);

  const runOrderPool = useMemo(() => {
    const runStates = new Set<DriverUiState>([
      DRIVER_UI_STATE.ASSIGNED,
      DRIVER_UI_STATE.PICKUP_IN_PROGRESS,
      DRIVER_UI_STATE.TRANSIT_IN_PROGRESS,
      DRIVER_UI_STATE.COMPLETED,
    ]);

    const byMatchId = new Map<number, DriverOrderCard>();
    [...overview.myOrders, ...overview.runOrders].forEach((item) => {
      if (!runStates.has(item.uiState)) return;
      const safeMatchId = Number(item.matchId);
      if (Number.isInteger(safeMatchId) && safeMatchId > 0) {
        if (!byMatchId.has(safeMatchId)) byMatchId.set(safeMatchId, item);
        return;
      }
      byMatchId.set(-(byMatchId.size + 1), item);
    });

    return Array.from(byMatchId.values());
  }, [overview.myOrders, overview.runOrders]);

  const runStatusOptions = useMemo(() => {
    const counts = new Map<RunStatusFilterKey, number>();
    RUN_STATUS_FILTER_ORDER.forEach((key) => counts.set(key, 0));
    runOrderPool.forEach((item) => {
      const filterKey = resolveRunStatusFilter(item);
      counts.set(filterKey, (counts.get(filterKey) ?? 0) + 1);
      counts.set("ALL", (counts.get("ALL") ?? 0) + 1);
    });
    return RUN_STATUS_FILTER_ORDER.filter((key) => key === "ALL" || (counts.get(key) ?? 0) > 0).map((key) => ({
      key,
      label: RUN_STATUS_FILTER_LABELS[key],
      count: counts.get(key) ?? 0,
    }));
  }, [runOrderPool]);

  useEffect(() => {
    if (!assignedOnly) return;
    const availableKeys = new Set(runStatusOptions.map((entry) => entry.key));
    if (!availableKeys.has(runStatusFilter)) {
      setRunStatusFilter("ALL");
    }
  }, [assignedOnly, runStatusFilter, runStatusOptions]);

  const filteredRunOrders = useMemo(() => {
    if (runStatusFilter === "ALL") return runOrderPool;
    return runOrderPool.filter((item) => resolveRunStatusFilter(item) === runStatusFilter);
  }, [runOrderPool, runStatusFilter]);

  useEffect(() => {
    if (!assignedOnly) return;
    pruneDriverAcceptedRunGroups(runOrderPool.map((item) => item.matchId));
  }, [assignedOnly, runOrderPool]);

  const runListItems = useMemo(() => {
    const groupSeeds = getDriverAcceptedRunGroups();
    if (groupSeeds.length <= 0) {
      return filteredRunOrders.map((order) => ({
        kind: "order" as const,
        key: `order-${order.cardKey}`,
        order,
      }));
    }

    const byMatchId = new Map<number, DriverOrderCard>();
    filteredRunOrders.forEach((order) => {
      const safeMatchId = Number(order.matchId);
      if (!Number.isInteger(safeMatchId) || safeMatchId <= 0) return;
      byMatchId.set(safeMatchId, order);
    });

    const consumedMatchIds = new Set<number>();
    const grouped: DriverOrdersListItem[] = [];

    groupSeeds.forEach((entry) => {
      const orders = entry.matchIds
        .map((matchId) => byMatchId.get(matchId))
        .filter((order): order is DriverOrderCard => Boolean(order));
      if (orders.length <= 1) return;

      orders.forEach((order) => {
        const safeMatchId = Number(order.matchId);
        if (Number.isInteger(safeMatchId) && safeMatchId > 0) {
          consumedMatchIds.add(safeMatchId);
        }
      });

      const fallbackRevenue = orders.reduce((sum, order) => sum + Number(order.priceValue ?? 0), 0);
      const fallbackDistance = orders
        .map((order) => Number(String(order.routeDistanceText ?? "").replace(/[^0-9.]/g, "")))
        .filter((distance) => Number.isFinite(distance) && distance > 0)
        .reduce((sum, distance) => sum + distance, 0);

      grouped.push({
        kind: "group",
        key: `group-${entry.key}`,
        group: {
          key: entry.key,
          mode: entry.mode,
          pathLabel: entry.pathLabel,
          totalRevenue: entry.totalRevenue > 0 ? entry.totalRevenue : fallbackRevenue,
          estimatedTotalDistanceKm:
            entry.estimatedTotalDistanceKm > 0 ? entry.estimatedTotalDistanceKm : fallbackDistance,
          acceptedAt: entry.acceptedAt,
          orders,
        },
      });
    });

    const singles = filteredRunOrders
      .filter((order) => {
        const safeMatchId = Number(order.matchId);
        return !Number.isInteger(safeMatchId) || !consumedMatchIds.has(safeMatchId);
      })
      .map((order) => ({
        kind: "order" as const,
        key: `order-${order.cardKey}`,
        order,
      }));

    return [...grouped, ...singles];
  }, [filteredRunOrders]);

  const visibleItems = useMemo(() => {
    if (assignedOnly) return runListItems;
    return [] as DriverOrdersListItem[];
  }, [assignedOnly, runListItems]);

  const showFilters = !assignedOnly && overview.availableFilters.length > 1;

  const handlePressCard = useCallback(
    async (card: DriverOrderCard) => {
      if (cardNavLockRef.current && lastCardNavIdRef.current === card.matchId) return;
      cardNavLockRef.current = true;
      lastCardNavIdRef.current = card.matchId;

      const access = await probeDriverOrderDetailAccess(card.matchId);
      if (access === "forbidden") {
        showToast("상세 접근 불가");
        cardNavLockRef.current = false;
        return;
      }
      if (access !== "ok") {
        showToast(NETWORK_ERROR_TEXT);
        cardNavLockRef.current = false;
        return;
      }

      if (resolvedActiveTab === "market") {
        router.push({
          pathname: DRIVER_ROUTE_PATH.ORDER_DETAIL,
          params: { id: String(card.matchId), source: "market" },
        });
      } else {
        const detailParams = buildDriverOrderDetailParams(card);
        const source = assignedOnly ? "run" : "my";
        const pathname = source === "run" ? DRIVER_ROUTE_PATH.RUN_DETAIL : DRIVER_ROUTE_PATH.ORDER_DETAIL;
        router.push({
          pathname,
          params: {
            ...detailParams,
            source,
          },
        });
      }

      setTimeout(() => {
        cardNavLockRef.current = false;
      }, 450);
    },
    [assignedOnly, resolvedActiveTab, router, showToast]
  );

  const handlePrepareForDrive = useCallback(
    async (card: DriverOrderCard) => {
      if (!card.quoteId) return;

      try {
        const detail = await getDriverQuoteSummaryDetail(card.quoteId);
        if (!detail) {
          showToast("오더 정보를 불러올 수 없습니다.");
          return;
        }
        const fallbackStatus = typeof card.status === "string" ? card.status.trim() : "";
        setActiveOrder({
          ...detail,
          status: (typeof detail.status === "string" && detail.status.trim()) || fallbackStatus || "READY",
        });
        void loadOrders("refresh").then(() => {
          router.push(DRIVER_ROUTE_PATH.RUN_TAB);
        });
      } catch {
        showToast(NETWORK_ERROR_TEXT);
      }
    },
    [loadOrders, router, setActiveOrder, showToast]
  );

  const handleAcceptFromMarket = useCallback(
    async (card: DriverOrderCard) => {
      if (acceptingMatchId !== null) return;

      const safeMatchId = Number(card.matchId);
      if (!Number.isInteger(safeMatchId) || safeMatchId <= 0) {
        showToast("유효하지 않은 매칭입니다.");
        return;
      }

      setAcceptingMatchId(safeMatchId);
      try {
        const result = await acceptDriverMatch(safeMatchId);
        if (!result) {
          showToast(NETWORK_ERROR_TEXT);
          return;
        }

        publishDriverRunSyncEvent({
          type: DRIVER_RUN_SYNC_EVENT.MATCH_ACCEPTED,
          matchIds: [safeMatchId],
          quoteIds: Number.isInteger(Number(card.quoteId)) && Number(card.quoteId) > 0 ? [Number(card.quoteId)] : [],
          source: "order_board",
        });
        await loadOrders("refresh");
        router.replace(DRIVER_ROUTE_PATH.RUN_TAB);
        showToast("오더를 수락했습니다.");
      } catch (error) {
        const code = getApiErrorCode(error);
        if (code === API_ERROR_CODE.CONFLICT) {
          showToast("이미 배차 처리된 오더입니다.");
          return;
        }
        showToast(readApiErrorMessage(error, NETWORK_ERROR_TEXT));
      } finally {
        setAcceptingMatchId(null);
      }
    },
    [acceptingMatchId, loadOrders, router, showToast]
  );

  const handleOpenCounterOffer = useCallback((card: DriverOrderCard) => {
    if (isSubmittingOffer) return;
    if (card.uiState !== DRIVER_UI_STATE.READY_TO_ACCEPT) {
      showToast("현재 상태에서는 역제안을 진행할 수 없습니다.");
      return;
    }
    setOfferTargetCard(card);
    setOfferErrorMessage(null);
    setIsOfferOpen(true);
  }, [isSubmittingOffer, showToast]);

  const handleSubmitCounterOffer = useCallback(
    async (payload: CounterOfferSubmitPayload) => {
      if (isSubmittingOffer) return;

      const target = offerTargetCard;
      const safeMatchId = Number(target?.matchId);
      if (!target || !Number.isInteger(safeMatchId) || safeMatchId <= 0) {
        setOfferErrorMessage("유효하지 않은 매칭입니다.");
        return;
      }

      setIsSubmittingOffer(true);
      setOfferErrorMessage(null);
      try {
        const result = await postCounterOffer(
          safeMatchId,
          {
            proposedPrice: payload.amount,
            message: payload.message,
          },
          target.quoteId
        );

        if (!result) {
          setOfferErrorMessage(NETWORK_ERROR_TEXT);
          return;
        }

        const safeQuoteId = Number(target.quoteId);
        publishDriverRunSyncEvent({
          type: DRIVER_RUN_SYNC_EVENT.COUNTER_OFFER_SUBMITTED,
          matchIds: [safeMatchId],
          quoteIds: Number.isInteger(safeQuoteId) && safeQuoteId > 0 ? [safeQuoteId] : [],
          source: "order_board",
        });
        setIsOfferOpen(false);
        setOfferTargetCard(null);
        showToast("역제안을 전송했습니다.");
        await loadOrders("refresh");
      } catch (error) {
        setOfferErrorMessage(readApiErrorMessage(error, NETWORK_ERROR_TEXT));
      } finally {
        setIsSubmittingOffer(false);
      }
    },
    [isSubmittingOffer, loadOrders, offerTargetCard, showToast]
  );

  const handleAnalyzeRecommendations = useCallback(async () => {
    if (isRecommendingRef.current) return;
    if (baseMarketOrders.length <= 0) {
      setRecommendAnalysis(null);
      setSelectedRecommendKey(null);
      return;
    }

    isRecommendingRef.current = true;
    setIsRecommending(true);
    try {
      const analysis = await recommendDriverOrderRoutes({
        orders: baseMarketOrders,
        mode: recommendMode,
        maxQuotesPerRoute,
      });
      setRecommendAnalysis(analysis);
      const firstKey = analysis.routes[0]?.key ?? null;
      setSelectedRecommendKey(firstKey);
    } catch {
      setRecommendAnalysis(null);
      setSelectedRecommendKey(null);
    } finally {
      isRecommendingRef.current = false;
      setIsRecommending(false);
    }
  }, [baseMarketOrders, maxQuotesPerRoute, recommendMode]);

  useEffect(() => {
    if (assignedOnly) return;
    if (resolvedActiveTab !== "market") return;
    void handleAnalyzeRecommendations();
  }, [assignedOnly, handleAnalyzeRecommendations, resolvedActiveTab]);

  const handleOpenRecommendationDetail = useCallback(
    (route: DriverRouteRecommendation) => {
      const safeQuoteIds = Array.from(
        new Set(
          route.quoteIds
            .map((quoteId) => Number(quoteId))
            .filter((quoteId) => Number.isInteger(quoteId) && quoteId > 0)
        )
      );
      if (safeQuoteIds.length <= 0) {
        showToast("추천 노선에 유효한 견적 ID가 없습니다.");
        return;
      }

      const marketOrderByQuoteId = new Map<number, DriverOrderCard>();
      baseMarketOrders.forEach((order) => {
        const quoteId = Number(order.quoteId);
        if (!Number.isInteger(quoteId) || quoteId <= 0) return;
        if (marketOrderByQuoteId.has(quoteId)) return;
        marketOrderByQuoteId.set(quoteId, order);
      });

      const selectedOrders = safeQuoteIds
        .map((quoteId) => marketOrderByQuoteId.get(quoteId))
        .filter((order): order is DriverOrderCard => Boolean(order));

      if (selectedOrders.length <= 0) {
        showToast("추천 상세를 열 수 없습니다. 목록을 새로고침 후 다시 시도해 주세요.");
        return;
      }
      const primaryMatchId = Number(selectedOrders[0]?.matchId);
      if (!Number.isInteger(primaryMatchId) || primaryMatchId <= 0) {
        showToast("추천 노선의 매칭 정보가 유효하지 않습니다.");
        return;
      }

      setSelectedRecommendKey(route.key);
      setDriverMarketRecommendationSelection({
        key: route.key,
        recommendation: route,
        orders: selectedOrders,
        mode: recommendMode,
        maxQuotesPerRoute,
        analyzedAt: Date.now(),
      });
      router.push({
        pathname: DRIVER_ROUTE_PATH.ORDER_DETAIL,
        params: { id: String(primaryMatchId), source: "market", recommendKey: route.key },
      });
    },
    [baseMarketOrders, maxQuotesPerRoute, recommendMode, router, showToast]
  );

  const renderListHeader = useCallback(() => {
    const showRecommendPanel = resolvedActiveTab === "market" && !assignedOnly;
    const recommendationRows = recommendAnalysis?.routes ?? [];
    const showRunStatusFilter = assignedOnly && runStatusOptions.length > 1;

    if (!showRecommendPanel && !showFilters && !showRunStatusFilter) return null;

    return (
      <View>
        {showRunStatusFilter ? (
          <View style={styles.runStatusTabs}>
            {runStatusOptions.map((entry) => {
              const active = runStatusFilter === entry.key;
              return (
                <Pressable
                  key={`run-status-${entry.key}`}
                  style={[styles.runStatusBtn, active ? styles.runStatusBtnActive : null]}
                  onPress={() => setRunStatusFilter(entry.key)}
                >
                  <AppText style={[styles.runStatusBtnLabel, active ? styles.runStatusBtnLabelActive : null]}>
                    {entry.label}
                  </AppText>
                  <View style={[styles.runStatusBtnCount, active ? styles.runStatusBtnCountActive : null]}>
                    <AppText variant="caption" weight="900" color={active ? "brandPrimary" : "textMuted"}>
                      {entry.count}
                    </AppText>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {showRecommendPanel ? (
          <View style={styles.marketRecommendWrap}>
            <View style={styles.marketModeTabs}>
              <Pressable
                style={[styles.marketModeBtn, recommendMode === "SINGLE" ? styles.marketModeBtnActive : null]}
                onPress={() => {
                  setRecommendMode("SINGLE");
                  setRecommendAnalysis(null);
                  setSelectedRecommendKey(null);
                }}
              >
                <Ionicons
                  name="cube-outline"
                  size={16}
                  color={recommendMode === "SINGLE" ? themeColors.textMain : themeColors.textMuted}
                />
                <AppText style={[styles.marketModeLabel, recommendMode === "SINGLE" ? styles.marketModeLabelActive : null]}>
                  단건 노선
                </AppText>
              </Pressable>
              <Pressable
                style={[styles.marketModeBtn, recommendMode === "BUNDLED" ? styles.marketModeBtnActive : null]}
                onPress={() => {
                  setRecommendMode("BUNDLED");
                  setRecommendAnalysis(null);
                  setSelectedRecommendKey(null);
                }}
              >
                <Ionicons
                  name="car-outline"
                  size={16}
                  color={recommendMode === "BUNDLED" ? themeColors.textMain : themeColors.textMuted}
                />
                <AppText style={[styles.marketModeLabel, recommendMode === "BUNDLED" ? styles.marketModeLabelActive : null]}>
                  합짐 노선
                </AppText>
              </Pressable>
            </View>

            <View style={styles.marketScaleCard}>
              <View style={styles.marketScaleHeader}>
                <AppText variant="detail" weight="800" color="textMain">
                  한 번에 묶을 오더 수
                </AppText>
                <AppText variant="detail" weight="900" color="brandPrimary">
                  {maxQuotesPerRoute}건 선택
                </AppText>
              </View>
              <AppText style={styles.marketScaleCaption}>
                {recommendMode === "SINGLE"
                  ? "단건 노선은 2~3건 중심으로 추천 정확도가 높습니다."
                  : "합짐 노선은 3~5건을 선택하면 조합 추천 폭이 넓어집니다."}
              </AppText>
              <View style={styles.marketScaleStepRow}>
                {ROUTE_RECOMMEND_STEPS.map((step) => {
                  const active = step === maxQuotesPerRoute;
                  return (
                    <Pressable
                      key={`route-step-${step}`}
                      style={[styles.marketScaleStep, active ? styles.marketScaleStepActive : null]}
                      onPress={() => {
                        setMaxQuotesPerRoute(step);
                        setRecommendAnalysis(null);
                        setSelectedRecommendKey(null);
                      }}
                    >
                      <AppText style={[styles.marketScaleStepText, active ? styles.marketScaleStepTextActive : null]}>
                        {step}건
                      </AppText>
                      <AppText style={[styles.marketScaleStepHint, active ? styles.marketScaleStepHintActive : null]}>
                        {ROUTE_RECOMMEND_STEP_HINT[step]}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.marketRecommendHeaderRow}>
              <AppText variant="detail" weight="900" color="textMain">
                추천 노선
              </AppText>
              <AppText style={styles.marketLoadingText}>
                {isRecommending ? "추천 계산 중..." : `${recommendationRows.length}건`}
              </AppText>
            </View>

            {recommendationRows.length > 0 ? (
              <View style={styles.marketRouteList}>
                {recommendationRows.map((route, index) => {
                  const selected = route.key === (selectedRecommendation?.key ?? "");
                  return (
                    <Pressable
                      key={route.key}
                      style={[styles.marketRouteCard, selected ? styles.marketRouteCardSelected : null]}
                      onPress={() => handleOpenRecommendationDetail(route)}
                    >
                      <View style={styles.marketRouteTop}>
                        <View style={styles.marketRouteBadge}>
                          <AppText variant="caption" weight="900" color="brandPrimary">
                            {index === 0 ? "BEST" : `순위 ${route.rank}`}
                          </AppText>
                        </View>
                        <AppText variant="title" weight="900" color="semanticSuccess">
                          {formatKrw(route.totalRevenue)}
                        </AppText>
                      </View>

                      <AppText variant="detail" weight="700" color="textSub">
                        {route.pathLabel}
                      </AppText>

                      <View style={styles.marketRouteStatRow}>
                        <View style={styles.marketRouteStatChip}>
                          <AppText variant="caption" weight="700" color="textMuted">왕복거리</AppText>
                          <AppText variant="detail" weight="900" color="brandPrimary">
                            {formatOneDecimal(route.estimatedTotalDistanceKm)}km
                          </AppText>
                        </View>
                        <View style={styles.marketRouteStatChip}>
                          <AppText variant="caption" weight="700" color="textMuted">CBM</AppText>
                          <AppText variant="detail" weight="900" color="textMain">
                            {formatOneDecimal(route.totalCbm)}
                          </AppText>
                        </View>
                        <View style={styles.marketRouteStatChip}>
                          <AppText variant="caption" weight="700" color="textMuted">복귀</AppText>
                          <AppText variant="detail" weight="900" color="textMain">
                            {formatOneDecimal(route.emptyRunDistanceKm)}km
                          </AppText>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
                <View style={styles.marketRouteHintCard}>
                  <AppText variant="caption" weight="800" color="textSub">
                    추천 노선을 클릭하면 추천 상세 화면으로 이동합니다.
                  </AppText>
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {showFilters ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {overview.availableFilters.map((f) => (
              <Pressable
                key={f}
                style={[styles.filterChip, activeFilter === f ? styles.filterChipActive : null]}
                onPress={() => {
                  setActiveFilter(f);
                  setSelectedRecommendKey(null);
                }}
              >
                <AppText
                  style={[styles.filterChipText, activeFilter === f ? styles.filterChipTextActive : null]}
                  numberOfLines={1}
                >
                  {getDriverOrderFilterLabel(f)}
                </AppText>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
      </View>
    );
  }, [
    activeFilter,
    assignedOnly,
    isRecommending,
    maxQuotesPerRoute,
    overview.availableFilters,
    recommendAnalysis,
    recommendMode,
    resolvedActiveTab,
    runStatusFilter,
    runStatusOptions,
    selectedRecommendation?.key,
    handleOpenRecommendationDetail,
    setRunStatusFilter,
    showFilters,
    styles,
    themeColors.textMain,
    themeColors.textMuted,
  ]);

  const handlePressRunGroup = useCallback(
    (group: DriverRunGroupCardModel) => {
      const target = group.orders[0];
      if (!target) return;
      void handlePressCard(target);
    },
    [handlePressCard]
  );

  const renderOrderItem = useCallback(
    ({ item }: { item: DriverOrdersListItem }) => {
      if (item.kind === "group") {
        return (
          <DriverRunGroupCard
            group={item.group}
            onPress={handlePressRunGroup}
            onPressOrder={(order) => void handlePressCard(order)}
          />
        );
      }

      return (
        <DriverOrderUnifiedCard
          item={item.order}
          scope={assignedOnly ? "run" : resolvedActiveTab}
          onPress={handlePressCard}
          onAcceptClick={handleAcceptFromMarket}
          onOfferClick={handleOpenCounterOffer}
          acceptingMatchId={acceptingMatchId}
          isSubmittingOffer={isSubmittingOffer}
          onPrepareClick={handlePrepareForDrive}
        />
      );
    },
    [
      acceptingMatchId,
      assignedOnly,
      handleAcceptFromMarket,
      handleOpenCounterOffer,
      handlePrepareForDrive,
      handlePressCard,
      handlePressRunGroup,
      isSubmittingOffer,
      resolvedActiveTab,
    ]
  );

  const keyExtractor = useCallback((item: DriverOrdersListItem) => item.key, []);

  return (
    <>
      <PageScaffold
        title={assignedOnly ? "운행 오더" : "오더 보드"}
        backgroundColor={theme.colors?.bgSurfaceAlt}
        scroll={false}
        padding={0}
        headerRight={
          assignedOnly ? null : (
            <Pressable onPress={() => void loadOrders("refresh")} style={styles.refreshBtn}>
              <Ionicons name="refresh" size={24} color={refreshIconColor} />
            </Pressable>
          )
        }
      >
        <View style={styles.flex1}>
          {isLoading ? (
            <AppSpinner label="목록을 불러오는 중입니다." />
          ) : errorMessage ? (
            <View style={styles.errorWrap}>
              <AppErrorState
                title="오더 목록을 불러오지 못했어요"
                description={errorMessage}
                retryLabel="다시 시도"
                onRetry={() => void loadOrders("initial")}
                fullScreen={false}
              />
            </View>
          ) : (
            <FlatList
              key={resolvedActiveTab}
              extraData={`${activeFilter}:${runStatusFilter}:${selectedRecommendKey ?? ""}:${recommendAnalysis?.recommendedCount ?? 0}`}
              style={styles.flex1}
              data={visibleItems}
              keyExtractor={keyExtractor}
              renderItem={renderOrderItem}
              ListHeaderComponent={renderListHeader}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadOrders("refresh")} />}
              ListEmptyComponent={
                (!assignedOnly && (isRecommending || (recommendAnalysis?.routes?.length ?? 0) > 0)) ? null : (
                  <AppEmptyState
                    title={
                      assignedOnly ? "운행 오더가 없습니다." : "추천 가능한 오더가 없습니다."
                    }
                    description={
                      assignedOnly
                        ? "수락 후 운행 가능한 오더가 생기면 이곳에 표시됩니다."
                        : "필터를 변경하거나 새로고침 후 다시 확인해 주세요."
                    }
                    fullScreen={false}
                  />
                )
              }
            />
          )}
        </View>

        {toast.visible ? (
          <View style={[styles.toastWrap, { bottom: toastBottom }]}>
            <View style={styles.toastCard}>
              <AppText style={styles.toastText}>{toast.message}</AppText>
            </View>
          </View>
        ) : null}
      </PageScaffold>

      <CounterOfferModal
        visible={isOfferOpen}
        isSubmitting={isSubmittingOffer}
        errorMessage={offerErrorMessage}
        onClose={() => {
          if (isSubmittingOffer) return;
          setIsOfferOpen(false);
          setOfferTargetCard(null);
          setOfferErrorMessage(null);
        }}
        onSubmit={handleSubmitCounterOffer}
      />
    </>
  );
}

export default DriverOrdersBoard;
