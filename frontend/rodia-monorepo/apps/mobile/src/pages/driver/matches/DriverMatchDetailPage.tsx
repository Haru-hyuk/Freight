import React from "react";
import { Alert, Platform, ScrollView, StyleSheet, ToastAndroid, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import CounterOfferModal from "@/features/matching/ui/CounterOfferModal";
import {
  acceptDriverMatch,
  postCounterOffer,
} from "@/features/matching/api";
import {
  canDriverAcceptMatch,
  isDriverMatchTerminal,
  normalizeDriverMatchStatus,
  toDriverMatchStatusLabel,
} from "@/features/matching/model/driverMatchStatus";
import { type MatchDetailRouteSnapshot, useMatchDetail } from "@/features/matching/model/useMatchDetail";
import { formatWorkMethodLabel } from "@/features/quote/model/workMethod";
import { readApiErrorMessage } from "@/shared/lib/api/readApiErrorMessage";
import { safeNumber, safeString, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppEmptyState } from "@/shared/ui/kit/AppEmptyState";
import { AppRequestState } from "@/shared/ui/kit/AppRequestState";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

type DriverMatchDetailPageProps = {
  matchId: number;
  routeSnapshot?: MatchDetailRouteSnapshot;
};

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

function formatPrice(value: unknown): string {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return "-";
  return `${Math.trunc(amount).toLocaleString("ko-KR")}원`;
}

function formatDistance(value: unknown): string {
  const distance = Number(value);
  if (!Number.isFinite(distance) || distance <= 0) return "-";
  return `${distance.toFixed(1)}km`;
}

function normalizeEnumLabel(value: unknown, mapping: Record<string, string>, fallback = "-"): string {
  const text = toText(value);
  if (!text) return fallback;
  const upper = text.toUpperCase();
  return mapping[upper] ?? text;
}

function toVehicleTypeLabel(value: unknown): string {
  return normalizeEnumLabel(value, {
    TON_1: "1톤",
    TON_2_5: "2.5톤",
    TON_5: "5톤",
  });
}

function toVehicleBodyTypeLabel(value: unknown): string {
  return normalizeEnumLabel(value, {
    CARGO: "카고",
    WING_BODY: "윙바디",
    TOP_CAR: "탑차",
  });
}

function toCargoTypeLabel(value: unknown): string {
  return normalizeEnumLabel(value, {
    GENERAL: "일반",
    FROZEN: "냉동",
    REFRIGERATED: "냉장",
  });
}

function showToast(message: string) {
  const safeMessage = toText(message);
  if (!safeMessage) return;

  if (Platform.OS === "android") {
    ToastAndroid.show(safeMessage, ToastAndroid.SHORT);
    return;
  }

  Alert.alert("", safeMessage);
}

const ACTIVE_ASSIGN_STATUSES = new Set(["ASSIGNED", "ACCEPTED", "PICKUP", "TRANSIT", "DROPOFF"]);

const useStyles = createThemedStyles((theme) => {
  const spacing = safeNumber(theme?.layout?.spacing?.base, 4);
  const cBorder = safeString(theme?.colors?.borderDefault, "#E2E8F0");
  const cStrong = safeString(theme?.colors?.textMain, "#111827");
  const cSub = safeString(theme?.colors?.textSub, "#334155");
  const cMuted = safeString(theme?.colors?.textMuted, "#64748B");
  const cPrimary = safeString(theme?.colors?.brandPrimary, "#FF6A00");
  const cSurface = safeString(theme?.colors?.bgSurface, "#FFFFFF");

  return StyleSheet.create({
    scrollContent: {
      paddingTop: spacing * 3,
      paddingBottom: spacing * 8,
      gap: spacing * 3,
    },
    card: {
      borderRadius: safeNumber(theme?.components?.card?.radius, 16),
      padding: spacing * 4,
      gap: spacing * 3,
    },
    cardHeading: {
      color: cStrong,
      fontSize: safeNumber(theme?.typography?.scale?.heading?.size, 18) + 2,
      lineHeight: safeNumber(theme?.typography?.scale?.heading?.lineHeight, 26) + 2,
      fontWeight: "900",
    },

    statusRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing * 2,
    },
    statusChip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: tint(cPrimary, 0.2, cBorder),
      backgroundColor: tint(cPrimary, 0.08, cSurface),
      paddingVertical: spacing,
      paddingHorizontal: spacing * 2,
    },
    statusChipText: {
      color: cPrimary,
      fontSize: safeNumber(theme?.typography?.scale?.detail?.size, 14) + 1,
      lineHeight: safeNumber(theme?.typography?.scale?.detail?.lineHeight, 20) + 2,
      fontWeight: "900",
    },
    statusMeta: {
      color: cMuted,
      fontSize: safeNumber(theme?.typography?.scale?.detail?.size, 14),
      lineHeight: safeNumber(theme?.typography?.scale?.detail?.lineHeight, 20),
      fontWeight: "700",
    },
    routeRow: {
      flexDirection: "row",
      alignItems: "stretch",
      gap: spacing * 2,
    },
    routeRail: {
      width: 20,
      alignItems: "center",
    },
    routeDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginTop: 8,
      backgroundColor: cBorder,
    },
    routeDotStart: {
      backgroundColor: cStrong,
    },
    routeDotEnd: {
      backgroundColor: cPrimary,
    },
    routeLine: {
      width: 2,
      flex: 1,
      marginTop: 6,
      backgroundColor: tint(cStrong, 0.12, cBorder),
    },
    routeBody: {
      flex: 1,
      paddingBottom: spacing * 2,
    },
    routeLabel: {
      color: cMuted,
      fontSize: safeNumber(theme?.typography?.scale?.detail?.size, 14),
      lineHeight: safeNumber(theme?.typography?.scale?.detail?.lineHeight, 20),
      fontWeight: "800",
    },
    routeAddress: {
      color: cStrong,
      fontSize: safeNumber(theme?.typography?.scale?.heading?.size, 18) + 4,
      lineHeight: safeNumber(theme?.typography?.scale?.heading?.lineHeight, 26) + 4,
      fontWeight: "900",
      marginTop: 2,
    },

    priceWrap: {
      gap: spacing,
    },
    priceEyebrow: {
      color: cMuted,
      fontSize: safeNumber(theme?.typography?.scale?.detail?.size, 14),
      lineHeight: safeNumber(theme?.typography?.scale?.detail?.lineHeight, 20),
      fontWeight: "700",
    },
    priceText: {
      color: cStrong,
      fontSize: safeNumber(theme?.typography?.scale?.display?.size, 28) + 4,
      lineHeight: safeNumber(theme?.typography?.scale?.display?.lineHeight, 36) + 4,
      fontWeight: "900",
      letterSpacing: -0.4,
    },
    summaryRow: {
      minHeight: 32,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing * 2,
    },
    summaryLabel: {
      color: cMuted,
      fontSize: safeNumber(theme?.typography?.scale?.detail?.size, 14),
      lineHeight: safeNumber(theme?.typography?.scale?.detail?.lineHeight, 20),
      fontWeight: "700",
    },
    summaryValue: {
      color: cSub,
      fontSize: safeNumber(theme?.typography?.scale?.detail?.size, 14) + 1,
      lineHeight: safeNumber(theme?.typography?.scale?.detail?.lineHeight, 20) + 2,
      fontWeight: "800",
    },
    chipWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing * 2,
    },
    chip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: tint(cPrimary, 0.2, cBorder),
      backgroundColor: tint(cPrimary, 0.08, cSurface),
      paddingVertical: spacing + 1,
      paddingHorizontal: spacing * 3,
    },
    chipText: {
      color: cStrong,
      fontSize: safeNumber(theme?.typography?.scale?.detail?.size, 14) + 1,
      lineHeight: safeNumber(theme?.typography?.scale?.detail?.lineHeight, 20) + 2,
      fontWeight: "800",
    },

    bottomBar: {
      borderTopWidth: 1,
      borderTopColor: cBorder,
      backgroundColor: cSurface,
      paddingHorizontal: spacing * 5,
      paddingTop: spacing * 3,
    },
    actionRow: {
      flexDirection: "row",
      gap: spacing * 2,
    },
    actionButton: {
      minHeight: 56,
    },
    primaryAction: {
      flex: 1.4,
    },
    secondaryAction: {
      flex: 1,
    },
    statusOnlyButton: {
      minHeight: 56,
      width: "100%",
    },
    guideText: {
      color: cMuted,
      fontSize: safeNumber(theme?.typography?.scale?.caption?.size, 12) + 1,
      lineHeight: safeNumber(theme?.typography?.scale?.caption?.lineHeight, 16) + 2,
      fontWeight: "700",
      textAlign: "center",
      marginBottom: spacing * 2,
    },
  });
});

export function DriverMatchDetailPage({ matchId, routeSnapshot }: DriverMatchDetailPageProps) {
  const router = useRouter();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useStyles();

  const detail = useMatchDetail(matchId, routeSnapshot);

  const [isAccepting, setIsAccepting] = React.useState(false);
  const [isCounterOfferOpen, setIsCounterOfferOpen] = React.useState(false);
  const [isCounterSubmitting, setIsCounterSubmitting] = React.useState(false);
  const [counterErrorMessage, setCounterErrorMessage] = React.useState<string | null>(null);
  const [bottomBarHeight, setBottomBarHeight] = React.useState(0);

  const spacing = safeNumber(theme?.layout?.spacing?.base, 4);
  const backgroundColor = safeString(theme?.colors?.bgSurfaceAlt, "#F8FAFC");
  const normalizedStatus = normalizeDriverMatchStatus(detail.match?.status);
  const statusLabel = toDriverMatchStatusLabel(detail.match?.status);
  const canAccept = canDriverAcceptMatch(normalizedStatus);
  const canCounterOffer = !isDriverMatchTerminal(normalizedStatus) && detail.quoteId > 0;
  const isAssignedState = ACTIVE_ASSIGN_STATUSES.has(normalizedStatus);
  const matchMetaText = detail.match ? `#${detail.match.matchId}` : "";

  const desiredPrice = Number(detail.quote?.desiredPrice);
  const finalPrice = Number(detail.quote?.finalPrice);
  const displayPrice = finalPrice > 0 ? finalPrice : desiredPrice;

  const routeOrigin = toDisplayText(detail.quote?.originAddress);
  const routeDestination = toDisplayText(detail.quote?.destinationAddress);
  const distanceText = formatDistance(detail.quote?.distanceKm);
  const loadMethodText = toDisplayText(formatWorkMethodLabel(detail.quote?.loadMethod));
  const unloadMethodText = toDisplayText(formatWorkMethodLabel(detail.quote?.unloadMethod));
  const tonLabel = toVehicleTypeLabel(detail.quote?.vehicleType);
  const bodyLabel = toVehicleBodyTypeLabel(detail.quote?.vehicleBodyType);
  const cargoTypeLabel = toCargoTypeLabel(detail.quote?.cargoType);

  const chips = [
    tonLabel !== "-" ? `톤수 ${tonLabel}` : "",
    bodyLabel !== "-" ? `차종 ${bodyLabel}` : "",
    cargoTypeLabel !== "-" ? `화물 ${cargoTypeLabel}` : "",
  ].filter(Boolean);

  const handleAccept = async () => {
    if (!canAccept || isAccepting) return;

    setIsAccepting(true);
    try {
      const result = await acceptDriverMatch(matchId);
      if (!result) {
        Alert.alert("배차 수락 실패", "오더 상태를 갱신하지 못했습니다.");
        return;
      }

      showToast("배차 완료");
      router.replace("/(driver)/matches/me");
    } catch (error) {
      Alert.alert("배차 수락 실패", readApiErrorMessage(error, "배차 수락에 실패했습니다. 잠시 후 다시 시도해 주세요."));
    } finally {
      setIsAccepting(false);
    }
  };

  const submitCounterOffer = async (amount: number) => {
    if (!canCounterOffer || isCounterSubmitting) return;

    setCounterErrorMessage(null);
    setIsCounterSubmitting(true);
    try {
      const result = await postCounterOffer(matchId, { proposedPrice: amount }, detail.quoteId);
      if (!result) {
        setCounterErrorMessage("역제안을 전송할 수 없습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }

      showToast("운임 제안을 전송했습니다.");
      setIsCounterOfferOpen(false);
      await detail.refetch();
    } catch (error) {
      setCounterErrorMessage(readApiErrorMessage(error, "역제안 전송에 실패했습니다."));
    } finally {
      setIsCounterSubmitting(false);
    }
  };

  if (toPositiveInt(matchId) <= 0) {
    return (
      <PageScaffold
        title="오더 상세"
        backgroundColor={backgroundColor}
        onPressBack={() => router.back()}
        backLabel="이전"
      >
        <AppEmptyState title="유효한 오더 ID가 없습니다." description="목록에서 다시 선택해 주세요." />
      </PageScaffold>
    );
  }

  const bottomBar = (
    <View
      style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing * 2 }]}
      onLayout={(event) => setBottomBarHeight(event.nativeEvent.layout.height)}
    >
      {isAssignedState ? (
        <AppButton
          title="배차 진행 중"
          variant="secondary"
          disabled
          style={styles.statusOnlyButton}
          textStyle={{ fontSize: 16, fontWeight: "900" }}
        />
      ) : (
        <View style={styles.actionRow}>
          <AppButton
            title="이 오더 수행하기"
            variant="primary"
            loading={isAccepting}
            disabled={!canAccept || isAccepting}
            onPress={() => {
              void handleAccept();
            }}
            style={[styles.actionButton, styles.primaryAction]}
            textStyle={{ fontSize: 16, fontWeight: "900" }}
          />
          <AppButton
            title="운임 제안하기"
            variant="secondary"
            disabled={!canCounterOffer || isCounterSubmitting}
            onPress={() => {
              setCounterErrorMessage(null);
              setIsCounterOfferOpen(true);
            }}
            style={[styles.actionButton, styles.secondaryAction]}
            textStyle={{ fontSize: 16, fontWeight: "900" }}
          />
        </View>
      )}
    </View>
  );

  return (
    <>
      <PageScaffold
        title="오더 상세"
        backgroundColor={backgroundColor}
        scroll={false}
        onPressBack={() => router.back()}
        backLabel="이전"
        contentStyle={{ paddingBottom: bottomBarHeight + spacing * 3 }}
        bottomBar={bottomBar}
      >
        <AppRequestState
          isLoading={detail.isLoading}
          loadingLabel="오더 상세를 불러오는 중입니다."
          errorMessage={detail.errorMessage}
          errorTitle="오더 상세를 불러오지 못했어요"
          retryLabel="다시 시도"
          onRetry={() => {
            void detail.refetch();
          }}
          fullScreen={false}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <AppCard outlined style={styles.card}>
              <View style={styles.statusRow}>
                <AppText style={styles.cardHeading}>운송 경로</AppText>
                <View style={styles.statusChip}>
                  <AppText style={styles.statusChipText}>{statusLabel}</AppText>
                </View>
              </View>
              {matchMetaText ? <AppText style={styles.statusMeta}>{matchMetaText}</AppText> : null}

              <View style={styles.routeRow}>
                <View style={styles.routeRail}>
                  <View style={[styles.routeDot, styles.routeDotStart]} />
                  <View style={styles.routeLine} />
                </View>
                <View style={styles.routeBody}>
                  <AppText style={styles.routeLabel}>출발지</AppText>
                  <AppText style={styles.routeAddress}>{routeOrigin}</AppText>
                </View>
              </View>

              <View style={styles.routeRow}>
                <View style={styles.routeRail}>
                  <View style={[styles.routeDot, styles.routeDotEnd]} />
                </View>
                <View style={styles.routeBody}>
                  <AppText style={styles.routeLabel}>도착지</AppText>
                  <AppText style={styles.routeAddress}>{routeDestination}</AppText>
                </View>
              </View>
            </AppCard>

            <AppCard outlined style={styles.card}>
              <AppText style={styles.cardHeading}>수익/업무 요약</AppText>
              <View style={styles.priceWrap}>
                <AppText style={styles.priceEyebrow}>예상 운임</AppText>
                <AppText style={styles.priceText}>{formatPrice(displayPrice)}</AppText>
              </View>

              <View style={styles.summaryRow}>
                <AppText style={styles.summaryLabel}>운송 거리</AppText>
                <AppText style={styles.summaryValue}>{distanceText}</AppText>
              </View>
              <View style={styles.summaryRow}>
                <AppText style={styles.summaryLabel}>상차 방식</AppText>
                <AppText style={styles.summaryValue}>{loadMethodText}</AppText>
              </View>
              <View style={styles.summaryRow}>
                <AppText style={styles.summaryLabel}>하차 방식</AppText>
                <AppText style={styles.summaryValue}>{unloadMethodText}</AppText>
              </View>

              {chips.length > 0 ? (
                <View style={styles.chipWrap}>
                  {chips.map((chip) => (
                    <View key={chip} style={styles.chip}>
                      <AppText style={styles.chipText}>{chip}</AppText>
                    </View>
                  ))}
                </View>
              ) : null}
            </AppCard>
          </ScrollView>
        </AppRequestState>
      </PageScaffold>

      <CounterOfferModal
        visible={isCounterOfferOpen}
        isSubmitting={isCounterSubmitting}
        errorMessage={counterErrorMessage}
        onClose={() => {
          if (isCounterSubmitting) return;
          setIsCounterOfferOpen(false);
          setCounterErrorMessage(null);
        }}
        onSubmit={submitCounterOffer}
      />
    </>
  );
}

export default DriverMatchDetailPage;
