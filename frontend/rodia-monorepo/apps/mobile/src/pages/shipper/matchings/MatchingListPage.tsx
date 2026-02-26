import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";

import { getShipperQuoteDetail } from "@/features/quote/api";
import { cancelShipperMatch, listShipperMatches, type ShipperMatchItem } from "@/features/matching/api";
import { BACKEND_STATUS, normalizeStatus } from "@/shared/lib/policy";
import { safeString, tint } from "@/shared/theme/colorUtils";
import { useAppTheme } from "@/shared/theme/useAppTheme";
import { PageScaffold } from "@/widgets/layout/PageScaffold";
import { AppText } from "@/shared/ui/kit/AppText";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppEmptyState } from "@/shared/ui/kit/AppEmptyState";
import { AppErrorState } from "@/shared/ui/kit/AppErrorState";
import { AppSpinner } from "@/shared/ui/kit/AppSpinner";

const VIEW_PRESSED: ViewStyle = { opacity: 0.85 };

type MatchingStatus = "payment" | "loading" | "moving" | "completed";
type MatchingItem = {
  id: string;
  matchId: number;
  quoteId: number;
  title: string;
  fromLabel: string;
  toLabel: string;
  status: MatchingStatus;
  rightHint: string;
  cancelable: boolean;
};

const TERMINAL_MATCH_STATUSES = new Set<string>([BACKEND_STATUS.CANCELED, BACKEND_STATUS.DROPOFF]);
const FOCUS_REFETCH_THROTTLE_MS = 1500;

function toSafeInt(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.trunc(parsed);
}

function normalizeMatchStatus(status: string): string {
  const normalized = normalizeStatus(status);
  if (normalized === BACKEND_STATUS.ACCEPTED) return BACKEND_STATUS.ASSIGNED;
  if (normalized !== BACKEND_STATUS.UNKNOWN) return normalized;

  const token = status.trim().toUpperCase();
  if (token === "CANCELLED" || token === "CANCEL") return BACKEND_STATUS.CANCELED;
  if (token === "COMPLETED" || token === "DONE" || token === "FINISHED" || token === "DELIVERED") {
    return BACKEND_STATUS.DROPOFF;
  }
  return token;
}

function toMatchingStatus(status: string): MatchingStatus {
  const normalized = normalizeMatchStatus(status);
  if (normalized === BACKEND_STATUS.READY || normalized === BACKEND_STATUS.OPEN || normalized === BACKEND_STATUS.NEGOTIATING) {
    return "payment";
  }
  if (normalized === BACKEND_STATUS.ASSIGNED || normalized === BACKEND_STATUS.PICKUP) return "loading";
  if (normalized === BACKEND_STATUS.TRANSIT) return "moving";
  if (TERMINAL_MATCH_STATUSES.has(normalized)) return "completed";
  return "payment";
}

function toStatusLabel(status: string): string {
  const normalized = normalizeMatchStatus(status);
  if (normalized === BACKEND_STATUS.READY || normalized === BACKEND_STATUS.OPEN) return "요청 접수";
  if (normalized === BACKEND_STATUS.NEGOTIATING) return "매칭 협의";
  if (normalized === BACKEND_STATUS.ASSIGNED) return "배차 완료";
  if (normalized === BACKEND_STATUS.PICKUP) return "상차 진행";
  if (normalized === BACKEND_STATUS.TRANSIT) return "운송 중";
  if (normalized === BACKEND_STATUS.DROPOFF) return "하차 완료";
  if (normalized === BACKEND_STATUS.CANCELED) return "취소됨";
  return normalized || "상태 확인";
}

function toMatchingTitle(status: string): string {
  const normalized = normalizeMatchStatus(status);
  if (normalized === BACKEND_STATUS.READY || normalized === BACKEND_STATUS.OPEN) return "기사님 배정 대기";
  if (normalized === BACKEND_STATUS.NEGOTIATING) return "기사님 제안 확인";
  if (normalized === BACKEND_STATUS.ASSIGNED) return "배차 확정";
  if (normalized === BACKEND_STATUS.PICKUP) return "상차 진행";
  if (normalized === BACKEND_STATUS.TRANSIT) return "이동 중";
  if (normalized === BACKEND_STATUS.DROPOFF) return "운송 완료";
  if (normalized === BACKEND_STATUS.CANCELED) return "요청 취소";
  return "매칭 상태";
}

function readErrorMessage(error: unknown): string {
  const fallback = "네트워크 또는 요청 값을 확인해주세요.";
  if (!error || typeof error !== "object") return fallback;

  const e = error as {
    response?: { data?: { message?: string; error?: string } };
    message?: string;
  };

  const serverMessage = e.response?.data?.message ?? e.response?.data?.error;
  if (typeof serverMessage === "string" && serverMessage.trim()) return serverMessage.trim();
  if (typeof e.message === "string" && e.message.trim()) return e.message.trim();
  return fallback;
}

async function enrichMatchingItems(matches: ShipperMatchItem[]): Promise<MatchingItem[]> {
  const quoteIds = Array.from(
    new Set(
      matches
        .map((match) => toSafeInt(match?.quoteId, 0))
        .filter((quoteId) => Number.isInteger(quoteId) && quoteId > 0)
    )
  ).slice(0, 20);

  const detailPairs = await Promise.all(
    quoteIds.map(async (quoteId) => {
      try {
        const detail = await getShipperQuoteDetail(quoteId);
        return [quoteId, detail] as const;
      } catch {
        return [quoteId, null] as const;
      }
    })
  );
  const detailMap = new Map<number, Awaited<ReturnType<typeof getShipperQuoteDetail>> | null>(detailPairs);

  return matches.map((match, index) => {
    const matchId = Math.max(0, toSafeInt(match?.matchId, 0));
    const quoteId = Math.max(0, toSafeInt(match?.quoteId, 0));
    const detail = quoteId > 0 ? detailMap.get(quoteId) : null;
    const fromLabel = String(detail?.originAddress ?? "").trim() || `견적 #${quoteId || "-"}`;
    const toLabel = String(detail?.destinationAddress ?? "").trim() || `매칭 #${matchId || index + 1}`;
    const status = String(match?.status ?? "").trim();

    return {
      id: `match-${matchId || index + 1}`,
      matchId,
      quoteId,
      title: toMatchingTitle(status),
      fromLabel,
      toLabel,
      status: toMatchingStatus(status),
      rightHint: toStatusLabel(status),
      cancelable: Boolean(match?.cancelable) && matchId > 0,
    };
  });
}

export function MatchingListPage() {
  const theme = useAppTheme();
  const router = useRouter();
  const isMountedRef = useRef(true);
  const focusRefetchMetaRef = useRef({ hasFocusedOnce: false, inFlight: false, lastRefetchAt: 0 });

  const [matchings, setMatchings] = useState<MatchingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cancellingMatchId, setCancellingMatchId] = useState<number | null>(null);

  const cText = safeString(theme?.colors?.textMain, "#111827");
  const cBg = safeString(theme?.colors?.bgSurfaceAlt, "#F3F4F6");
  const cBorder = safeString(theme?.colors?.borderDefault, "#E5E7EB");
  const cPrimary = safeString(theme?.colors?.brandPrimary, "#FF6A00");
  const cBlue = safeString(theme?.colors?.brandSecondary, "#3B82F6");
  const cMint = safeString(theme?.colors?.brandAccent, "#00E5A8");
  const subtleText = useMemo(() => tint(cText, 0.7, "rgba(17,24,39,0.7)"), [cText]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
        ghostBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12 },
        sectionWrap: { marginBottom: 8 },
        sectionTitle: { marginBottom: 8 },

        itemOuter: { borderRadius: 16, overflow: "hidden", marginBottom: 12 },
        itemInner: { padding: 16 },
        topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
        badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, alignSelf: "flex-start" },

        row: { flexDirection: "row", alignItems: "center", marginTop: 10 },
        node: { flex: 1 },
        arrow: { width: 18, alignItems: "center", justifyContent: "center", marginHorizontal: 12 },

        divider: { height: 1, backgroundColor: tint("#000000", 0.06, "rgba(0,0,0,0.06)"), marginTop: 12 },
        bottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10, gap: 8 },
        cancelButton: { minHeight: 34, minWidth: 96 },
      }),
    [cText]
  );

  const statusUi = useMemo(() => {
    return {
      payment: { label: "결제", bg: tint(cBlue, 0.12, "rgba(59,130,246,0.12)"), fg: cBlue },
      loading: { label: "상차", bg: tint(cMint, 0.12, "rgba(0,229,168,0.12)"), fg: cMint },
      moving: { label: "이동", bg: tint(cMint, 0.12, "rgba(0,229,168,0.12)"), fg: cMint },
      completed: { label: "완료", bg: tint(cBorder, 0.6, "rgba(229,231,235,0.6)"), fg: subtleText },
    } as const;
  }, [cBlue, cMint, cBorder, subtleText]);

  const loadMatches = useCallback(async (mode: "initial" | "focus" | "manual" = "initial") => {
    if (!isMountedRef.current) return;

    const shouldShowBlockingLoader = mode === "initial" || mode === "manual";
    if (shouldShowBlockingLoader) {
      setIsLoading(true);
      setErrorMessage(null);
    }

    try {
      const list = await listShipperMatches();
      const safeList = Array.isArray(list) ? list : [];
      const enriched = await enrichMatchingItems(safeList);

      if (!isMountedRef.current) return;
      setMatchings(enriched);
    } catch (error) {
      if (!isMountedRef.current) return;

      if (shouldShowBlockingLoader) {
        setMatchings([]);
      }
      setErrorMessage(readErrorMessage(error));
    } finally {
      if (isMountedRef.current && shouldShowBlockingLoader) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    void loadMatches("initial");

    return () => {
      isMountedRef.current = false;
    };
  }, [loadMatches]);

  useFocusEffect(
    useCallback(() => {
      const focusMeta = focusRefetchMetaRef.current;
      if (!focusMeta.hasFocusedOnce) {
        focusMeta.hasFocusedOnce = true;
        return undefined;
      }

      const now = Date.now();
      if (focusMeta.inFlight || now - focusMeta.lastRefetchAt < FOCUS_REFETCH_THROTTLE_MS) {
        return undefined;
      }

      focusMeta.inFlight = true;
      focusMeta.lastRefetchAt = now;
      void loadMatches("focus").finally(() => {
        focusMeta.inFlight = false;
      });

      return undefined;
    }, [loadMatches])
  );

  const runCancelMatch = useCallback(
    async (match: MatchingItem) => {
      const safeMatchId = Number.isInteger(match?.matchId) && match.matchId > 0 ? match.matchId : 0;
      if (safeMatchId <= 0 || cancellingMatchId !== null) return;

      try {
        setCancellingMatchId(safeMatchId);
        await cancelShipperMatch(safeMatchId);
        if (!isMountedRef.current) return;
        await loadMatches("manual");
      } catch (error) {
        if (!isMountedRef.current) return;
        Alert.alert("요청 취소 실패", readErrorMessage(error));
      } finally {
        if (isMountedRef.current) {
          setCancellingMatchId(null);
        }
      }
    },
    [cancellingMatchId, loadMatches]
  );

  const confirmCancelMatch = useCallback(
    (match: MatchingItem) => {
      if (!match?.cancelable || cancellingMatchId !== null) return;

      Alert.alert("요청 취소", "해당 매칭 요청을 취소하시겠습니까?", [
        { text: "닫기", style: "cancel" },
        {
          text: "취소",
          style: "destructive",
          onPress: () => {
            void runCancelMatch(match);
          },
        },
      ]);
    },
    [cancellingMatchId, runCancelMatch]
  );

  const activeMatchings = useMemo(
    () => (Array.isArray(matchings) ? matchings.filter((item) => item?.status !== "completed") : []),
    [matchings]
  );
  const completedMatchings = useMemo(
    () => (Array.isArray(matchings) ? matchings.filter((item) => item?.status === "completed") : []),
    [matchings]
  );

  const renderMatchingCard = useCallback(
    (m: MatchingItem) => {
      const ui = statusUi?.[m.status] ?? statusUi.completed;
      const isCancelling = cancellingMatchId === m.matchId;

      return (
        <View key={m.id} style={styles.itemOuter}>
          <AppCard>
            <View style={styles.itemInner}>
              <View style={styles.topRow}>
                <View style={[styles.badge, { backgroundColor: ui.bg }]}>
                  <AppText variant="caption" weight="900" style={{ color: ui.fg }}>
                    {ui.label}
                  </AppText>
                </View>
                <AppText variant="caption" weight="800" color={subtleText}>
                  {safeString(m.rightHint, "")}
                </AppText>
              </View>

              <View style={{ height: 10 }} />
              <AppText variant="body" weight="900">
                {safeString(m.title, "")}
              </AppText>

              <View style={styles.row}>
                <View style={styles.node}>
                  <AppText variant="caption" weight="700" color={subtleText}>
                    출발
                  </AppText>
                  <AppText variant="body" weight="800" numberOfLines={1}>
                    {safeString(m.fromLabel, "")}
                  </AppText>
                </View>

                <View style={styles.arrow}>
                  <AppText variant="caption" weight="700" color={subtleText}>
                    ➝
                  </AppText>
                </View>

                <View style={[styles.node, { alignItems: "flex-end" }]}>
                  <AppText variant="caption" weight="700" color={subtleText}>
                    도착
                  </AppText>
                  <AppText variant="body" weight="800" numberOfLines={1}>
                    {safeString(m.toLabel, "")}
                  </AppText>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.bottomRow}>
                <AppText variant="body" color={subtleText}>
                  {`견적 #${m.quoteId || "-"} · 매칭 #${m.matchId || "-"}`}
                </AppText>
                {m.cancelable ? (
                  <AppButton
                    title="요청 취소"
                    size="sm"
                    variant="secondary"
                    style={styles.cancelButton}
                    onPress={() => confirmCancelMatch(m)}
                    loading={isCancelling}
                    disabled={cancellingMatchId !== null && !isCancelling}
                  />
                ) : (
                  <Ionicons name="checkmark-circle-outline" size={18} color={subtleText} />
                )}
              </View>
            </View>
          </AppCard>
        </View>
      );
    },
    [cancellingMatchId, confirmCancelMatch, statusUi, styles, subtleText]
  );

  return (
    <PageScaffold title="매칭" backgroundColor={cBg}>
      <View style={styles.headerRow}>
        <AppText variant="heading" weight="800">
          진행 중인 운송
        </AppText>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="견적 목록으로"
          onPress={() => router?.push?.("/(shipper)/quotes")}
          style={({ pressed }) => [styles.ghostBtn, pressed ? VIEW_PRESSED : undefined]}
        >
          <AppText variant="caption" weight="900" color={cPrimary}>
            견적 보기
          </AppText>
        </Pressable>
      </View>

      {isLoading ? (
        <AppSpinner label="매칭 목록을 불러오는 중입니다." />
      ) : errorMessage ? (
        <AppErrorState
          title="매칭 목록을 불러오지 못했어요"
          description={errorMessage}
          retryLabel="다시 시도"
          onRetry={() => {
            void loadMatches("manual");
          }}
          fullScreen={false}
        />
      ) : activeMatchings.length > 0 || completedMatchings.length > 0 ? (
        <>
          {activeMatchings.length > 0 ? (
            <View style={styles.sectionWrap}>
              <AppText variant="detail" weight="800" style={styles.sectionTitle}>
                진행 중
              </AppText>
              {activeMatchings.map(renderMatchingCard)}
            </View>
          ) : null}

          {completedMatchings.length > 0 ? (
            <View style={styles.sectionWrap}>
              <AppText variant="detail" weight="800" style={styles.sectionTitle}>
                완료됨
              </AppText>
              {completedMatchings.map(renderMatchingCard)}
            </View>
          ) : null}
        </>
      ) : (
        <AppEmptyState
          fullScreen={false}
          title="진행 중인 매칭이 없어요"
          description="견적을 등록하고 기사님의 제안을 수락하면 매칭이 생성됩니다."
          action={{ label: "견적 등록", onPress: () => router?.push?.("/(shipper)/quotes/create") }}
        />
      )}

      <View style={{ height: 12 }} />
      <AppButton title="견적 등록" onPress={() => router?.push?.("/(shipper)/quotes/create")} />
      <View style={{ height: 120 }} />
    </PageScaffold>
  );
}

export default MatchingListPage;
