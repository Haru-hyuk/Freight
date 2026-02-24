import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import CounterOfferModal, { type CounterOfferSubmitPayload } from "@/features/matching/ui/CounterOfferModal";
import {
  acceptDriverMatch,
  getDriverMatchDetailBadges,
  postCounterOffer,
} from "@/features/matching/api";
import { normalizeDriverMatchStatus, toDriverMatchStatusLabel } from "@/features/matching/model/driverMatchStatus";
import { type MatchDetailRouteSnapshot, useMatchDetail } from "@/features/matching/model/useMatchDetail";
import { formatWorkMethodLabel } from "@/features/quote/model/workMethod";
import { safeNumber, safeString, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppEmptyState } from "@/shared/ui/kit/AppEmptyState";
import { AppErrorState } from "@/shared/ui/kit/AppErrorState";
import { AppSpinner } from "@/shared/ui/kit/AppSpinner";
import { AppText } from "@/shared/ui/kit/AppText";

type DriverMatchDetailPageProps = {
  matchId: number;
  routeSnapshot?: MatchDetailRouteSnapshot;
};

type ToastState = {
  visible: boolean;
  message: string;
};

const NETWORK_ERROR_TEXT = "네트워크 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.";
const TOAST_DURATION_MS = 2000;

const READY_ACTION_STATUSES = new Set(["READY", "OPEN", "NEGOTIATING"]);
const ASSIGNED_FLOW_STATUSES = new Set(["ACCEPTED", "ASSIGNED", "PICKUP", "TRANSIT", "DROPOFF"]);

function toPositiveInt(value: unknown): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toDisplayText(value: unknown, fallback = "-"): string {
  const text = toText(value);
  return text || fallback;
}

function formatDistanceText(value: unknown): string {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return "-";
  return `${parsed.toFixed(1)}km`;
}

function formatPriceText(value: unknown): string {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return "-";
  return `${Math.trunc(parsed).toLocaleString("ko-KR")}원`;
}

function formatDateTime(value: unknown): string {
  const raw = toText(value);
  if (!raw) return "-";

  const timestamp = Date.parse(raw);
  if (!Number.isFinite(timestamp)) return "-";

  const date = new Date(timestamp);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${month}/${day} ${hour}:${minute}`;
}

function normalizeVehicleType(value: unknown): string {
  const text = toText(value).toUpperCase();
  if (text === "TON_1") return "1톤";
  if (text === "TON_2_5") return "2.5톤";
  if (text === "TON_5") return "5톤";
  return toText(value) || "-";
}

function normalizeVehicleBodyType(value: unknown): string {
  const text = toText(value).toUpperCase();
  if (text === "CARGO") return "카고";
  if (text === "WING_BODY") return "윙바디";
  if (text === "TOP_CAR") return "탑차";
  return toText(value) || "-";
}

const useStyles = createThemedStyles((theme) => {
  const spacing = safeNumber(theme?.layout?.spacing?.base, 4);
  const cSurface = safeString(theme?.colors?.bgSurface, "#FFFFFF");
  const cSurfaceAlt = safeString(theme?.colors?.bgSurfaceAlt, "#F8FAFC");
  const cTextMain = safeString(theme?.colors?.textMain, "#111827");
  const cTextSub = safeString(theme?.colors?.textSub, "#334155");
  const cTextMuted = safeString(theme?.colors?.textMuted, "#64748B");
  const cBorder = safeString(theme?.colors?.borderDefault, "#E2E8F0");
  const cPrimary = safeString(theme?.colors?.brandPrimary, "#FF6A00");
  const cSuccess = safeString(theme?.colors?.semanticSuccess, "#10B981");
  const cInfo = safeString(theme?.colors?.semanticInfo, "#2563EB");
  const cDanger = safeString(theme?.colors?.semanticDanger, "#EF4444");

  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: cSurfaceAlt,
    },
    scrollContent: {
      paddingBottom: spacing * 24,
    },
    heroMap: {
      height: 248,
      backgroundColor: tint(cInfo, 0.09, cSurface),
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      overflow: "hidden",
    },
    heroGrid: {
      ...StyleSheet.absoluteFillObject,
      borderColor: tint(cInfo, 0.18, cBorder),
      borderWidth: 1,
      borderRadius: 24,
    },
    heroRoute: {
      position: "absolute",
      left: "20%",
      right: "22%",
      top: "36%",
      height: 2,
      backgroundColor: tint(cPrimary, 0.65, cPrimary),
      transform: [{ rotate: "-8deg" }],
    },
    heroDotStart: {
      position: "absolute",
      left: "16%",
      top: "42%",
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: cInfo,
    },
    heroDotEnd: {
      position: "absolute",
      right: "18%",
      top: "31%",
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: cPrimary,
    },
    heroLabelStart: {
      position: "absolute",
      left: "10%",
      top: "48%",
      color: cTextSub,
      fontSize: safeNumber(theme?.typography?.scale?.caption?.size, 12),
      lineHeight: safeNumber(theme?.typography?.scale?.caption?.lineHeight, 16),
      fontWeight: "700",
    },
    heroLabelEnd: {
      position: "absolute",
      right: "10%",
      top: "20%",
      color: cTextSub,
      fontSize: safeNumber(theme?.typography?.scale?.caption?.size, 12),
      lineHeight: safeNumber(theme?.typography?.scale?.caption?.lineHeight, 16),
      fontWeight: "700",
      textAlign: "right",
    },
    heroHeader: {
      position: "absolute",
      left: 0,
      right: 0,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing * 5,
    },
    heroHeaderCenter: {
      borderRadius: 999,
      backgroundColor: tint(cSurface, 0.85, cSurface),
      borderWidth: 1,
      borderColor: tint(cTextMain, 0.15, cBorder),
      minHeight: 34,
      paddingHorizontal: spacing * 3,
      alignItems: "center",
      justifyContent: "center",
      maxWidth: "52%",
    },
    heroHeaderTitle: {
      color: cTextMain,
      fontSize: safeNumber(theme?.typography?.scale?.detail?.size, 14) + 1,
      lineHeight: safeNumber(theme?.typography?.scale?.detail?.lineHeight, 20) + 2,
      fontWeight: "900",
    },
    iconCircleButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: tint(cTextMain, 0.15, cBorder),
      backgroundColor: tint(cSurface, 0.9, cSurface),
    },
    iconCircle: {
      fontSize: 18,
      color: cTextMain,
    },
    bodyWrap: {
      marginTop: -16,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      backgroundColor: cSurfaceAlt,
      paddingHorizontal: spacing * 5,
      paddingTop: spacing * 4,
      gap: spacing * 3,
    },
    badgeRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: spacing * 2,
    },
    badge: {
      minHeight: 28,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: spacing * 3,
      alignItems: "center",
      justifyContent: "center",
    },
    badgeText: {
      fontSize: safeNumber(theme?.typography?.scale?.caption?.size, 12) + 1,
      lineHeight: safeNumber(theme?.typography?.scale?.caption?.lineHeight, 16) + 2,
      fontWeight: "900",
    },
    summaryCard: {
      borderRadius: 16,
      padding: spacing * 4,
      gap: spacing * 3,
    },
    summaryTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: spacing * 2,
    },
    summaryPriceWrap: {
      gap: 4,
      flex: 1,
    },
    summaryLabel: {
      color: cTextMuted,
      fontSize: safeNumber(theme?.typography?.scale?.detail?.size, 14),
      lineHeight: safeNumber(theme?.typography?.scale?.detail?.lineHeight, 20),
      fontWeight: "700",
    },
    summaryPrice: {
      color: cTextMain,
      fontSize: safeNumber(theme?.typography?.scale?.display?.size, 28) + 2,
      lineHeight: safeNumber(theme?.typography?.scale?.display?.lineHeight, 36) + 2,
      fontWeight: "900",
      letterSpacing: -0.4,
    },
    summaryDistanceChip: {
      minHeight: 32,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: tint(cPrimary, 0.32, cBorder),
      backgroundColor: tint(cPrimary, 0.12, cSurface),
      paddingHorizontal: spacing * 3,
      alignItems: "center",
      justifyContent: "center",
    },
    summaryDistanceText: {
      color: cPrimary,
      fontSize: safeNumber(theme?.typography?.scale?.detail?.size, 14),
      lineHeight: safeNumber(theme?.typography?.scale?.detail?.lineHeight, 20),
      fontWeight: "900",
    },
    statusMeta: {
      color: cTextMuted,
      fontSize: safeNumber(theme?.typography?.scale?.caption?.size, 12) + 1,
      lineHeight: safeNumber(theme?.typography?.scale?.caption?.lineHeight, 16) + 2,
      fontWeight: "700",
    },
    specRow: {
      flexDirection: "row",
      alignItems: "stretch",
      gap: spacing * 2,
    },
    specCard: {
      flex: 1,
      borderRadius: 14,
      padding: spacing * 3,
      gap: spacing * 2,
      borderWidth: 1,
      borderColor: tint(cBorder, 0.9, cBorder),
    },
    specTitle: {
      color: cTextMain,
      fontSize: safeNumber(theme?.typography?.scale?.detail?.size, 14) + 1,
      lineHeight: safeNumber(theme?.typography?.scale?.detail?.lineHeight, 20) + 2,
      fontWeight: "900",
    },
    specItem: {
      gap: 2,
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
    timelineCard: {
      borderRadius: 16,
      padding: spacing * 4,
      gap: spacing * 3,
    },
    timelineTitle: {
      color: cTextMain,
      fontSize: safeNumber(theme?.typography?.scale?.heading?.size, 18),
      lineHeight: safeNumber(theme?.typography?.scale?.heading?.lineHeight, 26),
      fontWeight: "900",
    },
    timelineRow: {
      flexDirection: "row",
      alignItems: "stretch",
      gap: spacing * 2,
    },
    timelineRail: {
      width: 18,
      alignItems: "center",
    },
    timelineDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginTop: 7,
      backgroundColor: cBorder,
    },
    timelineDotStart: {
      backgroundColor: cInfo,
    },
    timelineDotEnd: {
      backgroundColor: cPrimary,
    },
    timelineLine: {
      width: 2,
      flex: 1,
      marginTop: 4,
      backgroundColor: tint(cTextMain, 0.12, cBorder),
    },
    timelineBody: {
      flex: 1,
      paddingBottom: spacing * 2,
      gap: spacing,
    },
    timelineLabel: {
      color: cTextMuted,
      fontSize: safeNumber(theme?.typography?.scale?.caption?.size, 12) + 1,
      lineHeight: safeNumber(theme?.typography?.scale?.caption?.lineHeight, 16) + 2,
      fontWeight: "800",
    },
    timelineAddress: {
      color: cTextMain,
      fontSize: safeNumber(theme?.typography?.scale?.detail?.size, 14) + 1,
      lineHeight: safeNumber(theme?.typography?.scale?.detail?.lineHeight, 20) + 2,
      fontWeight: "900",
    },
    copyButton: {
      alignSelf: "flex-start",
      minHeight: 28,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: tint(cTextMuted, 0.35, cBorder),
      backgroundColor: tint(cTextMain, 0.03, cSurface),
      paddingHorizontal: spacing * 2,
      alignItems: "center",
      justifyContent: "center",
    },
    copyButtonText: {
      color: cTextSub,
      fontSize: safeNumber(theme?.typography?.scale?.caption?.size, 12),
      lineHeight: safeNumber(theme?.typography?.scale?.caption?.lineHeight, 16),
      fontWeight: "700",
    },
    shipperCard: {
      borderRadius: 16,
      padding: spacing * 4,
      gap: spacing + 2,
    },
    shipperTitle: {
      color: cTextMain,
      fontSize: safeNumber(theme?.typography?.scale?.detail?.size, 14) + 1,
      lineHeight: safeNumber(theme?.typography?.scale?.detail?.lineHeight, 20) + 2,
      fontWeight: "900",
    },
    shipperText: {
      color: cTextSub,
      fontSize: safeNumber(theme?.typography?.scale?.detail?.size, 14),
      lineHeight: safeNumber(theme?.typography?.scale?.detail?.lineHeight, 20),
      fontWeight: "700",
    },
    bottomBar: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      borderTopWidth: 1,
      borderTopColor: cBorder,
      backgroundColor: cSurface,
      paddingHorizontal: spacing * 5,
      paddingTop: spacing * 3,
      zIndex: 20,
    },
    bottomActionRow: {
      flexDirection: "row",
      gap: spacing * 2,
    },
    offerButton: {
      flex: 1,
      minHeight: 56,
    },
    acceptButton: {
      flex: 1.35,
      minHeight: 56,
    },
    acceptedCta: {
      minHeight: 56,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: tint(cSuccess, 0.4, cBorder),
      backgroundColor: tint(cSuccess, 0.14, cSurface),
      paddingHorizontal: spacing * 4,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    acceptedCtaText: {
      color: cSuccess,
      fontSize: safeNumber(theme?.typography?.scale?.detail?.size, 14) + 1,
      lineHeight: safeNumber(theme?.typography?.scale?.detail?.lineHeight, 20) + 2,
      fontWeight: "900",
    },
    acceptedCtaIcon: {
      fontSize: 18,
      color: cSuccess,
    },
    waitingButton: {
      minHeight: 56,
      width: "100%",
    },
    toastWrap: {
      position: "absolute",
      left: 0,
      right: 0,
      alignItems: "center",
      zIndex: 30,
      pointerEvents: "none",
    },
    toastCard: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: tint(cTextMain, 0.35, cBorder),
      backgroundColor: cSurface,
      minHeight: 38,
      paddingHorizontal: spacing * 4,
      alignItems: "center",
      justifyContent: "center",
    },
    toastText: {
      color: cTextMain,
      fontSize: safeNumber(theme?.typography?.scale?.detail?.size, 14),
      lineHeight: safeNumber(theme?.typography?.scale?.detail?.lineHeight, 20),
      fontWeight: "800",
    },
    loadingWrap: {
      paddingTop: spacing * 6,
      paddingHorizontal: spacing * 5,
    },
    errorWrap: {
      paddingTop: spacing * 6,
      paddingHorizontal: spacing * 5,
    },
    emptyWrap: {
      paddingTop: spacing * 6,
      paddingHorizontal: spacing * 5,
    },
    badgeAi: {
      borderColor: tint(cInfo, 0.35, cBorder),
      backgroundColor: tint(cInfo, 0.12, cSurface),
    },
    badgeAiText: {
      color: cInfo,
    },
    badgeUrgent: {
      borderColor: tint(cDanger, 0.35, cBorder),
      backgroundColor: tint(cDanger, 0.12, cSurface),
    },
    badgeUrgentText: {
      color: cDanger,
    },
  });
});

export function DriverMatchDetailPage({ matchId, routeSnapshot }: DriverMatchDetailPageProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const styles = useStyles();
  const detail = useMatchDetail(matchId, routeSnapshot);

  const [isOfferOpen, setIsOfferOpen] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const [offerErrorMessage, setOfferErrorMessage] = useState<string | null>(null);
  const [bottomBarHeight, setBottomBarHeight] = useState(0);
  const [toast, setToast] = useState<ToastState>({ visible: false, message: "" });
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const spacing = safeNumber(theme?.layout?.spacing?.base, 4);
  const normalizedStatus = normalizeDriverMatchStatus(detail.match?.status);
  const statusLabel = toDriverMatchStatusLabel(detail.match?.status);

  const isReadyAction = READY_ACTION_STATUSES.has(normalizedStatus) && detail.match?.accepted !== true;
  const isAcceptedFlow = ASSIGNED_FLOW_STATUSES.has(normalizedStatus) || detail.match?.accepted === true;

  const badges = useMemo(() => getDriverMatchDetailBadges(detail.match), [detail.match]);

  const originAddress = toDisplayText(detail.quote?.originAddress);
  const destinationAddress = toDisplayText(detail.quote?.destinationAddress);
  const distanceText = formatDistanceText(detail.quote?.distanceKm);
  const loadMethod = toDisplayText(formatWorkMethodLabel(detail.quote?.loadMethod));
  const unloadMethod = toDisplayText(formatWorkMethodLabel(detail.quote?.unloadMethod));
  const cargoName = toDisplayText(detail.quote?.cargoName);
  const tonText = normalizeVehicleType(detail.quote?.vehicleType);
  const bodyText = normalizeVehicleBodyType(detail.quote?.vehicleBodyType);
  const vehicleText = [tonText, bodyText].filter((part) => part !== "-").join(" ") || "-";
  const requestedAtText = formatDateTime(detail.match?.createdAt);

  const priceValue = useMemo(() => {
    const finalPrice = Number(detail.quote?.finalPrice);
    const desiredPrice = Number(detail.quote?.desiredPrice);
    if (Number.isFinite(finalPrice) && finalPrice > 0) return finalPrice;
    if (Number.isFinite(desiredPrice) && desiredPrice > 0) return desiredPrice;
    return 0;
  }, [detail.quote?.desiredPrice, detail.quote?.finalPrice]);
  const priceText = formatPriceText(priceValue);

  const shipperName = toText(detail.quote?.senderName);
  const shipperPhone = toText(detail.quote?.senderPhone);
  const hasShipperBox = Boolean(shipperName || shipperPhone);

  const heroTitle = useMemo(() => {
    const safeMatchId = toPositiveInt(detail.match?.matchId);
    const safeQuoteId = toPositiveInt(detail.match?.quoteId);
    if (safeMatchId > 0) return `#${safeMatchId}`;
    if (safeQuoteId > 0) return `#Q${safeQuoteId}`;
    return "오더 상세";
  }, [detail.match?.matchId, detail.match?.quoteId]);

  const showToast = useCallback((message: string) => {
    const safeMessage = toText(message);
    if (!safeMessage) return;

    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    setToast({ visible: true, message: safeMessage });
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

  const copyAddress = useCallback(
    async (address: string) => {
      const safeAddress = toText(address);
      if (!safeAddress) {
        showToast("복사할 주소가 없습니다.");
        return;
      }

      try {
        await Clipboard.setStringAsync(safeAddress);
        showToast("주소를 복사했습니다.");
      } catch {
        showToast("주소 복사에 실패했습니다.");
      }
    },
    [showToast]
  );

  const handleAccept = useCallback(async () => {
    if (!isReadyAction || isAccepting) return;

    setIsAccepting(true);
    try {
      const result = await acceptDriverMatch(matchId);
      if (!result) {
        showToast(NETWORK_ERROR_TEXT);
        return;
      }

      showToast("배차를 수락했습니다.");
      await detail.refetch();
    } catch {
      showToast(NETWORK_ERROR_TEXT);
    } finally {
      setIsAccepting(false);
    }
  }, [detail, isAccepting, isReadyAction, matchId, showToast]);

  const handleSubmitOffer = useCallback(
    async (payload: CounterOfferSubmitPayload) => {
      if (isSubmittingOffer) return;

      setIsSubmittingOffer(true);
      setOfferErrorMessage(null);
      try {
        const result = await postCounterOffer(
          matchId,
          {
            proposedPrice: payload.amount,
            message: payload.message,
          },
          detail.quoteId
        );

        if (!result) {
          setOfferErrorMessage(NETWORK_ERROR_TEXT);
          return;
        }

        setIsOfferOpen(false);
        showToast("운임 제안을 전송했습니다.");
        await detail.refetch();
      } catch {
        setOfferErrorMessage(NETWORK_ERROR_TEXT);
      } finally {
        setIsSubmittingOffer(false);
      }
    },
    [detail, isSubmittingOffer, matchId, showToast]
  );

  const handlePressAssignedCta = useCallback(() => {
    showToast("운행 시작 기능은 준비 중입니다.");
  }, [showToast]);

  if (toPositiveInt(matchId) <= 0) {
    return (
      <View style={styles.root}>
        <View style={styles.emptyWrap}>
          <AppEmptyState title="유효한 오더 ID가 없습니다." description="목록에서 다시 선택해 주세요." />
        </View>
      </View>
    );
  }

  const bottomBar = (
    <View
      style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing * 2 }]}
      onLayout={(event) => setBottomBarHeight(event.nativeEvent.layout.height)}
    >
      {isReadyAction ? (
        <View style={styles.bottomActionRow}>
          <AppButton
            title="운임 제안"
            variant="secondary"
            style={styles.offerButton}
            disabled={isAccepting || isSubmittingOffer}
            onPress={() => {
              setOfferErrorMessage(null);
              setIsOfferOpen(true);
            }}
            textStyle={{ fontSize: 16, fontWeight: "900" }}
          />
          <AppButton
            title="배차 수락하기"
            variant="primary"
            loading={isAccepting}
            style={styles.acceptButton}
            disabled={isAccepting || isSubmittingOffer}
            onPress={() => {
              void handleAccept();
            }}
            textStyle={{ fontSize: 16, fontWeight: "900" }}
          />
        </View>
      ) : isAcceptedFlow ? (
        <Pressable style={styles.acceptedCta} onPress={handlePressAssignedCta}>
          <AppText style={styles.acceptedCtaText}>배차 완료 · 운행 준비 시작하기</AppText>
          <Ionicons name="arrow-forward" style={styles.acceptedCtaIcon} />
        </Pressable>
      ) : (
        <AppButton title="상태 확인 중" variant="secondary" disabled style={styles.waitingButton} />
      )}
    </View>
  );

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomBarHeight + spacing * 4 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroMap}>
          <View style={styles.heroGrid} />
          <View style={styles.heroRoute} />
          <View style={styles.heroDotStart} />
          <View style={styles.heroDotEnd} />
          <AppText style={styles.heroLabelStart}>출발</AppText>
          <AppText style={styles.heroLabelEnd}>도착</AppText>

          <View style={[styles.heroHeader, { paddingTop: insets.top + spacing * 2 }]}>
            <Pressable style={styles.iconCircleButton} onPress={() => router.back()}>
              <Ionicons name="chevron-back" style={styles.iconCircle} />
            </Pressable>

            <View style={styles.heroHeaderCenter}>
              <AppText style={styles.heroHeaderTitle} numberOfLines={1}>
                {heroTitle}
              </AppText>
            </View>

            <Pressable
              style={styles.iconCircleButton}
              onPress={() => {
                showToast("공유 기능은 준비 중입니다.");
              }}
            >
              <Ionicons name="share-social-outline" style={styles.iconCircle} />
            </Pressable>
          </View>
        </View>

        <View style={styles.bodyWrap}>
          {detail.isLoading ? (
            <View style={styles.loadingWrap}>
              <AppSpinner label="오더 상세를 불러오는 중입니다." />
            </View>
          ) : detail.errorMessage ? (
            <View style={styles.errorWrap}>
              <AppErrorState
                title="오더 상세를 불러오지 못했어요"
                description={detail.errorMessage}
                retryLabel="다시 시도"
                onRetry={() => {
                  void detail.refetch();
                }}
                fullScreen={false}
              />
            </View>
          ) : (
            <>
              {badges.length > 0 ? (
                <View style={styles.badgeRow}>
                  {badges.map((badge) => (
                    <View
                      key={badge.key}
                      style={[
                        styles.badge,
                        badge.key === "AI_RECOMMENDED" ? styles.badgeAi : styles.badgeUrgent,
                      ]}
                    >
                      <AppText
                        style={[
                          styles.badgeText,
                          badge.key === "AI_RECOMMENDED" ? styles.badgeAiText : styles.badgeUrgentText,
                        ]}
                      >
                        {badge.key === "AI_RECOMMENDED" ? `✨ ${badge.label}` : `🔥 ${badge.label}`}
                      </AppText>
                    </View>
                  ))}
                </View>
              ) : null}

              <AppCard outlined style={styles.summaryCard}>
                <View style={styles.summaryTop}>
                  <View style={styles.summaryPriceWrap}>
                    <AppText style={styles.summaryLabel}>예상 운임</AppText>
                    <AppText style={styles.summaryPrice}>{priceText}</AppText>
                  </View>
                  <View style={styles.summaryDistanceChip}>
                    <AppText style={styles.summaryDistanceText}>{distanceText}</AppText>
                  </View>
                </View>
                <AppText style={styles.statusMeta}>{`상태: ${statusLabel} · 요청시각: ${requestedAtText}`}</AppText>
              </AppCard>

              <View style={styles.specRow}>
                <AppCard elevated={false} style={styles.specCard}>
                  <AppText style={styles.specTitle}>차량 정보</AppText>
                  <View style={styles.specItem}>
                    <AppText style={styles.specLabel}>차종</AppText>
                    <AppText style={styles.specValue}>{vehicleText}</AppText>
                  </View>
                </AppCard>

                <AppCard elevated={false} style={styles.specCard}>
                  <AppText style={styles.specTitle}>화물 · 작업</AppText>
                  <View style={styles.specItem}>
                    <AppText style={styles.specLabel}>화물</AppText>
                    <AppText style={styles.specValue}>{cargoName}</AppText>
                  </View>
                  <View style={styles.specItem}>
                    <AppText style={styles.specLabel}>상하차</AppText>
                    <AppText style={styles.specValue}>{`${loadMethod} / ${unloadMethod}`}</AppText>
                  </View>
                </AppCard>
              </View>

              <AppCard outlined style={styles.timelineCard}>
                <AppText style={styles.timelineTitle}>운송 경로</AppText>

                <View style={styles.timelineRow}>
                  <View style={styles.timelineRail}>
                    <View style={[styles.timelineDot, styles.timelineDotStart]} />
                    <View style={styles.timelineLine} />
                  </View>
                  <View style={styles.timelineBody}>
                    <AppText style={styles.timelineLabel}>출발지</AppText>
                    <AppText style={styles.timelineAddress}>{originAddress}</AppText>
                    <Pressable
                      style={styles.copyButton}
                      onPress={() => {
                        void copyAddress(originAddress);
                      }}
                    >
                      <AppText style={styles.copyButtonText}>주소 복사</AppText>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.timelineRow}>
                  <View style={styles.timelineRail}>
                    <View style={[styles.timelineDot, styles.timelineDotEnd]} />
                  </View>
                  <View style={styles.timelineBody}>
                    <AppText style={styles.timelineLabel}>도착지</AppText>
                    <AppText style={styles.timelineAddress}>{destinationAddress}</AppText>
                    <Pressable
                      style={styles.copyButton}
                      onPress={() => {
                        void copyAddress(destinationAddress);
                      }}
                    >
                      <AppText style={styles.copyButtonText}>주소 복사</AppText>
                    </Pressable>
                  </View>
                </View>
              </AppCard>

              {hasShipperBox ? (
                <AppCard outlined style={styles.shipperCard}>
                  <AppText style={styles.shipperTitle}>화주 정보</AppText>
                  {shipperName ? <AppText style={styles.shipperText}>{shipperName}</AppText> : null}
                  {shipperPhone ? <AppText style={styles.shipperText}>{shipperPhone}</AppText> : null}
                </AppCard>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>

      {bottomBar}

      {toast.visible ? (
        <View style={[styles.toastWrap, { bottom: insets.bottom + bottomBarHeight + spacing * 2 }]}>
          <View style={styles.toastCard}>
            <AppText style={styles.toastText}>{toast.message}</AppText>
          </View>
        </View>
      ) : null}

      <CounterOfferModal
        visible={isOfferOpen}
        isSubmitting={isSubmittingOffer}
        errorMessage={offerErrorMessage}
        onClose={() => {
          if (isSubmittingOffer) return;
          setIsOfferOpen(false);
          setOfferErrorMessage(null);
        }}
        onSubmit={handleSubmitOffer}
      />
    </View>
  );
}

export default DriverMatchDetailPage;
