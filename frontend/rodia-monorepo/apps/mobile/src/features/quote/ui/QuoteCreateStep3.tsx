import React, { useEffect, useMemo, useState } from "react";
import {
  LayoutAnimation,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { safeNumber, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import type { AppTheme } from "@/shared/theme/types";
import { QUOTE_CREATE_STEP3 } from "@/shared/lib/dev/mockPayloads";
import { AppInput } from "@/shared/ui/kit/AppInput";
import { AppText } from "@/shared/ui/kit/AppText";
import { MockAutofillButton } from "@/shared/ui/dev/MockAutofillButton";
import {
  getQuoteFlatCardStyle,
  QUOTE_PRESS_EFFECT,
  QUOTE_SCROLL_VIEW_PROPS,
} from "@/features/quote/ui/QuoteCreateUiPrimitives";
import {
  EXTRA_OPTIONS,
  formatKrw,
  useQuoteCreateDraft,
  VEHICLE_DATA,
  computeQuotePricing, // 💡 9단계 로직이 적용된 계산 함수
} from "@/features/quote/model/quoteCreateDraft";
import type { QuotePricePreview } from "@/features/quote/api/quote-api";
import { initLayoutAnimationForAndroid } from "@/shared/lib/ui/layoutAnimationInit";
// import { useSubmitQuoteMutation } from "@/features/quote/model/useSubmitQuoteMutation"; // TODO: 나중에 연결할 제출 훅

const OPTION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  caution: "alert-circle-outline",
  upright: "arrow-up-outline",
  waterproof: "water-outline",
  shock: "flash-outline",
};

type AiStatus = "loading" | "ok" | "warn" | "danger" | "idle";
type LoadLevel = "safe" | "warn" | "danger";
type QuoteCreateStep3Props = {
  validationPreview?: QuotePricePreview | null;
  isValidationLoading?: boolean;
};

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(n, min), max);
}

function digitsOnly(input: string) {
  return (input ?? "").replace(/[^\d]/g, "");
}

function formatDigitsWithComma(input: string) {
  const digits = digitsOnly(input);
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatKg(value: number) {
  return `${Math.max(0, Math.floor(safeNumber(value, 0))).toLocaleString("ko-KR")}kg`;
}

const useStyles = createThemedStyles((theme: AppTheme) => {
  const c = theme.colors;
  const spacing = safeNumber(theme.layout.spacing.base, 4);
  const radiusCard = safeNumber(theme.layout.radii.card, 16);
  const radiusControl = safeNumber(theme.layout.radii.control, 12);
  const flatCard = getQuoteFlatCardStyle(theme);

  const warn = (c as any)?.semanticWarning ?? c.brandPrimary;

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bgMain },
    scrollContent: { gap: spacing * 2, paddingHorizontal: spacing, paddingTop: spacing, paddingBottom: spacing * 6 },
    devToolsWrap: { alignItems: "flex-end" },

    card: { ...flatCard, padding: 20 },
    cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 18, gap: 8 },
    sectionLabel: { marginBottom: 8, marginTop: 4 },
    
    // 차량 선택
    vehicleRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
    vehicleBtn: { flex: 1, padding: 14, backgroundColor: c.bgSurfaceAlt, borderRadius: radiusControl, borderWidth: 1, borderColor: c.borderDefault, justifyContent: "center", alignItems: "center" },
    vehicleLabel: { marginBottom: 4 },
    vehicleValueRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    
    // 세그먼트 (온도, 배송방식)
    segGroup: { marginBottom: 14 },
    segRow: { flexDirection: "row", backgroundColor: c.bgSurfaceAlt, borderRadius: 14, padding: 4, gap: 4 },
    segItem: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center", justifyContent: "center", overflow: "hidden", borderWidth: 1, borderColor: "transparent" },
    segItemActive: { backgroundColor: c.bgSurface, borderColor: c.borderDefault },
    segInner: { flexDirection: "row", alignItems: "center", gap: 6 },
    segText: {},
    segTextActive: { color: c.brandPrimary },
    segBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1, borderColor: c.borderDefault, backgroundColor: c.bgSurface },
    segBadgeActive: { borderColor: tint(c.brandPrimary, 0.35, c.borderDefault), backgroundColor: tint(c.brandPrimary, 0.08, c.bgSurface) },
    segBadgeText: {},
    segBadgeTextActive: { color: c.brandPrimary },
    
    // 옵션
    optionContainer: { gap: 10 },
    optionChip: { width: "100%", minHeight: 46, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 16, borderWidth: 1, borderColor: c.borderDefault, backgroundColor: c.bgSurfaceAlt },
    optionChipActive: { backgroundColor: tint(c.brandPrimary, 0.05, c.bgSurface), borderColor: c.brandPrimary },
    optionLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, minWidth: 0 },
    optionTitle: { flexShrink: 1 },
    optionTitleActive: { color: c.brandPrimary },
    optionRight: { flexDirection: "row", alignItems: "center", gap: 6 },
    optionPrice: {},
    optionPriceActive: { color: c.brandPrimary },
    
    // 예산
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
    
    // 💡 AI 인라인 리포트 카드 최적화
    aiInlineCard: { 
      ...flatCard, 
      padding: 20, 
      gap: 16,
      backgroundColor: tint(c.brandSecondary ?? c.brandPrimary, 0.04, c.bgSurface), // 살짝 다른 배경색으로 구분감 부여
      borderColor: tint(c.brandSecondary ?? c.brandPrimary, 0.2, c.borderDefault)
    },
    aiHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
    aiTitle: { flexShrink: 1 },
    aiStatusLine: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
    aiStatusBadge: {
      flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, borderWidth: 1,
      paddingHorizontal: 12, paddingVertical: 6, backgroundColor: c.bgSurfaceAlt,
    },
    aiStatusComment: { flex: 1, minWidth: 140, lineHeight: 18, fontSize: 13, fontWeight: "700", color: c.textSub },
    
    aiBlock: { gap: 6, backgroundColor: c.bgSurface, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: c.borderDefault },
    aiBlockHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    aiGaugeTrack: { height: 8, borderRadius: 999, backgroundColor: c.bgSurfaceAlt, overflow: "hidden", marginVertical: 4 },
    aiGaugeFill: { height: "100%", borderRadius: 999 },
    aiGaugeText: { color: c.textMuted, textAlign: "right" },
    aiPriceValue: { marginTop: 2 },

    serverCard: {
      ...flatCard,
      padding: 18,
      gap: 12,
      backgroundColor: tint(c.brandPrimary, 0.04, c.bgSurface),
      borderColor: tint(c.brandPrimary, 0.18, c.borderDefault),
    },
    serverTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    serverMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    serverMetaChip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.borderDefault,
      backgroundColor: c.bgSurface,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    serverMetaText: { fontSize: 11, fontWeight: "800", color: c.textSub },
    serverSummary: { fontSize: 13, fontWeight: "700", color: c.textMain, lineHeight: 18 },
    serverBlock: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.borderDefault,
      backgroundColor: c.bgSurface,
      padding: 10,
      gap: 6,
    },
    serverBlockTitle: { fontSize: 12, fontWeight: "900", color: c.textSub },
    serverBlockRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
    serverBlockLabel: { fontSize: 12, fontWeight: "700", color: c.textMuted },
    serverBlockValue: { fontSize: 12, fontWeight: "800", color: c.textMain, flexShrink: 1, textAlign: "right" },
    serverList: { gap: 4 },
    serverListItem: { fontSize: 12, fontWeight: "700", color: c.textSub, lineHeight: 17 },
    
    // Modal Styles
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

export function QuoteCreateStep3({ validationPreview = null, isValidationLoading = false }: QuoteCreateStep3Props) {
  const theme = useAppTheme();
  const styles = useStyles();
  const { draft, patchDraft, toggleOption } = useQuoteCreateDraft();

  const [modalMode, setModalMode] = useState<"TON" | "TYPE" | null>(null);
  const [isBudgetFocused, setIsBudgetFocused] = useState(false);

  useEffect(() => {
    initLayoutAnimationForAndroid();
  }, []);

  // 💡 1. 요금/상태 산출 로직을 헬퍼 함수로 단순화
  const analysis = useMemo(() => {
    // computeQuotePricing 내부에서 9단계 로직을 처리하여 반환한다고 가정
    const pricing = computeQuotePricing(draft);
    
    const vehicles = VEHICLE_DATA ?? [];
    const recommendedTonIdxRaw = vehicles.findIndex((v: any) => pricing.totalWeight <= safeNumber(v?.limit, 0));
    const recommendedTonIdx = recommendedTonIdxRaw >= 0 ? recommendedTonIdxRaw : Math.max(vehicles.length - 1, 0);

    const loadFactor = pricing.limit > 0 ? Math.min((pricing.totalWeight / pricing.limit) * 100, 100) : 0;
    const isOverloaded = pricing.limit > 0 && pricing.totalWeight > pricing.limit;
    const level: LoadLevel = loadFactor >= 90 ? "danger" : loadFactor >= 70 ? "warn" : "safe";

    const desired = parseInt(digitsOnly(draft?.budget ?? ""), 10) || 0;
    const isLowBudget = desired > 0 && desired < Math.floor(pricing.minPrice * 0.85);

    return {
      ...pricing,
      tonIdx: draft?.tonIdx ?? 0,
      typeIdx: draft?.typeIdx ?? 0,
      avgPrice: pricing.finalPrice,
      loadFactor,
      level,
      isOverloaded,
      recommendedTonIdx,
      desired,
      isLowBudget,
      hasVehicleData: vehicles.length > 0,
    };
  }, [draft]);

  // 💡 2. 색상 및 텍스트 매핑 최적화
  const infoColor = (theme.colors as any)?.semanticInfo ?? theme.colors.brandPrimary;
  const warnColor = (theme.colors as any)?.semanticWarning ?? theme.colors.brandPrimary;
  const dangerColor = (theme.colors as any)?.semanticDanger ?? theme.colors.brandPrimary;
  const successColor = (theme.colors as any)?.semanticSuccess ?? theme.colors.brandAccent;

  const hasPriceRange = safeNumber(analysis?.minPrice, 0) > 0 && safeNumber(analysis?.maxPrice, 0) > 0;
  const isAiLoading = !analysis?.hasVehicleData || !hasPriceRange;

  const loadPercent = clamp(safeNumber(analysis?.loadFactor, 0), 0, 100);
  const loadColor = isAiLoading ? infoColor : analysis.level === "danger" ? dangerColor : analysis.level === "warn" ? warnColor : infoColor;
  const levelLabel = isAiLoading ? "분석 중" : analysis.level === "danger" ? "적재 초과" : analysis.level === "warn" ? "무거움" : "적재 안전";

  const aiContent = useMemo(() => {
    if (isAiLoading) return { status: "loading" as AiStatus, statusText: "분석 중", comment: "입력값을 기반으로 요금을 계산합니다." };
    if (analysis.isOverloaded) return { status: "danger" as AiStatus, statusText: "위험", comment: `차량 한도(${formatKg(analysis.limit)})를 초과했습니다. 큰 차를 선택하세요.` };
    if (analysis.isLowBudget) return { status: "warn" as AiStatus, statusText: "확률 낮음", comment: "운임이 시세보다 낮아 배차가 늦어질 수 있습니다." };
    if (!analysis.desired) return { status: "idle" as AiStatus, statusText: "입력 대기", comment: "희망 운임을 입력하면 적정성을 진단해드립니다." };
    
    return { status: "ok" as AiStatus, statusText: "조건 좋음", comment: "빠른 배차가 예상되는 좋은 조건입니다." };
  }, [analysis, isAiLoading]);

  const aiStatusIcon: keyof typeof Ionicons.glyphMap =
    aiContent.status === "ok" ? "checkmark-circle" : aiContent.status === "danger" ? "alert-circle" : aiContent.status === "warn" ? "warning" : aiContent.status === "idle" ? "pause-circle" : "hourglass-outline";

  const aiStatusColor = aiContent.status === "danger" ? dangerColor : aiContent.status === "warn" ? warnColor : aiContent.status === "ok" ? successColor : theme.colors.textMuted;

  // 액션 핸들러
  const animateAndPatch = (payload: Record<string, any>) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    patchDraft(payload as any);
  };
  const handleBudgetChange = (v: string) => patchDraft({ budget: digitsOnly(v) } as any);
  const handleAutoFill = (amount: number) => animateAndPatch({ budget: String(Math.max(0, safeNumber(amount, 0))) });
  const budgetDisplay = formatDigitsWithComma(draft?.budget ?? "");

  const isFrozen = draft?.isFrozen === true;
  const isPool = draft?.isPool === true;
  const validationComments = validationPreview?.comments ?? [];
  const validationReasons = validationPreview?.reasons ?? [];
  const validationActions = validationPreview?.actions ?? [];
  const loadAnalysis = validationPreview?.loadAnalysis;
  const priceAnalysis = validationPreview?.priceAnalysis;
  const hasValidationContent =
    isValidationLoading ||
    Boolean(validationPreview) ||
    validationComments.length > 0 ||
    validationReasons.length > 0 ||
    validationActions.length > 0;

  return (
    <View style={styles.container}>
      <ScrollView {...QUOTE_SCROLL_VIEW_PROPS} contentContainerStyle={styles.scrollContent}>
        <View style={styles.devToolsWrap}>
          <MockAutofillButton onFill={() => patchDraft(QUOTE_CREATE_STEP3)} label="Fill Quote Step 3" />
        </View>
        
        {/* 1. 차량 및 조건 카드 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="bus-outline" size={20} color={theme.colors.brandPrimary} />
            <AppText size={16} weight="800" color="textMain">차량 및 조건</AppText>
          </View>
          <AppText size={13} weight="800" color="textMuted" style={styles.sectionLabel}>차량 선택</AppText>
          <View style={styles.vehicleRow}>
            <Pressable style={({ pressed }) => [styles.vehicleBtn, pressed && QUOTE_PRESS_EFFECT]} onPress={() => analysis.hasVehicleData && setModalMode("TON")}>
              <AppText size={11} weight="700" color="textMuted" style={styles.vehicleLabel}>톤수</AppText>
              <View style={styles.vehicleValueRow}>
                <AppText size={15} weight="800" color="textMain">{analysis.vehicleName}</AppText>
                <Ionicons name="chevron-down" size={14} color={theme.colors.textMuted} />
              </View>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.vehicleBtn, pressed && QUOTE_PRESS_EFFECT]} onPress={() => analysis.hasVehicleData && setModalMode("TYPE")}>
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
              <Pressable style={({ pressed }) => [styles.segItem, !isFrozen && styles.segItemActive, pressed && QUOTE_PRESS_EFFECT]} onPress={() => animateAndPatch({ isFrozen: false })}>
                 <AppText size={13} weight="800" color={!isFrozen ? "brandPrimary" : "textMuted"} style={[styles.segText, !isFrozen && styles.segTextActive]}>상온</AppText>
              </Pressable>
              <Pressable style={({ pressed }) => [styles.segItem, isFrozen && styles.segItemActive, pressed && QUOTE_PRESS_EFFECT]} onPress={() => animateAndPatch({ isFrozen: true })}>
                <View style={styles.segInner}>
                  <AppText size={13} weight="800" color={isFrozen ? "brandPrimary" : "textMuted"} style={[styles.segText, isFrozen && styles.segTextActive]}>냉장/냉동</AppText>
                  <View style={[styles.segBadge, isFrozen && styles.segBadgeActive]}><AppText size={10} weight="900" color={isFrozen ? "brandPrimary" : "textMuted"} style={[styles.segBadgeText, isFrozen && styles.segBadgeTextActive]}>+3만</AppText></View>
                </View>
              </Pressable>
            </View>
          </View>

          <AppText size={13} weight="800" color="textMuted" style={styles.sectionLabel}>배송 방식</AppText>
          <View style={styles.segGroup}>
             <View style={styles.segRow}>
              <Pressable style={({ pressed }) => [styles.segItem, !isPool && styles.segItemActive, pressed && QUOTE_PRESS_EFFECT]} onPress={() => animateAndPatch({ isPool: false })}>
                 <AppText size={13} weight="800" color={!isPool ? "brandPrimary" : "textMuted"} style={[styles.segText, !isPool && styles.segTextActive]}>독차</AppText>
              </Pressable>
              <Pressable style={({ pressed }) => [styles.segItem, isPool && styles.segItemActive, pressed && QUOTE_PRESS_EFFECT]} onPress={() => animateAndPatch({ isPool: true })}>
                <View style={styles.segInner}>
                  <AppText size={13} weight="800" color={isPool ? "brandPrimary" : "textMuted"} style={[styles.segText, isPool && styles.segTextActive]}>알뜰 배송</AppText>
                  <View style={[styles.segBadge, isPool && styles.segBadgeActive]}><AppText size={10} weight="900" color={isPool ? "brandPrimary" : "textMuted"} style={[styles.segBadgeText, isPool && styles.segBadgeTextActive]}>-30%</AppText></View>
                </View>
              </Pressable>
            </View>
          </View>
        </View>

        {/* 2. 추가 옵션 카드 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.brandPrimary} />
            <AppText size={16} weight="800" color="textMain">추가 옵션</AppText>
          </View>
          <View style={styles.optionContainer}>
            {(EXTRA_OPTIONS ?? []).map((opt: any) => {
              const id = String(opt?.id ?? "");
              const active = (draft?.selectedOpts ?? []).includes(id);
              const iconName = (OPTION_ICONS[id] ?? "options-outline") as keyof typeof Ionicons.glyphMap;
              return (
                <Pressable key={id} onPress={() => (id ? toggleOption(id) : undefined)} style={({ pressed }) => [styles.optionChip, active && styles.optionChipActive, pressed && QUOTE_PRESS_EFFECT]}>
                  <View style={styles.optionLeft}>
                    <Ionicons name={iconName} size={14} color={active ? theme.colors.brandPrimary : theme.colors.textMuted} />
                    <AppText size={12} weight="800" color={active ? "brandPrimary" : "textSub"} style={active ? styles.optionTitleActive : styles.optionTitle} numberOfLines={1}>{opt?.title}</AppText>
                  </View>
                  <View style={styles.optionRight}>
                    <AppText size={10} weight="900" color={active ? "brandPrimary" : "textMuted"} style={active ? styles.optionPriceActive : styles.optionPrice}>+{formatKrw(safeNumber(opt?.price, 0))}</AppText>
                    <Ionicons name="checkmark-circle" size={14} color={theme.colors.brandPrimary} style={active ? styles.optionCheck : styles.optionCheckHidden} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* 3. 희망 운임 카드 */}
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
                value={budgetDisplay}
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
            <AppText size={11} weight="900" color="textMuted" style={styles.suggestionLabel}>AI 제안가:</AppText>
            <Pressable style={({ pressed }) => [styles.suggestionChip, pressed && QUOTE_PRESS_EFFECT]} onPress={() => handleAutoFill(analysis.minPrice)}>
              <AppText size={12} weight="900" color="brandPrimary" style={styles.suggestionText}>최저가 입력</AppText>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.suggestionChip, pressed && QUOTE_PRESS_EFFECT]} onPress={() => handleAutoFill(analysis.avgPrice)}>
              <AppText size={12} weight="900" color="brandPrimary" style={styles.suggestionText}>평균가 입력</AppText>
            </Pressable>
          </View>
        </View>

        {/* 💡 4. AI 인라인 진단 리포트 (스크롤 마지막 자연스러운 배치) */}
        <View style={styles.aiInlineCard}>
          <View style={styles.aiHeaderRow}>
            <Ionicons name="sparkles" size={20} color={theme.colors.brandPrimary} />
            <AppText size={16} weight="800" color="textMain" style={styles.aiTitle}>AI 종합 진단 리포트</AppText>
          </View>

          <View style={styles.aiStatusLine}>
            <View style={[styles.aiStatusBadge, { borderColor: tint(aiStatusColor, 0.35, theme.colors.borderDefault), backgroundColor: tint(aiStatusColor, 0.12, theme.colors.bgSurface) }]}>
              <Ionicons name={aiStatusIcon} size={14} color={aiStatusColor} />
              <AppText size={12} weight="900" style={{ color: aiStatusColor }}>{aiContent.statusText}</AppText>
            </View>
            <AppText style={styles.aiStatusComment}>{aiContent.comment}</AppText>
          </View>

          <View style={styles.aiBlock}>
            <View style={styles.aiBlockHeader}>
              <AppText size={12} weight="800" color="textMuted">적재량 분석</AppText>
              <AppText size={12} weight="900" style={{ color: loadColor }}>{levelLabel}</AppText>
            </View>
            <View style={styles.aiGaugeTrack}>
              <View style={[styles.aiGaugeFill, { width: `${loadPercent}%`, backgroundColor: loadColor }]} />
            </View>
            <AppText size={11} weight="700" style={styles.aiGaugeText}>
              {isAiLoading ? "계산 중..." : `${formatKg(analysis.totalWeight)} / 한도 ${formatKg(analysis.limit)}`}
            </AppText>
          </View>

          <View style={styles.aiBlock}>
            <View style={styles.aiBlockHeader}>
              <AppText size={12} weight="800" color="textMuted">AI 예상 적정 시세</AppText>
              <AppText size={15} weight="900" color="textMain" style={styles.aiPriceValue}>
                {isAiLoading ? "분석 중" : hasPriceRange ? `${formatKrw(analysis.minPrice)} ~ ${formatKrw(analysis.maxPrice)}` : "-"}
              </AppText>
            </View>
          </View>
        </View>

        {hasValidationContent ? (
          <View style={styles.serverCard}>
            <View style={styles.serverTitleRow}>
              <AppText size={15} weight="900" color="textMain">서버 검증 결과</AppText>
              <Ionicons name="cloud-done-outline" size={16} color={theme.colors.brandPrimary} />
            </View>

            <View style={styles.serverMetaRow}>
              <View style={styles.serverMetaChip}>
                <AppText style={styles.serverMetaText}>
                  {`overall ${validationPreview?.overallStatus ?? (isValidationLoading ? "LOADING" : "-")}`}
                </AppText>
              </View>
              <View style={styles.serverMetaChip}>
                <AppText style={styles.serverMetaText}>
                  {`dispatch ${validationPreview?.dispatchSpeed ?? (isValidationLoading ? "LOADING" : "-")}`}
                </AppText>
              </View>
              <View style={styles.serverMetaChip}>
                <AppText style={styles.serverMetaText}>
                  {`badge ${validationPreview?.badge ?? (isValidationLoading ? "LOADING" : "-")}`}
                </AppText>
              </View>
              <View style={styles.serverMetaChip}>
                <AppText style={styles.serverMetaText}>
                  {`confidence ${Number.isFinite(validationPreview?.confidence ?? NaN) ? `${Math.round((validationPreview?.confidence ?? 0) * 100)}%` : "-"}`}
                </AppText>
              </View>
            </View>

            <AppText style={styles.serverSummary}>
              {isValidationLoading ? "서버 검증 결과를 가져오는 중입니다." : validationPreview?.aiSummary ?? "AI 요약이 없습니다."}
            </AppText>

            <View style={styles.serverBlock}>
              <AppText style={styles.serverBlockTitle}>가격 예측</AppText>
              <View style={styles.serverBlockRow}>
                <AppText style={styles.serverBlockLabel}>최소/최대</AppText>
                <AppText style={styles.serverBlockValue}>
                  {`${formatKrw(safeNumber(validationPreview?.estimatedMinPrice, 0))} ~ ${formatKrw(safeNumber(validationPreview?.estimatedMaxPrice, 0))}`}
                </AppText>
              </View>
              <View style={styles.serverBlockRow}>
                <AppText style={styles.serverBlockLabel}>가중 예측</AppText>
                <AppText style={styles.serverBlockValue}>{formatKrw(safeNumber(validationPreview?.estimatedWeightedPrice, 0))}</AppText>
              </View>
              <View style={styles.serverBlockRow}>
                <AppText style={styles.serverBlockLabel}>희망/제안</AppText>
                <AppText style={styles.serverBlockValue}>
                  {`${formatKrw(safeNumber(priceAnalysis?.userDesiredPrice, 0))} / ${formatKrw(safeNumber(priceAnalysis?.suggestedPrice, 0))}`}
                </AppText>
              </View>
              <View style={styles.serverBlockRow}>
                <AppText style={styles.serverBlockLabel}>적합도</AppText>
                <AppText style={styles.serverBlockValue}>
                  {priceAnalysis?.fit ?? "-"} {priceAnalysis?.label ? `(${priceAnalysis.label})` : ""}
                </AppText>
              </View>
            </View>

            <View style={styles.serverBlock}>
              <AppText style={styles.serverBlockTitle}>적재 분석</AppText>
              <View style={styles.serverBlockRow}>
                <AppText style={styles.serverBlockLabel}>현재/한도</AppText>
                <AppText style={styles.serverBlockValue}>
                  {`${safeNumber(loadAnalysis?.currentKg, 0)}kg / ${safeNumber(loadAnalysis?.capacityKg, 0)}kg`}
                </AppText>
              </View>
              <View style={styles.serverBlockRow}>
                <AppText style={styles.serverBlockLabel}>사용률</AppText>
                <AppText style={styles.serverBlockValue}>{`${safeNumber(loadAnalysis?.usagePercent, 0)}%`}</AppText>
              </View>
              <View style={styles.serverBlockRow}>
                <AppText style={styles.serverBlockLabel}>안전도</AppText>
                <AppText style={styles.serverBlockValue}>
                  {loadAnalysis?.safety ?? "-"} {loadAnalysis?.label ? `(${loadAnalysis.label})` : ""}
                </AppText>
              </View>
            </View>

            <View style={styles.serverBlock}>
              <AppText style={styles.serverBlockTitle}>코멘트</AppText>
              <View style={styles.serverList}>
                {(validationComments.length > 0 ? validationComments : ["-"]).map((item, index) => (
                  <AppText key={`comment-${index}`} style={styles.serverListItem}>{`• ${item}`}</AppText>
                ))}
              </View>
            </View>

            <View style={styles.serverBlock}>
              <AppText style={styles.serverBlockTitle}>사유/권장 액션</AppText>
              <View style={styles.serverList}>
                {(validationReasons.length > 0 ? validationReasons : ["-"]).map((item, index) => (
                  <AppText key={`reason-${index}`} style={styles.serverListItem}>{`• ${item}`}</AppText>
                ))}
                {(validationActions.length > 0 ? validationActions : ["-"]).map((item, index) => (
                  <AppText key={`action-${index}`} style={styles.serverListItem}>{`→ ${item}`}</AppText>
                ))}
              </View>
            </View>
          </View>
        ) : null}

      </ScrollView>
      
      {/* --- 차종 선택 모달 --- */}
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
