import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import type { CounterOfferResponse, MatchResponse, QuoteListResponse } from "@/shared/api/generated/schemas";
import {
  acceptMockFlowDriverMatch,
  advanceMockFlowMatchStatus,
  advanceMockFlowQuoteStatus,
  cancelMockFlowMatch,
  createMockFlowDriverCounterOffer,
  createMockFlowShipperMatch,
  listMockFlowDriverCounterOffersByQuote,
  listMockFlowShipperMatches,
  listMockFlowShipperQuotes,
  removeMockFlowCounterOffer,
  resetMockFlowState,
} from "@/shared/lib/mock-flow";
import { safeNumber } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppInput } from "@/shared/ui/kit/AppInput";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

type SnapshotState = {
  quotes: QuoteListResponse[];
  matches: MatchResponse[];
  offers: CounterOfferResponse[];
};

const MAX_PREVIEW_COUNT = 12;

function toPositiveInt(value: unknown): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

const useStyles = createThemedStyles((theme) => {
  const spacing = safeNumber(theme.layout.spacing.base, 4);
  return StyleSheet.create({
    content: {
      paddingTop: spacing * 2,
      paddingBottom: spacing * 10,
      gap: spacing * 3,
    },
    card: {
      padding: spacing * 3,
      gap: spacing * 2,
    },
    row: {
      flexDirection: "row",
      gap: spacing * 2,
    },
    col: {
      flex: 1,
    },
    helper: {
      color: theme.colors.textMuted,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "700",
    },
    sectionTitle: {
      color: theme.colors.textMain,
      fontSize: safeNumber(theme.typography.scale.detail.size, 14),
      lineHeight: safeNumber(theme.typography.scale.detail.lineHeight, 20),
      fontWeight: "900",
    },
    list: {
      gap: spacing,
    },
    itemPress: {
      borderWidth: 1,
      borderColor: theme.colors.borderDefault,
      borderRadius: safeNumber(theme.layout.radii.control, 10),
      paddingHorizontal: spacing * 2,
      paddingVertical: spacing * 2,
      backgroundColor: theme.colors.bgSurface,
    },
    itemText: {
      color: theme.colors.textSub,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "700",
    },
    emptyText: {
      color: theme.colors.textMuted,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "700",
    },
  });
});

export default function MockFlowControlPage() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useStyles();

  const [quoteIdInput, setQuoteIdInput] = useState("");
  const [matchIdInput, setMatchIdInput] = useState("");
  const [offerIdInput, setOfferIdInput] = useState("");
  const [offerAmountInput, setOfferAmountInput] = useState("");
  const [offerMessageInput, setOfferMessageInput] = useState("");
  const [statusText, setStatusText] = useState("ready");
  const [snapshot, setSnapshot] = useState<SnapshotState>({
    quotes: [],
    matches: [],
    offers: [],
  });

  const selectedQuoteId = toPositiveInt(quoteIdInput);

  const refreshSnapshot = useCallback(() => {
    const quotes = listMockFlowShipperQuotes().slice(0, MAX_PREVIEW_COUNT);
    const matches = listMockFlowShipperMatches().slice(0, MAX_PREVIEW_COUNT);
    const offers =
      selectedQuoteId > 0
        ? listMockFlowDriverCounterOffersByQuote(selectedQuoteId).slice(0, MAX_PREVIEW_COUNT)
        : [];
    setSnapshot({ quotes, matches, offers });
  }, [selectedQuoteId]);

  useEffect(() => {
    refreshSnapshot();
  }, [refreshSnapshot]);

  const runAction = useCallback(
    (label: string, action: () => unknown) => {
      try {
        const result = action();
        if (result === null) {
          setStatusText(`${label}: 대상 없음`);
        } else {
          setStatusText(`${label}: 완료`);
        }
        refreshSnapshot();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setStatusText(`${label}: 실패 (${message})`);
      }
    },
    [refreshSnapshot]
  );

  const ensureQuoteId = useCallback((): number => {
    const safeQuoteId = toPositiveInt(quoteIdInput);
    if (safeQuoteId > 0) return safeQuoteId;
    Alert.alert("입력 확인", "quoteId를 입력해 주세요.");
    return 0;
  }, [quoteIdInput]);

  const ensureMatchId = useCallback((): number => {
    const safeMatchId = toPositiveInt(matchIdInput);
    if (safeMatchId > 0) return safeMatchId;
    Alert.alert("입력 확인", "matchId를 입력해 주세요.");
    return 0;
  }, [matchIdInput]);

  const ensureOfferId = useCallback((): number => {
    const safeOfferId = toPositiveInt(offerIdInput);
    if (safeOfferId > 0) return safeOfferId;
    Alert.alert("입력 확인", "offerId를 입력해 주세요.");
    return 0;
  }, [offerIdInput]);

  const previewQuoteRows = useMemo(() => snapshot.quotes.slice(0, MAX_PREVIEW_COUNT), [snapshot.quotes]);
  const previewMatchRows = useMemo(() => snapshot.matches.slice(0, MAX_PREVIEW_COUNT), [snapshot.matches]);
  const previewOfferRows = useMemo(() => snapshot.offers.slice(0, MAX_PREVIEW_COUNT), [snapshot.offers]);

  return (
    <PageScaffold
      title="Mock Flow Control"
      backgroundColor={theme.colors.bgMain}
      onPressBack={() => router.back()}
      backLabel="Back"
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppCard outlined style={styles.card}>
          <AppText style={styles.sectionTitle}>상태</AppText>
          <AppText style={styles.helper}>{statusText}</AppText>
          <View style={styles.row}>
            <View style={styles.col}>
              <AppButton
                title="스냅샷 새로고침"
                variant="secondary"
                onPress={() => {
                  setStatusText("snapshot refreshed");
                  refreshSnapshot();
                }}
              />
            </View>
            <View style={styles.col}>
              <AppButton
                title="스토어 리셋"
                variant="destructive"
                onPress={() => {
                  runAction("스토어 리셋", () => {
                    resetMockFlowState();
                    return {};
                  });
                }}
              />
            </View>
          </View>
        </AppCard>

        <AppCard outlined style={styles.card}>
          <AppText style={styles.sectionTitle}>입력</AppText>
          <AppInput
            label="quoteId"
            placeholder="예: 5101"
            value={quoteIdInput}
            onChangeText={setQuoteIdInput}
            keyboardType="number-pad"
          />
          <AppInput
            label="matchId"
            placeholder="예: 7001"
            value={matchIdInput}
            onChangeText={setMatchIdInput}
            keyboardType="number-pad"
          />
          <AppInput
            label="offerId"
            placeholder="예: 9001"
            value={offerIdInput}
            onChangeText={setOfferIdInput}
            keyboardType="number-pad"
          />
          <AppInput
            label="offer amount"
            placeholder="예: 210000"
            value={offerAmountInput}
            onChangeText={setOfferAmountInput}
            keyboardType="number-pad"
          />
          <AppInput
            label="offer message"
            placeholder="역제안 메시지"
            value={offerMessageInput}
            onChangeText={setOfferMessageInput}
          />
        </AppCard>

        <AppCard outlined style={styles.card}>
          <AppText style={styles.sectionTitle}>액션</AppText>
          <View style={styles.row}>
            <View style={styles.col}>
              <AppButton
                title="배차 요청 생성"
                onPress={() => {
                  const quoteId = ensureQuoteId();
                  if (quoteId <= 0) return;
                  runAction("배차 요청 생성", () => createMockFlowShipperMatch({ quoteId }));
                }}
              />
            </View>
            <View style={styles.col}>
              <AppButton
                title="배차 수락"
                variant="secondary"
                onPress={() => {
                  const matchId = ensureMatchId();
                  if (matchId <= 0) return;
                  runAction("배차 수락", () => acceptMockFlowDriverMatch(matchId));
                }}
              />
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.col}>
              <AppButton
                title="배차 취소"
                variant="destructive"
                onPress={() => {
                  const matchId = ensureMatchId();
                  if (matchId <= 0) return;
                  runAction("배차 취소", () => cancelMockFlowMatch(matchId));
                }}
              />
            </View>
            <View style={styles.col}>
              <AppButton
                title="매칭 상태 다음"
                variant="secondary"
                onPress={() => {
                  const matchId = ensureMatchId();
                  if (matchId <= 0) return;
                  runAction("매칭 상태 단계 이동", () => advanceMockFlowMatchStatus(matchId));
                }}
              />
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.col}>
              <AppButton
                title="견적 상태 다음"
                variant="secondary"
                onPress={() => {
                  const quoteId = ensureQuoteId();
                  if (quoteId <= 0) return;
                  runAction("견적 상태 단계 이동", () => advanceMockFlowQuoteStatus(quoteId));
                }}
              />
            </View>
            <View style={styles.col}>
              <AppButton
                title="역제안 생성"
                onPress={() => {
                  const quoteId = ensureQuoteId();
                  if (quoteId <= 0) return;
                  const proposedPrice = toPositiveInt(offerAmountInput);
                  const message = offerMessageInput.trim();
                  if (proposedPrice <= 0 && !message) {
                    Alert.alert("입력 확인", "offer amount 또는 offer message를 입력해 주세요.");
                    return;
                  }
                  runAction("역제안 생성", () =>
                    createMockFlowDriverCounterOffer(quoteId, {
                      ...(proposedPrice > 0 ? { proposedPrice } : {}),
                      ...(message ? { message } : {}),
                    })
                  );
                }}
              />
            </View>
          </View>
          <AppButton
            title="역제안 삭제"
            variant="destructive"
            onPress={() => {
              const offerId = ensureOfferId();
              if (offerId <= 0) return;
              runAction("역제안 삭제", () => removeMockFlowCounterOffer(offerId));
            }}
          />
        </AppCard>

        <AppCard outlined style={styles.card}>
          <AppText style={styles.sectionTitle}>Quotes (tap to set quoteId)</AppText>
          <View style={styles.list}>
            {previewQuoteRows.length <= 0 ? (
              <AppText style={styles.emptyText}>quote data 없음</AppText>
            ) : (
              previewQuoteRows.map((quote) => (
                <Pressable
                  key={`quote-${quote.quoteId}`}
                  style={styles.itemPress}
                  onPress={() => {
                    setQuoteIdInput(String(quote.quoteId ?? ""));
                    setStatusText(`quoteId set: ${quote.quoteId ?? "-"}`);
                  }}
                >
                  <AppText style={styles.itemText}>
                    {`#${quote.quoteId ?? "-"} | ${quote.status ?? "-"} | ${quote.originAddress ?? "-"} -> ${quote.destinationAddress ?? "-"}`}
                  </AppText>
                </Pressable>
              ))
            )}
          </View>
        </AppCard>

        <AppCard outlined style={styles.card}>
          <AppText style={styles.sectionTitle}>Matches (tap to set matchId)</AppText>
          <View style={styles.list}>
            {previewMatchRows.length <= 0 ? (
              <AppText style={styles.emptyText}>match data 없음</AppText>
            ) : (
              previewMatchRows.map((match) => (
                <Pressable
                  key={`match-${match.matchId}`}
                  style={styles.itemPress}
                  onPress={() => {
                    setMatchIdInput(String(match.matchId ?? ""));
                    setStatusText(`matchId set: ${match.matchId ?? "-"}`);
                  }}
                >
                  <AppText style={styles.itemText}>
                    {`#${match.matchId ?? "-"} | quote:${match.quoteId ?? "-"} | ${match.status ?? "-"} | accepted:${match.accepted === true}`}
                  </AppText>
                </Pressable>
              ))
            )}
          </View>
        </AppCard>

        <AppCard outlined style={styles.card}>
          <AppText style={styles.sectionTitle}>Counter Offers (selected quoteId)</AppText>
          <View style={styles.list}>
            {selectedQuoteId <= 0 ? (
              <AppText style={styles.emptyText}>quoteId를 입력하면 역제안 목록이 표시됩니다.</AppText>
            ) : previewOfferRows.length <= 0 ? (
              <AppText style={styles.emptyText}>역제안 데이터 없음</AppText>
            ) : (
              previewOfferRows.map((offer) => (
                <Pressable
                  key={`offer-${offer.counterOfferId}`}
                  style={styles.itemPress}
                  onPress={() => {
                    setOfferIdInput(String(offer.counterOfferId ?? ""));
                    setStatusText(`offerId set: ${offer.counterOfferId ?? "-"}`);
                  }}
                >
                  <AppText style={styles.itemText}>
                    {`#${offer.counterOfferId ?? "-"} | status:${offer.status ?? "-"} | price:${offer.proposedPrice ?? 0}`}
                  </AppText>
                </Pressable>
              ))
            )}
          </View>
        </AppCard>
      </ScrollView>
    </PageScaffold>
  );
}
