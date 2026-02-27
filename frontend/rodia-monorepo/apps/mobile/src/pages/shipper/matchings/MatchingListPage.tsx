import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { getShipperQuoteDetail } from "@/features/quote/api";
import { listShipperMatches } from "@/features/matching/api";
import { mapToUsageHistoryItem } from "@/features/matching/api/usage-history-mapper";
import { UsageHistoryWidget } from "@/features/matching/ui/UsageHistoryWidget";
import type { ParsedUsageHistoryItem } from "@/features/matching/ui/UsageHistoryCard";

import { PageScaffold } from "@/widgets/layout/PageScaffold";
import { AppErrorState } from "@/shared/ui/kit/AppErrorState";
import { AppSpinner } from "@/shared/ui/kit/AppSpinner";
import { readApiErrorMessage } from "@/shared/lib/api/readApiErrorMessage";

const FOCUS_REFETCH_THROTTLE_MS = 1500;

export function MatchingListPage() {
  const isMountedRef = useRef(true);
  const focusRefetchMetaRef = useRef({ hasFocusedOnce: false, inFlight: false, lastRefetchAt: 0 });

  const [historyItems, setHistoryItems] = useState<ParsedUsageHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadUsageHistory = useCallback(async (mode: "initial" | "focus" | "manual" = "initial") => {
    if (!isMountedRef.current) return;

    const shouldShowBlockingLoader = mode === "initial" || mode === "manual";
    if (shouldShowBlockingLoader) {
      setIsLoading(true);
      setErrorMessage(null);
    }

    try {
      // 1. 서버에서 매칭 내역 호출
      const matches = await listShipperMatches();
      const safeMatches = Array.isArray(matches) ? matches : [];

      // 2. [최적화] 견적 상세 정보 병렬 호출을 위한 중복 ID 제거 (N+1 방어)
      const uniqueQuoteIds = Array.from(
        new Set(
          safeMatches
            .map((m) => m.quoteId)
            .filter((id): id is number => typeof id === "number" && id > 0)
        )
      ).slice(0, 30); // 넉넉하게 30건 제한

      // 3. 중복 없는 ID로만 API 호출
     const quoteDetails = await Promise.all(
        uniqueQuoteIds.map(async (quoteId) => {
          try {
            const detail = await getShipperQuoteDetail(quoteId);
            return { quoteId, detail };
          } catch {  
            return { quoteId, detail: null };
          }
        })
      );

      // 4. 매핑 속도 최적화를 위한 Map 객체 변환
      const quoteMap = new Map(quoteDetails.map((q) => [q.quoteId, q.detail]));

      // 5. 서버 데이터 ➔ UI 전용 모델(ParsedUsageHistoryItem) 변환
      const enrichedItems = safeMatches.map((match) => {
        const quoteDetail = match.quoteId ? (quoteMap.get(match.quoteId) ?? null) : null;
        return mapToUsageHistoryItem(match, quoteDetail);
      });

      if (!isMountedRef.current) return;
      setHistoryItems(enrichedItems);
    } catch (error) {
      if (!isMountedRef.current) return;
      if (shouldShowBlockingLoader) {
        setHistoryItems([]);
      }
      setErrorMessage(readApiErrorMessage(error));
    } finally {
      if (isMountedRef.current && shouldShowBlockingLoader) {
        setIsLoading(false);
      }
    }
  }, []);

  // 초기 마운트 시 데이터 로드
  useEffect(() => {
    isMountedRef.current = true;
    void loadUsageHistory("initial");
    return () => {
      isMountedRef.current = false;
    };
  }, [loadUsageHistory]);

  // 다른 화면에 갔다 돌아왔을 때 부드럽게 새로고침 (Throttle 적용)
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
      void loadUsageHistory("focus").finally(() => {
        focusMeta.inFlight = false;
      });

      return undefined;
    }, [loadUsageHistory])
  );

  return (
    <PageScaffold title="이용 내역" backgroundColor="#F3F4F6">
      <View style={styles.container}>
        {isLoading ? (
          <AppSpinner label="이용 내역을 불러오는 중입니다." />
        ) : errorMessage ? (
          <AppErrorState
            title="목록을 불러오지 못했어요"
            description={errorMessage}
            retryLabel="다시 시도"
            onRetry={() => void loadUsageHistory("manual")}
            fullScreen={false}
          />
        ) : (
          <UsageHistoryWidget items={historyItems} />
        )}
      </View>
    </PageScaffold>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default MatchingListPage;