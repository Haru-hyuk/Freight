import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import CounterOfferModal, { type CounterOfferSubmitPayload } from "@/features/matching/ui/CounterOfferModal";
import { acceptDriverMatch, getDriverMatchDetailBadges, postCounterOffer } from "@/features/matching/api";
import { type MatchDetailRouteSnapshot, useMatchDetail } from "@/features/matching/model/useMatchDetail";
import { formatWorkMethodLabel } from "@/features/quote/model/workMethod";
import {
  DRIVER_CTA_ID,
  DRIVER_UI_STATE,
  getDriverBadge,
  getDriverCta,
  getDriverUiStateFromBackendStatus,
  normalizeStatus,
  type DriverUiState,
} from "@/shared/lib/policy";
import { formatDateTime, formatDistance, formatKrw } from "@/shared/lib/format/display";
import { safeNumber, safeString, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppErrorState } from "@/shared/ui/kit/AppErrorState";
import { AppSpinner } from "@/shared/ui/kit/AppSpinner";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

type DriverMatchDetailPageProps = {
  matchId: number;
  routeSnapshot?: MatchDetailRouteSnapshot;
};

type ActionMessage = {
  tone: "success" | "error";
  text: string;
};

const NETWORK_ERROR_TEXT = "네트워크 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.";

const READY_ACTION_UI_STATES = new Set<DriverUiState>([
  DRIVER_UI_STATE.READY_TO_ACCEPT,
  DRIVER_UI_STATE.NEGOTIATING,
]);

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

function normalizeVehicleType(value: unknown): string {
  const text = toText(value).toUpperCase();
  if (text === "TON_1") return "1톤";
  if (text === "TON_2_5") return "2.5톤";
  if (text === "TON_5") return "5톤";
  return toDisplayText(value);
}

function normalizeVehicleBodyType(value: unknown): string {
  const text = toText(value).toUpperCase();
  if (text === "CARGO") return "카고";
  if (text === "WING_BODY") return "윙바디";
  if (text === "TOP_CAR") return "탑차";
  return toDisplayText(value);
}

function formatMetric(value: unknown, unit: string, maximumFractionDigits = 0): string {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return "-";
  return `${parsed.toLocaleString("ko-KR", { maximumFractionDigits })}${unit}`;
}

const useStyles = createThemedStyles((theme) => {
  const spacing = safeNumber(theme?.layout?.spacing?.base, 4);
  const cSurface = safeString(theme?.colors?.bgSurface, "#FFFFFF");
  const cBorder = safeString(theme?.colors?.borderDefault, "#E2E8F0");
  const cTextMain = safeString(theme?.colors?.textMain, "#111827");
  const cTextSub = safeString(theme?.colors?.textSub, "#334155");
  const cTextMuted = safeString(theme?.colors?.textMuted, "#64748B");
  const cPrimary = safeString(theme?.colors?.brandPrimary, "#FF6A00");
  const cSuccess = safeString(theme?.colors?.semanticSuccess, "#059669");
  const cDanger = safeString(theme?.colors?.semanticDanger, "#EF4444");

  return StyleSheet.create({
    stateWrap: {
      paddingTop: spacing * 6,
    },
    content: {
      gap: spacing * 3,
      paddingBottom: spacing * 28,
    },

    statusRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing * 2,
    },
    statusBadge: {
      alignSelf: "flex-start",
      borderRadius: 999,
      paddingHorizontal: spacing * 3,
      paddingVertical: spacing + 2,
      borderWidth: 1,
      borderColor: "#A7F3D0",
      backgroundColor: "#ECFDF5",
    },
    statusBadgeText: {
      color: "#059669",
      fontSize: safeNumber(theme?.typography?.scale?.caption?.size, 12) + 1,
      lineHeight: safeNumber(theme?.typography?.scale?.caption?.lineHeight, 16) + 1,
      fontWeight: "900",
    },
    requestedAtText: {
      color: cTextMuted,
      fontSize: safeNumber(theme?.typography?.scale?.caption?.size, 12) + 1,
      lineHeight: safeNumber(theme?.typography?.scale?.caption?.lineHeight, 16) + 1,
      fontWeight: "700",
    },
    decorationRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing * 2,
      marginTop: spacing,
    },
    decorationBadge: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: tint(cPrimary, 0.28, cBorder),
      backgroundColor: tint(cPrimary, 0.1, cSurface),
      paddingHorizontal: spacing * 2,
      paddingVertical: 6,
    },
    decorationBadgeText: {
      color: cPrimary,
      fontSize: safeNumber(theme?.typography?.scale?.caption?.size, 12),
      lineHeight: safeNumber(theme?.typography?.scale?.caption?.lineHeight, 16),
      fontWeight: "800",
    },

    summaryCard: {
      padding: spacing * 4,
      borderRadius: 16,
      gap: spacing * 3,
    },
    summaryTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: spacing * 2,
    },
    summaryAmountWrap: {
      flex: 1,
      gap: 4,
    },
    summaryLabel: {
      color: cTextMuted,
      fontSize: safeNumber(theme?.typography?.scale?.detail?.size, 14),
      lineHeight: safeNumber(theme?.typography?.scale?.detail?.lineHeight, 20),
      fontWeight: "700",
    },
    summaryPrice: {
      color: cTextMain,
      fontSize: safeNumber(theme?.typography?.scale?.display?.size, 28),
      lineHeight: safeNumber(theme?.typography?.scale?.display?.lineHeight, 36),
      fontWeight: "900",
      letterSpacing: -0.4,
    },
    distanceChip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: tint(cPrimary, 0.3, cBorder),
      backgroundColor: tint(cPrimary, 0.1, cSurface),
      paddingHorizontal: spacing * 3,
      paddingVertical: spacing + 2,
      alignItems: "center",
      justifyContent: "center",
      minWidth: 78,
    },
    distanceChipText: {
      color: cPrimary,
      fontSize: safeNumber(theme?.typography?.scale?.detail?.size, 14),
      lineHeight: safeNumber(theme?.typography?.scale?.detail?.lineHeight, 20),
      fontWeight: "900",
    },
    summaryMeta: {
      color: cTextSub,
      fontSize: safeNumber(theme?.typography?.scale?.caption?.size, 12) + 1,
      lineHeight: safeNumber(theme?.typography?.scale?.caption?.lineHeight, 16) + 1,
      fontWeight: "700",
    },

    sectionCard: {
      padding: spacing * 4,
      borderRadius: 16,
      gap: spacing * 3,
    },
    sectionHeader: {
      gap: spacing * 2,
    },
    sectionTitle: {
      color: cTextMain,
      fontSize: safeNumber(theme?.typography?.scale?.heading?.size, 18),
      lineHeight: safeNumber(theme?.typography?.scale?.heading?.lineHeight, 26),
      fontWeight: "900",
    },
    sectionDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: tint(cBorder, 0.9, cBorder),
    },

    timelineItem: {
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
      backgroundColor: "#FF6A00",
    },
    timelineLine: {
      width: 2,
      flex: 1,
      marginTop: 4,
      backgroundColor: cBorder,
    },
    timelineBody: {
      flex: 1,
      gap: 4,
      paddingBottom: spacing * 2,
    },
    timelineLabel: {
      color: cTextMuted,
      fontSize: safeNumber(theme?.typography?.scale?.caption?.size, 12) + 1,
      lineHeight: safeNumber(theme?.typography?.scale?.caption?.lineHeight, 16) + 1,
      fontWeight: "800",
    },
    timelineAddress: {
      color: cTextMain,
      fontSize: safeNumber(theme?.typography?.scale?.detail?.size, 14) + 1,
      lineHeight: safeNumber(theme?.typography?.scale?.detail?.lineHeight, 20) + 1,
      fontWeight: "900",
    },

    infoRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: spacing * 2,
    },
    infoLabel: {
      color: cTextMuted,
      fontSize: safeNumber(theme?.typography?.scale?.detail?.size, 14),
      lineHeight: safeNumber(theme?.typography?.scale?.detail?.lineHeight, 20),
      fontWeight: "700",
      flex: 1,
    },
    infoValue: {
      color: cTextMain,
      fontSize: safeNumber(theme?.typography?.scale?.detail?.size, 14),
      lineHeight: safeNumber(theme?.typography?.scale?.detail?.lineHeight, 20),
      fontWeight: "800",
      flex: 1.2,
      textAlign: "right",
    },

    noteText: {
      color: cTextSub,
      fontSize: safeNumber(theme?.typography?.scale?.detail?.size, 14),
      lineHeight: safeNumber(theme?.typography?.scale?.detail?.lineHeight, 20) + 2,
      fontWeight: "700",
    },

    headerRefreshBtn: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 18,
    },

    bottomBar: {
      borderTopWidth: 1,
      borderTopColor: cBorder,
      backgroundColor: cSurface,
      paddingHorizontal: spacing * 5,
      paddingTop: spacing * 3,
      gap: spacing * 2,
    },
    bottomButtonRow: {
      flexDirection: "row",
      gap: spacing * 2,
    },
    actionButton: {
      flex: 1,
      minHeight: 56,
    },
    counterButton: {
      borderColor: cPrimary,
    },
    actionMessage: {
      fontSize: safeNumber(theme?.typography?.scale?.caption?.size, 12) + 1,
      lineHeight: safeNumber(theme?.typography?.scale?.caption?.lineHeight, 16) + 1,
      fontWeight: "800",
    },
    actionMessageSuccess: {
      color: cSuccess,
    },
    actionMessageError: {
      color: cDanger,
    },
    actionHint: {
      color: cTextMuted,
      fontSize: safeNumber(theme?.typography?.scale?.caption?.size, 12),
      lineHeight: safeNumber(theme?.typography?.scale?.caption?.lineHeight, 16),
      fontWeight: "700",
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [offerErrorMessage, setOfferErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<ActionMessage | null>(null);

  const spacing = safeNumber(theme?.layout?.spacing?.base, 4);
  const primaryColor = safeString(theme?.colors?.brandPrimary, "#FF6A00");

  const backendStatus = normalizeStatus(toText(detail.match?.status));
  const uiState = getDriverUiStateFromBackendStatus(backendStatus);
  const statusLabel = getDriverBadge(uiState).label;
  const ctaPolicy = getDriverCta(uiState, true);
  const decorations = useMemo(() => getDriverMatchDetailBadges(detail.match), [detail.match]);

  const isReadyAction =
    READY_ACTION_UI_STATES.has(uiState) &&
    detail.match?.accepted !== true &&
    (ctaPolicy.id === DRIVER_CTA_ID.ACCEPT_MATCH || ctaPolicy.id === DRIVER_CTA_ID.SEND_OFFER);

  const isAssignedCta = uiState === DRIVER_UI_STATE.ASSIGNED;

  const priceValue = useMemo(() => {
    const finalPrice = Number(detail.quote?.finalPrice);
    const desiredPrice = Number(detail.quote?.desiredPrice);
    if (Number.isFinite(finalPrice) && finalPrice > 0) return finalPrice;
    if (Number.isFinite(desiredPrice) && desiredPrice > 0) return desiredPrice;
    return 0;
  }, [detail.quote?.desiredPrice, detail.quote?.finalPrice]);

  const priceText = formatKrw(priceValue);
  const distanceText = formatDistance(detail.quote?.distanceKm);
  const requestedAtText = formatDateTime(detail.match?.createdAt);

  const vehicleTypeText = normalizeVehicleType(detail.quote?.vehicleType);
  const vehicleBodyText = normalizeVehicleBodyType(detail.quote?.vehicleBodyType);
  const loadMethodText = toDisplayText(formatWorkMethodLabel(detail.quote?.loadMethod));
  const unloadMethodText = toDisplayText(formatWorkMethodLabel(detail.quote?.unloadMethod));

  const noteItems = useMemo(() => {
    const notes: string[] = [];

    const cargoDesc = toText(detail.quote?.cargoDesc);
    if (cargoDesc) notes.push(cargoDesc);

    const sender = [toText(detail.quote?.senderName), toText(detail.quote?.senderPhone)].filter(Boolean).join(" / ");
    if (sender) notes.push(`발송자: ${sender}`);

    const receiver = [toText(detail.quote?.receiverName), toText(detail.quote?.receiverPhone)]
      .filter(Boolean)
      .join(" / ");
    if (receiver) notes.push(`수령자: ${receiver}`);

    const stopCount = Number(detail.quote?.stops?.length ?? 0);
    if (Number.isFinite(stopCount) && stopCount > 0) {
      notes.push(`경유지: ${stopCount.toLocaleString("ko-KR")}곳`);
    }

    return notes.length > 0 ? notes : ["요청 메모가 없습니다."];
  }, [
    detail.quote?.cargoDesc,
    detail.quote?.receiverName,
    detail.quote?.receiverPhone,
    detail.quote?.senderName,
    detail.quote?.senderPhone,
    detail.quote?.stops,
  ]);

  useEffect(() => {
    setActionMessage(null);
  }, [matchId]);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setActionMessage(null);
    try {
      await detail.refetch();
    } catch {
      setActionMessage({ tone: "error", text: NETWORK_ERROR_TEXT });
    } finally {
      setIsRefreshing(false);
    }
  }, [detail, isRefreshing]);

  const handleAccept = useCallback(async () => {
    if (!isReadyAction || isAccepting) return;

    setIsAccepting(true);
    setActionMessage(null);
    try {
      const result = await acceptDriverMatch(matchId);
      if (!result) {
        setActionMessage({ tone: "error", text: NETWORK_ERROR_TEXT });
        return;
      }

      setActionMessage({ tone: "success", text: "오더를 수락했습니다." });
      await detail.refetch();
    } catch {
      setActionMessage({ tone: "error", text: NETWORK_ERROR_TEXT });
    } finally {
      setIsAccepting(false);
    }
  }, [detail, isAccepting, isReadyAction, matchId]);

  const handleSubmitOffer = useCallback(
    async (payload: CounterOfferSubmitPayload) => {
      if (isSubmittingOffer) return;

      setIsSubmittingOffer(true);
      setOfferErrorMessage(null);
      setActionMessage(null);

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
        setActionMessage({ tone: "success", text: "역제안을 전송했습니다." });
        await detail.refetch();
      } catch {
        setOfferErrorMessage(NETWORK_ERROR_TEXT);
      } finally {
        setIsSubmittingOffer(false);
      }
    },
    [detail, isSubmittingOffer, matchId]
  );

  const handleOpenCounterOffer = useCallback(() => {
    if (!isReadyAction) {
      setActionMessage({ tone: "error", text: "현재 상태에서는 역제안을 진행할 수 없습니다." });
      return;
    }
    setOfferErrorMessage(null);
    setActionMessage(null);
    setIsOfferOpen(true);
  }, [isReadyAction]);

  const headerRight = (
    <Pressable
      style={styles.headerRefreshBtn}
      onPress={() => {
        void handleRefresh();
      }}
      disabled={isRefreshing}
    >
      <Ionicons name="refresh" size={22} color="#64748B" />
    </Pressable>
  );

  const bottomBar = (
    <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing * 2 }]}>
      {isAssignedCta ? (
        <AppButton
          title={ctaPolicy.label}
          variant={ctaPolicy.enabled ? "primary" : "secondary"}
          disabled={!ctaPolicy.enabled}
          onPress={ctaPolicy.enabled ? () => { router.push("/(driver)/run"); } : undefined}
          style={styles.actionButton}
          textStyle={{ fontSize: 16, fontWeight: "900" }}
        />
      ) : (
        <View style={styles.bottomButtonRow}>
          <AppButton
            title="역제안 하기"
            variant="secondary"
            style={[styles.actionButton, styles.counterButton]}
            disabled={!isReadyAction || isAccepting || isSubmittingOffer}
            onPress={handleOpenCounterOffer}
            textStyle={{ fontSize: 16, fontWeight: "900", color: primaryColor }}
          />
          <AppButton
            title="바로 수락하기"
            variant="primary"
            style={styles.actionButton}
            loading={isAccepting}
            disabled={!isReadyAction || isAccepting || isSubmittingOffer}
            onPress={() => {
              void handleAccept();
            }}
            textStyle={{ fontSize: 16, fontWeight: "900" }}
          />
        </View>
      )}

      {actionMessage ? (
        <AppText
          style={[
            styles.actionMessage,
            actionMessage.tone === "success" ? styles.actionMessageSuccess : styles.actionMessageError,
          ]}
        >
          {actionMessage.text}
        </AppText>
      ) : !isReadyAction && !isAssignedCta ? (
        <AppText style={styles.actionHint}>현재 상태에서는 제안/수락이 비활성화됩니다.</AppText>
      ) : null}
    </View>
  );

  if (toPositiveInt(matchId) <= 0) {
    return (
      <PageScaffold
        title="운송 상세"
        subtitle="운송 제안 및 정보 확인"
        scroll
        padding={20}
        onPressBack={() => router.back()}
        headerRight={headerRight}
      >
        <View style={styles.stateWrap}>
          <AppErrorState
            title="유효하지 않은 오더 ID입니다."
            description="목록에서 다시 선택해 주세요."
            retryLabel="목록으로"
            onRetry={() => router.back()}
            fullScreen={false}
          />
        </View>
      </PageScaffold>
    );
  }

  return (
    <>
      <PageScaffold
        title="운송 상세"
        subtitle="운송 제안 및 정보 확인"
        scroll
        padding={20}
        onPressBack={() => router.back()}
        headerRight={headerRight}
        bottomBar={bottomBar}
        backgroundColor={theme.colors?.bgSurfaceAlt}
      >
        {detail.isLoading ? (
          <View style={styles.stateWrap}>
            <AppSpinner label="운송 상세를 불러오는 중입니다." />
          </View>
        ) : detail.errorMessage ? (
          <View style={styles.stateWrap}>
            <AppErrorState
              title="운송 상세를 불러오지 못했습니다."
              description={detail.errorMessage}
              retryLabel="다시 시도"
              onRetry={() => {
                void handleRefresh();
              }}
              fullScreen={false}
            />
          </View>
        ) : (
          <View style={styles.content}>
            <View>
              <View style={styles.statusRow}>
                <View style={styles.statusBadge}>
                  <AppText style={styles.statusBadgeText}>{statusLabel}</AppText>
                </View>
                <AppText style={styles.requestedAtText}>{`요청 시각 ${requestedAtText}`}</AppText>
              </View>

              {decorations.length > 0 ? (
                <View style={styles.decorationRow}>
                  {decorations.map((badge) => (
                    <View key={badge.key} style={styles.decorationBadge}>
                      <AppText style={styles.decorationBadgeText}>{badge.label}</AppText>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            <AppCard outlined style={styles.summaryCard}>
              <View style={styles.summaryTop}>
                <View style={styles.summaryAmountWrap}>
                  <AppText style={styles.summaryLabel}>제안 운임</AppText>
                  <AppText style={styles.summaryPrice}>{priceText}</AppText>
                </View>
                <View style={styles.distanceChip}>
                  <AppText style={styles.distanceChipText}>{distanceText}</AppText>
                </View>
              </View>
              <AppText style={styles.summaryMeta}>{`상태: ${statusLabel}`}</AppText>
            </AppCard>

            <AppCard outlined style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <AppText style={styles.sectionTitle}>운송 경로</AppText>
                <View style={styles.sectionDivider} />
              </View>

              <View style={styles.timelineItem}>
                <View style={styles.timelineRail}>
                  <View style={styles.timelineDot} />
                  <View style={styles.timelineLine} />
                </View>
                <View style={styles.timelineBody}>
                  <AppText style={styles.timelineLabel}>출발지</AppText>
                  <AppText style={styles.timelineAddress}>{toDisplayText(detail.quote?.originAddress)}</AppText>
                </View>
              </View>

              <View style={styles.timelineItem}>
                <View style={styles.timelineRail}>
                  <View style={styles.timelineDot} />
                </View>
                <View style={styles.timelineBody}>
                  <AppText style={styles.timelineLabel}>도착지</AppText>
                  <AppText style={styles.timelineAddress}>{toDisplayText(detail.quote?.destinationAddress)}</AppText>
                </View>
              </View>
            </AppCard>

            <AppCard outlined style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <AppText style={styles.sectionTitle}>Vehicle Specs</AppText>
                <View style={styles.sectionDivider} />
              </View>

              <View style={styles.infoRow}>
                <AppText style={styles.infoLabel}>톤수</AppText>
                <AppText style={styles.infoValue}>{vehicleTypeText}</AppText>
              </View>
              <View style={styles.infoRow}>
                <AppText style={styles.infoLabel}>차체</AppText>
                <AppText style={styles.infoValue}>{vehicleBodyText}</AppText>
              </View>
              <View style={styles.infoRow}>
                <AppText style={styles.infoLabel}>중량</AppText>
                <AppText style={styles.infoValue}>{formatMetric(detail.quote?.weightKg, "kg", 0)}</AppText>
              </View>
              <View style={styles.infoRow}>
                <AppText style={styles.infoLabel}>용적</AppText>
                <AppText style={styles.infoValue}>{formatMetric(detail.quote?.volumeCbm, "cbm", 1)}</AppText>
              </View>
            </AppCard>

            <AppCard outlined style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <AppText style={styles.sectionTitle}>Load Info</AppText>
                <View style={styles.sectionDivider} />
              </View>

              <View style={styles.infoRow}>
                <AppText style={styles.infoLabel}>화물명</AppText>
                <AppText style={styles.infoValue}>{toDisplayText(detail.quote?.cargoName)}</AppText>
              </View>
              <View style={styles.infoRow}>
                <AppText style={styles.infoLabel}>상차 방식</AppText>
                <AppText style={styles.infoValue}>{loadMethodText}</AppText>
              </View>
              <View style={styles.infoRow}>
                <AppText style={styles.infoLabel}>하차 방식</AppText>
                <AppText style={styles.infoValue}>{unloadMethodText}</AppText>
              </View>
              <View style={styles.infoRow}>
                <AppText style={styles.infoLabel}>거리</AppText>
                <AppText style={styles.infoValue}>{distanceText}</AppText>
              </View>
              <View style={styles.infoRow}>
                <AppText style={styles.infoLabel}>운임</AppText>
                <AppText style={styles.infoValue}>{priceText}</AppText>
              </View>
            </AppCard>

            <AppCard outlined style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <AppText style={styles.sectionTitle}>Notes</AppText>
                <View style={styles.sectionDivider} />
              </View>
              {noteItems.map((item) => (
                <AppText key={item} style={styles.noteText}>
                  {`• ${item}`}
                </AppText>
              ))}
            </AppCard>
          </View>
        )}
      </PageScaffold>

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
    </>
  );
}

export default DriverMatchDetailPage;
