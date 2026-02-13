import React, { useMemo, useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, type NavigationProp, type ParamListBase } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  const radiusCard = safeNumber(theme.layout.radii.card, 16);
  const overlay = tint(c.textMain, 0.45, "rgba(0,0,0,0.45)");

  return StyleSheet.create({
    content: { backgroundColor: c.bgMain, paddingTop: 16 },

    // 상단 스텝 바 (Progress Bar)
    stepBarContainer: {
        paddingHorizontal: spacing * 5,
        marginBottom: spacing * 4,
    },
    stepBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      position: 'relative',
    },
    stepLineBg: {
        position: 'absolute', top: 14, left: 0, right: 0, height: 2, backgroundColor: c.borderDefault, zIndex: 0
    },
    stepItem: { alignItems: 'center', zIndex: 1, gap: 6 },
    stepCircle: {
        width: 30, height: 30, borderRadius: 15, backgroundColor: c.bgSurface,
        borderWidth: 2, borderColor: c.borderDefault, alignItems: 'center', justifyContent: 'center'
    },
    stepCircleActive: {
        backgroundColor: c.brandPrimary, borderColor: c.brandPrimary
    },
    stepCheck: { color: "#fff", fontWeight: 'bold', fontSize: 12 }, // Used indirectly via Icon
    stepNum: { fontSize: 12, fontWeight: '700', color: c.textMuted },
    stepLabel: { fontSize: 11, fontWeight: '600', color: c.textMuted },
    stepLabelActive: { color: c.brandPrimary, fontWeight: '700' },
    devAutoFillBtn: {
      minHeight: 36,
      minWidth: 44,
      paddingHorizontal: 10,
    },

    // 하단 바 (Bottom Bar)
    bottomBar: {
      backgroundColor: c.bgSurface,
      borderTopWidth: 1,
      borderTopColor: c.borderDefault,
      paddingHorizontal: spacing * 5,
      paddingTop: spacing * 3,
      shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, elevation: 10
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
      width: "100%",
      borderRadius: radiusCard,
      paddingHorizontal: spacing * 6,
      paddingVertical: spacing * 6,
      alignItems: "center", // 중앙 정렬
      backgroundColor: c.bgSurface,
      elevation: 5,
      shadowColor: "#000",
      shadowOpacity: 0.25,
      shadowRadius: 10,
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
    modalBtnSecondary: { width: '100%', height: 50, borderRadius: 12, backgroundColor: 'transparent', borderWidth: 0 },
  });
});

function QuoteCreatePageInner() {
  const theme = useAppTheme();
  const styles = useStyles();
  const router = useRouter();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const insets = useSafeAreaInsets();

  const { draft, patchDraft } = useQuoteCreateDraft();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [bottomBarHeight, setBottomBarHeight] = useState(100);
  const [isSubmitDoneOpen, setIsSubmitDoneOpen] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<Date | null>(null);

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

  const handleNext = () => {
      if (step === 1 && !isStep1Ready) return alert("출발지와 도착지, 연락처를 입력해주세요.");
      if (step === 2 && !isStep2Ready) return alert("화물 정보를 입력해주세요.");
      
      if (step < 3) setStep((prev) => (prev + 1) as 2 | 3);
      else submitQuoteRequest();
  };

  const submitQuoteRequest = () => {
    setSubmittedAt(new Date());
    setIsSubmitDoneOpen(true);
  };

  const applyDevAutoFill = () => {
    const date = new Date();
    const time = new Date();
    time.setHours(10, 30, 0, 0);

    patchDraft({
      senderName: "테스트 발송인",
      senderPhone: "01012345678",
      receiverName: "테스트 수취인",
      receiverPhone: "01087654321",
      startAddr: "서울 강남구 테헤란로 427",
      startAddrDetail: "15층 물류팀",
      endAddr: "경기 성남시 분당구 판교역로 166",
      endAddrDetail: "1층 하차장",
      waypoints: [
        { id: 1, name: "경유 담당자", phone: "01055556666", addr: "서울 송파구 올림픽로 300", detail: "B1 집하장" },
      ],
      loadMethod: "수작업",
      unloadMethod: "지게차",
      date,
      time,
      cargoList: [
        {
          id: 1,
          itemCategory: "BOX",
          type: "전자부품 박스",
          quantity: "12",
          lengthCm: "48",
          widthCm: "38",
          heightCm: "34",
          weight: "180",
          dropOffKey: "WP:1",
        },
        {
          id: 2,
          itemCategory: "PALLET",
          type: "파렛트 자재",
          quantity: "2",
          lengthCm: "110",
          widthCm: "110",
          heightCm: "120",
          weight: "420",
          dropOffKey: "END",
        },
      ],
      tonIdx: 1,
      typeIdx: 0,
      isFrozen: false,
      isPool: false,
      selectedOpts: ["caution"],
      budget: "180000",
      noteToDriver: "개발용 자동 입력 데이터입니다.",
    });

    setStep(3);
  };

  const goToQuoteList = () => {
    setIsSubmitDoneOpen(false);
    router.replace("/(shipper)/quotes");
  };

  const goToHome = () => {
    setIsSubmitDoneOpen(false);
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
            right={step < 3 ? <Ionicons name="arrow-forward" size={18} color={theme.colors.textOnBrand} /> : undefined}
          />
        </View>
      </View>
    </View>
  );

  return (
    <PageScaffold
      title="견적 요청"
      headerRight={
        <AppButton
          title="⚡️"
          size="sm"
          variant="secondary"
          style={styles.devAutoFillBtn}
          onPress={applyDevAutoFill}
          accessibilityLabel="개발용 자동 입력"
        />
      }
      onPressBack={goBack}
      backgroundColor={theme.colors.bgMain}
      scroll={false}
      contentStyle={StyleSheet.flatten([styles.content, { paddingBottom: bottomBarHeight + 20 }])}
      bottomBar={bottomBar}
    >
      {/* Step Progress Bar */}
      <View style={styles.stepBarContainer}>
          <View style={styles.stepBar}>
              <View style={styles.stepLineBg} />
              {QUOTE_STEP_ITEMS.map((item) => {
                  const isActive = step >= item.step;
                  const isCurrent = step === item.step;
                  return (
                      <View key={item.step} style={styles.stepItem}>
                          <View style={[styles.stepCircle, isActive && styles.stepCircleActive]}>
                              {isActive ? (
                                  <Ionicons name="checkmark" size={16} color="#fff" />
                              ) : (
                                  <AppText style={styles.stepNum}>{item.step}</AppText>
                              )}
                          </View>
                          <AppText style={isCurrent ? styles.stepLabelActive : styles.stepLabel}>
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
                            {draft.startAddr.split(" ")[0]} <Ionicons name="arrow-forward" size={10}/> {draft.endAddr.split(" ")[0]}
                        </AppText>
                    </View>
                </View>

                <View style={styles.modalBtnGroup}>
                    <AppButton title="내역 확인하기" size="lg" style={styles.modalBtn} onPress={goToQuoteList} />
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
