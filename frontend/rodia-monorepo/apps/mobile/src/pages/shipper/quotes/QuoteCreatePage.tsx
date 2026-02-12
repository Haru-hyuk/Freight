// apps/mobile/src/pages/shipper/quotes/QuoteCreatePage.tsx
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
import { AppCard } from "@/shared/ui/kit/AppCard";
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

const useStyles = createThemedStyles((theme: AppTheme) => {
  const spacing = safeNumber(theme.layout.spacing.base, 4);
  const radiusCard = safeNumber(theme.layout.radii.card, 16);
  const radiusControl = safeNumber(theme.layout.radii.control, 12);
  const overlay = tint(theme.colors.textMain, 0.45, "rgba(0,0,0,0.45)");

  return StyleSheet.create({
    content: { backgroundColor: theme.colors.bgMain, paddingTop: 12 },

    stepBar: {
      paddingHorizontal: spacing * 5,
      marginBottom: spacing * 3,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing * 2 + 2,
    },
    stepPill: {
      flex: 1,
      minHeight: 36,
      borderRadius: 999,
      backgroundColor: theme.colors.bgSurfaceAlt,
      borderWidth: 1,
      borderColor: theme.colors.borderDefault,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 10,
    },
    stepPillActive: {
      backgroundColor: tint(theme.colors.brandPrimary, 0.1, theme.colors.bgSurfaceAlt),
      borderColor: tint(theme.colors.brandPrimary, 0.24, theme.colors.borderDefault),
    },

    bottomBar: {
      backgroundColor: theme.colors.bgSurface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderDefault,
      paddingHorizontal: spacing * 5,
      paddingTop: spacing * 4,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing * 4,
    },
    bottomBarStack: {
      backgroundColor: theme.colors.bgSurface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderDefault,
      paddingHorizontal: spacing * 5,
      paddingTop: spacing * 4,
      gap: spacing * 3,
    },
    bottomSummary: { flex: 1, minWidth: 0 },
    bottomSummaryValue: { marginTop: 2 },
    bottomActionGroup: { flexDirection: "row", gap: spacing * 2 + 2 },
    bottomActionButton: { flex: 1, minHeight: safeNumber(theme.components.button.sizes.lg.minHeight, 52) + 2 },
    bottomBackButton: { flex: 0.8, minHeight: safeNumber(theme.components.button.sizes.lg.minHeight, 52) + 2 },
    bottomSubmitButton: { flex: 1.2, minHeight: safeNumber(theme.components.button.sizes.lg.minHeight, 52) + 2 },

    requestModalOverlay: {
      flex: 1,
      backgroundColor: overlay,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: spacing * 5,
    },
    requestModalWrap: { width: "100%", maxWidth: 420 },
    requestModalCard: { borderRadius: radiusCard, padding: spacing * 5, gap: spacing * 3 },
    requestModalIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: tint(theme.colors.brandPrimary, 0.1, theme.colors.bgSurfaceAlt),
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "center",
      marginBottom: 2,
    },
    requestMetaBox: {
      backgroundColor: theme.colors.bgSurfaceAlt,
      borderRadius: radiusControl,
      borderWidth: 1,
      borderColor: theme.colors.borderDefault,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 4,
    },
    requestActions: { gap: spacing * 2 },
  });
});

function QuoteCreatePageInner() {
  const theme = useAppTheme();
  const styles = useStyles();
  const router = useRouter();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const insets = useSafeAreaInsets();

  const { draft } = useQuoteCreateDraft();

  const [step, setStep] = useState<1 | 2>(1);
  const [bottomBarHeight, setBottomBarHeight] = useState(180);
  const [isSubmitDoneOpen, setIsSubmitDoneOpen] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<Date | null>(null);

  const pricing = useMemo(() => computeQuotePricing(draft), [draft]);

  const goBack = () => {
    if (step === 2) {
      setStep(1);
      return;
    }
    if (navigation?.canGoBack?.()) navigation.goBack();
    else router.replace("/(shipper)/quotes");
  };

  const submitQuoteRequest = () => {
    setSubmittedAt(new Date());
    setIsSubmitDoneOpen(true);
  };

  const closeSubmitDone = () => setIsSubmitDoneOpen(false);

  const goToQuoteList = () => {
    setIsSubmitDoneOpen(false);
    router.replace("/(shipper)/quotes");
  };

  const handleBottomBarLayout = (height: number) => {
    setBottomBarHeight((prev) => (prev === height ? prev : height));
  };

  const bottomBar =
    step === 1 ? (
      <View
        style={[styles.bottomBar, { paddingBottom: (insets?.bottom ?? 0) + 16 }]}
        onLayout={(e) => handleBottomBarLayout(e.nativeEvent.layout.height)}
      >
        <View style={styles.bottomSummary}>
          <AppText variant="caption" color="textMuted">
            다음 단계에서 화물/차량/옵션을 선택해요
          </AppText>
          <AppText variant="detail" weight="700" color="textSub" style={styles.bottomSummaryValue}>
            {draft?.startAddr && draft?.endAddr ? "경로 입력 완료" : "경로를 입력해주세요"}
          </AppText>
        </View>
        <AppButton title="다음" size="lg" style={styles.bottomActionButton} onPress={() => setStep(2)} />
      </View>
    ) : (
      <View
        style={[styles.bottomBarStack, { paddingBottom: (insets?.bottom ?? 0) + 16 }]}
        onLayout={(e) => handleBottomBarLayout(e.nativeEvent.layout.height)}
      >
        <View style={styles.bottomSummary}>
          <AppText variant="caption" color="textMuted">
            예상 견적
          </AppText>
          <AppText variant="title" weight="800" color="brandPrimary" style={styles.bottomSummaryValue}>
            {formatKrw(pricing?.finalPrice ?? 0)}
          </AppText>
        </View>
        <View style={styles.bottomActionGroup}>
          <AppButton title="이전" variant="secondary" size="lg" style={styles.bottomBackButton} onPress={() => setStep(1)} />
          <AppButton title="요청하기" size="lg" style={styles.bottomSubmitButton} onPress={submitQuoteRequest} />
        </View>
      </View>
    );

  return (
    <PageScaffold
      title="견적 요청"
      onPressBack={goBack}
      backgroundColor={theme.colors.bgMain}
      contentStyle={StyleSheet.flatten([styles.content, { paddingBottom: bottomBarHeight + 12 }])}
      bottomBar={bottomBar}
    >
      <View style={styles.stepBar}>
        <View style={[styles.stepPill, step === 1 ? styles.stepPillActive : undefined]}>
          <AppText variant="caption" weight="800" color={step === 1 ? "brandPrimary" : "textMuted"}>
            1. 운송정보 입력
          </AppText>
        </View>
        <View style={[styles.stepPill, step === 2 ? styles.stepPillActive : undefined]}>
          <AppText variant="caption" weight="800" color={step === 2 ? "brandPrimary" : "textMuted"}>
            2. 화물/차량/옵션 입력
          </AppText>
        </View>
      </View>

      {step === 1 ? <QuoteCreateStep1 /> : null}
      {step === 2 ? <QuoteCreateStep2 /> : null}

      <Modal visible={isSubmitDoneOpen} transparent animationType={Platform.OS === "ios" ? "fade" : "fade"} onRequestClose={closeSubmitDone}>
        <Pressable style={styles.requestModalOverlay} onPress={closeSubmitDone}>
          <Pressable style={styles.requestModalWrap} onPress={(e) => e.stopPropagation()}>
            <AppCard outlined elevated={false} style={styles.requestModalCard}>
              <View style={styles.requestModalIcon}>
                <Ionicons name="checkmark" size={28} color={theme.colors.brandPrimary} />
              </View>

              <AppText variant="title" weight="800" color="textMain" align="center">
                요청이 접수되었어요
              </AppText>
              <AppText variant="detail" color="textSub" align="center">
                견적 제안이 도착하면 내역 화면에서 바로 확인할 수 있어요.
              </AppText>

              <View style={styles.requestMetaBox}>
                <AppText variant="caption" weight="700" color="textMuted">
                  접수 시각
                </AppText>
                <AppText variant="detail" weight="700" color="textMain">
                  {submittedAt?.toLocaleString?.("ko-KR") ?? "-"}
                </AppText>
                <AppText variant="caption" color="textMuted">
                  예상 견적 {formatKrw(pricing?.finalPrice ?? 0)}
                </AppText>
              </View>

              <View style={styles.requestActions}>
                <AppButton title="내역 확인하기" size="lg" onPress={goToQuoteList} />
                <AppButton title="이 화면에서 계속 보기" variant="secondary" size="lg" onPress={closeSubmitDone} />
              </View>
            </AppCard>
          </Pressable>
        </Pressable>
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
