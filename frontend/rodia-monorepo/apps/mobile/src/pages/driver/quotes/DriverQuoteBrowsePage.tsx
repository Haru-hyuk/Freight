import React, { useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { type DriverMatchItem, listOpenDriverMatches } from "@/features/matching/api";
import { cacheDriverMatches } from "@/features/matching/model/driverMatchMockStore";
import { toDriverMatchStatusLabel } from "@/features/matching/model/driverMatchStatus";
import { safeNumber, safeString, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppEmptyState } from "@/shared/ui/kit/AppEmptyState";
import { AppErrorState } from "@/shared/ui/kit/AppErrorState";
import { AppSpinner } from "@/shared/ui/kit/AppSpinner";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

const NETWORK_ERROR_TEXT = "네트워크 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.";

function formatDateTime(value: unknown): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return "-";

  const timestamp = Date.parse(text);
  if (!Number.isFinite(timestamp)) return "-";

  const date = new Date(timestamp);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${month}월 ${day}일 ${hour}:${minute}`;
}

function toAcceptedLabel(accepted: boolean | undefined): string {
  if (accepted === true) return "수락됨";
  if (accepted === false) return "미수락";
  return "-";
}

function buildDetailParams(match: DriverMatchItem): Record<string, string> {
  const params: Record<string, string> = { id: String(match.matchId), matchId: String(match.matchId) };

  if (typeof match.quoteId === "number" && match.quoteId > 0) {
    params.quoteId = String(match.quoteId);
  }
  if (typeof match.status === "string" && match.status.trim()) {
    params.status = match.status;
  }
  if (typeof match.createdAt === "string" && match.createdAt.trim()) {
    params.createdAt = match.createdAt;
  }
  if (typeof match.updatedAt === "string" && match.updatedAt.trim()) {
    params.updatedAt = match.updatedAt;
  }
  if (typeof match.accepted === "boolean") {
    params.accepted = match.accepted ? "true" : "false";
  }

  return params;
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

export function DriverQuoteBrowsePage() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useStyles();

  const [items, setItems] = useState<DriverMatchItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const backgroundColor = safeString(theme?.colors?.bgSurfaceAlt, "#F8FAFC");
  const textMain = safeString(theme?.colors?.textMain, "#111827");
  const textMuted = safeString(theme?.colors?.textMuted, "#64748B");

  const loadOpenMatches = async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const matches = await listOpenDriverMatches();
      setItems(matches);
      cacheDriverMatches(matches);
      setErrorMessage(null);
    } catch {
      setItems([]);
      setErrorMessage(NETWORK_ERROR_TEXT);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadOpenMatches("initial");
  }, []);

  const renderItem = ({ item }: { item: DriverMatchItem }) => {
    const statusLabel = toDriverMatchStatusLabel(item.status);
    const quoteId = typeof item.quoteId === "number" && item.quoteId > 0 ? `#${item.quoteId}` : "-";
    const createdAt = formatDateTime(item.createdAt);
    const updatedAt = formatDateTime(item.updatedAt);
    const acceptedLabel = toAcceptedLabel(item.accepted);

    return (
      <Pressable
        onPress={() => router.push({ pathname: "/(driver)/matches/[id]", params: buildDetailParams(item) })}
        style={({ pressed }) => (pressed ? styles.pressed : undefined)}
      >
        <AppCard outlined style={styles.card}>
          <View style={styles.headerRow}>
            <AppText variant="detail" weight="800" color={textMain}>
              {`오더 #${item.matchId}`}
            </AppText>
            <View style={styles.statusChip}>
              <AppText style={styles.statusChipText}>{statusLabel}</AppText>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <AppText style={styles.infoLabel}>견적 ID</AppText>
            <AppText variant="caption" color={textMuted} style={styles.infoValue}>
              {quoteId}
            </AppText>
          </View>
          <View style={styles.infoRow}>
            <AppText style={styles.infoLabel}>요청 시각</AppText>
            <AppText variant="caption" color={textMuted} style={styles.infoValue}>
              {createdAt}
            </AppText>
          </View>
          <View style={styles.infoRow}>
            <AppText style={styles.infoLabel}>최근 변경</AppText>
            <AppText variant="caption" color={textMuted} style={styles.infoValue}>
              {updatedAt}
            </AppText>
          </View>
          <View style={styles.infoRow}>
            <AppText style={styles.infoLabel}>수락 여부</AppText>
            <AppText variant="caption" color={textMuted} style={styles.infoValue}>
              {acceptedLabel}
            </AppText>
          </View>
        </AppCard>
      </Pressable>
    );
  };

  return (
    <PageScaffold title="오더" backgroundColor={backgroundColor} scroll={false}>
      {isLoading ? (
        <AppSpinner label="오픈 매칭 목록을 불러오는 중입니다." />
      ) : errorMessage ? (
        <AppErrorState
          title="오픈 매칭 목록을 불러오지 못했어요"
          description={errorMessage}
          retryLabel="다시 시도"
          onRetry={() => {
            void loadOpenMatches("initial");
          }}
          fullScreen={false}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.matchId)}
          renderItem={renderItem}
          ListEmptyComponent={<AppEmptyState title="오픈 매칭이 없습니다." description="새 오더가 등록되면 표시됩니다." />}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => {
                void loadOpenMatches("refresh");
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

export default DriverQuoteBrowsePage;
