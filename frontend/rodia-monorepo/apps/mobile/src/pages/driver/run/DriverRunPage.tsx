import React from "react";
import { Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { useActiveOrder } from "@/entities/order/model/active-order.store";
import { DriverOrdersBoard } from "@/features/driver-orders/ui/DriverOrdersBoard";
import { PrepareForRunScreen } from "@/features/driver-run/ui/PrepareForRunScreen";
import { RunActiveDetails } from "@/features/driver-run/ui/RunActiveDetails";
import { getDriverMatch, getDriverQuoteSummaryByQuoteId } from "@/features/matching/api";
import { readApiErrorMessage } from "@/shared/lib/api/readApiErrorMessage";
import {
  DRIVER_UI_STATE,
  getDriverBadge,
  getDriverStatusTitle,
  getDriverUiStateFromStatusPayload,
} from "@/shared/lib/policy";

const FOCUS_REFETCH_THROTTLE_MS = 1500;
const RUN_AUTO_SYNC_INTERVAL_MS = 12_000;
const RUN_AUTO_SYNC_STATUS_TOKENS: ReadonlySet<string> = new Set([
  "NEGOTIATING",
  "ASSIGNED",
  "READY",
  "MATCHED",
  "ACCEPTED",
  "PREPARING",
]);

function parsePositiveInt(value: unknown): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function toStatusToken(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
}

function shouldAutoSyncWhileFocused(status: unknown): boolean {
  return RUN_AUTO_SYNC_STATUS_TOKENS.has(toStatusToken(status));
}

function mergeMatchWithPrevious(input: {
  previousMatch: NonNullable<ReturnType<typeof useActiveOrder>["activeRun"]>["match"] | undefined;
  nextMatch: NonNullable<ReturnType<typeof useActiveOrder>["activeRun"]>["match"];
}) {
  const { previousMatch, nextMatch } = input;
  if (!previousMatch) return nextMatch;

  return {
    ...nextMatch,
    ...(typeof nextMatch.status === "string" && nextMatch.status.trim()
      ? {}
      : { status: previousMatch.status }),
    ...(typeof nextMatch.accepted === "boolean" ? {} : { accepted: previousMatch.accepted }),
    ...(typeof nextMatch.locationSharingEnabled === "boolean"
      ? {}
      : { locationSharingEnabled: previousMatch.locationSharingEnabled }),
    ...(typeof nextMatch.locationSharingUpdatedAt === "string" && nextMatch.locationSharingUpdatedAt.trim()
      ? {}
      : { locationSharingUpdatedAt: previousMatch.locationSharingUpdatedAt }),
  };
}

export default function DriverRunPage() {
  const { activeRun, setActiveRun, clearActiveRun } = useActiveOrder();
  const [isRunSyncing, setIsRunSyncing] = React.useState(false);
  const focusRefetchMetaRef = React.useRef({ hasFocusedOnce: false, lastRefetchAt: 0 });
  const activeRunRef = React.useRef(activeRun);

  React.useEffect(() => {
    activeRunRef.current = activeRun;
  }, [activeRun]);

  const refreshActiveRun = React.useCallback(
    async (input?: { showError?: boolean }) => {
      const showError = input?.showError !== false;
      const currentRun = activeRunRef.current;
      const safeMatchId = parsePositiveInt(currentRun?.match?.matchId);
      if (safeMatchId <= 0) return;

      try {
        setIsRunSyncing(true);
        const latestMatch = await getDriverMatch(safeMatchId);
        if (!latestMatch) {
          clearActiveRun();
          return;
        }

        const quoteIdFromMatch = parsePositiveInt(latestMatch.quoteId);
        const quoteIdFromSummary = parsePositiveInt(currentRun?.summary?.quoteId);
        const quoteIdFromRunMatch = parsePositiveInt(currentRun?.match?.quoteId);
        const resolvedQuoteId = quoteIdFromMatch || quoteIdFromSummary || quoteIdFromRunMatch;
        const nextSummary = resolvedQuoteId > 0 ? await getDriverQuoteSummaryByQuoteId(resolvedQuoteId) : currentRun?.summary ?? undefined;
        const mergedMatch = mergeMatchWithPrevious({
          previousMatch: currentRun?.match,
          nextMatch: latestMatch,
        });

        setActiveRun(nextSummary ? { match: mergedMatch, summary: nextSummary } : { match: mergedMatch });
      } catch (error) {
        if (!showError) return;
        Alert.alert("운행 상태 동기화 실패", readApiErrorMessage(error), [
          { text: "취소", style: "cancel" },
          { text: "다시 시도", onPress: () => void refreshActiveRun() },
        ]);
      } finally {
        setIsRunSyncing(false);
      }
    },
    [clearActiveRun, setActiveRun]
  );

  React.useEffect(() => {
    const safeMatchId = parsePositiveInt(activeRun?.match?.matchId);
    if (safeMatchId <= 0) return;
    void refreshActiveRun({ showError: false });
  }, [activeRun?.match?.matchId, refreshActiveRun]);

  useFocusEffect(
    React.useCallback(() => {
      const safeMatchId = parsePositiveInt(activeRun?.match?.matchId);
      if (safeMatchId <= 0) return undefined;
      const shouldRunInterval = shouldAutoSyncWhileFocused(activeRun?.match?.status);

      const focusMeta = focusRefetchMetaRef.current;
      if (!focusMeta.hasFocusedOnce) {
        focusMeta.hasFocusedOnce = true;
      } else {
        const now = Date.now();
        if (now - focusMeta.lastRefetchAt >= FOCUS_REFETCH_THROTTLE_MS) {
          focusMeta.lastRefetchAt = now;
          void refreshActiveRun({ showError: false });
        }
      }

      if (!shouldRunInterval) return undefined;

      const intervalId = setInterval(() => {
        void refreshActiveRun({ showError: false });
      }, RUN_AUTO_SYNC_INTERVAL_MS);
      return () => clearInterval(intervalId);
    }, [activeRun?.match?.matchId, activeRun?.match?.status, refreshActiveRun])
  );

  if (!activeRun) {
    return <DriverOrdersBoard assignedOnly />;
  }

  const uiState = getDriverUiStateFromStatusPayload({
    scope: "run",
    accepted: activeRun.match.accepted,
    matchStatus: activeRun.match.status,
    quoteStatus: undefined,
  });
  const badge = getDriverBadge(uiState);
  const driverStatusTitle = getDriverStatusTitle(uiState);

  if (uiState === DRIVER_UI_STATE.ASSIGNED) {
    return (
      <PrepareForRunScreen
        activeRun={activeRun}
        isSyncing={isRunSyncing}
        onRefetchRun={() => refreshActiveRun()}
      />
    );
  }

  return (
    <RunActiveDetails
      activeRun={activeRun}
      uiState={uiState}
      driverBadgeLabel={badge.label}
      driverBadgeTone={badge.tone}
      driverStatusTitle={driverStatusTitle}
      isSyncing={isRunSyncing}
      onRefetchRun={() => refreshActiveRun()}
    />
  );
}
