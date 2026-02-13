import React, { useEffect, useMemo, useState } from "react";
import {
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  UIManager,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { safeNumber, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import type { AppTheme } from "@/shared/theme/types";
import { AppInput } from "@/shared/ui/kit/AppInput";
import { AppText } from "@/shared/ui/kit/AppText";
import { QUOTE_PRESS_EFFECT } from "@/features/quote/ui/QuoteCreateUiPrimitives";
import {
  EXTRA_OPTIONS,
  formatKrw,
  useQuoteCreateDraft,
  VEHICLE_DATA,
} from "@/features/quote/model/quoteCreateDraft";

// ... (기존 헬퍼 함수 및 아이콘 데이터 유지 - clamp, digitsOnly, OPTION_ICONS 등) ...
const OPTION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  caution: "alert-circle-outline",
  upright: "arrow-up-outline",
  waterproof: "water-outline",
  shock: "flash-outline",
};

type LoadLevel = "safe" | "warn" | "danger";

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(n, min), max);
}

function digitsOnly(input: string) {
  return (input ?? "").replace(/[^\d]/g, "");
}

const useStyles = createThemedStyles((theme: AppTheme) => {
  const c = theme.colors;
  const spacing = safeNumber(theme.layout.spacing.base, 4);
  const radiusCard = safeNumber(theme.layout.radii.card, 16);
  const radiusControl = safeNumber(theme.layout.radii.control, 12);

  const warn = (c as any)?.semanticWarning ?? c.brandPrimary;
  const danger = (c as any)?.semanticDanger ?? c.brandPrimary;
  const success = (c as any)?.semanticSuccess ?? c.brandAccent;
  
  // AI panel tone (opaque)
  const aiPanelBg = c.brandSecondary;
  const aiPanelBorder = tint(c.textOnBrand, 0.12, c.borderDefault);
  const aiTextMain = c.textOnBrand;
  const aiTextSub = tint(c.textOnBrand, 0.72, c.textOnBrand);
  const aiTextFaint = tint(c.textOnBrand, 0.55, c.textOnBrand);
  const aiSurface = tint(c.textOnBrand, 0.1, c.bgSurface);

  return StyleSheet.create({
    container: { flex: 1, position: "relative", backgroundColor: c.bgMain },
    scrollContent: { gap: spacing * 2, paddingHorizontal: spacing, paddingTop: spacing },

    // ... (기존 카드, 차량, 옵션, 예산 스타일 전체 유지) ...
    card: { backgroundColor: c.bgSurface, borderRadius: radiusCard, borderWidth: 1, borderColor: c.borderDefault, padding: 20 },
    cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 18, gap: 8 },
    sectionLabel: { marginBottom: 8, marginTop: 4 },
    vehicleRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
    vehicleBtn: { flex: 1, padding: 14, backgroundColor: c.bgSurfaceAlt, borderRadius: radiusControl, borderWidth: 1, borderColor: c.borderDefault, justifyContent: "center", alignItems: "center" },
    vehicleLabel: { marginBottom: 4 },
    vehicleValueRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    segGroup: { marginBottom: 14 },
    segRow: { flexDirection: "row", backgroundColor: c.bgSurfaceAlt, borderRadius: 14, padding: 4, gap: 4 },
    segItem: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center", justifyContent: "center", overflow: "hidden" },
    segItemActive: { backgroundColor: c.bgSurface, shadowColor: c.textMain, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
    segInner: { flexDirection: "row", alignItems: "center", gap: 6 },
    segText: {},
    segTextActive: { color: c.brandPrimary },
    segBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1, borderColor: c.borderDefault, backgroundColor: c.bgSurface },
    segBadgeActive: { borderColor: tint(c.brandPrimary, 0.35, c.borderDefault), backgroundColor: tint(c.brandPrimary, 0.08, c.bgSurface) },
    segBadgeText: {},
    segBadgeTextActive: { color: c.brandPrimary },
    optionContainer: { gap: 10 },
    optionChip: { width: "100%", minHeight: 46, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 16, borderWidth: 1, borderColor: c.borderDefault, backgroundColor: c.bgSurfaceAlt },
    optionChipActive: { backgroundColor: tint(c.brandPrimary, 0.05, c.bgSurface), borderColor: c.brandPrimary },
    optionLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, minWidth: 0 },
    optionTitle: { flexShrink: 1 },
    optionTitleActive: { color: c.brandPrimary },
    optionRight: { flexDirection: "row", alignItems: "center", gap: 6 },
    optionPrice: {},
    optionPriceActive: { color: c.brandPrimary },
    budgetRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    budgetBox: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: c.bgSurfaceAlt, borderRadius: 14, borderWidth: 1, borderColor: c.borderDefault, height: 54, paddingHorizontal: 14, minWidth: 0 },
    budgetBoxActive: { borderColor: c.brandPrimary, backgroundColor: c.bgSurface },
    budgetInputContainer: { flex: 1 },
    budgetInputShell: { minHeight: 0, borderWidth: 0, borderRadius: 0, paddingHorizontal: 0, backgroundColor: "transparent" },
    budgetInputText: { fontSize: 17, fontWeight: "900", color: c.textMain, textAlign: "right", paddingRight: 8, minWidth: 0, paddingVertical: 0 },
    budgetWarnPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 14, borderWidth: 1, borderColor: tint(warn, 0.35, c.borderDefault), backgroundColor: tint(warn, 0.1, c.bgSurface), maxWidth: 150, flexShrink: 0 },
    budgetWarnText: { flexShrink: 1 },
    suggestionRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 10, gap: 8, flexWrap: "wrap", alignItems: "center" },
    suggestionChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: tint(c.brandPrimary, 0.06, c.bgSurface), borderWidth: 1, borderColor: tint(c.brandPrimary, 0.2, c.borderDefault) },
    suggestionText: {},
    suggestionLabel: {},
    
    // --- [NEW] 개선된 AI 바텀 시트 스타일 ---
    aiSheetContainer: {
      position: "absolute",
      left: 16,
      right: 16,
      zIndex: 100,
      backgroundColor: aiPanelBg,
      borderRadius: 24,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: aiPanelBorder,
      shadowColor: c.textMain,
      shadowOpacity: 0.18,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 10,
    },
    
    // 헤더바 (닫혀있을 때)
    aiHeaderBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      height: 72, 
      backgroundColor: aiPanelBg,
    },
    aiInfoLeft: {
      justifyContent: "center",
      gap: 4,
      flex: 1,
    },
    aiLabelSmall: {
      fontSize: 11,
      fontWeight: "700",
      color: aiTextSub,
      letterSpacing: 0.5,
    },
    aiTitleBig: {
      fontSize: 17,
      fontWeight: "800",
      color: aiTextMain,
    },
    aiHeaderRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    
    // 상태 뱃지 (Pill Shape)
    aiStatusBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: aiPanelBorder,
      backgroundColor: tint(c.textOnBrand, 0.12, c.bgSurface),
    },
    
    // 확장 영역
    aiExpandedContent: {
      paddingHorizontal: 20,
      paddingBottom: 24,
      backgroundColor: aiPanelBg,
    },
    divider: {
      height: 1,
      backgroundColor: tint(c.textOnBrand, 0.12, c.borderDefault),
      marginBottom: 20,
      marginTop: 0,
    },
    
    // 상세 정보 카드 (검은 배경 위 더 밝은 영역)
    detailCard: {
      backgroundColor: aiSurface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      gap: 12,
      borderWidth: 1,
      borderColor: tint(c.textOnBrand, 0.08, c.borderDefault),
    },
    detailRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    
    // 게이지 UI
    gaugeTrack: {
      height: 8,
      backgroundColor: tint(c.textOnBrand, 0.2, c.bgSurface),
      borderRadius: 4,
      overflow: "hidden",
      marginTop: 8,
      marginBottom: 4,
    },
    gaugeFill: {
      height: "100%",
      borderRadius: 4,
    },
    
    // 메시지 박스
    msgBox: {
      flexDirection: "row",
      gap: 12,
      alignItems: "flex-start",
    },
    msgText: {
      flex: 1,
      fontSize: 13,
      fontWeight: "600",
      color: tint(c.textOnBrand, 0.92, c.textOnBrand),
      lineHeight: 18,
    },
    aiMetaLabel: { color: tint(c.textOnBrand, 0.8, c.textOnBrand) },
    aiMetaValue: { color: aiTextFaint, textAlign: "right" },
    aiMarketValue: { color: c.textOnBrand },
    aiChevron: { color: aiTextFaint },

    // Modal Styles (유지)
    modalOverlay: { flex: 1, backgroundColor: tint(c.textMain, 0.5, c.textMain), justifyContent: "flex-end" },
    modalContent: { backgroundColor: c.bgSurface, borderTopLeftRadius: radiusCard, borderTopRightRadius: radiusCard, padding: spacing * 4, paddingBottom: spacing * 8 },
    modalItem: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: c.borderDefault, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    modalTitle: { marginBottom: spacing * 4 },
    modalItemLeft: { flexDirection: "row", alignItems: "center" },
    optionCheck: { opacity: 1 },
    optionCheckHidden: { opacity: 0 },
    recBadgePill: { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, backgroundColor: tint(c.brandPrimary, 0.12, c.bgSurface), borderWidth: 1, borderColor: tint(c.brandPrimary, 0.25, c.borderDefault) },
    recBadgeText: {},
  });
});

export function QuoteCreateStep3() {
  const theme = useAppTheme();
  const styles = useStyles();
  const { draft, patchDraft, toggleOption } = useQuoteCreateDraft();

  const [modalMode, setModalMode] = useState<"TON" | "TYPE" | null>(null);
  const [isBudgetFocused, setIsBudgetFocused] = useState(false);
  const [isAiExpanded, setIsAiExpanded] = useState(false);

  useEffect(() => {
    if (Platform.OS === "android") {
      (UIManager as any)?.setLayoutAnimationEnabledExperimental?.(true);
    }
  }, []);

  // ... (analysis 로직 유지) ...
  const analysis = useMemo(() => {
    const cargoList = draft?.cargoList ?? [];
    const totalWeight = cargoList.reduce((acc, c) => {
      const w = parseInt((c as any)?.weight ?? "0", 10);
      return acc + (Number.isFinite(w) ? w : 0);
    }, 0);

    const vehicles = VEHICLE_DATA ?? [];
    const lastIdx = Math.max(vehicles.length - 1, 0);
    const tonIdx = clamp(draft?.tonIdx ?? 0, 0, lastIdx);

    const vehicleInfo = vehicles?.[tonIdx];
    const types = vehicleInfo?.types ?? [];
    const typeLastIdx = Math.max(types.length - 1, 0);
    const typeIdx = clamp(draft?.typeIdx ?? 0, 0, typeLastIdx);
    const typeInfo = types?.[typeIdx];

    const limit = safeNumber((vehicleInfo as any)?.limit, 0);
    const loadFactor = limit > 0 ? Math.min((totalWeight / limit) * 100, 100) : 0;
    const isOverloaded = limit > 0 && totalWeight > limit;

    const recommendedTonIdxRaw = vehicles.findIndex((v: any) => totalWeight <= safeNumber(v?.limit, 0));
    const recommendedTonIdx = recommendedTonIdxRaw >= 0 ? recommendedTonIdxRaw : lastIdx;

    const basePrice0 = safeNumber((typeInfo as any)?.p, 0);
    const basePrice = draft?.isPool ? Math.floor(basePrice0 * 0.8) : basePrice0;
    const frozenPrice = draft?.isFrozen ? 30000 : 0;

    const selectedOpts = draft?.selectedOpts ?? [];
    const optionCost = selectedOpts.reduce((acc, id) => {
      const opt = (EXTRA_OPTIONS ?? []).find((o: any) => o?.id === id);
      return acc + safeNumber((opt as any)?.price, 0);
    }, 0);

    const total = basePrice + frozenPrice + optionCost;
    const minPrice = Math.floor(total * 0.9);
    const avgPrice = total;
    const maxPrice = Math.floor(total * 1.15);

    const desired = parseInt(digitsOnly(draft?.budget ?? ""), 10) || 0;
    const hardLimit = Math.floor(minPrice * 0.85);
    const isLowBudget = desired > 0 && desired < hardLimit;

    const level: LoadLevel = loadFactor >= 90 ? "danger" : loadFactor >= 70 ? "warn" : "safe";

    return {
      tonIdx, typeIdx, totalWeight, limit, loadFactor, level, isOverloaded, recommendedTonIdx,
      minPrice, avgPrice, maxPrice, desired, isLowBudget,
      vehicleName: (vehicleInfo as any)?.name ?? "미선택",
      typeName: (typeInfo as any)?.n ?? "미선택",
      hasVehicleData: vehicles.length > 0,
    };
  }, [draft]);

  const infoColor = (theme.colors as any)?.semanticInfo ?? theme.colors.brandPrimary;
  const warnColor = (theme.colors as any)?.semanticWarning ?? theme.colors.brandPrimary;
  const dangerColor = (theme.colors as any)?.semanticDanger ?? theme.colors.brandPrimary;
  const successColor = (theme.colors as any)?.semanticSuccess ?? theme.colors.brandAccent;

  const loadColor = analysis.level === "danger" ? dangerColor : analysis.level === "warn" ? warnColor : infoColor;
  const levelLabel = analysis.level === "danger" ? "적재 위험" : analysis.level === "warn" ? "무거움" : "적재 안전";

  const bottomStatus = analysis.isOverloaded ? "danger" : analysis.isLowBudget ? "warn" : "ok";
  const statusIcon = bottomStatus === "ok" ? "checkmark-circle" : bottomStatus === "danger" ? "alert-circle" : "warning";
  const statusColor = bottomStatus === "danger" ? dangerColor : bottomStatus === "warn" ? warnColor : successColor;
  
  // 텍스트 로직 개선: 짧은 타이틀 + 긴 설명 분리
  const aiContent = useMemo(() => {
    // 1) 예산 미입력 상태
    if (!analysis.desired) {
      return {
        label: "AI 예상 시세",
        title: `${formatKrw(analysis.minPrice)} ~ ${formatKrw(analysis.maxPrice)}`, // 메인 타이틀
        desc: "희망 운임을 입력하면 적정성을 진단해드립니다.", // 상세 설명
        statusText: "입력 대기",
        statusColor: tint(theme.colors.textOnBrand, 0.55, theme.colors.textOnBrand),
      };
    }

    // 2) 예산 입력 상태 - 진단 결과
    if (analysis.isOverloaded) {
      return {
        label: "AI 안전 진단",
        title: "배차 불가 (중량 초과)", // 짧고 강렬하게
        desc: `현재 차량의 적재 한도(${analysis.limit}kg)를 초과했습니다. 더 큰 톤수의 차량을 선택해주세요.`,
        statusText: "위험",
        statusColor: dangerColor,
      };
    }
    
    if (analysis.isLowBudget) {
      return {
        label: "AI 요금 진단",
        title: "배차 지연 예상",
        desc: "입력하신 운임이 시장 평균보다 낮아 배차가 늦어질 수 있습니다. '제안가' 기능을 사용해보세요.",
        statusText: "확률 낮음",
        statusColor: warnColor,
      };
    }

    // 정상
    return {
      label: "AI 종합 진단",
      title: "빠른 배차 예상",
      desc: "적재량과 예산이 아주 적절합니다. 기사님들이 선호하는 주문 조건입니다.",
      statusText: "조건 좋음",
      statusColor: successColor,
    };
  }, [analysis, dangerColor, warnColor, successColor, theme.colors.textOnBrand]);

  const aiDockBottom = safeNumber(theme.layout.spacing.base, 16);
  
  const animateAndPatch = (payload: Record<string, any>) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    patchDraft(payload as any);
  };

  const handleBudgetChange = (v: string) => patchDraft({ budget: digitsOnly(v) } as any);
  const handleAutoFill = (amount: number) => animateAndPatch({ budget: String(Math.max(0, safeNumber(amount, 0))) });

  const onPressTon = () => (analysis.hasVehicleData ? setModalMode("TON") : undefined);
  const onPressType = () => (analysis.hasVehicleData ? setModalMode("TYPE") : undefined);

  const toggleAiSheet = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsAiExpanded((prev) => !prev);
  };

  const contentPadBottom = aiDockBottom + (isAiExpanded ? 300 : 100);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: contentPadBottom }]}>
        {/* ... (기존 상단 UI 컴포넌트들: 차량, 옵션, 예산 카드 유지) ... */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="bus-outline" size={20} color={theme.colors.brandPrimary} />
            <AppText size={16} weight="800" color="textMain">차량 및 조건</AppText>
          </View>
          <AppText size={13} weight="800" color="textMuted" style={styles.sectionLabel}>차량 선택</AppText>
          <View style={styles.vehicleRow}>
            <Pressable style={({ pressed }) => [styles.vehicleBtn, pressed && QUOTE_PRESS_EFFECT]} onPress={onPressTon}>
              <AppText size={11} weight="700" color="textMuted" style={styles.vehicleLabel}>톤수</AppText>
              <View style={styles.vehicleValueRow}>
                <AppText size={15} weight="800" color="textMain">{analysis.vehicleName}</AppText>
                <Ionicons name="chevron-down" size={14} color={theme.colors.textMuted} />
              </View>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.vehicleBtn, pressed && QUOTE_PRESS_EFFECT]} onPress={onPressType}>
              <AppText size={11} weight="700" color="textMuted" style={styles.vehicleLabel}>차종</AppText>
              <View style={styles.vehicleValueRow}>
                <AppText size={15} weight="800" color="textMain">{analysis.typeName}</AppText>
                <Ionicons name="chevron-down" size={14} color={theme.colors.textMuted} />
              </View>
            </Pressable>
          </View>

          <AppText size={13} weight="800" color="textMuted" style={styles.sectionLabel}>온도</AppText>
          <View style={styles.segGroup}>
            <View style={styles.segRow}>
              <Pressable style={({ pressed }) => [styles.segItem, !draft?.isFrozen && styles.segItemActive, pressed && QUOTE_PRESS_EFFECT]} onPress={() => patchDraft({ isFrozen: false } as any)}>
                 <AppText size={13} weight="800" color={!draft?.isFrozen ? "brandPrimary" : "textMuted"} style={[styles.segText, !draft?.isFrozen && styles.segTextActive]}>상온</AppText>
              </Pressable>
              <Pressable style={({ pressed }) => [styles.segItem, !!draft?.isFrozen && styles.segItemActive, pressed && QUOTE_PRESS_EFFECT]} onPress={() => patchDraft({ isFrozen: true } as any)}>
                <View style={styles.segInner}>
                  <AppText size={13} weight="800" color={draft?.isFrozen ? "brandPrimary" : "textMuted"} style={[styles.segText, !!draft?.isFrozen && styles.segTextActive]}>냉장/냉동</AppText>
                  <View style={[styles.segBadge, !!draft?.isFrozen && styles.segBadgeActive]}><AppText size={10} weight="900" color={draft?.isFrozen ? "brandPrimary" : "textMuted"} style={[styles.segBadgeText, !!draft?.isFrozen && styles.segBadgeTextActive]}>+3만</AppText></View>
                </View>
              </Pressable>
            </View>
          </View>

          <AppText size={13} weight="800" color="textMuted" style={styles.sectionLabel}>배송 방식</AppText>
          <View style={styles.segGroup}>
             <View style={styles.segRow}>
              <Pressable style={({ pressed }) => [styles.segItem, !draft?.isPool && styles.segItemActive, pressed && QUOTE_PRESS_EFFECT]} onPress={() => patchDraft({ isPool: false } as any)}>
                 <AppText size={13} weight="800" color={!draft?.isPool ? "brandPrimary" : "textMuted"} style={[styles.segText, !draft?.isPool && styles.segTextActive]}>독차</AppText>
              </Pressable>
              <Pressable style={({ pressed }) => [styles.segItem, !!draft?.isPool && styles.segItemActive, pressed && QUOTE_PRESS_EFFECT]} onPress={() => patchDraft({ isPool: true } as any)}>
                <View style={styles.segInner}>
                  <AppText size={13} weight="800" color={draft?.isPool ? "brandPrimary" : "textMuted"} style={[styles.segText, !!draft?.isPool && styles.segTextActive]}>알뜰 배송</AppText>
                  <View style={[styles.segBadge, !!draft?.isPool && styles.segBadgeActive]}><AppText size={10} weight="900" color={draft?.isPool ? "brandPrimary" : "textMuted"} style={[styles.segBadgeText, !!draft?.isPool && styles.segBadgeTextActive]}>-20%</AppText></View>
                </View>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.brandPrimary} />
            <AppText size={16} weight="800" color="textMain">추가 옵션</AppText>
          </View>
          <View style={styles.optionContainer}>
            {(EXTRA_OPTIONS ?? []).map((opt: any) => {
              const id = String(opt?.id ?? "");
              const title = String(opt?.title ?? "옵션");
              const price = safeNumber(opt?.price, 0);
              const active = (draft?.selectedOpts ?? []).includes(id);
              const iconName = (OPTION_ICONS[id] ?? "options-outline") as keyof typeof Ionicons.glyphMap;
              return (
                <Pressable key={id} onPress={() => (id ? toggleOption(id) : undefined)} style={({ pressed }) => [styles.optionChip, active && styles.optionChipActive, pressed && QUOTE_PRESS_EFFECT]}>
                  <View style={styles.optionLeft}>
                    <Ionicons name={iconName} size={14} color={active ? theme.colors.brandPrimary : theme.colors.textMuted} />
                    <AppText size={12} weight="800" color={active ? "brandPrimary" : "textSub"} style={active ? styles.optionTitleActive : styles.optionTitle} numberOfLines={1}>{title}</AppText>
                  </View>
                  <View style={styles.optionRight}>
                    <AppText size={10} weight="900" color={active ? "brandPrimary" : "textMuted"} style={active ? styles.optionPriceActive : styles.optionPrice}>+{formatKrw(price)}</AppText>
                    <Ionicons name="checkmark-circle" size={14} color={theme.colors.brandPrimary} style={active ? styles.optionCheck : styles.optionCheckHidden} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="wallet-outline" size={20} color={theme.colors.brandPrimary} />
            <AppText size={16} weight="800" color="textMain">희망 운임</AppText>
          </View>
          <View style={styles.budgetRow}>
            <View style={[styles.budgetBox, isBudgetFocused && styles.budgetBoxActive]}>
              <AppText weight="900" size={16} color="textMain">₩</AppText>
              <AppInput
                placeholder="금액 입력 (선택)"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="numeric"
                value={draft?.budget ?? ""}
                onChangeText={handleBudgetChange}
                onFocus={() => setIsBudgetFocused(true)}
                onBlur={() => setIsBudgetFocused(false)}
                containerStyle={styles.budgetInputContainer}
                shellStyle={styles.budgetInputShell}
                inputStyle={styles.budgetInputText}
              />
              <AppText weight="800" size={13} color="textSub">원</AppText>
            </View>
            {analysis.isLowBudget && (
              <View style={styles.budgetWarnPill}>
                <Ionicons name="warning-outline" size={14} color={warnColor} />
                <AppText size={11} weight="900" color={warnColor} style={styles.budgetWarnText}>배차 확률 낮음</AppText>
              </View>
            )}
          </View>
          <View style={styles.suggestionRow}>
            <Ionicons name="sparkles-outline" size={12} color={theme.colors.brandPrimary} />
            <AppText size={11} weight="900" color="textMuted" style={styles.suggestionLabel}>원터치 제안:</AppText>
            <Pressable style={({ pressed }) => [styles.suggestionChip, pressed && QUOTE_PRESS_EFFECT]} onPress={() => handleAutoFill(analysis.minPrice)}>
              <AppText size={12} weight="900" color="brandPrimary" style={styles.suggestionText}>최저가 입력</AppText>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.suggestionChip, pressed && QUOTE_PRESS_EFFECT]} onPress={() => handleAutoFill(analysis.avgPrice)}>
              <AppText size={12} weight="900" color="brandPrimary" style={styles.suggestionText}>평균가 입력</AppText>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* [NEW] 개선된 AI 바텀 시트 */}
      <View style={[styles.aiSheetContainer, { bottom: aiDockBottom }]}>
        {/* 헤더: 항상 노출되는 영역 */}
        <Pressable 
          onPress={toggleAiSheet} 
          style={({ pressed }) => [styles.aiHeaderBar, pressed && { opacity: 0.9 }]}
        >
          {/* 왼쪽: 타이틀 */}
          <View style={styles.aiInfoLeft}>
            <AppText style={styles.aiLabelSmall}>{aiContent.label}</AppText>
            <AppText style={styles.aiTitleBig} numberOfLines={1}>{aiContent.title}</AppText>
          </View>

          {/* 오른쪽: 상태 뱃지 + 화살표 */}
          <View style={styles.aiHeaderRight}>
            <View style={styles.aiStatusBadge}>
              <Ionicons name={statusIcon as any} size={14} color={aiContent.statusColor} />
              <AppText size={12} weight="800" style={{ color: aiContent.statusColor }}>
                {aiContent.statusText}
              </AppText>
            </View>
            <Ionicons name={isAiExpanded ? "chevron-down" : "chevron-up"} size={20} style={styles.aiChevron} />
          </View>
        </Pressable>

        {/* 확장 영역: 상세 리포트 */}
        {isAiExpanded && (
          <View style={styles.aiExpandedContent}>
            <View style={styles.divider} />

            {/* 상세 정보 카드 */}
            <View style={styles.detailCard}>
              {/* 적재율 게이지 */}
              <View>
                <View style={styles.detailRow}>
                   <AppText size={12} weight="800" style={styles.aiMetaLabel}>적재량 분석</AppText>
                   <AppText size={12} weight="900" style={{ color: loadColor }}>{levelLabel}</AppText>
                </View>

                <View style={styles.gaugeTrack}>
                   <View style={[styles.gaugeFill, { width: `${clamp(analysis.loadFactor, 0, 100)}%`, backgroundColor: loadColor }]} />
                </View>
                
                <AppText size={11} weight="600" style={styles.aiMetaValue}>
                   {analysis.totalWeight}kg / {analysis.limit}kg
                </AppText>
              </View>

              {/* 예산 입력 시: 시세 정보 참고용 노출 */}
              {analysis.desired > 0 && (
                <View style={[styles.detailRow, { marginTop: 8 }]}>
                   <AppText size={12} weight="800" style={styles.aiMetaLabel}>AI 예상 시세</AppText>
                   <AppText size={13} weight="900" style={styles.aiMarketValue}>
                      {formatKrw(analysis.minPrice)} ~ {formatKrw(analysis.maxPrice)}
                   </AppText>
                </View>
              )}
            </View>

            {/* AI 코멘트 박스 */}
            <View style={styles.msgBox}>
               <Ionicons name="chatbubble-ellipses-outline" size={20} color={aiContent.statusColor} style={{ marginTop: 2 }} />
               <AppText style={styles.msgText}>
                 {aiContent.desc}
               </AppText>
            </View>
          </View>
        )}
      </View>
      
      {/* ... (모달 코드 유지) ... */}
      <Modal visible={modalMode !== null} transparent animationType="fade" onRequestClose={() => setModalMode(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setModalMode(null)}>
          <View style={styles.modalContent}>
            <AppText weight="900" size={18} style={styles.modalTitle}>{modalMode === "TON" ? "차량 톤수 선택" : "차량 종류 선택"}</AppText>
            {modalMode === "TON" && (VEHICLE_DATA ?? []).map((v: any, i: number) => {
              const isSelected = (draft?.tonIdx ?? 0) === i;
              const isRecommended = i === analysis.recommendedTonIdx;
              return (
                <Pressable key={i} style={({ pressed }) => [styles.modalItem, pressed && QUOTE_PRESS_EFFECT]} onPress={() => { animateAndPatch({ tonIdx: i, typeIdx: 0 }); setModalMode(null); }}>
                  <View style={styles.modalItemLeft}>
                    <AppText weight={isSelected ? "900" : "700"} color={isSelected ? "brandPrimary" : "textMain"} size={16}>{v?.name}</AppText>
                    {isRecommended && <View style={styles.recBadgePill}><AppText size={10} weight="900" color="brandPrimary" style={styles.recBadgeText}>AI 추천</AppText></View>}
                  </View>
                  {isSelected && <Ionicons name="checkmark" size={20} color={theme.colors.brandPrimary} />}
                </Pressable>
              );
            })}
            {modalMode === "TYPE" && ((VEHICLE_DATA ?? [])?.[analysis.tonIdx]?.types ?? []).map((t: any, i: number) => {
              const isSelected = (draft?.typeIdx ?? 0) === i;
              return (
                <Pressable key={i} style={({ pressed }) => [styles.modalItem, pressed && QUOTE_PRESS_EFFECT]} onPress={() => { animateAndPatch({ typeIdx: i }); setModalMode(null); }}>
                  <AppText weight={isSelected ? "900" : "700"} color={isSelected ? "brandPrimary" : "textMain"} size={16}>{t?.n}</AppText>
                  {isSelected && <Ionicons name="checkmark" size={20} color={theme.colors.brandPrimary} />}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

export default QuoteCreateStep3;
