import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";

import type { QuoteDetailResponse } from "@/entities/quote/model/quote.types";
import {
  createDriverCounterOffer,
  listDriverCounterOffersByQuote,
  normalizeCounterOfferStatus,
  type CounterOfferItem,
} from "@/features/counter-offer/api";
import {
  acceptDriverMatch,
  cancelDriverMatch,
  getDriverMatch,
  type DriverMatchItem,
} from "@/features/matching/api";
import { canDriverAcceptMatch, toDriverMatchStatusLabel } from "@/features/matching/model/driverMatchStatus";
import { getShipperQuoteDetail } from "@/features/quote/api";
import { safeNumber, safeString, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppEmptyState } from "@/shared/ui/kit/AppEmptyState";
import { AppErrorState } from "@/shared/ui/kit/AppErrorState";
import { AppInput } from "@/shared/ui/kit/AppInput";
import { AppSpinner } from "@/shared/ui/kit/AppSpinner";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

const NETWORK_ERROR_TEXT = "네트워크 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.";

type PendingAction = "accept" | "cancel" | "counter-offer" | null;

function formatPrice(value: unknown): string {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return "-";
  return `${Math.trunc(parsed).toLocaleString("ko-KR")}원`;
}

function formatDateTime(value: unknown): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return "-";

  const parsed = Date.parse(text);
  if (!Number.isFinite(parsed)) return "-";

  const date = new Date(parsed);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${month}월 ${day}일 ${hour}:${minute}`;
}

function toCounterOfferStatusLabel(status: string): string {
  const normalized = normalizeCounterOfferStatus(status);
  if (normalized === "PENDING" || normalized === "OPEN") return "대기";
  if (normalized.includes("ACCEPT")) return "수락됨";
  if (normalized.includes("REJECT")) return "거절됨";
  if (normalized.includes("CANCEL")) return "취소됨";
  return normalized;
}

const useStyles = createThemedStyles((theme) => {
  const spacing = safeNumber(theme?.layout?.spacing?.base, 4);
  const cBorder = safeString(theme?.colors?.borderDefault, "#E2E8F0");
  const cPrimary = safeString(theme?.colors?.brandPrimary, "#FF6A00");
  const cSurface = safeString(theme?.colors?.bgSurface, "#FFFFFF");
  const cMuted = safeString(theme?.colors?.textMuted, "#64748B");
  const cDanger = safeString(theme?.colors?.semanticDanger, "#EF4444");

  return StyleSheet.create({
    content: {
      paddingTop: spacing * 3,
      paddingBottom: spacing * 20,
      gap: spacing * 3,
    },
    card: {
      borderRadius: safeNumber(theme?.components?.card?.radius, 16),
      padding: spacing * 4,
      gap: spacing * 2,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing,
    },
    statusChip: {
      paddingHorizontal: spacing * 2,
      paddingVertical: spacing,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: tint(cPrimary, 0.25, cBorder),
      backgroundColor: tint(cPrimary, 0.08, cSurface),
    },
    statusChipText: {
      color: cPrimary,
      fontWeight: "800",
      fontSize: safeNumber(theme?.typography?.scale?.caption?.size, 12),
      lineHeight: safeNumber(theme?.typography?.scale?.caption?.lineHeight, 16),
    },
    routeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing,
    },
    routeText: {
      flex: 1,
    },
    infoRow: {
      minHeight: 20,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing * 2,
    },
    infoLabel: {
      color: cMuted,
      fontSize: safeNumber(theme?.typography?.scale?.caption?.size, 12),
      lineHeight: safeNumber(theme?.typography?.scale?.caption?.lineHeight, 16),
      fontWeight: "700",
    },
    infoValue: {
      flex: 1,
      textAlign: "right",
    },
    actionRow: {
      flexDirection: "row",
      gap: spacing * 2,
    },
    actionButton: {
      flex: 1,
      minHeight: 38,
    },
    divider: {
      height: 1,
      backgroundColor: tint(cBorder, 0.8, cBorder),
    },
    counterList: {
      gap: spacing * 2,
    },
    counterItem: {
      borderWidth: 1,
      borderColor: tint(cBorder, 0.9, cBorder),
      borderRadius: 12,
      padding: spacing * 2,
      gap: spacing,
      backgroundColor: tint(cSurface, 0.96, cSurface),
    },
    counterForm: {
      gap: spacing,
    },
    actionErrorText: {
      color: cDanger,
      fontSize: safeNumber(theme?.typography?.scale?.caption?.size, 12),
      lineHeight: safeNumber(theme?.typography?.scale?.caption?.lineHeight, 16),
      fontWeight: "700",
    },
  });
});

type DriverMatchDetailPageProps = {
  matchId: number;
};

export function DriverMatchDetailPage({ matchId }: DriverMatchDetailPageProps) {
  const theme = useAppTheme();
  const styles = useStyles();

  const [match, setMatch] = useState<DriverMatchItem | null>(null);
  const [quote, setQuote] = useState<QuoteDetailResponse | null>(null);
  const [counterOffers, setCounterOffers] = useState<CounterOfferItem[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const [lastSuccessMessage, setLastSuccessMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const [priceInput, setPriceInput] = useState("");
  const [messageInput, setMessageInput] = useState("");

  const backgroundColor = safeString(theme?.colors?.bgSurfaceAlt, "#F8FAFC");
  const textMain = safeString(theme?.colors?.textMain, "#111827");
  const textMuted = safeString(theme?.colors?.textMuted, "#64748B");

  const loadDetail = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (matchId <= 0) {
      setMatch(null);
      setQuote(null);
      setCounterOffers([]);
      setErrorMessage("유효한 오더 ID가 없습니다.");
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    if (mode === "refresh") {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const matchData = await getDriverMatch(matchId);
      if (!matchData) {
        setMatch(null);
        setQuote(null);
        setCounterOffers([]);
        setErrorMessage(null);
        return;
      }

      const quoteId = matchData.quoteId;
      const [quoteData, offers] = await Promise.all([
        quoteId > 0
          ? getShipperQuoteDetail(quoteId).catch(() => null)
          : Promise.resolve(null),
        quoteId > 0
          ? listDriverCounterOffersByQuote(quoteId).catch(() => [])
          : Promise.resolve([]),
      ]);

      setMatch(matchData);
      setQuote(quoteData);
      setCounterOffers(offers);
      setErrorMessage(null);
    } catch {
      setMatch(null);
      setQuote(null);
      setCounterOffers([]);
      setErrorMessage(NETWORK_ERROR_TEXT);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [matchId]);

  useEffect(() => {
    void loadDetail("initial");
  }, [loadDetail]);

  const runAccept = useCallback(async () => {
    if (!match || pendingAction !== null) return;

    setActionErrorMessage(null);
    setLastSuccessMessage(null);
    setPendingAction("accept");

    try {
      await acceptDriverMatch(match.matchId);
      await loadDetail("refresh");
      setLastSuccessMessage("수락이 완료되었습니다.");
    } catch {
      setActionErrorMessage(NETWORK_ERROR_TEXT);
    } finally {
      setPendingAction(null);
    }
  }, [loadDetail, match, pendingAction]);

  const runCancel = useCallback(async () => {
    if (!match || pendingAction !== null) return;

    setActionErrorMessage(null);
    setLastSuccessMessage(null);
    setPendingAction("cancel");

    try {
      await cancelDriverMatch(match.matchId);
      await loadDetail("refresh");
      setLastSuccessMessage("취소가 완료되었습니다.");
    } catch {
      setActionErrorMessage(NETWORK_ERROR_TEXT);
    } finally {
      setPendingAction(null);
    }
  }, [loadDetail, match, pendingAction]);

  const runCounterOfferSubmit = useCallback(async () => {
    if (!match || pendingAction !== null) return;
    if (match.quoteId <= 0) return;

    const proposedPrice = Number(priceInput);
    const hasPrice = Number.isFinite(proposedPrice) && Math.trunc(proposedPrice) > 0;
    const message = messageInput.trim();

    if (!hasPrice && !message) {
      setActionErrorMessage("금액 또는 사유를 입력해 주세요.");
      return;
    }

    setActionErrorMessage(null);
    setLastSuccessMessage(null);
    setPendingAction("counter-offer");

    try {
      await createDriverCounterOffer(match.quoteId, {
        proposedPrice: hasPrice ? Math.trunc(proposedPrice) : undefined,
        message: message || undefined,
      });
      await loadDetail("refresh");
      setPriceInput("");
      setMessageInput("");
      setLastSuccessMessage("역제안이 제출되었습니다.");
    } catch {
      setActionErrorMessage(NETWORK_ERROR_TEXT);
    } finally {
      setPendingAction(null);
    }
  }, [loadDetail, match, messageInput, pendingAction, priceInput]);

  const detailSummary = useMemo(() => {
    if (!match) return null;
    return {
      statusLabel: toDriverMatchStatusLabel(match.status),
      canAccept: canDriverAcceptMatch(match.status),
      canCancel: match.cancelable,
      requestedAt: formatDateTime(match.createdAt ?? quote?.createdAt),
      updatedAt: formatDateTime(match.updatedAt ?? quote?.updatedAt),
      amountText: formatPrice(quote?.finalPrice ?? quote?.desiredPrice),
      originAddress: quote?.originAddress || "-",
      destinationAddress: quote?.destinationAddress || "-",
      quoteIdText: match.quoteId > 0 ? `#${match.quoteId}` : "-",
      matchIdText: `#${match.matchId}`,
    };
  }, [match, quote?.createdAt, quote?.desiredPrice, quote?.destinationAddress, quote?.finalPrice, quote?.originAddress, quote?.updatedAt]);

  if (isLoading) {
    return (
      <PageScaffold title="오더 상세" backgroundColor={backgroundColor}>
        <AppSpinner label="오더 상세를 불러오는 중입니다." />
      </PageScaffold>
    );
  }

  if (errorMessage) {
    return (
      <PageScaffold title="오더 상세" backgroundColor={backgroundColor}>
        <AppErrorState
          title="오더 상세를 불러오지 못했어요"
          description={errorMessage}
          retryLabel="다시 시도"
          onRetry={() => {
            void loadDetail("initial");
          }}
          fullScreen={false}
        />
      </PageScaffold>
    );
  }

  if (!detailSummary || !match) {
    return (
      <PageScaffold title="오더 상세" backgroundColor={backgroundColor}>
        <AppEmptyState title="오더를 찾을 수 없습니다." description="목록에서 다시 선택해 주세요." />
      </PageScaffold>
    );
  }

  const isAcceptLoading = pendingAction === "accept";
  const isCancelLoading = pendingAction === "cancel";
  const isCounterOfferLoading = pendingAction === "counter-offer";
  const isActionPending = pendingAction !== null;

  return (
    <PageScaffold title="오더 상세" backgroundColor={backgroundColor} scroll={false}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              void loadDetail("refresh");
            }}
          />
        }
      >
        <AppCard outlined style={styles.card}>
          <View style={styles.headerRow}>
            <AppText variant="heading" weight="800" color={textMain}>
              {`오더 ${detailSummary.matchIdText}`}
            </AppText>
            <View style={styles.statusChip}>
              <AppText style={styles.statusChipText}>{detailSummary.statusLabel}</AppText>
            </View>
          </View>

          <View style={styles.routeRow}>
            <AppText variant="detail" weight="700" color={textMain} style={styles.routeText} numberOfLines={1}>
              {detailSummary.originAddress}
            </AppText>
            <AppText variant="caption" color={textMuted}>
              →
            </AppText>
            <AppText variant="detail" weight="700" color={textMain} style={styles.routeText} numberOfLines={1}>
              {detailSummary.destinationAddress}
            </AppText>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <AppText style={styles.infoLabel}>견적 ID</AppText>
            <AppText variant="caption" color={textMuted} style={styles.infoValue}>
              {detailSummary.quoteIdText}
            </AppText>
          </View>
          <View style={styles.infoRow}>
            <AppText style={styles.infoLabel}>요청 시각</AppText>
            <AppText variant="caption" color={textMuted} style={styles.infoValue}>
              {detailSummary.requestedAt}
            </AppText>
          </View>
          <View style={styles.infoRow}>
            <AppText style={styles.infoLabel}>최근 변경</AppText>
            <AppText variant="caption" color={textMuted} style={styles.infoValue}>
              {detailSummary.updatedAt}
            </AppText>
          </View>
          <View style={styles.infoRow}>
            <AppText style={styles.infoLabel}>금액</AppText>
            <AppText variant="caption" color={textMuted} style={styles.infoValue}>
              {detailSummary.amountText}
            </AppText>
          </View>

          <View style={styles.actionRow}>
            <AppButton
              title="배차 수락"
              variant="primary"
              style={styles.actionButton}
              onPress={() => {
                void runAccept();
              }}
              loading={isAcceptLoading}
              disabled={!detailSummary.canAccept || (isActionPending && !isAcceptLoading)}
            />
            <AppButton
              title="배차 취소"
              variant="destructive"
              style={styles.actionButton}
              onPress={() => {
                void runCancel();
              }}
              loading={isCancelLoading}
              disabled={!detailSummary.canCancel || (isActionPending && !isCancelLoading)}
            />
          </View>

          {actionErrorMessage ? (
            <AppText style={styles.actionErrorText}>{actionErrorMessage}</AppText>
          ) : null}
          {lastSuccessMessage ? (
            <AppText variant="caption" color={textMuted}>
              {lastSuccessMessage}
            </AppText>
          ) : null}
        </AppCard>

        {match.quoteId > 0 ? (
          <AppCard outlined style={styles.card}>
            <AppText variant="heading" weight="800" color={textMain}>
              역제안
            </AppText>

            {counterOffers.length > 0 ? (
              <View style={styles.counterList}>
                {counterOffers.map((offer) => (
                  <View key={offer.counterOfferId} style={styles.counterItem}>
                    <AppText variant="detail" weight="700" color={textMain}>
                      {`${formatPrice(offer.proposedPrice)} · ${toCounterOfferStatusLabel(offer.status)}`}
                    </AppText>
                    <AppText variant="caption" color={textMuted}>
                      {offer.message || "-"}
                    </AppText>
                    <AppText variant="caption" color={textMuted}>
                      {formatDateTime(offer.createdAt)}
                    </AppText>
                  </View>
                ))}
              </View>
            ) : (
              <AppText variant="caption" color={textMuted}>
                제출된 역제안이 없습니다.
              </AppText>
            )}

            <View style={styles.counterForm}>
              <AppInput
                label="역제안 금액"
                placeholder="예) 120000"
                value={priceInput}
                keyboardType="number-pad"
                onChangeText={(text) => {
                  setPriceInput(text.replace(/[^0-9]/g, ""));
                }}
              />
              <AppInput
                label="사유"
                placeholder="선택 입력"
                value={messageInput}
                onChangeText={setMessageInput}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              <AppButton
                title="역제안 제출"
                variant="primary"
                loading={isCounterOfferLoading}
                disabled={isActionPending && !isCounterOfferLoading}
                onPress={() => {
                  void runCounterOfferSubmit();
                }}
              />
            </View>
          </AppCard>
        ) : null}
      </ScrollView>
    </PageScaffold>
  );
}

export default DriverMatchDetailPage;
