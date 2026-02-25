import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  buildDriverOrderDetailParams,
  getDriverOrderFilterLabel,
  loadDriverOrdersOverview,
  matchesDriverOrderFilter,
  probeDriverOrderDetailAccess,
  requestAiRecommendedOrder,
  type DriverOrderCard,
  type DriverOrderFilterKey,
  type DriverOrdersOverview,
  type DriverOrdersTabKey,
} from "@/features/matching/api";
import {
  readDriverOrdersAiTooltipSeen,
  writeDriverOrdersAiTooltipSeen,
} from "@/shared/lib/storage/driverOrdersStorage";
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
  activeTab: DriverOrdersTabKey;
  onChangeTab: (nextTab: DriverOrdersTabKey) => void;
};

type ToastState = {
  visible: boolean;
  message: string;
};

const NETWORK_ERROR_TEXT = "네트워크 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.";
const TOAST_DURATION_MS = 2000;

const EMPTY_OVERVIEW: DriverOrdersOverview = {
  marketOrders: [],
  myOrders: [],
  myCount: 0,
  availableFilters: ["ALL"],
  capability: {
    supportsRichFilters: false,
    supportsAiFab: false,
  },
};

function resolveStatusStripColor(status: string, colors: Record<string, string>): string {
  if (status === "OPEN" || status === "NEGOTIATING") return colors.brandPrimary;
  if (status === "ASSIGNED" || status === "PICKUP" || status === "TRANSIT") return colors.semanticSuccess;
  if (status === "DROPOFF") return colors.semanticInfo;
  if (status === "CANCELED") return colors.semanticDanger;
  return colors.borderStrong;
}

function resolveTagPalette(tagKey: string, colors: Record<string, string>): { bg: string; border: string; text: string } {
  if (tagKey === "AI_RECOMMENDED") {
    return {
      bg: tint(colors.semanticInfo, 0.12, colors.bgSurface),
      border: tint(colors.semanticInfo, 0.25, colors.borderDefault),
      text: colors.semanticInfo,
    };
  }
  if (tagKey === "URGENT") {
    return {
      bg: tint(colors.semanticDanger, 0.12, colors.bgSurface),
      border: tint(colors.semanticDanger, 0.25, colors.borderDefault),
      text: colors.semanticDanger,
    };
  }
  if (tagKey === "COMBINED") {
    return {
      bg: tint(colors.semanticWarning, 0.12, colors.bgSurface),
      border: tint(colors.semanticWarning, 0.25, colors.borderDefault),
      text: colors.semanticWarning,
    };
  }
  return {
    bg: tint(colors.brandPrimary, 0.12, colors.bgSurface),
    border: tint(colors.brandPrimary, 0.25, colors.borderDefault),
    text: colors.brandPrimary,
  };
}

const useStyles = createThemedStyles((theme) => {
  const spacing = safeNumber(theme?.layout?.spacing?.base, 4);
  const cSurface = safeString(theme?.colors?.bgSurface, "#FFFFFF");
  const cSurfaceAlt = safeString(theme?.colors?.bgSurfaceAlt, "#F8FAFC");
  const cLine = safeString(theme?.colors?.borderDefault, "#E2E8F0");
  const cTextMain = safeString(theme?.colors?.textMain, "#111827");
  const cTextSub = safeString(theme?.colors?.textSub, "#334155");
  const cTextMuted = safeString(theme?.colors?.textMuted, "#64748B");
  const cPrimary = safeString(theme?.colors?.brandPrimary, "#FF6A00");

  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: cSurfaceAlt,
    },
    tabsWrap: {
      paddingHorizontal: spacing * 5,
      paddingTop: spacing * 3,
      paddingBottom: spacing * 2,
      backgroundColor: cSurfaceAlt,
    },
    tabRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing * 2,
    },
    tabButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: cLine,
      backgroundColor: cSurface,
      borderRadius: 14,
      minHeight: 48,
      paddingHorizontal: spacing * 3,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing + 2,
    },
    tabButtonActive: {
      borderColor: tint(cPrimary, 0.45, cPrimary),
      backgroundColor: tint(cPrimary, 0.1, cSurface),
    },
    tabLabel: {
      color: cTextMuted,
      fontSize: safeNumber(theme?.typography?.scale?.detail?.size, 14) + 1,
      lineHeight: safeNumber(theme?.typography?.scale?.detail?.lineHeight, 20) + 2,
      fontWeight: "800",
    },
    tabLabelActive: {
      color: cPrimary,
    },
    tabBadge: {
      minWidth: 22,
      height: 22,
      borderRadius: 11,
      paddingHorizontal: 6,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: tint(cPrimary, 0.4, cPrimary),
      backgroundColor: tint(cPrimary, 0.18, cSurface),
    },
    tabBadgeText: {
      color: cPrimary,
      fontSize: safeNumber(theme?.typography?.scale?.caption?.size, 12),
      lineHeight: safeNumber(theme?.typography?.scale?.caption?.lineHeight, 16),
      fontWeight: "900",
    },
    stickyFilterWrap: {
      paddingHorizontal: spacing * 5,
      paddingVertical: spacing * 2,
      backgroundColor: cSurfaceAlt,
      borderBottomWidth: 1,
      borderBottomColor: tint(cLine, 0.85, cLine),
    },
    filterScroll: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing * 2,
    },
    filterChip: {
      minHeight: 36,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: cLine,
      backgroundColor: cSurface,
      paddingHorizontal: spacing * 3,
      alignItems: "center",
      justifyContent: "center",
    },
    filterChipActive: {
      borderColor: tint(cPrimary, 0.45, cPrimary),
      backgroundColor: tint(cPrimary, 0.12, cSurface),
    },
    filterChipText: {
      color: cTextMuted,
      fontSize: safeNumber(theme?.typography?.scale?.detail?.size, 14),
      lineHeight: safeNumber(theme?.typography?.scale?.detail?.lineHeight, 20),
      fontWeight: "800",
    },
    filterChipTextActive: {
      color: cPrimary,
      fontWeight: "900",
    },
    listContent: {
      paddingHorizontal: spacing * 5,
      paddingTop: spacing * 3,
      paddingBottom: spacing * 24,
    },
    cardPressable: {
      position: "relative",
    },
    cardStrip: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: 5,
      borderTopLeftRadius: 16,
      borderBottomLeftRadius: 16,
      zIndex: 3,
    },
    card: {
      borderRadius: safeNumber(theme?.components?.card?.radius, 16),
      paddingHorizontal: spacing * 4,
      paddingTop: spacing * 4,
      paddingBottom: spacing * 4,
      gap: spacing * 3,
    },
    topRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: spacing * 2,
    },
    tagsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing,
      flex: 1,
    },
    tagChip: {
      borderRadius: 999,
      borderWidth: 1,
      minHeight: 24,
      paddingHorizontal: spacing * 2,
      alignItems: "center",
      justifyContent: "center",
    },
    tagText: {
      fontSize: safeNumber(theme?.typography?.scale?.caption?.size, 12),
      lineHeight: safeNumber(theme?.typography?.scale?.caption?.lineHeight, 16),
      fontWeight: "900",
    },
    topMeta: {
      alignItems: "flex-end",
      gap: 2,
      minWidth: 84,
    },
    topMetaText: {
      color: cTextMuted,
      fontSize: safeNumber(theme?.typography?.scale?.caption?.size, 12),
      lineHeight: safeNumber(theme?.typography?.scale?.caption?.lineHeight, 16),
      fontWeight: "700",
    },
    routeWrap: {
      borderWidth: 1,
      borderColor: tint(cLine, 0.9, cLine),
      backgroundColor: tint(cTextMain, 0.02, cSurface),
      borderRadius: 14,
      paddingHorizontal: spacing * 3,
      paddingVertical: spacing * 3,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing * 2,
    },
    routeCol: {
      flex: 1,
      gap: 2,
    },
    routeLabel: {
      color: cTextMuted,
      fontSize: safeNumber(theme?.typography?.scale?.caption?.size, 12),
      lineHeight: safeNumber(theme?.typography?.scale?.caption?.lineHeight, 16),
      fontWeight: "800",
    },
    routeAddress: {
      color: cTextMain,
      fontSize: safeNumber(theme?.typography?.scale?.detail?.size, 14) + 1,
      lineHeight: safeNumber(theme?.typography?.scale?.detail?.lineHeight, 20) + 2,
      fontWeight: "900",
    },
    routeCenter: {
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      minWidth: 74,
    },
    routeDistanceChip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: tint(cPrimary, 0.35, cPrimary),
      backgroundColor: tint(cPrimary, 0.14, cSurface),
      minHeight: 24,
      paddingHorizontal: spacing * 2,
      alignItems: "center",
      justifyContent: "center",
    },
    routeDistanceText: {
      color: cPrimary,
      fontSize: safeNumber(theme?.typography?.scale?.caption?.size, 12),
      lineHeight: safeNumber(theme?.typography?.scale?.caption?.lineHeight, 16),
      fontWeight: "900",
    },
    routeArrow: {
      color: cTextMuted,
      fontSize: 16,
    },
    specGrid: {
      flexDirection: "row",
      alignItems: "stretch",
      borderWidth: 1,
      borderColor: tint(cLine, 0.9, cLine),
      borderRadius: 12,
      overflow: "hidden",
    },
    specCell: {
      flex: 1,
      minHeight: 62,
      paddingHorizontal: spacing * 2,
      paddingVertical: spacing * 2,
      justifyContent: "center",
      gap: 3,
      borderRightWidth: 1,
      borderRightColor: tint(cLine, 0.9, cLine),
      backgroundColor: cSurface,
    },
    specCellLast: {
      borderRightWidth: 0,
    },
    specLabel: {
      color: cTextMuted,
      fontSize: safeNumber(theme?.typography?.scale?.caption?.size, 12),
      lineHeight: safeNumber(theme?.typography?.scale?.caption?.lineHeight, 16),
      fontWeight: "700",
    },
    specValue: {
      color: cTextSub,
      fontSize: safeNumber(theme?.typography?.scale?.detail?.size, 14),
      lineHeight: safeNumber(theme?.typography?.scale?.detail?.lineHeight, 20),
      fontWeight: "800",
    },
    bottomRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing * 2,
    },
    emptyDistanceChip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: tint(cTextMuted, 0.35, cLine),
      backgroundColor: tint(cTextMuted, 0.08, cSurface),
      minHeight: 28,
      paddingHorizontal: spacing * 3,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyDistanceText: {
      color: cTextMuted,
      fontSize: safeNumber(theme?.typography?.scale?.caption?.size, 12) + 1,
      lineHeight: safeNumber(theme?.typography?.scale?.caption?.lineHeight, 16) + 2,
      fontWeight: "800",
    },
    priceBlock: {
      alignItems: "flex-end",
      gap: 2,
    },
    priceLabel: {
      color: cTextMuted,
      fontSize: safeNumber(theme?.typography?.scale?.caption?.size, 12),
      lineHeight: safeNumber(theme?.typography?.scale?.caption?.lineHeight, 16),
      fontWeight: "700",
    },
    priceText: {
      color: cTextMain,
      fontSize: safeNumber(theme?.typography?.scale?.heading?.size, 18) + 4,
      lineHeight: safeNumber(theme?.typography?.scale?.heading?.lineHeight, 26) + 2,
      fontWeight: "900",
      letterSpacing: -0.2,
    },
    fabWrap: {
      position: "absolute",
      right: spacing * 5,
      zIndex: 25,
      alignItems: "flex-end",
      gap: spacing * 2,
    },
    tooltip: {
      maxWidth: 220,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: tint(cPrimary, 0.3, cLine),
      backgroundColor: cSurface,
      paddingHorizontal: spacing * 3,
      paddingVertical: spacing * 2,
    },
    tooltipText: {
      color: cTextMain,
      fontSize: safeNumber(theme?.typography?.scale?.caption?.size, 12) + 1,
      lineHeight: safeNumber(theme?.typography?.scale?.caption?.lineHeight, 16) + 2,
      fontWeight: "700",
    },
    fabButton: {
      minHeight: 56,
      borderRadius: 999,
      paddingHorizontal: spacing * 4,
      shadowColor: cTextMain,
      shadowOpacity: 0.18,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 8,
    },
    fabText: {
      fontSize: safeNumber(theme?.typography?.scale?.detail?.size, 14) + 1,
      fontWeight: "900",
    },
    aiOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: tint(cTextMain, 0.36, "#000000"),
      alignItems: "center",
      justifyContent: "center",
      gap: spacing * 2,
      zIndex: 40,
    },
    aiOverlayText: {
      color: safeString(theme?.colors?.textOnBrand, "#FFFFFF"),
      fontSize: safeNumber(theme?.typography?.scale?.detail?.size, 14) + 1,
      lineHeight: safeNumber(theme?.typography?.scale?.detail?.lineHeight, 20) + 2,
      fontWeight: "900",
    },
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
      minHeight: 36,
      paddingHorizontal: spacing * 4,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: tint(cTextMain, 0.4, cLine),
      backgroundColor: safeString(theme?.colors?.bgSurface, "#FFFFFF"),
    },
    toastText: {
      color: cTextMain,
      fontSize: safeNumber(theme?.typography?.scale?.detail?.size, 14),
      lineHeight: safeNumber(theme?.typography?.scale?.detail?.lineHeight, 20),
      fontWeight: "800",
    },
    refreshButton: {
      minHeight: 40,
      width: 40,
    },
    logoBadge: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: tint(cPrimary, 0.16, cSurface),
      borderWidth: 1,
      borderColor: tint(cPrimary, 0.35, cLine),
      alignItems: "center",
      justifyContent: "center",
    },
    logoIcon: {
      color: cPrimary,
      fontSize: 18,
    },
    cardPressed: {
      opacity: 0.86,
    },
    separator: {
      height: spacing * 3,
    },
    errorWrap: {
      paddingHorizontal: spacing * 5,
    },
  });
});

function DriverOrdersTabs({
  activeTab,
  myCount,
  onChangeTab,
}: {
  activeTab: DriverOrdersTabKey;
  myCount: number;
  onChangeTab: (nextTab: DriverOrdersTabKey) => void;
}) {
  const styles = useStyles();

  return (
    <View style={styles.tabsWrap}>
      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tabButton, activeTab === "market" ? styles.tabButtonActive : null]}
          onPress={() => onChangeTab("market")}
        >
          <AppText style={[styles.tabLabel, activeTab === "market" ? styles.tabLabelActive : null]}>
            오더 마켓
          </AppText>
        </Pressable>

        <Pressable
          style={[styles.tabButton, activeTab === "my" ? styles.tabButtonActive : null]}
          onPress={() => onChangeTab("my")}
        >
          <AppText style={[styles.tabLabel, activeTab === "my" ? styles.tabLabelActive : null]}>
            내 오더
          </AppText>
          {myCount > 0 ? (
            <View style={styles.tabBadge}>
              <AppText style={styles.tabBadgeText}>{myCount}</AppText>
            </View>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}

function DriverOrderFilters({
  filters,
  activeFilter,
  onChangeFilter,
}: {
  filters: DriverOrderFilterKey[];
  activeFilter: DriverOrderFilterKey;
  onChangeFilter: (filter: DriverOrderFilterKey) => void;
}) {
  const styles = useStyles();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
      {filters.map((filter) => {
        const selected = activeFilter === filter;
        return (
          <Pressable
            key={filter}
            style={[styles.filterChip, selected ? styles.filterChipActive : null]}
            onPress={() => onChangeFilter(filter)}
          >
            <AppText style={[styles.filterChipText, selected ? styles.filterChipTextActive : null]}>
              {getDriverOrderFilterLabel(filter)}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function DriverOrderCardView({
  item,
  onPress,
}: {
  item: DriverOrderCard;
  onPress: (card: DriverOrderCard) => void;
}) {
  const theme = useAppTheme();
  const styles = useStyles();
  const colors = theme.colors as Record<string, string>;

  const statusStripColor = resolveStatusStripColor(item.status, colors);

  return (
    <Pressable
      onPress={() => onPress(item)}
      style={({ pressed }) => [styles.cardPressable, pressed ? styles.cardPressed : null]}
    >
      <View style={[styles.cardStrip, { backgroundColor: statusStripColor }]} />
      <AppCard outlined style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.tagsRow}>
            {item.tags.map((tag) => {
              const palette = resolveTagPalette(tag.key, colors);
              return (
                <View
                  key={`${item.cardKey}-${tag.key}`}
                  style={[styles.tagChip, { borderColor: palette.border, backgroundColor: palette.bg }]}
                >
                  <AppText style={[styles.tagText, { color: palette.text }]}>{tag.label}</AppText>
                </View>
              );
            })}
          </View>
          <View style={styles.topMeta}>
            <AppText style={styles.topMetaText}>{item.requestedAtText || ""}</AppText>
            {item.pickupTimeText ? <AppText style={styles.topMetaText}>{item.pickupTimeText}</AppText> : null}
          </View>
        </View>

        <View style={styles.routeWrap}>
          <View style={styles.routeCol}>
            <AppText style={styles.routeLabel}>출발</AppText>
            <AppText style={styles.routeAddress}>{item.originAddress || "-"}</AppText>
          </View>

          <View style={styles.routeCenter}>
            {item.routeDistanceText ? (
              <View style={styles.routeDistanceChip}>
                <AppText style={styles.routeDistanceText}>{item.routeDistanceText}</AppText>
              </View>
            ) : null}
            <Ionicons name="arrow-forward" style={styles.routeArrow} />
          </View>

          <View style={styles.routeCol}>
            <AppText style={styles.routeLabel}>도착</AppText>
            <AppText style={styles.routeAddress}>{item.destinationAddress || "-"}</AppText>
          </View>
        </View>

        <View style={styles.specGrid}>
          <View style={styles.specCell}>
            <AppText style={styles.specLabel}>차종</AppText>
            <AppText style={styles.specValue}>{item.vehicleText || "-"}</AppText>
          </View>
          <View style={styles.specCell}>
            <AppText style={styles.specLabel}>방법</AppText>
            <AppText style={styles.specValue}>{item.methodText || "-"}</AppText>
          </View>
          <View style={[styles.specCell, styles.specCellLast]}>
            <AppText style={styles.specLabel}>화물</AppText>
            <AppText style={styles.specValue}>{item.cargoText || "-"}</AppText>
          </View>
        </View>

        <View style={styles.bottomRow}>
          {item.emptyDistanceText ? (
            <View style={styles.emptyDistanceChip}>
              <AppText style={styles.emptyDistanceText}>{item.emptyDistanceText}</AppText>
            </View>
          ) : (
            <View />
          )}

          <View style={styles.priceBlock}>
            <AppText style={styles.priceLabel}>{item.statusLabel}</AppText>
            <AppText style={styles.priceText}>{item.priceText || "-"}</AppText>
          </View>
        </View>
      </AppCard>
    </Pressable>
  );
}

export function DriverOrdersBoard({ activeTab, onChangeTab }: DriverOrdersBoardProps) {
  const router = useRouter();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useStyles();

  const [overview, setOverview] = useState<DriverOrdersOverview>(EMPTY_OVERVIEW);
  const [activeFilter, setActiveFilter] = useState<DriverOrderFilterKey>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>({ visible: false, message: "" });
  const [showAiTooltip, setShowAiTooltip] = useState(false);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardNavLockRef = useRef(false);
  const lastCardNavIdRef = useRef(0);

  const showToast = useCallback((message: string) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    setToast({ visible: true, message });
    toastTimerRef.current = setTimeout(() => {
      setToast({ visible: false, message: "" });
      toastTimerRef.current = null;
    }, TOAST_DURATION_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const loadOrders = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const nextOverview = await loadDriverOrdersOverview();
        setOverview(nextOverview);
        setActiveFilter((prev) => (nextOverview.availableFilters.includes(prev) ? prev : "ALL"));
        setErrorMessage(null);
      } catch {
        setOverview(EMPTY_OVERVIEW);
        setErrorMessage(NETWORK_ERROR_TEXT);
      } finally {
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
    let mounted = true;

    readDriverOrdersAiTooltipSeen()
      .then((seen) => {
        if (!mounted) return;
        if (!seen) {
          setShowAiTooltip(true);
        }
      })
      .catch(() => {
        if (!mounted) return;
        setShowAiTooltip(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const dismissAiTooltip = useCallback(() => {
    setShowAiTooltip(false);
    void writeDriverOrdersAiTooltipSeen(true);
  }, []);

  const filteredMarketOrders = useMemo(() => {
    return overview.marketOrders.filter((card) => matchesDriverOrderFilter(card, activeFilter));
  }, [activeFilter, overview.marketOrders]);

  const visibleOrders = activeTab === "market" ? filteredMarketOrders : overview.myOrders;
  const showFilters = activeTab === "market" && overview.availableFilters.length > 1;
  const showAiFab = activeTab === "market" && overview.capability.supportsAiFab;
  const showAiTooltipBubble = showAiTooltip && showAiFab && !isAiLoading;

  const listBottomPadding = useMemo(() => {
    if (showAiFab) return insets.bottom + 126;
    return insets.bottom + 36;
  }, [insets.bottom, showAiFab]);

  const handlePressCard = useCallback(
    async (card: DriverOrderCard) => {
      if (cardNavLockRef.current && lastCardNavIdRef.current === card.matchId) return;
      cardNavLockRef.current = true;
      lastCardNavIdRef.current = card.matchId;

      const access = await probeDriverOrderDetailAccess(card.matchId);
      if (access === "forbidden") {
        showToast("상세 접근 불가(권한)");
        cardNavLockRef.current = false;
        return;
      }
      if (access !== "ok") {
        showToast(NETWORK_ERROR_TEXT);
        cardNavLockRef.current = false;
        return;
      }

      router.push({
        pathname: "/(driver)/run/[id]",
        params: buildDriverOrderDetailParams(card),
      });

      setTimeout(() => {
        cardNavLockRef.current = false;
      }, 450);
    },
    [router, showToast]
  );

  const handlePressAiFab = useCallback(async () => {
    if (!showAiFab || isAiLoading) return;

    dismissAiTooltip();
    setIsAiLoading(true);
    try {
      const recommended = await requestAiRecommendedOrder(overview.marketOrders);
      if (!recommended) {
        showToast("추천 가능한 오더가 없습니다.");
        return;
      }

      setOverview((prev) => ({
        ...prev,
        marketOrders: [recommended, ...prev.marketOrders.filter((order) => order.matchId !== recommended.matchId)],
      }));
      setActiveFilter("ALL");
      showToast("AI 추천 오더를 반영했습니다.");
    } catch {
      showToast(NETWORK_ERROR_TEXT);
    } finally {
      setIsAiLoading(false);
    }
  }, [dismissAiTooltip, isAiLoading, overview.marketOrders, showAiFab, showToast]);

  const renderItem = useCallback(
    ({ item }: { item: DriverOrderCard }) => <DriverOrderCardView item={item} onPress={handlePressCard} />,
    [handlePressCard]
  );

  const renderListHeader = useCallback(() => {
    if (!showFilters) return null;
    return (
      <View style={styles.stickyFilterWrap}>
        <DriverOrderFilters
          filters={overview.availableFilters}
          activeFilter={activeFilter}
          onChangeFilter={setActiveFilter}
        />
      </View>
    );
  }, [activeFilter, overview.availableFilters, showFilters, styles.stickyFilterWrap]);

  const keyExtractor = useCallback((item: DriverOrderCard) => item.cardKey, []);

  const backgroundColor = safeString(theme?.colors?.bgSurfaceAlt, "#F8FAFC");
  const textMain = safeString(theme?.colors?.textMain, "#111827");

  const headerLeft = (
    <View style={styles.logoBadge}>
      <Ionicons name="car-sport-outline" style={styles.logoIcon} />
    </View>
  );

  const headerRight = (
    <AppButton
      size="icon"
      variant="secondary"
      style={styles.refreshButton}
      accessibilityLabel="목록 새로고침"
      onPress={() => {
        void loadOrders("refresh");
      }}
    >
      <Ionicons name="refresh" size={18} color={textMain} />
    </AppButton>
  );

  return (
    <PageScaffold
      title="Rodia Driver Pro"
      backgroundColor={backgroundColor}
      scroll={false}
      padding={0}
      headerLeft={headerLeft}
      headerRight={headerRight}
    >
      <View style={styles.root}>
        <DriverOrdersTabs activeTab={activeTab} myCount={overview.myCount} onChangeTab={onChangeTab} />

        {isLoading ? (
          <AppSpinner label="오더 목록을 불러오는 중입니다." />
        ) : errorMessage ? (
          <View style={styles.errorWrap}>
            <AppErrorState
              title="오더 목록을 불러오지 못했어요"
              description={errorMessage}
              retryLabel="다시 시도"
              onRetry={() => {
                void loadOrders("initial");
              }}
              fullScreen={false}
            />
          </View>
        ) : (
          <FlatList
            data={visibleOrders}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            ListHeaderComponent={renderListHeader}
            stickyHeaderIndices={showFilters ? [0] : undefined}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={[styles.listContent, { paddingBottom: listBottomPadding }]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => {
                  void loadOrders("refresh");
                }}
              />
            }
            ListEmptyComponent={
              <AppEmptyState
                title={activeTab === "market" ? "오더 마켓이 비어 있습니다." : "내 오더가 없습니다."}
                description={
                  activeTab === "market"
                    ? "새 오더가 등록되면 이곳에 표시됩니다."
                    : "수락한 오더가 있으면 이곳에 표시됩니다."
                }
                fullScreen={false}
              />
            }
          />
        )}

        {showAiFab ? (
          <View style={[styles.fabWrap, { bottom: insets.bottom + 78 }]}>
            {showAiTooltipBubble ? (
              <Pressable style={styles.tooltip} onPress={dismissAiTooltip}>
                <AppText style={styles.tooltipText}>AI 추천으로 수익 가능성이 높은 오더를 먼저 확인해 보세요.</AppText>
              </Pressable>
            ) : null}

            <AppButton style={styles.fabButton} onPress={() => void handlePressAiFab()}>
              <AppText style={styles.fabText} color="textOnBrand">
                AI 추천받기
              </AppText>
            </AppButton>
          </View>
        ) : null}

        {isAiLoading ? (
          <View style={styles.aiOverlay}>
            <ActivityIndicator size="large" color={safeString(theme?.colors?.textOnBrand, "#FFFFFF")} />
            <AppText style={styles.aiOverlayText}>AI 최적 경로 탐색 중...</AppText>
          </View>
        ) : null}

        {toast.visible ? (
          <View style={[styles.toastWrap, { bottom: insets.bottom + 26 }]}>
            <View style={styles.toastCard}>
              <AppText style={styles.toastText}>{toast.message}</AppText>
            </View>
          </View>
        ) : null}
      </View>
    </PageScaffold>
  );
}

export default DriverOrdersBoard;
