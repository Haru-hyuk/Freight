import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import type { QuoteDetailResponse } from "@/entities/quote/model/quote.types";
import {
  createDriverCounterOffer,
  isCounterOfferPending,
  listMyDriverCounterOffersByQuotes,
  normalizeCounterOfferStatus,
  type CounterOfferItem,
} from "@/features/counter-offer/api";
import {
  acceptDriverMatch,
  cancelDriverMatch,
  listDriverMatches,
  type DriverMatchItem,
} from "@/features/matching/api";
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

type DriverOrderItem = {
  key: string;
  match: DriverMatchItem;
  quote: QuoteDetailResponse | null;
  counterOffers: CounterOfferItem[];
};

const DRIVER_COUNTER_OFFER_CREATE_ENABLED = true;

function toDisplayDash(value: unknown): string {
  const text = String(value ?? "").trim();
  return text || "-";
}

function formatPrice(value: unknown): string {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "-";
  return `${Math.max(0, Math.trunc(parsed)).toLocaleString("ko-KR")}원`;
}

function formatDateTimeOrDash(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "-";

  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) return "-";

  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${month}월 ${day}일 ${hour}:${minute}`;
}

function normalizeMatchStatus(status: string): string {
  const normalized = String(status ?? "").trim().toUpperCase();
  if (!normalized) return "UNKNOWN";
  if (normalized === "CANCELLED") return "CANCELED";
  return normalized;
}

function resolveMatchStatusLabel(status: string): string {
  const normalized = normalizeMatchStatus(status);
  if (normalized === "OPEN") return "요청 접수";
  if (normalized === "NEGOTIATING") return "협상 중";
  if (normalized === "ASSIGNED") return "배차 완료";
  if (normalized === "PICKUP") return "상차 중";
  if (normalized === "TRANSIT") return "운송 중";
  if (normalized === "DROPOFF") return "하차 완료";
  if (normalized === "CANCELED") return "취소됨";
  return normalized;
}

function resolveCounterOfferStatusLabel(status: string): string {
  const normalized = normalizeCounterOfferStatus(status);
  if (normalized === "PENDING") return "대기";
  if (normalized === "OPEN") return "대기";
  if (normalized === "NEGOTIATING") return "협상 중";
  if (normalized.includes("ACCEPT")) return "수락됨";
  if (normalized.includes("REJECT")) return "거절됨";
  if (normalized.includes("CANCEL")) return "취소됨";
  return normalized;
}

function canAcceptMatch(match: DriverMatchItem): boolean {
  const status = normalizeMatchStatus(match.status);
  if (status === "OPEN" || status === "NEGOTIATING") return true;
  return false;
}

function canCancelMatch(match: DriverMatchItem): boolean {
  return Boolean(match.cancelable) && Number.isInteger(match.matchId) && match.matchId > 0;
}

function readErrorMessage(error: unknown): string {
  const fallback = "네트워크 또는 요청 값을 확인해주세요.";
  if (!error || typeof error !== "object") return fallback;

  const e = error as {
    response?: { data?: { message?: unknown; error?: unknown } };
    message?: unknown;
  };

  const serverMessage = String(e.response?.data?.message ?? e.response?.data?.error ?? "").trim();
  if (serverMessage) return serverMessage;

  const localMessage = String(e.message ?? "").trim();
  if (localMessage) return localMessage;

  return fallback;
}

const useStyles = createThemedStyles((theme) => {
  const spacing = safeNumber(theme?.layout?.spacing?.base, 4);
  const cBorder = safeString(theme?.colors?.borderDefault, "#E2E8F0");
  const cSurface = safeString(theme?.colors?.bgSurface, "#FFFFFF");
  const cMuted = safeString(theme?.colors?.textMuted, "#64748B");
  const cPrimary = safeString(theme?.colors?.brandPrimary, "#FF6A00");

  return StyleSheet.create({
    content: {
      paddingTop: spacing * 3,
      paddingBottom: spacing * 20,
      gap: spacing * 3,
    },
    summaryCard: {
      padding: spacing * 4,
      borderRadius: safeNumber(theme?.components?.card?.radius, 16),
      gap: spacing * 2,
    },
    orderCard: {
      padding: spacing * 4,
      borderRadius: safeNumber(theme?.components?.card?.radius, 16),
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
      borderColor: tint(cPrimary, 0.3, cBorder),
      backgroundColor: tint(cPrimary, 0.08, cSurface),
    },
    statusChipText: {
      color: cPrimary,
      fontSize: safeNumber(theme?.typography?.scale?.caption?.size, 12),
      lineHeight: safeNumber(theme?.typography?.scale?.caption?.lineHeight, 16),
      fontWeight: "900",
    },
    routeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing,
    },
    routeText: {
      flex: 1,
    },
    divider: {
      height: 1,
      backgroundColor: tint(cBorder, 0.75, cBorder),
    },
    infoRow: {
      minHeight: 20,
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: spacing * 2,
    },
    infoLabel: {
      width: "34%",
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
    counterOfferListWrap: {
      gap: spacing * 2,
    },
    counterOfferCard: {
      borderWidth: 1,
      borderColor: tint(cBorder, 0.9, cBorder),
      borderRadius: 12,
      padding: spacing * 2,
      gap: spacing,
      backgroundColor: tint(cSurface, 0.95, cSurface),
    },
    counterOfferTitle: {
      color: cMuted,
    },
    muted: {
      color: cMuted,
    },
    counterForm: {
      gap: spacing,
    },
  });
});

export function DriverQuoteBrowsePage() {
  const theme = useAppTheme();
  const styles = useStyles();
  const isMountedRef = useRef(true);

  const [orders, setOrders] = useState<DriverOrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [matchPendingKey, setMatchPendingKey] = useState<string | null>(null);
  const [counterOfferPendingQuoteId, setCounterOfferPendingQuoteId] = useState<number | null>(null);
  const [priceByQuote, setPriceByQuote] = useState<Record<number, string>>({});
  const [messageByQuote, setMessageByQuote] = useState<Record<number, string>>({});

  const cBg = safeString(theme?.colors?.bgSurfaceAlt, "#F8FAFC");
  const cText = safeString(theme?.colors?.textMain, "#111827");
  const cSub = safeString(theme?.colors?.textSub, "#334155");

  const loadOrders = useCallback(async () => {
    if (!isMountedRef.current) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const matches = await listDriverMatches();
      const safeMatches = Array.isArray(matches) ? matches : [];
      const quoteIds = Array.from(
        new Set(
          safeMatches
            .map((item) => (Number.isInteger(item?.quoteId) && Number(item.quoteId) > 0 ? Number(item.quoteId) : 0))
            .filter((id) => id > 0)
        )
      ).slice(0, 30);

      const quotePairs = await Promise.all(
        quoteIds.map(async (quoteId) => {
          try {
            const detail = await getShipperQuoteDetail(quoteId);
            return [quoteId, detail] as const;
          } catch {
            return [quoteId, null] as const;
          }
        })
      );
      const quoteMap = new Map<number, QuoteDetailResponse | null>(quotePairs);

      const counterOfferGrouped = await listMyDriverCounterOffersByQuotes(quoteIds);

      const items: DriverOrderItem[] = safeMatches.map((match, index) => {
        const quoteId = Number.isInteger(match?.quoteId) && Number(match.quoteId) > 0 ? Number(match.quoteId) : 0;
        const quote = quoteId > 0 ? quoteMap.get(quoteId) ?? null : null;
        const counterOffers = quoteId > 0 ? counterOfferGrouped[quoteId] ?? [] : [];

        return {
          key: `driver-order-${Number(match?.matchId ?? 0)}-${quoteId}-${index}`,
          match,
          quote,
          counterOffers,
        };
      });

      if (!isMountedRef.current) return;
      setOrders(items);
    } catch (error) {
      if (!isMountedRef.current) return;
      setOrders([]);
      setErrorMessage(readErrorMessage(error));
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    void loadOrders();

    return () => {
      isMountedRef.current = false;
    };
  }, [loadOrders]);

  const refreshAll = useCallback(async () => {
    await loadOrders();
  }, [loadOrders]);

  const handleAcceptMatch = useCallback(
    async (matchId: number) => {
      const safeMatchId = Number.isInteger(matchId) && matchId > 0 ? matchId : 0;
      if (safeMatchId <= 0) {
        Alert.alert("배차 수락 실패", "유효한 매칭 ID를 찾을 수 없습니다.");
        return;
      }

      const pendingKey = `accept:${safeMatchId}`;
      if (matchPendingKey !== null) return;

      try {
        setMatchPendingKey(pendingKey);
        await acceptDriverMatch(safeMatchId);
        await refreshAll();
        Alert.alert("배차 수락", "배차 요청을 수락했습니다.");
      } catch (error) {
        Alert.alert("배차 수락 실패", readErrorMessage(error));
      } finally {
        setMatchPendingKey(null);
      }
    },
    [matchPendingKey, refreshAll]
  );

  const handleCancelMatch = useCallback(
    async (matchId: number) => {
      const safeMatchId = Number.isInteger(matchId) && matchId > 0 ? matchId : 0;
      if (safeMatchId <= 0) {
        Alert.alert("배차 취소 실패", "유효한 매칭 ID를 찾을 수 없습니다.");
        return;
      }

      const pendingKey = `cancel:${safeMatchId}`;
      if (matchPendingKey !== null) return;

      try {
        setMatchPendingKey(pendingKey);
        await cancelDriverMatch(safeMatchId);
        await refreshAll();
        Alert.alert("배차 취소", "배차 요청을 취소했습니다.");
      } catch (error) {
        Alert.alert("배차 취소 실패", readErrorMessage(error));
      } finally {
        setMatchPendingKey(null);
      }
    },
    [matchPendingKey, refreshAll]
  );

  const handleSubmitCounterOffer = useCallback(
    async (quoteId: number) => {
      if (!DRIVER_COUNTER_OFFER_CREATE_ENABLED) return;

      const safeQuoteId = Number.isInteger(quoteId) && quoteId > 0 ? quoteId : 0;
      if (safeQuoteId <= 0) {
        Alert.alert("역제안 실패", "유효한 견적 ID를 찾을 수 없습니다.");
        return;
      }

      const proposedPrice = Number(priceByQuote[safeQuoteId] ?? 0);
      const message = String(messageByQuote[safeQuoteId] ?? "").trim();

      if (!Number.isFinite(proposedPrice) || Math.trunc(proposedPrice) <= 0) {
        Alert.alert("역제안 실패", "금액은 1원 이상 입력해주세요.");
        return;
      }

      if (message.length < 2) {
        Alert.alert("역제안 실패", "사유를 2자 이상 입력해주세요.");
        return;
      }

      if (counterOfferPendingQuoteId !== null) return;

      try {
        setCounterOfferPendingQuoteId(safeQuoteId);
        await createDriverCounterOffer(safeQuoteId, {
          proposedPrice: Math.trunc(proposedPrice),
          message,
        });
        await refreshAll();
        setPriceByQuote((prev) => ({ ...prev, [safeQuoteId]: "" }));
        setMessageByQuote((prev) => ({ ...prev, [safeQuoteId]: "" }));
        Alert.alert("역제안 제출", "역제안을 제출했습니다.");
      } catch (error) {
        Alert.alert("역제안 실패", readErrorMessage(error));
      } finally {
        setCounterOfferPendingQuoteId(null);
      }
    },
    [counterOfferPendingQuoteId, messageByQuote, priceByQuote, refreshAll]
  );

  const summaryText = useMemo(() => {
    const total = orders.length;
    if (total <= 0) return "표시할 오더가 없습니다.";
    const activeCounter = orders.reduce((acc, item) => {
      const list = Array.isArray(item.counterOffers) ? item.counterOffers : [];
      return acc + list.filter((offer) => isCounterOfferPending(offer.status)).length;
    }, 0);
    return `총 ${total}건 · 대기 중 역제안 ${activeCounter}건`;
  }, [orders]);

  return (
    <PageScaffold title="오더" backgroundColor={cBg} contentStyle={styles.content}>
      <AppCard outlined style={styles.summaryCard}>
        <AppText variant="heading" weight="800" color={cText}>
          기사 오더 현황
        </AppText>
        <AppText variant="detail" color={cSub}>
          {summaryText}
        </AppText>
      </AppCard>

      {isLoading ? (
        <AppSpinner label="기사 오더를 불러오는 중입니다." />
      ) : errorMessage ? (
        <AppErrorState
          title="오더를 불러오지 못했어요"
          description={errorMessage}
          retryLabel="다시 시도"
          onRetry={loadOrders}
          fullScreen={false}
        />
      ) : orders.length <= 0 ? (
        <AppEmptyState title="진행 가능한 오더가 없어요" description="배차 요청이 생성되면 이 화면에 표시됩니다." />
      ) : (
        orders.map((order) => {
          const match = order.match;
          const quote = order.quote;
          const quoteId = Number.isInteger(match?.quoteId) && Number(match.quoteId) > 0 ? Number(match.quoteId) : 0;
          const matchId = Number.isInteger(match?.matchId) && Number(match.matchId) > 0 ? Number(match.matchId) : 0;
          const canAccept = canAcceptMatch(match);
          const canCancel = canCancelMatch(match);
          const isAcceptLoading = matchPendingKey === `accept:${matchId}`;
          const isCancelLoading = matchPendingKey === `cancel:${matchId}`;
          const hasOtherMatchPending = matchPendingKey !== null && !isAcceptLoading && !isCancelLoading;

          const quoteCounterOffers = Array.isArray(order.counterOffers) ? order.counterOffers : [];
          const createDisabled = !DRIVER_COUNTER_OFFER_CREATE_ENABLED || counterOfferPendingQuoteId !== null;
          const createLoading = counterOfferPendingQuoteId === quoteId;

          return (
            <AppCard key={order.key} outlined style={styles.orderCard}>
              <View style={styles.headerRow}>
                <AppText variant="detail" weight="700" color={cText}>
                  {`견적 #${toDisplayDash(quoteId)}`}
                </AppText>
                <View style={styles.statusChip}>
                  <AppText style={styles.statusChipText}>{resolveMatchStatusLabel(match.status)}</AppText>
                </View>
              </View>

              <View style={styles.routeRow}>
                <AppText variant="body" weight="700" color={cText} style={styles.routeText}>
                  {toDisplayDash(quote?.originAddress)}
                </AppText>
                <AppText variant="caption" style={styles.muted}>
                  →
                </AppText>
                <AppText variant="body" weight="700" color={cText} style={styles.routeText}>
                  {toDisplayDash(quote?.destinationAddress)}
                </AppText>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <AppText style={styles.infoLabel}>요청 시각</AppText>
                <AppText variant="caption" style={[styles.infoValue, styles.muted]}>
                  {formatDateTimeOrDash(quote?.createdAt)}
                </AppText>
              </View>
              <View style={styles.infoRow}>
                <AppText style={styles.infoLabel}>차량/화물</AppText>
                <AppText variant="caption" style={[styles.infoValue, styles.muted]}>
                  {toDisplayDash(
                    quote ? `${toDisplayDash(quote.vehicleType)} ${toDisplayDash(quote.vehicleBodyType)} · ${toDisplayDash(quote.cargoName)}` : "-"
                  )}
                </AppText>
              </View>
              <View style={styles.infoRow}>
                <AppText style={styles.infoLabel}>거리/상태</AppText>
                <AppText variant="caption" style={[styles.infoValue, styles.muted]}>
                  {toDisplayDash(quote ? `${safeNumber(quote.distanceKm, 0).toFixed(1)}km · ${toDisplayDash(quote.status)}` : "-")}
                </AppText>
              </View>
              <View style={styles.infoRow}>
                <AppText style={styles.infoLabel}>화주 제안 금액</AppText>
                <AppText variant="caption" style={[styles.infoValue, styles.muted]}>
                  {formatPrice(quote?.desiredPrice)}
                </AppText>
              </View>
              <View style={styles.infoRow}>
                <AppText style={styles.infoLabel}>현재 금액</AppText>
                <AppText variant="caption" style={[styles.infoValue, styles.muted]}>
                  {formatPrice(quote?.finalPrice)}
                </AppText>
              </View>

              <View style={styles.actionRow}>
                <AppButton
                  title="배차 수락"
                  variant="primary"
                  style={styles.actionButton}
                  onPress={() => {
                    void handleAcceptMatch(matchId);
                  }}
                  loading={isAcceptLoading}
                  disabled={!canAccept || hasOtherMatchPending || isCancelLoading}
                />
                <AppButton
                  title="배차 취소"
                  variant="destructive"
                  style={styles.actionButton}
                  onPress={() => {
                    void handleCancelMatch(matchId);
                  }}
                  loading={isCancelLoading}
                  disabled={!canCancel || hasOtherMatchPending || isAcceptLoading}
                />
              </View>

              <View style={styles.divider} />

              <AppText variant="detail" weight="800" color={cText}>
                역제안 이력
              </AppText>
              {quoteCounterOffers.length > 0 ? (
                <View style={styles.counterOfferListWrap}>
                  {quoteCounterOffers.map((offer) => (
                    <View key={`driver-offer-${offer.counterOfferId}-${offer.createdAt}`} style={styles.counterOfferCard}>
                      <AppText variant="caption" weight="800" style={styles.counterOfferTitle}>
                        {`제안 ${formatPrice(offer.proposedPrice)} · ${resolveCounterOfferStatusLabel(offer.status)}`}
                      </AppText>
                      <AppText variant="caption" style={styles.muted}>
                        {`사유: ${toDisplayDash(offer.message)}`}
                      </AppText>
                      <AppText variant="caption" style={styles.muted}>
                        {`생성: ${formatDateTimeOrDash(offer.createdAt)}`}
                      </AppText>
                    </View>
                  ))}
                </View>
              ) : (
                <AppText variant="caption" style={styles.muted}>
                  표시할 역제안이 없습니다.
                </AppText>
              )}

              <View style={styles.counterForm}>
                <AppInput
                  label="역제안 금액"
                  placeholder="예) 120000"
                  value={priceByQuote[quoteId] ?? ""}
                  keyboardType="number-pad"
                  onChangeText={(text) => {
                    setPriceByQuote((prev) => ({ ...prev, [quoteId]: text.replace(/[^0-9]/g, "") }));
                  }}
                />
                <AppInput
                  label="역제안 사유"
                  placeholder="예) 야간 상차로 추가 비용 필요"
                  value={messageByQuote[quoteId] ?? ""}
                  onChangeText={(text) => {
                    setMessageByQuote((prev) => ({ ...prev, [quoteId]: text }));
                  }}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  maxLength={200}
                />

                <AppButton
                  title={DRIVER_COUNTER_OFFER_CREATE_ENABLED ? "역제안 제출" : "서버 명세 없음(역제안 생성 불가)"}
                  variant="primary"
                  onPress={() => {
                    void handleSubmitCounterOffer(quoteId);
                  }}
                  loading={createLoading}
                  disabled={createDisabled || !DRIVER_COUNTER_OFFER_CREATE_ENABLED}
                />
              </View>
            </AppCard>
          );
        })
      )}
    </PageScaffold>
  );
}

export default DriverQuoteBrowsePage;
