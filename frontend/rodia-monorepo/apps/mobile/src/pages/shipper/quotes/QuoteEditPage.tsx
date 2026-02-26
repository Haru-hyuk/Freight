import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, type NavigationProp, type ParamListBase } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { QuoteDetailResponse } from "@/entities/quote/model/quote.types";
import { getShipperQuoteDetailByIdentifier, updateShipperQuote } from "@/features/quote/api/quote-api";
import { buildQuoteCreateRequest } from "@/features/quote/model/quoteCreateRequestMapper";
import { toDraftLoadMethod, toDraftUnloadMethod } from "@/features/quote/model/workMethod";
import {
  computeQuotePricing,
  createInitialQuoteCreateDraft,
  formatKrw,
  QuoteCreateDraftProvider,
  type QuoteCreateDraft,
  useQuoteCreateDraft,
} from "@/features/quote/model/quoteCreateDraft";
import QuoteCreateStep1 from "@/features/quote/ui/QuoteCreateStep1";
import QuoteCreateStep2 from "@/features/quote/ui/QuoteCreateStep2";
import QuoteCreateStep3 from "@/features/quote/ui/QuoteCreateStep3";
import { getQuoteFlatCardStyle, QUOTE_PROGRESS_TOKENS } from "@/features/quote/ui/QuoteCreateUiPrimitives";
import { estimateRouteKm, isValidCoord, type LatLng } from "@/shared/lib/geo/distance";
import { readApiErrorMessage } from "@/shared/lib/api/readApiErrorMessage";
import { safeNumber, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import type { AppTheme } from "@/shared/theme/types";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppRequestState } from "@/shared/ui/kit/AppRequestState";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

const QUOTE_STEP_ITEMS = [
  { step: 1 as const, label: "운송 경로" },
  { step: 2 as const, label: "화물 정보" },
  { step: 3 as const, label: "차량/옵션" },
];

function parseQuoteId(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function parseQuoteIdentifier(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" ? raw.trim() : "";
}

function toSafeNumber(value: unknown, fallback = 0): number {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function toSafeInt(value: unknown, fallback = 0): number {
  return Math.trunc(toSafeNumber(value, fallback));
}

function readDetailValue(source: QuoteDetailResponse, keys: string[]): string {
  const raw = source as unknown as Record<string, unknown>;
  for (const key of keys) {
    const value = String(raw?.[key] ?? "").trim();
    if (value) return value;
  }
  return "";
}

function resolveTonIndex(vehicleType: unknown): number {
  const normalized = String(vehicleType ?? "").trim().toUpperCase();
  if (normalized === "TON_2_5") return 1;
  if (normalized === "TON_5") return 2;
  return 0;
}

function resolveBodyIndex(vehicleBodyType: unknown): number {
  const normalized = String(vehicleBodyType ?? "").trim().toUpperCase();
  if (normalized === "WING_BODY") return 1;
  if (normalized === "TOP_CAR") return 2;
  return 0;
}

function toDraftDate(raw: unknown): Date {
  const value = new Date(String(raw ?? ""));
  if (Number.isFinite(value.getTime())) return value;
  return new Date();
}

function buildCargoFromDetail(detail: QuoteDetailResponse): QuoteCreateDraft["cargoList"] {
  const safeWeight = Math.max(0, Math.round(toSafeNumber(detail?.weightKg, 0)));
  const safeVolume = Math.max(0, toSafeNumber(detail?.volumeCbm, 0));
  const approxHeightCm = safeVolume > 0 ? Math.max(1, Math.round((safeVolume / 4) * 100)) : 0;

  return [
    {
      id: 1,
      itemCategory: "BOX",
      type: String(detail?.cargoName ?? "").trim() || "일반 화물",
      quantity: "1",
      lengthCm: approxHeightCm > 0 ? "200" : "",
      widthCm: approxHeightCm > 0 ? "200" : "",
      heightCm: approxHeightCm > 0 ? String(approxHeightCm) : "",
      weight: safeWeight > 0 ? String(safeWeight) : "",
      dropOffKey: "END",
    },
  ];
}

function mapDetailToDraft(detail: QuoteDetailResponse): QuoteCreateDraft {
  const base = createInitialQuoteCreateDraft();
  const createdDate = toDraftDate(detail?.createdAt);
  const updatedDate = toDraftDate(detail?.updatedAt);
  const senderName = readDetailValue(detail, ["senderName", "originContactName", "pickupContactName"]);
  const senderPhone = readDetailValue(detail, ["senderPhone", "originContactPhone", "pickupContactPhone"]);
  const receiverName = readDetailValue(detail, ["receiverName", "destinationContactName", "dropoffContactName"]);
  const receiverPhone = readDetailValue(detail, ["receiverPhone", "destinationContactPhone", "dropoffContactPhone"]);
  const originAddressDetail = readDetailValue(detail, [
    "originAddressDetail",
    "originDetailAddress",
    "originDetail",
    "startAddrDetail",
    "startAddressDetail",
  ]);
  const destinationAddressDetail = readDetailValue(detail, [
    "destinationAddressDetail",
    "destinationDetailAddress",
    "destinationDetail",
    "endAddrDetail",
    "endAddressDetail",
  ]);
  const sortedStops = Array.isArray(detail?.stops)
    ? detail.stops
        .slice()
        .sort((a, b) => Math.max(1, toSafeInt(a?.seq, 0)) - Math.max(1, toSafeInt(b?.seq, 0)))
    : [];

  return {
    ...base,
    senderName,
    senderPhone,
    receiverName,
    receiverPhone,
    startAddr: String(detail?.originAddress ?? "").trim(),
    startAddrDetail: originAddressDetail,
    endAddr: String(detail?.destinationAddress ?? "").trim(),
    endAddrDetail: destinationAddressDetail,
    waypoints: sortedStops.map((stop, index) => ({
          id: index + 1,
          name: String(stop?.contactName ?? "").trim(),
          phone: String(stop?.contactPhone ?? "").trim(),
          addr: String(stop?.address ?? "").trim(),
          detail: "",
          lat: toSafeNumber(stop?.lat, 0),
          lng: toSafeNumber(stop?.lng, 0),
        })),
    loadMethod: toDraftLoadMethod(detail?.loadMethod),
    unloadMethod: toDraftUnloadMethod(detail?.unloadMethod),
    date: createdDate,
    time: updatedDate,
    truckId: (() => {
      const safeId = toSafeInt(detail?.truckId, 0);
      return safeId > 0 ? safeId : undefined;
    })(),
    originLat: toSafeNumber(detail?.originLat, 0),
    originLng: toSafeNumber(detail?.originLng, 0),
    destinationLat: toSafeNumber(detail?.destinationLat, 0),
    destinationLng: toSafeNumber(detail?.destinationLng, 0),
    distanceKm: Math.max(0, Math.trunc(toSafeNumber(detail?.distanceKm, 0))),
    cargoList: buildCargoFromDetail(detail),
    tonIdx: resolveTonIndex(detail?.vehicleType),
    typeIdx: resolveBodyIndex(detail?.vehicleBodyType),
    isFrozen: String(detail?.cargoType ?? "").trim().toUpperCase() === "FROZEN",
    isPool: Boolean(detail?.allowCombine),
    selectedOpts: [],
    budget: Math.max(0, toSafeInt(detail?.desiredPrice, 0)) > 0 ? String(Math.max(0, toSafeInt(detail?.desiredPrice, 0))) : "",
    noteToDriver: String(detail?.cargoDesc ?? ""),
  };
}

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
      position: "relative",
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
    stepItem: { alignItems: "center", zIndex: 1, gap: 6 },
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
    stepNum: { fontSize: 12, fontWeight: "700", color: c.textMuted },
    stepLabel: { fontSize: 11, fontWeight: "600", color: c.textMuted },
    stepLabelActive: { color: c.brandPrimary, fontWeight: "700" },
    bottomBar: {
      backgroundColor: c.bgSurface,
      borderTopWidth: 1,
      borderTopColor: c.borderDefault,
      paddingHorizontal: spacing * 5,
      paddingTop: spacing * 3,
    },
    bottomContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
    summaryBox: { flex: 1, justifyContent: "center" },
    summaryLabel: { fontSize: 11, color: c.textMuted, marginBottom: 2 },
    summaryMain: { fontSize: 13, fontWeight: "700", color: c.textSub },
    priceText: { fontSize: 18, fontWeight: "800", color: c.brandPrimary },
    btnGroup: { flexDirection: "row", gap: 10 },
    btnBack: { minHeight: safeNumber(theme.components.button.sizes.lg.minHeight, 52), minWidth: 88 },
    btnNext: { minHeight: safeNumber(theme.components.button.sizes.lg.minHeight, 52), minWidth: 136 },
    loadingWrap: {
      ...flatCard,
      marginHorizontal: spacing * 5,
      paddingVertical: spacing * 8,
      alignItems: "center",
      justifyContent: "center",
      gap: spacing * 2,
      backgroundColor: overlay,
    },
  });
});

function QuoteEditPageInner() {
  const theme = useAppTheme();
  const styles = useStyles();
  const router = useRouter();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const quoteIdentifier = parseQuoteIdentifier(params?.id);
  const quoteId = parseQuoteId(params?.id);

  const { draft, setDraft } = useQuoteCreateDraft();

  const [resolvedQuoteId, setResolvedQuoteId] = useState(0);
  const [resolvedQuoteIdentifier, setResolvedQuoteIdentifier] = useState("");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [bottomBarHeight, setBottomBarHeight] = useState(100);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pricing = useMemo(() => computeQuotePricing(draft), [draft]);

  const hasText = (v?: string) => (v ?? "").trim().length > 0;
  const parseQty = (v?: string) => parseInt((v ?? "").replace(/[^\d]/g, ""), 10) || 0;

  const isStep1Ready = useMemo(() => {
    return hasText(draft?.startAddr) && hasText(draft?.endAddr);
  }, [draft?.startAddr, draft?.endAddr]);

  const cargoList = draft?.cargoList ?? [];
  const validCargoCount = useMemo(() => {
    return cargoList.filter((cargo) => {
      const category = cargo?.itemCategory ?? "BOX";
      const hasName = category === "FURNITURE" ? hasText(cargo?.type) : true;
      return hasName && parseQty(cargo?.quantity) > 0;
    }).length;
  }, [cargoList]);
  const isStep2Ready = cargoList.length > 0 && validCargoCount === cargoList.length;

  const loadDetail = useCallback(async () => {
    const fallbackIdentifier = quoteIdentifier || (quoteId > 0 ? String(quoteId) : "");
    if (!fallbackIdentifier) {
      setErrorMessage("유효한 견적 식별자가 아닙니다.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const detail = await getShipperQuoteDetailByIdentifier(fallbackIdentifier);
      const safeQuoteId = Math.max(0, toSafeInt(detail?.quoteId, quoteId));
      const safeIdentifier =
        String(detail?.quotePublicId ?? fallbackIdentifier).trim() ||
        (safeQuoteId > 0 ? String(safeQuoteId) : fallbackIdentifier);

      setResolvedQuoteId(safeQuoteId);
      setResolvedQuoteIdentifier(safeIdentifier);
      setDraft(mapDetailToDraft(detail));
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message.trim()
          : "견적 상세를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, [quoteIdentifier, quoteId, setDraft]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const goBack = useCallback(() => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as 1 | 2);
      return;
    }

    if (navigation?.canGoBack?.()) {
      navigation.goBack();
      return;
    }

    const routeBackIdentifier =
      resolvedQuoteIdentifier ||
      quoteIdentifier ||
      (resolvedQuoteId > 0 ? String(resolvedQuoteId) : quoteId > 0 ? String(quoteId) : "");

    if (routeBackIdentifier) {
      router.replace({ pathname: "/(shipper)/quotes/[id]", params: { id: routeBackIdentifier } });
      return;
    }

    router.replace("/(shipper)/quotes");
  }, [navigation, quoteId, quoteIdentifier, resolvedQuoteId, resolvedQuoteIdentifier, router, step]);

  const submitQuoteUpdate = useCallback(async () => {
    if (isSubmitting) return;

    const targetQuoteId = resolvedQuoteId > 0 ? resolvedQuoteId : quoteId;
    if (!Number.isInteger(targetQuoteId) || targetQuoteId <= 0) {
      Alert.alert("견적 수정 실패", "유효한 견적 ID를 찾을 수 없습니다.");
      return;
    }

    const payload = buildQuoteCreateRequest(draft);
    let finalDistanceKm = Number.isFinite(payload?.distanceKm) ? Math.trunc(payload.distanceKm as number) : 0;

    if (finalDistanceKm < 1) {
      const points: LatLng[] = [];

      if (isValidCoord(payload?.originLat, payload?.originLng)) {
        points.push({
          lat: Number(payload?.originLat),
          lng: Number(payload?.originLng),
        });
      }

      const stops = Array.isArray(payload?.stops) ? payload.stops : [];
      for (const stop of stops) {
        const lat = (stop as { lat?: unknown })?.lat;
        const lng = (stop as { lng?: unknown })?.lng;
        if (!isValidCoord(lat, lng)) continue;

        points.push({
          lat: Number(lat),
          lng: Number(lng),
        });
      }

      if (isValidCoord(payload?.destinationLat, payload?.destinationLng)) {
        points.push({
          lat: Number(payload?.destinationLat),
          lng: Number(payload?.destinationLng),
        });
      }

      const estimatedKm = Math.round(estimateRouteKm(points));
      if (estimatedKm > 0) {
        finalDistanceKm = Math.max(1, estimatedKm);
      }
    }

    const finalPayload = {
      ...payload,
      ...(finalDistanceKm > 0 ? { distanceKm: finalDistanceKm } : {}),
    };

    // undefined 값 제거 (선택적 필드만 API로 전송)
    const cleanPayload = Object.fromEntries(
      Object.entries(finalPayload).filter(([, value]) => value !== undefined)
    ) as Record<string, unknown>;

    try {
      setIsSubmitting(true);
      const updatedDetail = await updateShipperQuote(targetQuoteId, cleanPayload as any);
      const nextQuoteId = Math.max(0, toSafeInt(updatedDetail?.quoteId, targetQuoteId));
      const nextIdentifier =
        String(updatedDetail?.quotePublicId ?? resolvedQuoteIdentifier ?? quoteIdentifier ?? "").trim() ||
        String(nextQuoteId > 0 ? nextQuoteId : targetQuoteId);

      setResolvedQuoteId(nextQuoteId > 0 ? nextQuoteId : targetQuoteId);
      setResolvedQuoteIdentifier(nextIdentifier);

      Alert.alert("견적 수정 완료", "견적 정보가 업데이트되었습니다.", [
        {
          text: "확인",
          onPress: () => {
            router.replace({
              pathname: "/(shipper)/quotes/[id]",
              params: { id: nextIdentifier, refreshedAt: String(Date.now()) },
            });
          },
        },
      ]);
    } catch (error) {
      Alert.alert("견적 수정 실패", readApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    draft,
    isSubmitting,
    quoteId,
    quoteIdentifier,
    resolvedQuoteId,
    resolvedQuoteIdentifier,
    router,
  ]);

  const handleNext = useCallback(async () => {
    if (step === 1 && !isStep1Ready) {
      Alert.alert("입력 확인", "출발지와 도착지를 입력해주세요.");
      return;
    }

    if (step === 2 && !isStep2Ready) {
      Alert.alert("입력 확인", "화물 정보를 입력해주세요.");
      return;
    }

    if (step < 3) {
      setStep((prev) => (prev + 1) as 2 | 3);
      return;
    }

    await submitQuoteUpdate();
  }, [isStep1Ready, isStep2Ready, step, submitQuoteUpdate]);

  const getBottomSummary = () => {
    if (step === 1) return isStep1Ready ? "경로 입력 완료" : "경로를 입력해주세요";
    if (step === 2) return `화물 ${validCargoCount}건 입력됨`;
    return `${pricing.vehicleName} ${pricing.typeName} · ${draft.isPool ? "합짐" : "독차"}`;
  };

  const getBottomPrice = () => {
    return formatKrw(pricing.finalPrice || pricing.basePrice);
  };

  const stepProgress = QUOTE_STEP_ITEMS.length > 1 ? ((step - 1) / (QUOTE_STEP_ITEMS.length - 1)) * 100 : 0;

  const bottomBar = isLoading || errorMessage ? null : (
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
            title={step === 3 ? "수정 저장" : "다음"}
            size="lg"
            style={styles.btnNext}
            onPress={handleNext}
            disabled={isSubmitting}
            loading={step === 3 && isSubmitting}
            right={
              step < 3 && !isSubmitting ? (
                <Ionicons name="arrow-forward" size={18} color={theme.colors.textOnBrand} />
              ) : undefined
            }
          />
        </View>
      </View>
    </View>
  );

  return (
    <PageScaffold
      title="견적 수정"
      onPressBack={goBack}
      backgroundColor={theme.colors.bgMain}
      scroll={false}
      contentStyle={StyleSheet.flatten([styles.content, { paddingBottom: bottomBarHeight + 20 }])}
      bottomBar={bottomBar}
    >
      <AppRequestState
        isLoading={isLoading}
        loadingLabel="견적 정보를 불러오는 중입니다."
        errorMessage={errorMessage}
        errorTitle="견적 정보를 불러오지 못했어요"
        retryLabel="다시 시도"
        onRetry={() => {
          void loadDetail();
        }}
        fullScreen={false}
      >
        <>
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
                );
              })}
            </View>
          </View>

          {step === 1 && <QuoteCreateStep1 />}
          {step === 2 && <QuoteCreateStep2 />}
          {step === 3 && <QuoteCreateStep3 />}
        </>
      </AppRequestState>
    </PageScaffold>
  );
}

export function QuoteEditPage() {
  return (
    <QuoteCreateDraftProvider>
      <QuoteEditPageInner />
    </QuoteCreateDraftProvider>
  );
}

export default QuoteEditPage;