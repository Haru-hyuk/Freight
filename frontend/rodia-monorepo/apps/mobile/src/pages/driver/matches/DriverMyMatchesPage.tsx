import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import type { QuoteDetailResponse } from "@/entities/quote/model/quote.types";
import { listMyDriverMatches, type DriverMatchItem } from "@/features/matching/api";
import { toDriverMatchStatusLabel } from "@/features/matching/model/driverMatchStatus";
import { getShipperQuoteDetail } from "@/features/quote/api";
import { safeNumber, safeString, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppEmptyState } from "@/shared/ui/kit/AppEmptyState";
import { AppErrorState } from "@/shared/ui/kit/AppErrorState";
import { AppSpinner } from "@/shared/ui/kit/AppSpinner";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

const NETWORK_ERROR_TEXT = "네트워크 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.";

type MyMatchListItem = {
  match: DriverMatchItem;
  quote: QuoteDetailResponse | null;
};

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

const useStyles = createThemedStyles((theme) => {
  const spacing = safeNumber(theme?.layout?.spacing?.base, 4);
  const cBorder = safeString(theme?.colors?.borderDefault, "#E2E8F0");
  const cPrimary = safeString(theme?.colors?.brandPrimary, "#FF6A00");
  const cSurface = safeString(theme?.colors?.bgSurface, "#FFFFFF");
  const cMuted = safeString(theme?.colors?.textMuted, "#64748B");

  return StyleSheet.create({
    listContent: {
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
    divider: {
      height: 1,
      backgroundColor: tint(cBorder, 0.8, cBorder),
    },
    pressed: {
      opacity: 0.86,
    },
  });
});

export function DriverMyMatchesPage() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useStyles();

  const [items, setItems] = useState<MyMatchListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const backgroundColor = safeString(theme?.colors?.bgSurfaceAlt, "#F8FAFC");
  const textMain = safeString(theme?.colors?.textMain, "#111827");
  const textMuted = safeString(theme?.colors?.textMuted, "#64748B");

  const loadMyMatches = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const matches = await listMyDriverMatches();
      const quoteIds = Array.from(
        new Set(
          matches
            .map((item) => item.quoteId)
            .filter((quoteId) => Number.isInteger(quoteId) && quoteId > 0)
        )
      );

      const quotePairs = await Promise.all(
        quoteIds.map(async (quoteId) => {
          try {
            const quote = await getShipperQuoteDetail(quoteId);
            return [quoteId, quote] as const;
          } catch {
            return [quoteId, null] as const;
          }
        })
      );

      const quoteMap = new Map<number, QuoteDetailResponse | null>(quotePairs);
      const nextItems = matches.map((match) => ({
        match,
        quote: quoteMap.get(match.quoteId) ?? null,
      }));

      setItems(nextItems);
      setErrorMessage(null);
    } catch {
      setItems([]);
      setErrorMessage(NETWORK_ERROR_TEXT);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadMyMatches("initial");
  }, [loadMyMatches]);

  const renderItem = useCallback(
    ({ item }: { item: MyMatchListItem }) => {
      const statusLabel = toDriverMatchStatusLabel(item.match.status);
      const quote = item.quote;
      const matchId = item.match.matchId;
      const quoteId = item.match.quoteId;
      const amountText = formatPrice(quote?.finalPrice ?? quote?.desiredPrice);
      const updatedAt = formatDateTime(item.match.updatedAt ?? quote?.updatedAt);

      return (
        <Pressable
          onPress={() => router.push({ pathname: "/(driver)/run/[id]", params: { id: String(matchId) } })}
          style={({ pressed }) => (pressed ? styles.pressed : undefined)}
        >
          <AppCard outlined style={styles.card}>
            <View style={styles.headerRow}>
              <AppText variant="detail" weight="800" color={textMain}>
                {`오더 #${matchId}`}
              </AppText>
              <View style={styles.statusChip}>
                <AppText style={styles.statusChipText}>{statusLabel}</AppText>
              </View>
            </View>

            <View style={styles.routeRow}>
              <AppText variant="detail" weight="700" color={textMain} style={styles.routeText} numberOfLines={1}>
                {quote?.originAddress || "-"}
              </AppText>
              <AppText variant="caption" color={textMuted}>
                →
              </AppText>
              <AppText variant="detail" weight="700" color={textMain} style={styles.routeText} numberOfLines={1}>
                {quote?.destinationAddress || "-"}
              </AppText>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <AppText style={styles.infoLabel}>견적 ID</AppText>
              <AppText variant="caption" color={textMuted} style={styles.infoValue}>
                {quoteId > 0 ? `#${quoteId}` : "-"}
              </AppText>
            </View>
            <View style={styles.infoRow}>
              <AppText style={styles.infoLabel}>최근 변경</AppText>
              <AppText variant="caption" color={textMuted} style={styles.infoValue}>
                {updatedAt}
              </AppText>
            </View>
            <View style={styles.infoRow}>
              <AppText style={styles.infoLabel}>금액</AppText>
              <AppText variant="caption" color={textMuted} style={styles.infoValue}>
                {amountText}
              </AppText>
            </View>
          </AppCard>
        </Pressable>
      );
    },
    [router, styles.card, styles.divider, styles.headerRow, styles.infoLabel, styles.infoRow, styles.infoValue, styles.pressed, styles.routeRow, styles.routeText, styles.statusChip, styles.statusChipText, textMain, textMuted]
  );

  const emptyState = useMemo(
    () => <AppEmptyState title="내 매칭이 없습니다." description="오더를 수락하면 이 화면에 표시됩니다." />,
    []
  );

  return (
    <PageScaffold title="운행" backgroundColor={backgroundColor} scroll={false}>
      {isLoading ? (
        <AppSpinner label="내 매칭을 불러오는 중입니다." />
      ) : errorMessage ? (
        <AppErrorState
          title="내 매칭을 불러오지 못했어요"
          description={errorMessage}
          retryLabel="다시 시도"
          onRetry={() => {
            void loadMyMatches("initial");
          }}
          fullScreen={false}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.match.matchId)}
          renderItem={renderItem}
          ListEmptyComponent={emptyState}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => {
                void loadMyMatches("refresh");
              }}
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </PageScaffold>
  );
}

export default DriverMyMatchesPage;
