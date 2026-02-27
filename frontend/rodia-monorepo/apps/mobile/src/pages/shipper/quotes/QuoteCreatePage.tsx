import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Modal, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, type NavigationProp, type ParamListBase } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { readApiErrorMessage } from "@/shared/lib/api/readApiErrorMessage";
import { safeNumber, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import type { AppTheme } from "@/shared/theme/types";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

import {
  computeQuotePricing,
  formatKrw,
  QuoteCreateDraftProvider,
  useQuoteCreateDraft,
} from "@/features/quote/model/quoteCreateDraft";
import { createShipperMatch } from "@/features/matching/api";
import { createShipperQuote, previewShipperQuote } from "@/features/quote/api/quote-api";
import { buildQuoteCreateRequest } from "@/features/quote/model/quoteCreateRequestMapper";
import { isActorOnlyWorkMethod } from "@/features/quote/model/workMethod";
import { getQuoteFlatCardStyle, QUOTE_PROGRESS_TOKENS } from "@/features/quote/ui/QuoteCreateUiPrimitives";
import QuoteCreateStep1 from "@/features/quote/ui/QuoteCreateStep1";
import QuoteCreateStep2 from "@/features/quote/ui/QuoteCreateStep2";
import QuoteCreateStep3 from "@/features/quote/ui/QuoteCreateStep3";

const QUOTE_STEP_ITEMS = [
  { step: 1 as const, label: "운송 경로" },
  { step: 2 as const, label: "화물 정보" },
  { step: 3 as const, label: "차량/옵션" },
];

const useStyles = createThemedStyles((theme: AppTheme) => {
  const c = theme.colors;
  const spacing = safeNumber(theme.layout.spacing.base, 4);
  const overlay = tint(c.textMain, 0.45, c.textMain);
  const stepCircleSize = QUOTE_PROGRESS_TOKENS.circleSize;
  const stepLineHeight = QUOTE_PROGRESS_TOKENS.lineHeight;
  const flatCard = getQuoteFlatCardStyle(theme);

  return StyleSheet.create({
    content: { backgroundColor: c.bgMain, paddingTop: 16 },

    stepBarContainer: {
        paddingHorizontal: spacing * 5,
        marginBottom: spacing * 4,
    },
    stepBar: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      position: 'relative',
    },
    stepLineTrack: {
      position: "absolute",
      top: stepCircleSize / 2 - stepLineHeight / 2,
      left: 0,
      right: 0,
      height: stepLineHeight,
      borderRadius: stepLineHeight,
      backgroundColor: tint(c.textMain, 0.08, c.borderDefault),
      zIndex: 0,
      overflow: "hidden",
    },
    stepLineFill: { height: "100%", borderRadius: stepLineHeight, backgroundColor: c.brandPrimary },
    stepItem: { alignItems: 'center', zIndex: 1, gap: 6 },
    stepCircle: {
      width: stepCircleSize,
      height: stepCircleSize,
      borderRadius: stepCircleSize / 2,
      backgroundColor: c.bgSurface,
      borderWidth: 2,
      borderColor: c.borderDefault,
      alignItems: "center",
      justifyContent: "center",
    },
    stepCircleActive: {
      backgroundColor: c.brandPrimary,
      borderColor: c.brandPrimary,
    },
    stepNum: { fontSize: 12, fontWeight: '700', color: c.textMuted },
    stepLabel: { fontSize: 11, fontWeight: '600', color: c.textMuted },
    stepLabelActive: { color: c.brandPrimary, fontWeight: '700' },

    bottomBar: {
      backgroundColor: c.bgSurface,
      borderTopWidth: 1,
      borderTopColor: c.borderDefault,
      paddingHorizontal: spacing * 5,
      paddingTop: spacing * 3,
    },
    bottomContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
    
    summaryBox: { flex: 1, justifyContent: 'center' },
    summaryLabel: { fontSize: 11, color: c.textMuted, marginBottom: 2 },
    summaryMain: { fontSize: 13, fontWeight: '700', color: c.textSub },
    priceText: { fontSize: 18, fontWeight: '800', color: c.brandPrimary },

    btnGroup: { flexDirection: "row", gap: 10 },
    btnBack: { minHeight: safeNumber(theme.components.button.sizes.lg.minHeight, 52), minWidth: 88 },
    btnNext: { minHeight: safeNumber(theme.components.button.sizes.lg.minHeight, 52), minWidth: 136 },

    requestModalOverlay: {
      flex: 1,
      backgroundColor: overlay,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: spacing * 4,
    },
    requestModalWrap: { width: "100%", maxWidth: 360 },
    requestModalCard: {
      ...flatCard,
      width: "100%",
      paddingHorizontal: spacing * 6,
      paddingVertical: spacing * 6,
      alignItems: "center",
    },
    requestModalIcon: {
      width: 72, height: 72, borderRadius: 36, backgroundColor: tint(c.brandPrimary, 0.1, c.bgSurface),
      alignItems: "center", justifyContent: "center", marginBottom: spacing * 3,
    },
    successTitle: { fontSize: 18, fontWeight: '800', color: c.textMain, textAlign: 'center', marginBottom: spacing * 2 },
    successDesc: { fontSize: 14, color: c.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: spacing * 4 },
    
    infoBox: {
        width: '100%', backgroundColor: c.bgSurfaceAlt, borderRadius: 12, padding: 16, gap: 10, marginBottom: spacing * 4
    },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    infoLabel: { fontSize: 13, color: c.textMuted },
    infoValue: { fontSize: 14, fontWeight: '700', color: c.textMain },
    
    modalBtnGroup: { width: '100%', gap: 10 },
    modalBtn: { width: '100%', height: 50, borderRadius: 12 },
    modalBtnSecondary: { width: '100%', height: 50, borderRadius: 12 },
  });
});

function hasBrokenAddressText(value?: string) {
  const v = String(value ?? "").trim();
  if (!v) return false;
  if (v.includes("\uFFFD")) return true;
  return /\?{2,}/.test(v);
}

function toFiniteNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function isStrictPositiveNumber(value: unknown): boolean {
  const parsed = toFiniteNumber(value);
  if (parsed === null) return false;
  return parsed > 0;
}

function isNonNegativeNumber(value: unknown): boolean {
  const parsed = toFiniteNumber(value);
  if (parsed === null) return false;
  return parsed >= 0;
}

function QuoteCreatePageInner() {
  const theme = useAppTheme();
  const styles = useStyles();
  const router = useRouter();
  const params = useLocalSearchParams<{ prefillStartAddr?: string; prefillEndAddr?: string }>();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const insets = useSafeAreaInsets();

  const { draft, patchDraft } = useQuoteCreateDraft();
  const appliedPrefillKeyRef = useRef("");

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [bottomBarHeight, setBottomBarHeight] = useState(100);
  const [isSubmitDoneOpen, setIsSubmitDoneOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewPrice, setPreviewPrice] = useState<number | null>(null);
  const [createdQuoteIdentifier, setCreatedQuoteIdentifier] = useState("");

  const pricing = useMemo(() => computeQuotePricing(draft), [draft]);

  const hasText = (v?: string) => (v ?? "").trim().length > 0;
  const parseQty = (v?: string) => parseInt((v ?? "").replace(/[^\d]/g, ""), 10) || 0;

  const isStep1Ready = useMemo(() => {
    return hasText(draft?.startAddr) && hasText(draft?.endAddr) && hasText(draft?.senderPhone);
  }, [draft?.startAddr, draft?.endAddr, draft?.senderPhone]);

  const cargoList = draft?.cargoList ?? [];
  const validCargoCount = useMemo(() => {
    return cargoList.filter((cargo) => {
      const category = cargo?.itemCategory ?? "BOX";
      const hasName = category === "FURNITURE" ? hasText(cargo?.type) : true;
      return hasName && parseQty(cargo?.quantity) > 0;
    }).length;
  }, [cargoList]);
  const isStep2Ready = cargoList.length > 0 && validCargoCount === cargoList.length;

  useEffect(() => {
    const startAddr = String(params?.prefillStartAddr ?? "").trim();
    const endAddr = String(params?.prefillEndAddr ?? "").trim();
    if (!startAddr && !endAddr) return;

    const key = `${startAddr}__${endAddr}`;
    if (appliedPrefillKeyRef.current === key) return;
    appliedPrefillKeyRef.current = key;

    patchDraft({
      startAddr: startAddr || draft?.startAddr || "",
      endAddr: endAddr || draft?.endAddr || "",
      startAddrDetail: "",
      endAddrDetail: "",
      waypoints: [],
      originLat: undefined,
      originLng: undefined,
      destinationLat: undefined,
      destinationLng: undefined,
      distanceKm: undefined,
    });
  }, [draft?.endAddr, draft?.startAddr, params?.prefillEndAddr, params?.prefillStartAddr, patchDraft]);

  useEffect(() => {
    const submitBasePrice = Math.max(0, Math.trunc(Number(pricing?.basePrice ?? 0)));
    const draftForPreview: typeof draft & { basePrice?: number } = {
      ...draft,
      basePrice: submitBasePrice,
    };
    const payload = buildQuoteCreateRequest(draftForPreview);
    const { truckId: _ignoredTruckId, ...previewPayload } = payload;

    if (!String(previewPayload?.originAddress ?? "").trim() || !String(previewPayload?.destinationAddress ?? "").trim()) {
      setPreviewPrice(null);
      return;
    }

    let canceled = false;
    const timer = setTimeout(async () => {
      try {
        const preview = await previewShipperQuote(previewPayload);
        if (canceled) return;

        const weighted = Number(preview?.estimatedWeightedPrice ?? NaN);
        const min = Number(preview?.estimatedMinPrice ?? NaN);
        const max = Number(preview?.estimatedMaxPrice ?? NaN);
        const candidate = Number.isFinite(weighted) && weighted > 0
          ? weighted
          : Number(preview?.estimatedMaxPrice ?? preview?.estimatedMinPrice ?? NaN);
        const nextPreviewPrice = Number.isFinite(candidate) && candidate > 0 ? Math.trunc(candidate) : null;
        setPreviewPrice(nextPreviewPrice);
      } catch {
        if (canceled) return;
        setPreviewPrice(null);
      }
    }, 350);

    return () => {
      canceled = true;
      clearTimeout(timer);
    };
  }, [draft, pricing?.basePrice]);

  const goBack = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as 1 | 2);
      return;
    }
    if (navigation?.canGoBack?.()) navigation.goBack();
    else router.replace("/(shipper)/quotes");
  };

  const resolveCreatedQuoteIdentifier = (input: unknown): string => {
    if (!input || typeof input !== "object") return "";
    const source = input as { quotePublicId?: unknown; quoteId?: unknown };
    const quotePublicId = typeof source?.quotePublicId === "string" ? source.quotePublicId.trim() : "";
    if (quotePublicId) return quotePublicId;

    const quoteId = Number(source?.quoteId);
    if (Number.isFinite(quoteId) && quoteId > 0) return String(Math.trunc(quoteId));
    return "";
  };

  const resolveCreatedQuoteId = (input: unknown): number => {
    if (!input || typeof input !== "object") return 0;
    const source = input as { quoteId?: unknown };
    const quoteId = Number(source?.quoteId);
    if (!Number.isFinite(quoteId) || quoteId <= 0) return 0;
    return Math.trunc(quoteId);
  };

  const handleNext = async () => {
      if (step === 1 && !isStep1Ready) return alert("출발지와 도착지, 연락처를 입력해주세요.");
      if (step === 2 && !isStep2Ready) return alert("화물 정보를 입력해주세요.");
      
      if (step < 3) {
        setStep((prev) => (prev + 1) as 2 | 3);
        return;
      }

      await submitQuoteRequest();
  };

  const submitQuoteRequest = async () => {
    if (isSubmitting) return;

    const submitBasePrice = Math.max(0, Math.trunc(Number(pricing?.basePrice ?? 0)));
    const draftForSubmit: typeof draft & { basePrice?: number } = {
      ...draft,
      basePrice: submitBasePrice,
    };
    
    const payload = buildQuoteCreateRequest(draftForSubmit);
    const { truckId: _ignoredTruckId, ...createPayload } = payload;

    const stops = Array.isArray(payload?.stops) ? payload.stops : [];
    const addressCandidates = [
      payload?.originAddress,
      payload?.destinationAddress,
      ...stops.map((stop) => (stop as { address?: unknown })?.address),
    ];

    if (!isActorOnlyWorkMethod(payload?.loadMethod) || !isActorOnlyWorkMethod(payload?.unloadMethod)) {
      Alert.alert("견적 요청 실패", "상하차 방식이 확정되지 않았어요. 상하차 방식을 다시 선택해주세요.");
      return;
    }

    if (!isStrictPositiveNumber(payload?.weightKg)) {
      Alert.alert("견적 요청 실패", "화물 중량이 확정되지 않았어요. 화물 정보를 확인해주세요.");
      return;
    }

    if (!isNonNegativeNumber(payload?.volumeCbm)) {
      Alert.alert("견적 요청 실패", "화물 부피 값이 유효하지 않아요. 화물 정보를 확인해주세요.");
      return;
    }

    if (addressCandidates.some((address) => hasBrokenAddressText(String(address ?? "")))) {
      Alert.alert("견적 요청 실패", "주소 문자열이 깨져 있어요. 주소를 다시 선택해주세요.");
      return;
    }

    try {
      setIsSubmitting(true);
      setCreatedQuoteIdentifier("");
      const response = await createShipperQuote(createPayload);
      const nextQuoteIdentifier = resolveCreatedQuoteIdentifier(response);
      const nextQuoteId =
        resolveCreatedQuoteId(response) ||
        (() => {
          const parsed = Number(nextQuoteIdentifier);
          return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 0;
        })();
      setCreatedQuoteIdentifier(nextQuoteIdentifier);

      if (nextQuoteId > 0) {
        try {
          await createShipperMatch(nextQuoteId);
        } catch (error) {
          if (__DEV__) {
            console.warn("[quote-create] auto-create-match failed", error);
          }
        }
      }

      if (nextQuoteIdentifier) {
        setIsSubmitDoneOpen(false);
        router.replace({ pathname: "/(shipper)/quotes/[id]", params: { id: nextQuoteIdentifier } });
        return;
      }

      setIsSubmitDoneOpen(true);
    } catch (error) {
      Alert.alert("견적 요청 실패", readApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToCreatedQuoteDetail = () => {
    const safeIdentifier = String(createdQuoteIdentifier ?? "").trim();
    setIsSubmitDoneOpen(false);
    if (!safeIdentifier) {
      router.replace("/(shipper)/quotes");
      return;
    }
    router.replace({ pathname: "/(shipper)/quotes/[id]", params: { id: safeIdentifier } });
  };

  const goToQuoteList = () => {
    setIsSubmitDoneOpen(false);
    setCreatedQuoteIdentifier("");
    router.replace("/(shipper)/quotes");
  };

  const goToHome = () => {
    setIsSubmitDoneOpen(false);
    setCreatedQuoteIdentifier("");
    router.replace("/(shipper)/home");
  };

  const getBottomSummary = () => {
      if (step === 1) return isStep1Ready ? "경로 입력 완료" : "경로를 입력해주세요";
      if (step === 2) return `화물 ${validCargoCount}건 입력됨`;
      return `${pricing.vehicleName} ${pricing.typeName} · ${draft.isPool ? "합짐" : "독차"}`;
  };

  const getBottomPrice = () => {
      return formatKrw(pricing.finalPrice || pricing.basePrice);
  };

  const startAddrLabel = String(draft?.startAddr ?? "").trim().split(/\s+/).filter(Boolean)[0] ?? "-";
  const endAddrLabel = String(draft?.endAddr ?? "").trim().split(/\s+/).filter(Boolean)[0] ?? "-";

  const stepProgress =
    QUOTE_STEP_ITEMS.length > 1 ? ((step - 1) / (QUOTE_STEP_ITEMS.length - 1)) * 100 : 0;

  const bottomBar = (
    <View
      style={[styles.bottomBar, { paddingBottom: (insets?.bottom ?? 0) + 16 }]}
      onLayout={(e) => setBottomBarHeight(e.nativeEvent.layout.height)}
    >
      <View style={styles.bottomContent}>
        <View style={styles.summaryBox}>
          <AppText style={styles.summaryLabel}>
            {step === 3 ? "예상 견적 (AI 분석)" : "현재 단계 요약"}
          </AppText>
          {step === 3 ? (
            <AppText style={styles.priceText}>{getBottomPrice()}</AppText>
          ) : (
            <AppText style={styles.summaryMain}>{getBottomSummary()}</AppText>
          )}
        </View>

        <View style={styles.btnGroup}>
          {step > 1 ? (
            <AppButton title="이전" variant="secondary" size="lg" style={styles.btnBack} onPress={goBack} />
          ) : null}
          <AppButton
            title={step === 3 ? "견적 요청" : "다음"}
            size="lg"
            style={styles.btnNext}
            onPress={handleNext}
            disabled={isSubmitting}
            loading={step === 3 && isSubmitting}
            right={step < 3 && !isSubmitting ? <Ionicons name="arrow-forward" size={18} color={theme.colors.textOnBrand} /> : undefined}
          />
        </View>
      </View>
    </View>
  );

  return (
    <PageScaffold
      title="견적 요청"
      onPressBack={goBack}
      backgroundColor={theme.colors.bgMain}
      scroll={false}
      contentStyle={StyleSheet.flatten([styles.content, { paddingBottom: bottomBarHeight + 20 }])}
      bottomBar={bottomBar}
    >
      <View style={styles.stepBarContainer}>
          <View style={styles.stepBar}>
              <View style={styles.stepLineTrack}>
                <View style={[styles.stepLineFill, { width: `${stepProgress}%` }]} />
              </View>
              {QUOTE_STEP_ITEMS.map((item) => {
                  const isActive = step >= item.step;
                  const isCurrent = step === item.step;
                  return (
                      <View key={item.step} style={styles.stepItem}>
                          <View style={[styles.stepCircle, isActive && styles.stepCircleActive]}>
                              {isActive ? (
                                  <Ionicons name="checkmark" size={16} color={theme.colors.textOnBrand} />
                              ) : (
                                  <AppText style={styles.stepNum}>{item.step}</AppText>
                              )}
                          </View>
                          <AppText style={[styles.stepLabel, isCurrent && styles.stepLabelActive]}>
                              {item.label}
                          </AppText>
                      </View>
                  )
              })}
          </View>
      </View>

      {step === 1 && <QuoteCreateStep1 />}
      {step === 2 && <QuoteCreateStep2 />}
      {step === 3 && <QuoteCreateStep3 />}

      <Modal visible={isSubmitDoneOpen} transparent animationType="fade" onRequestClose={goToQuoteList}>
        <View style={styles.requestModalOverlay}>
          <View style={styles.requestModalWrap}>
            <View style={styles.requestModalCard}>
                <View style={styles.requestModalIcon}>
                    <Ionicons name="paper-plane" size={36} color={theme.colors.brandPrimary} />
                </View>

                <AppText style={styles.successTitle}>견적 요청 완료!</AppText>
                <AppText style={styles.successDesc}>
                   곧 기사님들의 제안이 도착합니다.{'\n'}조금만 기다려주세요.
                </AppText>

                <View style={styles.infoBox}>
                    <View style={styles.infoRow}>
                        <AppText style={styles.infoLabel}>예상 견적</AppText>
                        <AppText style={styles.infoValue}>{getBottomPrice()}</AppText>
                    </View>
                    <View style={styles.infoRow}>
                        <AppText style={styles.infoLabel}>운송 구간</AppText>
                        <AppText style={[styles.infoValue, { maxWidth: "70%" }]} numberOfLines={1}>
                            {startAddrLabel} <Ionicons name="arrow-forward" size={10}/> {endAddrLabel}
                        </AppText>
                    </View>
                </View>

                <View style={styles.modalBtnGroup}>
                    <AppButton title="견적 상세 보기" size="lg" style={styles.modalBtn} onPress={goToCreatedQuoteDetail} />
                    <AppButton title="내역 확인하기" variant="secondary" size="lg" style={styles.modalBtnSecondary} onPress={goToQuoteList} />
                    <AppButton title="홈으로" variant="secondary" size="lg" style={styles.modalBtnSecondary} onPress={goToHome} />
                </View>
            </View>
          </View>
        </View>
      </Modal>
    </PageScaffold>
  );
}

export function QuoteCreatePage() {
  return (
    <QuoteCreateDraftProvider>
      <QuoteCreatePageInner />
    </QuoteCreateDraftProvider>
  );
}

export default QuoteCreatePage;


