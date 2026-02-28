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
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  buildDriverOrderDetailParams,
  getDriverOrderFilterLabel,
  getDriverQuoteSummaryDetail,
  loadDriverOrdersOverview,
  matchesDriverOrderFilter,
  probeDriverOrderDetailAccess,
  requestAiRecommendedOrder,
  type DriverOrderCard,
  type DriverOrderFilterKey,
  type DriverOrdersOverview,
  type DriverOrdersTabKey,
} from "@/features/matching/api";
import { useActiveOrder } from "@/entities/order/model/active-order.store";
import {
  readDriverOrdersAiTooltipSeen,
  writeDriverOrdersAiTooltipSeen,
} from "@/shared/lib/storage/driverOrdersStorage";
import {
  BADGE_TONE,
  DRIVER_UI_STATE,
  getDriverUiStateFromBackendStatus,
  type BadgeTone,
} from "@/shared/lib/policy";
import { safeNumber, safeString, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppEmptyState } from "@/shared/ui/kit/AppEmptyState";
import { AppErrorState } from "@/shared/ui/kit/AppErrorState";
import { AppSpinner } from "@/shared/ui/kit/AppSpinner";
import { AppText } from "@/shared/ui/kit/AppText";

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
  myCount: 0,
  availableFilters: ["ALL"],
  capability: { supportsRichFilters: false, supportsAiFab: false },
};

function resolveStatusPalette(tone: BadgeTone, colors: Record<string, string>) {
  if (tone === BADGE_TONE.ATTENTION) {
    return { bg: tint(colors.brandPrimary, 0.1, colors.bgSurface), text: colors.brandPrimary, border: tint(colors.brandPrimary, 0.25, colors.borderDefault) };
  }
  if (tone === BADGE_TONE.PROGRESS) {
    return { bg: tint(colors.semanticSuccess, 0.1, colors.bgSurface), text: colors.semanticSuccess, border: tint(colors.semanticSuccess, 0.25, colors.borderDefault) };
  }
  if (tone === BADGE_TONE.CLOSED) {
    return { bg: tint(colors.semanticInfo, 0.1, colors.bgSurface), text: colors.semanticInfo, border: tint(colors.semanticInfo, 0.25, colors.borderDefault) };
  }
  return { bg: tint(colors.textMuted, 0.1, colors.bgSurface), text: colors.textMuted, border: tint(colors.textMuted, 0.25, colors.borderDefault) };
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

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: cSurfaceAlt },
    
    // --- Header & Tabs ---
    headerContainer: {
      backgroundColor: cSurface,
      borderBottomWidth: 1,
      borderBottomColor: cLine,
      zIndex: 10,
    },
    headerTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing * 4,
      paddingVertical: spacing * 3,
    },
    headerLogoWrap: { flexDirection: "row", alignItems: "center", gap: spacing * 2 },
    logoCircle: {
      width: 32, height: 32, borderRadius: 16,
      backgroundColor: tint(cPrimary, 0.1, cSurface),
      alignItems: "center", justifyContent: "center",
    },
    logoIcon: { color: cPrimary, fontSize: 18 },
    headerTitle: { color: cTextMain, fontSize: 18, fontWeight: "900", letterSpacing: -0.3 },
    tabsRow: { flexDirection: "row", paddingHorizontal: spacing * 2 },
    tabBtn: {
      flex: 1, paddingVertical: 14,
      alignItems: "center", justifyContent: "center",
      flexDirection: "row", gap: 6,
      borderBottomWidth: 2, borderBottomColor: "transparent",
    },
    tabBtnActive: { borderBottomColor: cPrimary },
    tabLabel: { color: cTextMuted, fontSize: 15, fontWeight: "800" },
    tabLabelActive: { color: cTextMain, fontWeight: "900" },
    tabBadge: {
      backgroundColor: cPrimary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10,
    },
    tabBadgeText: { color: cSurface, fontSize: 11, fontWeight: "900" },

    // --- List & Card ---
    listContent: { paddingHorizontal: spacing * 4, paddingTop: spacing * 4, paddingBottom: spacing * 24 },
    separator: { height: spacing * 3.5 },
    
    cardWrap: {
      backgroundColor: cSurface,
      borderRadius: 16,
      padding: spacing * 4,
      borderWidth: 1,
      borderColor: tint(cLine, 0.6, cLine),
      shadowColor: "#000",
      shadowOpacity: 0.03,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    cardPressed: { backgroundColor: cSurfaceAlt, transform: [{ scale: 0.99 }] },
    
    // Top (Badge & Time)
    cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing * 4 },
    badge: { paddingHorizontal: spacing * 2, paddingVertical: spacing, borderRadius: 6, borderWidth: 1 },
    badgeText: { fontSize: 12, fontWeight: "900", letterSpacing: -0.2 },
    timeText: { color: cTextMuted, fontSize: 13, fontWeight: "700" },

    // Middle (Vertical Timeline)
    timelineWrap: { flexDirection: "row", alignItems: "stretch", marginBottom: spacing * 4 },
    rail: { width: 24, alignItems: "center", marginRight: spacing * 2 },
    dotStart: { width: 10, height: 10, borderRadius: 5, backgroundColor: cInfo, zIndex: 2 },
    dotEnd: { width: 10, height: 10, borderRadius: 5, backgroundColor: cPrimary, zIndex: 2 },
    line: { width: 2, flex: 1, backgroundColor: cLine, marginVertical: 4 },
    addressWrap: { flex: 1, justifyContent: "space-between", paddingVertical: 1 },
    addressBlock: { gap: 2 },
    addressLabel: { color: cTextMuted, fontSize: 12, fontWeight: "800" },
    addressText: { color: cTextMain, fontSize: 16, fontWeight: "900", lineHeight: 22, letterSpacing: -0.3 },
    
    // Distance Pill
    distancePill: {
      justifyContent: "center", alignItems: "flex-end", paddingLeft: spacing * 2,
    },
    distanceChip: {
      backgroundColor: cSurfaceAlt, borderWidth: 1, borderColor: cLine,
      paddingHorizontal: spacing * 2, paddingVertical: 4, borderRadius: 999,
    },
    distanceText: { color: cTextSub, fontSize: 12, fontWeight: "900" },

    // Bottom (Tags & Price - Horizontal alignment)
    cardBottom: {
      flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end",
      paddingTop: spacing * 4, borderTopWidth: 1, borderTopColor: tint(cLine, 0.5, cSurfaceAlt),
    },
    tagWrap: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 6, paddingRight: 8 },
    specText: { color: cTextMuted, fontSize: 13, fontWeight: "700" },
    priceWrap: { flexDirection: "row", alignItems: "baseline", gap: 4 },
    priceLabel: { color: cTextSub, fontSize: 13, fontWeight: "800" },
    priceVal: { color: cTextMain, fontSize: 24, fontWeight: "900", letterSpacing: -0.5 },

    // CTA
    ctaWrap: { marginTop: spacing * 4 },

    // Extras
    fabWrap: { position: "absolute", right: spacing * 4, zIndex: 25, alignItems: "flex-end", gap: spacing * 2 },
    fabButton: { minHeight: 56, borderRadius: 28, paddingHorizontal: spacing * 4, elevation: 6, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
    fabText: { fontSize: 15, fontWeight: "900" },
    errorWrap: { paddingHorizontal: spacing * 5, paddingTop: spacing * 4 },
    toastWrap: { position: "absolute", left: 0, right: 0, alignItems: "center", zIndex: 45, pointerEvents: "none" },
    toastCard: { borderRadius: 999, minHeight: 36, paddingHorizontal: spacing * 4, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(17,24,39,0.9)" },
    toastText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
    filterScroll: { flexDirection: "row", paddingHorizontal: spacing * 4, paddingVertical: spacing * 2, backgroundColor: cSurfaceAlt, borderBottomWidth: 1, borderBottomColor: tint(cLine, 0.7, cLine) },
    filterChip: { minHeight: 32, paddingHorizontal: spacing * 3, borderRadius: 16, borderWidth: 1, borderColor: cLine, backgroundColor: cSurface, alignItems: "center", justifyContent: "center", marginRight: spacing * 2 },
    filterChipActive: { borderColor: cTextMain, backgroundColor: cTextMain },
    filterChipText: { color: cTextMuted, fontSize: 13, fontWeight: "800" },
    filterChipTextActive: { color: cSurface, fontWeight: "900" },
  });
});

function DriverOrderCardView({ item, onPress, activeTab, onPrepareClick }: { item: DriverOrderCard; onPress: (card: DriverOrderCard) => void; activeTab: DriverOrdersTabKey; onPrepareClick: (card: DriverOrderCard) => void; }) {
  const theme = useAppTheme();
  const styles = useStyles();
  const colors = theme.colors as Record<string, string>;
  const pal = resolveStatusPalette(item.statusTone, colors);

  // 태그 정보를 텍스트 한 줄로 요약
  const specSummary = item.tags.map((t) => t.label).join(" · ");

  return (
    <Pressable onPress={() => onPress(item)} style={({ pressed }) => [styles.cardWrap, pressed && styles.cardPressed]}>
      {/* 1. 상단: 배지 & 시간 */}
      <View style={styles.cardTop}>
        <View style={[styles.badge, { backgroundColor: pal.bg, borderColor: pal.border }]}>
          <AppText style={[styles.badgeText, { color: pal.text }]}>{item.statusLabel}</AppText>
        </View>
        <AppText style={styles.timeText}>{item.requestedAtText || ""}</AppText>
      </View>

      {/* 2. 중간: 세로 타임라인 (출발지 -> 도착지) */}
      <View style={styles.timelineWrap}>
        <View style={styles.rail}>
          <View style={styles.dotStart} />
          <View style={styles.line} />
          <View style={styles.dotEnd} />
        </View>
        
        <View style={styles.addressWrap}>
          <View style={styles.addressBlock}>
            <AppText style={styles.addressLabel}>출발</AppText>
            <AppText style={styles.addressText} numberOfLines={1}>{item.originAddress || "-"}</AppText>
          </View>
          <View style={{ height: 16 }} />
          <View style={styles.addressBlock}>
            <AppText style={styles.addressLabel}>도착</AppText>
            <AppText style={styles.addressText} numberOfLines={1}>{item.destinationAddress || "-"}</AppText>
          </View>
        </View>

        {item.routeDistanceText ? (
          <View style={styles.distancePill}>
             <View style={styles.distanceChip}>
                <AppText style={styles.distanceText}>{item.routeDistanceText}</AppText>
             </View>
          </View>
        ) : null}
      </View>

      {/* 3. 하단: 스펙 텍스트 & 운임 (가로 배치) */}
      <View style={styles.cardBottom}>
        <View style={styles.tagWrap}>
          <AppText style={styles.specText} numberOfLines={1}>{specSummary}</AppText>
        </View>
        <View style={styles.priceWrap}>
          <AppText style={styles.priceLabel}>운임</AppText>
          <AppText style={styles.priceVal}>{item.priceText || "-"}</AppText>
        </View>
      </View>

      {/* 4. 내 오더 전용 버튼 */}
      {activeTab === "my" && getDriverUiStateFromBackendStatus(item.status) === DRIVER_UI_STATE.ASSIGNED && (
        <View style={styles.ctaWrap}>
          <AppButton onPress={() => onPrepareClick(item)} variant="primary" style={{ minHeight: 48, borderRadius: 12 }}>
            <AppText color="textOnBrand" style={{ fontWeight: "900", fontSize: 15 }}>운행 준비하기</AppText>
          </AppButton>
        </View>
      )}
    </Pressable>
  );
}

export function DriverOrdersBoard({ initialTab, assignedOnly, activeTab: controlledActiveTab, onChangeTab }: DriverOrdersBoardProps) {
  const router = useRouter();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { setActiveOrder } = useActiveOrder();

  const [activeTab, setActiveTab] = useState<DriverOrdersTabKey>(assignedOnly ? "my" : (initialTab ?? "market"));
  const [overview, setOverview] = useState<DriverOrdersOverview>(EMPTY_OVERVIEW);
  const [activeFilter, setActiveFilter] = useState<DriverOrderFilterKey>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>({ visible: false, message: "" });
  const resolvedActiveTab = controlledActiveTab ?? activeTab;
  const changeTab = useCallback(
    (nextTab: DriverOrdersTabKey) => {
      if (!controlledActiveTab) {
        setActiveTab(nextTab);
      }
      onChangeTab?.(nextTab);
    },
    [controlledActiveTab, onChangeTab]
  );

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardNavLockRef = useRef(false);
  const focusRefetchMetaRef = useRef({ hasFocusedOnce: false, inFlight: false, lastRefetchAt: 0 });

  const showToast = useCallback((message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ visible: true, message });
    toastTimerRef.current = setTimeout(() => { setToast({ visible: false, message: "" }); toastTimerRef.current = null; }, TOAST_DURATION_MS);
  }, []);

  const loadOrders = useCallback(async (mode: "initial" | "refresh" = "initial") => {
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
  }, []);

  useEffect(() => { void loadOrders("initial"); }, [loadOrders]);

  useEffect(() => {
    if (assignedOnly) {
      setActiveTab("my");
      setActiveFilter("ALL");
    }
  }, [assignedOnly]);

  useFocusEffect(useCallback(() => {
    const meta = focusRefetchMetaRef.current;
    if (!meta.hasFocusedOnce) { meta.hasFocusedOnce = true; return; }
    const now = Date.now();
    if (meta.inFlight || now - meta.lastRefetchAt < FOCUS_REFETCH_THROTTLE_MS) return;
    meta.inFlight = true; meta.lastRefetchAt = now;
    void loadOrders("refresh").finally(() => { meta.inFlight = false; });
  }, [loadOrders]));

  const filteredMarketOrders = useMemo(() => overview.marketOrders.filter((c) => matchesDriverOrderFilter(c, activeFilter)), [activeFilter, overview.marketOrders]);

  useEffect(() => {
    if (resolvedActiveTab !== "market" && activeFilter !== "ALL") {
      setActiveFilter("ALL");
    }
  }, [activeFilter, resolvedActiveTab]);
  
  const visibleOrders = useMemo(() => {
    if (resolvedActiveTab === "market") return filteredMarketOrders;
    return assignedOnly 
      ? overview.myOrders.filter(c => getDriverUiStateFromBackendStatus(c.status) === DRIVER_UI_STATE.ASSIGNED)
      : overview.myOrders;
  }, [resolvedActiveTab, assignedOnly, filteredMarketOrders, overview.myOrders]);
  const showFilters = resolvedActiveTab === "market" && overview.availableFilters.length > 1;

  const handlePressCard = useCallback(async (card: DriverOrderCard) => {
    if (cardNavLockRef.current) return;
    cardNavLockRef.current = true;
    const access = await probeDriverOrderDetailAccess(card.matchId);
    if (access === "forbidden") { showToast("상세 접근 불가"); cardNavLockRef.current = false; return; }
    if (access !== "ok") { showToast(NETWORK_ERROR_TEXT); cardNavLockRef.current = false; return; }
    router.push({ pathname: "/(driver)/run/[id]", params: buildDriverOrderDetailParams(card) });
    setTimeout(() => { cardNavLockRef.current = false; }, 450);
  }, [router, showToast]);

  const handlePrepareForDrive = useCallback(async (card: DriverOrderCard) => {
    if (!card.quoteId) return;
    try {
      const detail = await getDriverQuoteSummaryDetail(card.quoteId);
      if (!detail) return showToast("오더 정보를 불러올 수 없습니다.");
      setActiveOrder(detail);
      void loadOrders("refresh").then(() => router.push("/(driver)/run"));
    } catch { showToast(NETWORK_ERROR_TEXT); }
  }, [router, setActiveOrder, showToast, loadOrders]);

  const renderItem = useCallback(({ item }: { item: DriverOrderCard }) => (
    <DriverOrderCardView item={item} onPress={handlePressCard} activeTab={resolvedActiveTab} onPrepareClick={handlePrepareForDrive} />
  ), [handlePressCard, handlePrepareForDrive, resolvedActiveTab]);

  const renderListHeader = useCallback(() => {
    if (!showFilters) return null;
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
        {overview.availableFilters.map((f) => (
          <Pressable key={f} style={[styles.filterChip, activeFilter === f && styles.filterChipActive]} onPress={() => setActiveFilter(f)}>
            <AppText style={[styles.filterChipText, activeFilter === f && styles.filterChipTextActive]}>{getDriverOrderFilterLabel(f)}</AppText>
          </Pressable>
        ))}
      </ScrollView>
    );
  }, [activeFilter, overview.availableFilters, showFilters, styles]);

  return (
    <View style={styles.root}>
      {/* 최상단 통합 헤더 (상태바/노치 대응) */}
      {!assignedOnly && (
        <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 0) }]}>
          {/* 1. 로고 & 타이틀 */}
          <View style={styles.headerTopRow}>
            <View style={styles.headerLogoWrap}>
              <View style={styles.logoCircle}><Ionicons name="car-sport" style={styles.logoIcon} /></View>
              <AppText style={styles.headerTitle}>Rodia Driver Pro</AppText>
            </View>
            <Pressable onPress={() => void loadOrders("refresh")} style={{ padding: 4 }}>
              <Ionicons name="refresh" size={24} color={theme.colors?.textSub} />
            </Pressable>
          </View>

          {/* 2. 탭 */}
          <View style={styles.tabsRow}>
            <Pressable style={[styles.tabBtn, resolvedActiveTab === "market" && styles.tabBtnActive]} onPress={() => { changeTab("market"); setActiveFilter("ALL"); }}>
              <AppText style={[styles.tabLabel, resolvedActiveTab === "market" && styles.tabLabelActive]}>마켓</AppText>
            </Pressable>
            <Pressable style={[styles.tabBtn, resolvedActiveTab === "my" && styles.tabBtnActive]} onPress={() => changeTab("my")}>
              <AppText style={[styles.tabLabel, resolvedActiveTab === "my" && styles.tabLabelActive]}>내 오더</AppText>
              {overview.myCount > 0 && (
                <View style={styles.tabBadge}><AppText style={styles.tabBadgeText}>{overview.myCount}</AppText></View>
              )}
            </Pressable>
          </View>
        </View>
      )}

      {/* 리스트 본문 */}
      {isLoading ? (
        <AppSpinner label="목록을 불러오는 중입니다." />
      ) : errorMessage ? (
        <View style={styles.errorWrap}>
          <AppErrorState title="오류 발생" description={errorMessage} retryLabel="다시 시도" onRetry={() => void loadOrders("initial")} fullScreen={false} />
        </View>
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={visibleOrders}
          keyExtractor={(item) => item.cardKey}
          renderItem={renderItem}
          ListHeaderComponent={renderListHeader}
          stickyHeaderIndices={showFilters ? [0] : undefined}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={[styles.listContent, assignedOnly && { paddingTop: Math.max(insets.top, 0) + 16 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadOrders("refresh")} />}
          ListEmptyComponent={
              <AppEmptyState
              title={resolvedActiveTab === "market" ? "오더 마켓이 비어 있습니다." : assignedOnly ? "운행 가능한 오더가 없습니다." : "내 오더가 없습니다."}
              description="새 오더가 등록되면 이곳에 표시됩니다."
              fullScreen={false}
            />
          }
        />
      )}

      {/* 하단 토스트 팝업 */}
      {toast.visible && (
        <View style={[styles.toastWrap, { bottom: insets.bottom + 30 }]}>
          <View style={styles.toastCard}><AppText style={styles.toastText}>{toast.message}</AppText></View>
        </View>
      )}
    </View>
  );
}

export default DriverOrdersBoard;
