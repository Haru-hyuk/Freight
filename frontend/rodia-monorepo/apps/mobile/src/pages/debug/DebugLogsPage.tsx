// apps/mobile/src/pages/debug/DebugLogsPage.tsx
import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Redirect, useRouter } from "expo-router";

import { isApiDebugLogsEnabled } from "@/shared/lib/config/env";
import { debugLogStore, type DebugLogGroup, type DebugLogTag } from "@/shared/lib/debug/debugLogStore";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { safeNumber, tint } from "@/shared/theme/colorUtils";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppInput } from "@/shared/ui/kit/AppInput";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

type StatusFilter = "ALL" | "2XX" | "4XX" | "5XX" | "NETWORK_ERROR";
type SortMode = "LATEST" | "STATUS" | "TAG";

const TAGS: DebugLogTag[] = ["AUTH", "QUOTE", "MATCH", "OFFER", "NOTI", "UNKNOWN"];
const STATUS_FILTERS: StatusFilter[] = ["ALL", "2XX", "4XX", "5XX", "NETWORK_ERROR"];
const SORT_MODES: SortMode[] = ["LATEST", "STATUS", "TAG"];

function formatTime(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function formatStatus(status: number | "NETWORK_ERROR" | undefined): string {
  if (typeof status === "number") return String(status);
  return status ?? "-";
}

function formatDuration(value: number | undefined): string {
  return typeof value === "number" ? `${value}ms` : "-";
}

function phaseSymbol(phase: "request" | "response" | "error"): string {
  if (phase === "request") return "→";
  if (phase === "response") return "←";
  return "✕";
}

function groupTitle(group: DebugLogGroup): string {
  const method = (group.method ?? "").trim();
  const path = (group.path ?? group.url ?? "").trim();
  return [method, path].filter(Boolean).join(" ") || "UNKNOWN REQUEST";
}

function readText(input: unknown): string {
  if (typeof input === "string") return input;
  if (typeof input === "number" || typeof input === "boolean") return String(input);
  if (!input || typeof input !== "object") return "";

  const target = input as Record<string, unknown>;
  const candidates = [
    target.message,
    target.errorMessage,
    target.detail,
    target.reason,
    target.code,
    (target.error as Record<string, unknown> | undefined)?.message,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return "";
}

function matchesStatusFilter(status: number | "NETWORK_ERROR" | undefined, filter: StatusFilter): boolean {
  if (filter === "ALL") return true;
  if (filter === "NETWORK_ERROR") return status === "NETWORK_ERROR";
  if (typeof status !== "number") return false;
  if (filter === "2XX") return status >= 200 && status < 300;
  if (filter === "4XX") return status >= 400 && status < 500;
  return status >= 500 && status < 600;
}

function statusSortRank(status: number | "NETWORK_ERROR" | undefined): number {
  if (status === "NETWORK_ERROR") return 10_000;
  if (typeof status === "number") return status;
  return -1;
}

function toSearchIndex(group: DebugLogGroup): string {
  const base = [
    group.tag,
    group.method,
    group.path,
    group.url,
    formatStatus(group.status),
    readText(group.errorEntry?.error),
    readText(group.responseEntry?.response),
    group.requestId,
  ];
  return base
    .filter((v) => typeof v === "string" && v.trim().length > 0)
    .join(" ")
    .toLowerCase();
}

const useStyles = createThemedStyles((theme) => {
  const c = theme.colors;
  const spacing = safeNumber(theme.layout.spacing.base, 4);

  return StyleSheet.create({
    content: {
      paddingTop: spacing * 2,
      paddingHorizontal: spacing * 4,
      paddingBottom: spacing * 10,
      backgroundColor: c.bgMain,
      gap: spacing * 2,
    },

    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing * 2,
    },
    topButtons: {
      flexDirection: "row",
      gap: spacing,
    },
    hint: {
      color: c.textMuted,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "600",
    },

    chipSection: {
      gap: spacing,
    },
    chipTitle: {
      color: c.textSub,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "800",
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing,
    },
    chip: {
      paddingHorizontal: spacing * 2,
      paddingVertical: spacing,
      borderRadius: 999,
      borderWidth: 1,
    },
    chipText: {
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "800",
      letterSpacing: -0.2,
    },

    cardInner: {
      padding: spacing * 3,
      gap: spacing + 2,
    },
    row: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: spacing * 2,
    },
    left: {
      flex: 1,
      gap: 2,
    },
    meta: {
      color: c.textMuted,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "700",
    },
    title: {
      color: c.textMain,
      fontSize: safeNumber(theme.typography.scale.detail.size, 14),
      lineHeight: safeNumber(theme.typography.scale.detail.lineHeight, 20),
      fontWeight: "900",
      letterSpacing: -0.2,
    },
    timeline: {
      color: c.textSub,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "700",
    },
    message: {
      color: c.textMuted,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "600",
    },
    badge: {
      paddingHorizontal: spacing * 2,
      paddingVertical: spacing,
      borderRadius: 999,
      borderWidth: 1,
      alignSelf: "flex-start",
    },
    badgeText: {
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "900",
      letterSpacing: -0.2,
    },

    empty: {
      padding: spacing * 4,
      borderRadius: safeNumber(theme.layout.radii.card, 16),
      borderWidth: 1,
      borderColor: c.borderDefault,
      backgroundColor: c.bgSurface,
      gap: spacing,
    },
    emptyTitle: {
      color: c.textMain,
      fontSize: safeNumber(theme.typography.scale.detail.size, 14),
      lineHeight: safeNumber(theme.typography.scale.detail.lineHeight, 20),
      fontWeight: "900",
    },
    emptyDesc: {
      color: c.textMuted,
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "600",
    },
  });
});

export default function DebugLogsPage() {
  const styles = useStyles();
  const theme = useAppTheme();
  const router = useRouter();

  const enabled = isApiDebugLogsEnabled();
  if (!enabled) {
    return <Redirect href="/" />;
  }

  const [query, setQuery] = React.useState("");
  const [activeTag, setActiveTag] = React.useState<DebugLogTag | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("ALL");
  const [sortMode, setSortMode] = React.useState<SortMode>("LATEST");
  const [groups, setGroups] = React.useState<DebugLogGroup[]>(() => debugLogStore.getGroupSnapshot());

  React.useEffect(() => {
    return debugLogStore.subscribe(() => {
      setGroups(debugLogStore.getGroupSnapshot());
    });
  }, []);

  const filtered = React.useMemo(() => {
    const keyword = query.trim().toLowerCase();

    let next = groups.filter((group) => {
      if (activeTag !== "ALL" && group.tag !== activeTag) return false;
      if (!matchesStatusFilter(group.status, statusFilter)) return false;
      if (!keyword) return true;
      return toSearchIndex(group).includes(keyword);
    });

    if (sortMode === "STATUS") {
      next = next.slice().sort((a, b) => {
        const byStatus = statusSortRank(b.status) - statusSortRank(a.status);
        if (byStatus !== 0) return byStatus;
        return b.latestAt - a.latestAt;
      });
    } else if (sortMode === "TAG") {
      next = next.slice().sort((a, b) => {
        const byTag = a.tag.localeCompare(b.tag);
        if (byTag !== 0) return byTag;
        return b.latestAt - a.latestAt;
      });
    } else {
      next = next.slice().sort((a, b) => b.latestAt - a.latestAt);
    }

    return next;
  }, [activeTag, groups, query, sortMode, statusFilter]);

  const clearAll = React.useCallback(() => {
    debugLogStore.clear();
  }, []);

  return (
    <PageScaffold
      title="API Debug Logs"
      backgroundColor={theme.colors.bgMain}
      contentStyle={styles.content}
      onPressBack={() => router.back()}
      backLabel="이전"
      scroll={false}
    >
      <>
        <View style={styles.topRow}>
          <AppText style={styles.hint}>requestId 그룹 단위로 API 흐름(→/←/✕)을 확인합니다.</AppText>
          <View style={styles.topButtons}>
            <AppButton title="Mock Flow Control" variant="secondary" onPress={() => router.push("/mock-flow")} />
            <AppButton title="전체 삭제" variant="secondary" onPress={clearAll} />
          </View>
        </View>

        <AppInput
          placeholder="검색: url, method, status, message, tag"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={styles.chipSection}>
          <AppText style={styles.chipTitle}>Tag</AppText>
          <View style={styles.chipRow}>
            {(["ALL", ...TAGS] as Array<"ALL" | DebugLogTag>).map((tag) => {
              const active = activeTag === tag;
              return (
                <Pressable
                  key={tag}
                  onPress={() => setActiveTag(tag)}
                  style={[
                    styles.chip,
                    {
                      borderColor: theme.colors.borderDefault,
                      backgroundColor: active
                        ? tint(theme.colors.textMain, 0.08, theme.colors.bgSurface)
                        : theme.colors.bgSurface,
                    },
                  ]}
                >
                  <AppText style={[styles.chipText, { color: theme.colors.textMain }]}>{tag}</AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.chipSection}>
          <AppText style={styles.chipTitle}>Status</AppText>
          <View style={styles.chipRow}>
            {STATUS_FILTERS.map((item) => {
              const active = statusFilter === item;
              return (
                <Pressable
                  key={item}
                  onPress={() => setStatusFilter(item)}
                  style={[
                    styles.chip,
                    {
                      borderColor: theme.colors.borderDefault,
                      backgroundColor: active
                        ? tint(theme.colors.textMain, 0.08, theme.colors.bgSurface)
                        : theme.colors.bgSurface,
                    },
                  ]}
                >
                  <AppText style={[styles.chipText, { color: theme.colors.textMain }]}>{item}</AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.chipSection}>
          <AppText style={styles.chipTitle}>Sort</AppText>
          <View style={styles.chipRow}>
            {SORT_MODES.map((item) => {
              const active = sortMode === item;
              return (
                <Pressable
                  key={item}
                  onPress={() => setSortMode(item)}
                  style={[
                    styles.chip,
                    {
                      borderColor: theme.colors.borderDefault,
                      backgroundColor: active
                        ? tint(theme.colors.textMain, 0.08, theme.colors.bgSurface)
                        : theme.colors.bgSurface,
                    },
                  ]}
                >
                  <AppText style={[styles.chipText, { color: theme.colors.textMain }]}>{item}</AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <AppText style={styles.emptyTitle}>로그가 없습니다</AppText>
            <AppText style={styles.emptyDesc}>로그인/회원가입/견적 API를 호출하면 requestId 그룹 단위로 표시됩니다.</AppText>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ gap: safeNumber(theme.layout.spacing.base, 4) * 2 }}>
            {filtered.map((group) => {
              const badgeBg =
                group.level === "error"
                  ? tint(theme.colors.semanticDanger, 0.12, theme.colors.bgSurface)
                  : group.level === "warn"
                    ? tint(theme.colors.semanticWarning, 0.12, theme.colors.bgSurface)
                    : tint(theme.colors.semanticInfo, 0.1, theme.colors.bgSurface);

              const badgeBorder =
                group.level === "error"
                  ? tint(theme.colors.semanticDanger, 0.35, theme.colors.borderDefault)
                  : group.level === "warn"
                    ? tint(theme.colors.semanticWarning, 0.35, theme.colors.borderDefault)
                    : tint(theme.colors.semanticInfo, 0.3, theme.colors.borderDefault);

              const message = readText(group.errorEntry?.error) || readText(group.responseEntry?.response);
              const timeline = group.timeline.map((item) => phaseSymbol(item.phase)).join(" ");

              return (
                <Pressable
                  key={group.requestId}
                  onPress={() => router.push({ pathname: "/debug/logs/[id]", params: { id: group.requestId } })}
                >
                  <AppCard outlined elevated={false}>
                    <View style={styles.cardInner}>
                      <View style={styles.row}>
                        <View style={styles.left}>
                          <AppText style={styles.meta}>
                            {formatTime(group.latestAt)} · {group.tag} · {formatStatus(group.status)} ·{" "}
                            {formatDuration(group.durationMs)}
                          </AppText>
                          <AppText style={styles.title} numberOfLines={2}>
                            {groupTitle(group)}
                          </AppText>
                          <AppText style={styles.timeline} numberOfLines={1}>
                            {timeline}
                          </AppText>
                          {message ? (
                            <AppText style={styles.message} numberOfLines={2}>
                              {message}
                            </AppText>
                          ) : null}
                        </View>

                        <View style={[styles.badge, { backgroundColor: badgeBg, borderColor: badgeBorder }]}>
                          <AppText style={[styles.badgeText, { color: theme.colors.textMain }]}>
                            {group.level.toUpperCase()}
                          </AppText>
                        </View>
                      </View>
                    </View>
                  </AppCard>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </>
    </PageScaffold>
  );
}
