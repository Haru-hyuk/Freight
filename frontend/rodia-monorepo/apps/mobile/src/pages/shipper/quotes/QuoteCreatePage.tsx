import React, { useMemo, useState } from "react";
import { Alert, Modal, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, type NavigationProp, type ParamListBase } from "@react-navigation/native";
import { useRouter } from "expo-router";
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
import { createShipperQuote } from "@/features/quote/api/quote-api";
import { buildQuoteCreateRequest } from "@/features/quote/model/quoteCreateRequestMapper";
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

    // 상단 스텝 바 (Progress Bar)
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

    // 하단 바 (Bottom Bar)
    bottomBar: {
      backgroundColor: c.bgSurface,
      borderTopWidth: 1,
      borderTopColor: c.borderDefault,
      paddingHorizontal: spacing * 5,
      paddingTop: spacing * 3,
    },
    bottomContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
    
    // 요약 텍스트
    summaryBox: { flex: 1, justifyContent: 'center' },
    summaryLabel: { fontSize: 11, color: c.textMuted, marginBottom: 2 },
    summaryMain: { fontSize: 13, fontWeight: '700', color: c.textSub },
    priceText: { fontSize: 18, fontWeight: '800', color: c.brandPrimary },

    // 버튼 그룹
    btnGroup: { flexDirection: "row", gap: 10 },
    btnBack: { minHeight: safeNumber(theme.components.button.sizes.lg.minHeight, 52), minWidth: 88 },
    btnNext: { minHeight: safeNumber(theme.components.button.sizes.lg.minHeight, 52), minWidth: 136 },

    // 완료 모달
    requestModalOverlay: {
      flex: 1,
      backgroundColor: overlay,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: spacing * 4,
    },
    requestModalWrap: { width: "100%", maxWidth: 360 }, // 너비 조정
    requestModalCard: {
      ...flatCard,
      width: "100%",
      paddingHorizontal: spacing * 6,
      paddingVertical: spacing * 6,
      alignItems: "center", // 중앙 정렬
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

function QuoteCreatePageInner() {
  const theme = useAppTheme();
  const styles = useStyles();
  const router = useRouter();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const insets = useSafeAreaInsets();

  const { draft } = useQuoteCreateDraft();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [bottomBarHeight, setBottomBarHeight] = useState(100);
  const [isSubmitDoneOpen, setIsSubmitDoneOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdQuoteIdentifier, setCreatedQuoteIdentifier] = useState("");

  const pricing = useMemo(() => computeQuotePricing(draft), [draft]);

  const hasText = (v?: string) => (v ?? "").trim().length > 0;
  const parseQty = (v?: string) => parseInt((v ?? "").replace(/[^\d]/g, ""), 10) || 0;

  // Step 1 Validation
  const isStep1Ready = useMemo(() => {
    return hasText(draft?.startAddr) && hasText(draft?.endAddr) && hasText(draft?.senderPhone);
  }, [draft?.startAddr, draft?.endAddr, draft?.senderPhone]);

  // Step 2 Validation
  const cargoList = draft?.cargoList ?? [];
  const validCargoCount = useMemo(() => {
    return cargoList.filter((cargo) => {
      const category = cargo?.itemCategory ?? "BOX";
      const hasName = category === "FURNITURE" ? hasText(cargo?.type) : true;
      return hasName && parseQty(cargo?.quantity) > 0;
    }).length;
  }, [cargoList]);
  const isStep2Ready = cargoList.length > 0 && validCargoCount === cargoList.length;

  // Step 3 Validation (Vehicle selected?)
  // const isStep3Ready = useMemo(() => {
  //     // 기본값이 있으므로 사실상 항상 준비됨
  //     return true; 
  // }, [draft.tonIdx, draft.typeIdx]);

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

    const payload = buildQuoteCreateRequest(draft);
    const stops = Array.isArray(payload?.stops) ? payload.stops : [];
    const addressCandidates = [
      payload?.originAddress,
      payload?.destinationAddress,
      ...stops.map((stop) => (stop as { address?: unknown })?.address),
    ];

    if (addressCandidates.some((address) => hasBrokenAddressText(String(address ?? "")))) {
      Alert.alert("견적 요청 실패", "주소 문자열이 깨져 있어요. 주소를 다시 선택해주세요.");
      return;
    }

    try {
      setIsSubmitting(true);
      setCreatedQuoteIdentifier("");
      const response = await createShipperQuote(payload);
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
            // eslint-disable-next-line no-console
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
    router.replace("/(shipper)/home"); // 홈 경로로 이동 (가정)
  };

  // Helper text for Bottom Bar
  const getBottomSummary = () => {
      if (step === 1) return isStep1Ready ? "경로 입력 완료" : "경로를 입력해주세요";
      if (step === 2) return `화물 ${validCargoCount}건 입력됨`;
      return `${pricing.vehicleName} ${pricing.typeName} · ${draft.isPool ? "합짐" : "독차"}`;
  };

  const getBottomPrice = () => {
      // 아직 차량 선택 전(Step 1,2)이라도 AI 예상 견적(1톤 기준) 보여줌 (동기부여)
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
      {/* Step Progress Bar */}
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

      {/* Content Area */}
      {step === 1 && <QuoteCreateStep1 />}
      {step === 2 && <QuoteCreateStep2 />}
      {step === 3 && <QuoteCreateStep3 />}

      {/* 완료 모달 */}
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
