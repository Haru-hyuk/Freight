// apps/mobile/src/pages/debug/DebugLogDetailPage.tsx
import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";

import { isApiDebugLogsEnabled } from "@/shared/lib/config/env";
import { debugLogStore, type DebugLogGroup } from "@/shared/lib/debug/debugLogStore";
import { safeJsonPreview } from "@/shared/lib/debug/sanitize";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { safeNumber, tint } from "@/shared/theme/colorUtils";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

type AnyObj = Record<string, unknown>;

function formatTime(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function phaseSymbol(phase: "request" | "response" | "error"): string {
  if (phase === "request") return "→";
  if (phase === "response") return "←";
  return "✕";
}

function isPlainObject(input: unknown): input is AnyObj {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function pickRequestPayload(group: DebugLogGroup): AnyObj {
  const request = group.requestEntry?.request ?? group.errorEntry?.request;
  return isPlainObject(request) ? request : {};
}

function encodeQuery(params: unknown): string {
  if (!isPlainObject(params)) return "";
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      value.forEach((item) => q.append(key, String(item)));
      continue;
    }
    q.append(key, String(value));
  }
  return q.toString();
}

function escapeForSingleQuote(input: unknown): string {
  return String(input ?? "").replace(/'/g, `'\"'\"'`);
}

function buildCurl(group: DebugLogGroup): string {
  const method = (group.method ?? "GET").toUpperCase();
  const payload = pickRequestPayload(group);
  const headers = isPlainObject(payload.headers) ? payload.headers : {};
  const params = payload.params;
  const data = payload.data;

  const baseUrl = (group.url ?? group.path ?? "").trim() || "https://example.invalid/path";
  const query = encodeQuery(params);
  const url = query ? `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}${query}` : baseUrl;

  const lines: string[] = [`curl -X ${method} '${escapeForSingleQuote(url)}'`];

  for (const [key, value] of Object.entries(headers)) {
    if (value == null) continue;
    lines.push(`  -H '${escapeForSingleQuote(key)}: ${escapeForSingleQuote(String(value))}'`);
  }

  if (typeof data !== "undefined") {
    const asString = typeof data === "string" ? data : JSON.stringify(data);
    if (asString && asString !== "undefined") {
      lines.push(`  --data '${escapeForSingleQuote(asString)}'`);
    }
  }

  return lines.join(" \\\n");
}

function buildSummary(group: DebugLogGroup): string {
  const method = (group.method ?? "-").toUpperCase();
  const path = (group.path ?? group.url ?? "-").trim() || "-";
  const status = typeof group.status === "number" ? String(group.status) : group.status ?? "-";
  const duration = typeof group.durationMs === "number" ? `${group.durationMs}ms` : "-";
  return `${formatTime(group.latestAt)} ${method} ${path} status=${status} duration=${duration} tag=${group.tag} requestId=${group.requestId}`;
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
    summaryCard: {
      padding: spacing * 3,
      gap: spacing + 2,
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
    copyRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing,
    },
    feedback: {
      paddingHorizontal: spacing * 2,
      paddingVertical: spacing,
      borderRadius: 999,
      borderWidth: 1,
      alignSelf: "flex-start",
    },
    feedbackText: {
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "800",
    },
    sectionCard: {
      padding: spacing * 3,
      gap: spacing + 2,
    },
    sectionTitle: {
      color: c.textMain,
      fontSize: safeNumber(theme.typography.scale.detail.size, 14),
      lineHeight: safeNumber(theme.typography.scale.detail.lineHeight, 20),
      fontWeight: "900",
    },
    jsonShell: {
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: safeNumber(theme.layout.radii.control, 12),
      backgroundColor: tint(c.textMain, 0.03, c.bgSurface),
      maxHeight: 320,
    },
    jsonText: {
      fontSize: 12,
      lineHeight: 18,
      fontFamily: "monospace",
      color: c.textMain,
      padding: spacing * 2,
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

function JsonSection(props: { title: string; value: unknown }) {
  const styles = useStyles();
  const text = React.useMemo(() => safeJsonPreview(props.value), [props.value]);

  return (
    <AppCard outlined elevated={false}>
      <View style={styles.sectionCard}>
        <AppText style={styles.sectionTitle}>{props.title}</AppText>
        <View style={styles.jsonShell}>
          <ScrollView horizontal nestedScrollEnabled>
            <AppText selectable style={styles.jsonText}>
              {text}
            </AppText>
          </ScrollView>
        </View>
      </View>
    </AppCard>
  );
}

export default function DebugLogDetailPage() {
  const styles = useStyles();
  const theme = useAppTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();

  const enabled = isApiDebugLogsEnabled();
  if (!enabled) {
    return <Redirect href="/" />;
  }

  const requestId = React.useMemo(() => {
    const raw = params?.id;
    const value = Array.isArray(raw) ? raw[0] : raw;
    return typeof value === "string" ? value.trim() : "";
  }, [params]);

  const [group, setGroup] = React.useState<DebugLogGroup | undefined>(() =>
    requestId ? debugLogStore.getGroupByRequestId(requestId) : undefined
  );
  const [feedback, setFeedback] = React.useState("");
  const feedbackTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    setGroup(requestId ? debugLogStore.getGroupByRequestId(requestId) : undefined);
    return debugLogStore.subscribe(() => {
      setGroup(requestId ? debugLogStore.getGroupByRequestId(requestId) : undefined);
    });
  }, [requestId]);

  React.useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  const timeline = React.useMemo(() => {
    if (!group) return "-";
    return group.timeline.map((item) => phaseSymbol(item.phase)).join(" ");
  }, [group]);

  const copyWithFeedback = React.useCallback(async (label: string, value: string) => {
    try {
      await Clipboard.setStringAsync(value);
      setFeedback(`${label} copied`);
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = setTimeout(() => {
        setFeedback("");
        feedbackTimerRef.current = null;
      }, 1200);
    } catch {
      setFeedback("copy failed");
    }
  }, []);

  if (!group) {
    return (
      <PageScaffold
        title="API Log Detail"
        backgroundColor={theme.colors.bgMain}
        contentStyle={styles.content}
        onPressBack={() => router.back()}
        backLabel="이전"
      >
        <View style={styles.empty}>
          <AppText style={styles.emptyTitle}>로그를 찾을 수 없습니다</AppText>
          <AppText style={styles.emptyDesc}>이미 삭제되었거나 requestId가 유효하지 않습니다.</AppText>
          <AppButton title="목록으로" variant="secondary" onPress={() => router.replace("/debug/logs")} />
        </View>
      </PageScaffold>
    );
  }

  const summary = buildSummary(group);
  const rawJson = safeJsonPreview({
    requestId: group.requestId,
    startedAt: group.startedAt,
    latestAt: group.latestAt,
    level: group.level,
    tag: group.tag,
    method: group.method,
    path: group.path,
    url: group.url,
    status: group.status,
    durationMs: group.durationMs,
    timeline: group.timeline,
    request: group.requestEntry?.request,
    response: group.responseEntry?.response,
    error: group.errorEntry?.error,
  });
  const curl = buildCurl(group);

  return (
    <PageScaffold
      title="API Log Detail"
      backgroundColor={theme.colors.bgMain}
      contentStyle={styles.content}
      onPressBack={() => router.back()}
      backLabel="이전"
    >
      <>
        <AppCard outlined elevated={false}>
          <View style={styles.summaryCard}>
            <AppText style={styles.meta}>
              {formatTime(group.latestAt)} · {group.tag} · {typeof group.status === "number" ? group.status : group.status ?? "-"}
              {" · "}
              {typeof group.durationMs === "number" ? `${group.durationMs}ms` : "-"}
            </AppText>
            <AppText style={styles.title}>
              {(group.method ?? "-").toUpperCase()} {(group.path ?? group.url ?? "-").trim() || "-"}
            </AppText>
            <AppText style={styles.timeline}>{timeline}</AppText>
            <AppText style={styles.meta}>requestId: {group.requestId}</AppText>

            <View style={styles.copyRow}>
              <AppButton title="Copy summary" variant="secondary" onPress={() => copyWithFeedback("summary", summary)} />
              <AppButton title="Copy JSON" variant="secondary" onPress={() => copyWithFeedback("json", rawJson)} />
              <AppButton title="Copy as cURL" variant="secondary" onPress={() => copyWithFeedback("curl", curl)} />
            </View>

            {feedback ? (
              <Pressable
                style={[
                  styles.feedback,
                  {
                    backgroundColor: tint(theme.colors.semanticSuccess, 0.1, theme.colors.bgSurface),
                    borderColor: tint(theme.colors.semanticSuccess, 0.3, theme.colors.borderDefault),
                  },
                ]}
              >
                <AppText style={[styles.feedbackText, { color: theme.colors.textMain }]}>{feedback}</AppText>
              </Pressable>
            ) : null}
          </View>
        </AppCard>

        <JsonSection title="Request" value={group.requestEntry?.request ?? null} />
        <JsonSection title="Response" value={group.responseEntry?.response ?? null} />
        <JsonSection title="Error" value={group.errorEntry?.error ?? null} />
      </>
    </PageScaffold>
  );
}
