import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useActiveOrder } from "@/entities/order/model/active-order.store";
import {
  buildDriverOrderDetailParams,
  getDriverOrderFilterLabel,
  getDriverQuoteSummaryDetail,
  loadDriverOrdersOverview,
  matchesDriverOrderFilter,
  probeDriverOrderDetailAccess,
  type DriverOrderCard,
  type DriverOrderFilterKey,
  type DriverOrdersOverview,
  type DriverOrdersTabKey,
} from "@/features/matching/api";
import {
  BADGE_TONE,
  DRIVER_CTA_ID,
  DRIVER_UI_STATE,
  type BadgeTone,
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
  initialTab?: DriverOrdersTabKey;
  assignedOnly?: boolean;
  activeTab?: DriverOrdersTabKey;
  onChangeTab?: (nextTab: DriverOrdersTabKey) => void;
};

type ToastState = {
  visible: boolean;
  message: string;
};

const NETWORK_ERROR_TEXT = "네트워크 요청이 실패했습니다. 잠시 후 다시 시도해 주세요.";
const TOAST_DURATION_MS = 2000;
const FOCUS_REFETCH_THROTTLE_MS = 1500;

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
  const headingScale = theme?.typography?.scale?.heading;
  const titleScale = theme?.typography?.scale?.title;

  const radiusCard = safeNumber(theme?.components?.card?.radius, safeNumber(radii?.card, spacing * 4));
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

    listContent: { paddingHorizontal: spacing * 4, paddingTop: spacing * 2, paddingBottom: spacing * 24 },
    separator: { height: spacing * 4 },

    flex1: { flex: 1 },

    cardPressable: {},
    cardWrap: {
      borderRadius: radiusCard,
      padding: cardPaddingMd,
      borderWidth: 0,
    },
    cardPressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },

    cardTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: cardPaddingMd,
    },
    badge: {
      paddingHorizontal: spacing * 2.5,
      paddingVertical: spacing * 1.5,
      borderRadius: radiusControl,
    },
    badgeText: {
      fontSize: safeNumber(detailScale?.size, 14),
      lineHeight: safeNumber(detailScale?.lineHeight, 20),
      letterSpacing: safeNumber(detailScale?.letterSpacing, 0),
      fontWeight: "900",
    },
    timeText: {
      color: cTextMuted,
      fontSize: safeNumber(detailScale?.size, 14),
      lineHeight: safeNumber(detailScale?.lineHeight, 20),
      fontWeight: "600",
    },
    cardTopMeta: {
      alignItems: "flex-end",
      gap: spacing,
    },
    statusTitleText: {
      color: cTextSub,
      fontSize: safeNumber(headingScale?.size, 18),
      lineHeight: safeNumber(headingScale?.lineHeight, 26),
      fontWeight: "700",
      letterSpacing: safeNumber(headingScale?.letterSpacing, -0.1),
      textAlign: "right",
      maxWidth: spacing * 40,
    },

    timelineWrap: { flexDirection: "row", alignItems: "stretch", marginBottom: cardPaddingMd },
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
    addressLabel: {
      color: cTextMuted,
      fontSize: safeNumber(captionScale?.size, 12),
      lineHeight: safeNumber(captionScale?.lineHeight, 16),
      letterSpacing: safeNumber(captionScale?.letterSpacing, 0),
      fontWeight: "800",
    },
    addressText: {
      color: cTextMain,
      fontSize: safeNumber(headingScale?.size, 18),
      lineHeight: safeNumber(headingScale?.lineHeight, 26),
      fontWeight: "900",
      letterSpacing: safeNumber(headingScale?.letterSpacing, -0.1),
    },

    distanceChip: {
      backgroundColor: tint(cTextMuted, 0.08, cSurface),
      paddingHorizontal: spacing * 2,
      paddingVertical: spacing,
      borderRadius: radiusPill,
    },
    distanceText: {
      color: cTextSub,
      fontSize: safeNumber(captionScale?.size, 12),
      lineHeight: safeNumber(captionScale?.lineHeight, 16),
      letterSpacing: safeNumber(captionScale?.letterSpacing, 0),
      fontWeight: "800",
    },

    cardBottom: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
      paddingTop: cardPaddingMd,
      borderTopWidth: 1,
      borderTopColor: tint(cLine, 0.5, cSurfaceAlt),
    },
    tagWrap: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: spacing * 1.5, paddingRight: spacing * 3 },
    specPill: {
      backgroundColor: tint(cTextMuted, 0.06, cSurfaceAlt),
      paddingHorizontal: spacing * 2,
      paddingVertical: spacing,
      borderRadius: radiusControl,
      minHeight: safeNumber(buttonSm?.minHeight, 36) - spacing * 4,
      justifyContent: "center",
    },
    specText: {
      color: cTextSub,
      fontSize: safeNumber(captionScale?.size, 12),
      lineHeight: safeNumber(captionScale?.lineHeight, 16),
      letterSpacing: safeNumber(captionScale?.letterSpacing, 0),
      fontWeight: "700",
    },

    priceWrap: { alignItems: "flex-end", gap: spacing * 0.5 },
    priceLabel: {
      color: cTextMuted,
      fontSize: safeNumber(captionScale?.size, 12),
      lineHeight: safeNumber(captionScale?.lineHeight, 16),
      letterSpacing: safeNumber(captionScale?.letterSpacing, 0),
      fontWeight: "800",
    },
    priceVal: {
      color: cPrimary,
      fontSize: safeNumber(titleScale?.size, 22),
      lineHeight: safeNumber(titleScale?.lineHeight, 30),
      fontWeight: "900",
      letterSpacing: safeNumber(titleScale?.letterSpacing, -0.1),
    },

    prepareWrap: { marginTop: spacing * 4 },
    prepareBtn: {
      minHeight: safeNumber(buttonLg?.minHeight, spacing * 13),
      borderRadius: safeNumber(buttonLg?.radius, radiusControl),
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

    toastWrap: { position: "absolute", left: 0, right: 0, alignItems: "center", zIndex: 45, pointerEvents: "none" },
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
  });
});

type DriverOrdersBoardStyles = ReturnType<typeof useStyles>;

function DriverOrderCardView({
  item,
  onPress,
  activeTab,
  onPrepareClick,
  styles,
  colors,
}: {
  item: DriverOrderCard;
  onPress: (card: DriverOrderCard) => void;
  activeTab: DriverOrdersTabKey;
  onPrepareClick: (card: DriverOrderCard) => void;
  styles: DriverOrdersBoardStyles;
  colors: Record<string, string>;
}) {
  const pal = resolveStatusPalette(item.statusTone, colors);

  const ctaPolicy = item.cta;
  const ctaVariant = ctaPolicy.variant === "primary" ? "primary" : ctaPolicy.variant === "destructive" ? "destructive" : "secondary";

  return (
    <Pressable onPress={() => onPress(item)} style={({ pressed }) => [styles.cardPressable, pressed ? styles.cardPressed : null]}>
      <AppCard style={styles.cardWrap} outlined={false}>
        <View style={styles.cardTop}>
          <View style={[styles.badge, { backgroundColor: pal.bg }]}>
            <AppText style={[styles.badgeText, { color: pal.text }]}>{item.statusLabel}</AppText>
          </View>
          <View style={styles.cardTopMeta}>
            <AppText style={styles.timeText}>{item.requestedAtText || ""}</AppText>
            <AppText style={styles.statusTitleText} numberOfLines={2}>
                {item.statusTitle}
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
              <AppText style={styles.addressLabel}>출발</AppText>
              <AppText style={styles.addressText} numberOfLines={1}>
                {item.originAddress || "-"}
              </AppText>
            </View>
            <View style={styles.addressSpacer} />
            <View style={styles.addressBlock}>
              <AppText style={styles.addressLabel}>도착</AppText>
              <AppText style={styles.addressText} numberOfLines={1}>
                {item.destinationAddress || "-"}
              </AppText>
            </View>
          </View>

          {item.routeDistanceText ? (
            <View style={styles.distanceWrap}>
              <View style={styles.distanceChip}>
                <AppText style={styles.distanceText}>{item.routeDistanceText}</AppText>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.cardBottom}>
          <View style={styles.tagWrap}>
            {item.tags.map((tag, idx) => (
              <View key={`${tag.label}-${idx}`} style={styles.specPill}>
                <AppText style={styles.specText} numberOfLines={1}>
                  {tag.label}
                </AppText>
              </View>
            ))}
          </View>
          <View style={styles.priceWrap}>
            <AppText style={styles.priceLabel}>총 운임</AppText>
            <AppText style={styles.priceVal}>{item.priceText || "-"}</AppText>
          </View>
        </View>

        {activeTab === "my" && item.uiState === DRIVER_UI_STATE.ASSIGNED && item.cta?.id !== DRIVER_CTA_ID.START_DRIVE ? (
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
        ) : null}
      </AppCard>
    </Pressable>
  );
}

export function DriverOrdersBoard({ initialTab, assignedOnly, activeTab: controlledActiveTab, onChangeTab }: DriverOrdersBoardProps) {
  const router = useRouter();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { setActiveOrder } = useActiveOrder();

  const [activeTab, setActiveTab] = useState<DriverOrdersTabKey>(assignedOnly ? "my" : initialTab ?? "market");
  const [overview, setOverview] = useState<DriverOrdersOverview>(EMPTY_OVERVIEW);
  const [activeFilter, setActiveFilter] = useState<DriverOrderFilterKey>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>({ visible: false, message: "" });

  const resolvedActiveTab = controlledActiveTab ?? activeTab;
  const refreshIconColor = safeString(
    theme.colors?.textSub,
    safeString(theme.colors?.textMain, safeString(theme.colors?.brandPrimary, ""))
  );

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardNavLockRef = useRef(false);
  const lastCardNavIdRef = useRef(0);
  const isFetchInFlightRef = useRef(false);
  const focusRefetchMetaRef = useRef({ hasFocusedOnce: false, lastRefetchAt: 0 });
  const themeColors = theme.colors as Record<string, string>;

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

  const loadOrders = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (isFetchInFlightRef.current) return;
      isFetchInFlightRef.current = true;

      if (mode === "refresh") setIsRefreshing(true);
      else setIsLoading(true);

      try {
        const nextOverview = await loadDriverOrdersOverview();
        setOverview(nextOverview);
        setActiveFilter((prev) => (nextOverview.availableFilters.includes(prev) ? prev : "ALL"));
        setErrorMessage(null);
      } catch {
        setOverview(EMPTY_OVERVIEW);
        setErrorMessage(NETWORK_ERROR_TEXT);
      } finally {
        isFetchInFlightRef.current = false;
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadOrders("initial");
  }, [loadOrders]);

  useEffect(() => {
    if (!assignedOnly) return;
    setActiveTab("my");
    setActiveFilter("ALL");
  }, [assignedOnly]);

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

  const filteredMarketOrders = useMemo(
    () =>
      overview.marketOrders.filter(
        (item) =>
          item.uiState === DRIVER_UI_STATE.READY_TO_ACCEPT &&
          matchesDriverOrderFilter(item, activeFilter)
      ),
    [activeFilter, overview.marketOrders]
  );

  const filteredMyOrders = useMemo(
    () =>
      [...overview.myOrders, ...overview.runOrders].filter((item) => item.uiState === DRIVER_UI_STATE.ASSIGNED),
    [overview.myOrders, overview.runOrders]
  );

  const filteredRunOrders = useMemo(
    () =>
      overview.runOrders.filter(
        (item) =>
          item.uiState === DRIVER_UI_STATE.TRANSIT_IN_PROGRESS ||
          item.uiState === DRIVER_UI_STATE.COMPLETED
      ),
    [overview.runOrders]
  );

  const visibleOrders = useMemo(() => {
    if (resolvedActiveTab === "market") {
      return filteredMarketOrders;
    }
    if (assignedOnly) {
      return filteredRunOrders;
    }
    return filteredMyOrders;
  }, [assignedOnly, filteredMarketOrders, filteredMyOrders, filteredRunOrders, resolvedActiveTab]);

  const showFilters = resolvedActiveTab === "market" && overview.availableFilters.length > 1;

  const changeTab = useCallback(
    (nextTab: DriverOrdersTabKey) => {
      if (!controlledActiveTab) setActiveTab(nextTab);
      onChangeTab?.(nextTab);
      if (nextTab !== "market") setActiveFilter("ALL");
    },
    [controlledActiveTab, onChangeTab]
  );

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

      const { id } = buildDriverOrderDetailParams(card);
      const source = resolvedActiveTab === "market" ? "market" : assignedOnly ? "run" : "my";
      router.push({
        pathname: assignedOnly ? "/(driver)/(stack)/run/[id]" : "/(driver)/(stack)/order/[id]",
        params: { id, source },
      });

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
        setActiveOrder(detail);
        void loadOrders("refresh").then(() => {
          router.push("/(driver)/run");
        });
      } catch {
        showToast(NETWORK_ERROR_TEXT);
      }
    },
    [loadOrders, router, setActiveOrder, showToast]
  );

  const renderListHeader = useCallback(() => {
    if (!showFilters) return null;
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
        {overview.availableFilters.map((f) => (
          <Pressable
            key={f}
            style={[styles.filterChip, activeFilter === f ? styles.filterChipActive : null]}
            onPress={() => setActiveFilter(f)}
          >
            <AppText style={[styles.filterChipText, activeFilter === f ? styles.filterChipTextActive : null]}>
              {getDriverOrderFilterLabel(f)}
            </AppText>
          </Pressable>
        ))}
      </ScrollView>
    );
  }, [activeFilter, overview.availableFilters, showFilters, styles]);

  const renderOrderItem = useCallback(
    ({ item }: { item: DriverOrderCard }) => (
      <DriverOrderCardView
        item={item}
        activeTab={resolvedActiveTab}
        onPress={handlePressCard}
        onPrepareClick={handlePrepareForDrive}
        styles={styles}
        colors={themeColors}
      />
    ),
    [handlePrepareForDrive, handlePressCard, resolvedActiveTab, styles, themeColors]
  );

  const keyExtractor = useCallback(
    (item: DriverOrderCard) => `${resolvedActiveTab}:${item.cardKey}`,
    [resolvedActiveTab]
  );

  return (
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
        {!assignedOnly ? (
          <View style={styles.tabsContainer}>
            <Pressable
              style={[styles.tabBtn, resolvedActiveTab === "market" ? styles.tabBtnActive : null]}
              onPress={() => changeTab("market")}
            >
              <AppText style={[styles.tabLabel, resolvedActiveTab === "market" ? styles.tabLabelActive : null]}>마켓</AppText>
            </Pressable>

            <Pressable
              style={[styles.tabBtn, resolvedActiveTab === "my" ? styles.tabBtnActive : null]}
              onPress={() => changeTab("my")}
            >
              <AppText style={[styles.tabLabel, resolvedActiveTab === "my" ? styles.tabLabelActive : null]}>내 오더</AppText>
              {filteredMyOrders.length > 0 ? (
                <View style={styles.tabBadge}>
                  <AppText style={styles.tabBadgeText}>{filteredMyOrders.length}</AppText>
                </View>
              ) : null}
            </Pressable>
          </View>
        ) : null}

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
            extraData={activeFilter}
            style={styles.flex1}
            data={visibleOrders}
            keyExtractor={keyExtractor}
            renderItem={renderOrderItem}
            ListHeaderComponent={renderListHeader}
            stickyHeaderIndices={showFilters ? [0] : undefined}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadOrders("refresh")} />}
            ListEmptyComponent={
              <AppEmptyState
                title={
                  resolvedActiveTab === "market"
                    ? "오더 마켓이 비어 있습니다."
                    : assignedOnly
                      ? "운행 오더가 없습니다."
                      : "내 오더가 없습니다."
                }
                description={
                  resolvedActiveTab === "market"
                    ? "새 오더가 등록되면 이곳에 표시됩니다."
                    : assignedOnly
                      ? "운송 중이거나 완료된 오더가 생기면 이곳에 표시됩니다."
                      : "수락한 오더가 있으면 이곳에 표시됩니다."
                }
                fullScreen={false}
              />
            }
          />
        )}
      </View>

      {toast.visible ? (
        <View style={[styles.toastWrap, { bottom: insets.bottom + 30 }]}>
          <View style={styles.toastCard}>
            <AppText style={styles.toastText}>{toast.message}</AppText>
          </View>
        </View>
      ) : null}
    </PageScaffold>
  );
}

export default DriverOrdersBoard;
