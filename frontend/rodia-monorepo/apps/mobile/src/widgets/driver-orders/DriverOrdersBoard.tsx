import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
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
      border: tint(colors.brandPrimary, 0.25, colors.borderDefault),
    };
  }
  if (tone === BADGE_TONE.PROGRESS) {
    return {
      bg: tint(colors.semanticSuccess, 0.1, colors.bgSurface),
      text: colors.semanticSuccess,
      border: tint(colors.semanticSuccess, 0.25, colors.borderDefault),
    };
  }
  if (tone === BADGE_TONE.CLOSED) {
    return {
      bg: tint(colors.semanticInfo, 0.1, colors.bgSurface),
      text: colors.semanticInfo,
      border: tint(colors.semanticInfo, 0.25, colors.borderDefault),
    };
  }
  return {
    bg: tint(colors.textMuted, 0.1, colors.bgSurface),
    text: colors.textMuted,
    border: tint(colors.textMuted, 0.25, colors.borderDefault),
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
  const cInfo = safeString(theme?.colors?.semanticInfo, "#2563EB");
  const cToastBg = tint(cTextMain, 0.92, cTextMain);

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: cSurfaceAlt },

    tabsRow: {
      flexDirection: "row",
      paddingHorizontal: spacing * 2,
      backgroundColor: cSurface,
      borderBottomWidth: 1,
      borderBottomColor: cLine,
    },
    tabBtn: {
      flex: 1,
      paddingVertical: 14,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 6,
      borderBottomWidth: 2,
      borderBottomColor: "transparent",
    },
    tabBtnActive: { borderBottomColor: cPrimary },
    tabLabel: { color: cTextMuted, fontSize: 15, fontWeight: "800" },
    tabLabelActive: { color: cTextMain, fontWeight: "900" },

    tabBadge: {
      backgroundColor: cPrimary,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 10,
    },
    tabBadgeText: { color: cSurface, fontSize: 11, fontWeight: "900" },

    listContent: { paddingHorizontal: spacing * 4, paddingTop: spacing * 4, paddingBottom: spacing * 24 },
    separator: { height: spacing * 3.5 },

    flex1: { flex: 1 },

    cardPressable: {},
    cardWrap: {
      borderRadius: 16,
      padding: spacing * 4,
    },
    cardPressed: { transform: [{ scale: 0.99 }] },

    cardTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing * 4,
    },
    badge: { paddingHorizontal: spacing * 2, paddingVertical: spacing, borderRadius: 6, borderWidth: 1 },
    badgeText: { fontSize: 12, fontWeight: "900", letterSpacing: -0.2 },
    timeText: { color: cTextMuted, fontSize: 13, fontWeight: "700" },

    timelineWrap: { flexDirection: "row", alignItems: "stretch", marginBottom: spacing * 4 },
    rail: { width: 24, alignItems: "center", marginRight: spacing * 2 },
    dotStart: { width: 10, height: 10, borderRadius: 5, backgroundColor: cInfo, zIndex: 2 },
    dotEnd: { width: 10, height: 10, borderRadius: 5, backgroundColor: cPrimary, zIndex: 2 },
    line: { width: 2, flex: 1, backgroundColor: cLine, marginVertical: 4 },
    addressWrap: { flex: 1, justifyContent: "space-between", paddingVertical: 1 },
    addressSpacer: { height: spacing * 4 },
    distanceWrap: { justifyContent: "center" },
    addressBlock: { gap: 2 },
    addressLabel: { color: cTextMuted, fontSize: 12, fontWeight: "800" },
    addressText: { color: cTextMain, fontSize: 16, fontWeight: "900", lineHeight: 22, letterSpacing: -0.3 },

    distanceChip: {
      backgroundColor: cSurfaceAlt,
      borderWidth: 1,
      borderColor: cLine,
      paddingHorizontal: spacing * 2,
      paddingVertical: 4,
      borderRadius: 999,
    },
    distanceText: { color: cTextSub, fontSize: 12, fontWeight: "900" },

    cardBottom: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
      paddingTop: spacing * 4,
      borderTopWidth: 1,
      borderTopColor: tint(cLine, 0.5, cSurfaceAlt),
    },
    tagWrap: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 6, paddingRight: 8 },
    specText: { color: cTextMuted, fontSize: 13, fontWeight: "700" },
    priceWrap: { flexDirection: "row", alignItems: "baseline", gap: 4 },
    priceLabel: { color: cTextSub, fontSize: 13, fontWeight: "800" },
    priceVal: { color: cPrimary, fontSize: 24, fontWeight: "900", letterSpacing: -0.5 },
    prepareWrap: { marginTop: spacing * 3 },
    prepareBtn: { minHeight: spacing * 12, borderRadius: spacing * 3 },
    prepareBtnText: { fontWeight: "900", fontSize: 15 },

    filterScroll: {
      flexDirection: "row",
      paddingHorizontal: spacing * 4,
      paddingVertical: spacing * 2,
      backgroundColor: cSurfaceAlt,
      borderBottomWidth: 1,
      borderBottomColor: tint(cLine, 0.7, cLine),
    },
    filterChip: {
      minHeight: 32,
      paddingHorizontal: spacing * 3,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: cLine,
      backgroundColor: cSurface,
      alignItems: "center",
      justifyContent: "center",
      marginRight: spacing * 2,
    },
    filterChipActive: { borderColor: cTextMain, backgroundColor: cTextMain },
    filterChipText: { color: cTextMuted, fontSize: 13, fontWeight: "800" },
    filterChipTextActive: { color: cSurface, fontWeight: "900" },

    errorWrap: { paddingHorizontal: spacing * 5, paddingTop: spacing * 4 },
    refreshBtn: { padding: spacing },

    toastWrap: { position: "absolute", left: 0, right: 0, alignItems: "center", zIndex: 45, pointerEvents: "none" },
    toastCard: {
      borderRadius: 999,
      minHeight: 36,
      paddingHorizontal: spacing * 4,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: cToastBg,
    },
    toastText: { color: cSurface, fontSize: 14, fontWeight: "800" },
  });
});

function DriverOrderCardView({
  item,
  onPress,
  activeTab,
  onPrepareClick,
}: {
  item: DriverOrderCard;
  onPress: (card: DriverOrderCard) => void;
  activeTab: DriverOrdersTabKey;
  onPrepareClick: (card: DriverOrderCard) => void;
}) {
  const theme = useAppTheme();
  const styles = useStyles();
  const colors = theme.colors as Record<string, string>;
  const pal = resolveStatusPalette(item.statusTone, colors);

  const specSummary = item.tags.map((t) => t.label).join(" · ");
  const ctaPolicy = item.cta;
  const ctaVariant = ctaPolicy.variant === "primary" ? "primary" : ctaPolicy.variant === "destructive" ? "destructive" : "secondary";

  return (
    <Pressable onPress={() => onPress(item)} style={({ pressed }) => [styles.cardPressable, pressed ? styles.cardPressed : null]}>
      <AppCard style={styles.cardWrap} outlined elevated>
        <View style={styles.cardTop}>
          <View style={[styles.badge, { backgroundColor: pal.bg, borderColor: pal.border }]}>
            <AppText style={[styles.badgeText, { color: pal.text }]}>{item.statusLabel}</AppText>
          </View>
          <AppText style={styles.timeText}>{item.requestedAtText || ""}</AppText>
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
            <AppText style={styles.specText} numberOfLines={1}>
              {specSummary || ""}
            </AppText>
          </View>
          <View style={styles.priceWrap}>
            <AppText style={styles.priceLabel}>운임</AppText>
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
            >
              <AppText color={ctaPolicy.enabled ? "textOnBrand" : "textSecondary"} style={styles.prepareBtnText}>
                {ctaPolicy.label}
              </AppText>
            </AppButton>
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
  const focusRefetchMetaRef = useRef({ hasFocusedOnce: false, inFlight: false, lastRefetchAt: 0 });

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
      if (meta.inFlight || now - meta.lastRefetchAt < FOCUS_REFETCH_THROTTLE_MS) {
        return undefined;
      }

      meta.inFlight = true;
      meta.lastRefetchAt = now;
      void loadOrders("refresh").finally(() => {
        meta.inFlight = false;
      });

      return undefined;
    }, [loadOrders])
  );

  const filteredMarketOrders = useMemo(
    () => overview.marketOrders.filter((c) => matchesDriverOrderFilter(c, activeFilter)),
    [activeFilter, overview.marketOrders]
  );

  const filteredMyOrders = useMemo(
    () =>
      overview.myOrders.filter(
        (item) =>
          item.uiState === DRIVER_UI_STATE.NEGOTIATING ||
          item.cta?.id === DRIVER_CTA_ID.PAYMENT_PENDING
      ),
    [overview.myOrders]
  );

  const visibleOrders = useMemo(() => {
    if (resolvedActiveTab === "market") {
      return filteredMarketOrders;
    }
    if (assignedOnly) {
      return overview.runOrders;
    }
    return filteredMyOrders;
  }, [assignedOnly, filteredMarketOrders, filteredMyOrders, overview.runOrders, resolvedActiveTab]);

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
      router.push({
        pathname: "/(driver-stack)/run/[id]",
        params: { id },
      });

      setTimeout(() => {
        cardNavLockRef.current = false;
      }, 450);
    },
    [router, showToast]
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
  }, [activeFilter, overview.availableFilters, showFilters, styles.filterChip, styles.filterChipActive, styles.filterChipText, styles.filterChipTextActive, styles.filterScroll]);

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
          <View style={styles.tabsRow}>
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
            style={styles.flex1}
            data={visibleOrders}
            keyExtractor={(item) => item.cardKey}
            renderItem={({ item }) => (
              <DriverOrderCardView
                item={item}
                activeTab={resolvedActiveTab}
                onPress={handlePressCard}
                onPrepareClick={handlePrepareForDrive}
              />
            )}
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
                      ? "수락 완료 또는 운행 중인 오더가 생기면 이곳에 표시됩니다."
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
