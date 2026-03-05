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
  getDriverCta,
  getDriverStatusTitle,
  getDriverUiStateFromStatusPayload,
} from "@/shared/lib/policy";

const FOCUS_REFETCH_THROTTLE_MS = 1500;

function parsePositiveInt(value: unknown): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
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

        setActiveRun(nextSummary ? { match: latestMatch, summary: nextSummary } : { match: latestMatch });
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

      const focusMeta = focusRefetchMetaRef.current;
      if (!focusMeta.hasFocusedOnce) {
        focusMeta.hasFocusedOnce = true;
        return undefined;
      }

      const now = Date.now();
      if (now - focusMeta.lastRefetchAt < FOCUS_REFETCH_THROTTLE_MS) return undefined;
      focusMeta.lastRefetchAt = now;

      void refreshActiveRun({ showError: false });
      return undefined;
    }, [activeRun?.match?.matchId, refreshActiveRun])
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
  const driverCta = getDriverCta(uiState, true);

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
      driverCta={driverCta}
      isSyncing={isRunSyncing}
      onRefetchRun={() => refreshActiveRun()}
    />
  );
}
