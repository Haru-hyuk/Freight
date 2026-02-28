import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { QuoteDetailResponse } from "@/entities/quote/model/quote.types";
import { type DriverMatchItem, getDriverMatch, getDriverQuoteSummaryDetail } from "@/features/matching/api";
import { parseMatchPositiveInt } from "@/features/matching/api/shipper-match-parser";
import {
  getMatchDetailRouteSnapshotKey,
  normalizeMatchDetailRouteSnapshot,
  type MatchDetailRouteSnapshot,
} from "./matchDetailRouteSnapshot";

export type { MatchDetailRouteSnapshot } from "./matchDetailRouteSnapshot";

type UseMatchDetailViewModel = {
  match: DriverMatchItem | null;
  quote: QuoteDetailResponse | null;
  quoteId: number;
  isLoading: boolean;
  errorMessage: string | null;
  refetch: () => Promise<void>;
};

const NETWORK_ERROR_TEXT = "네트워크 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.";

export function useMatchDetail(matchId: number, routeSnapshot?: MatchDetailRouteSnapshot): UseMatchDetailViewModel {
  const safeMatchId = parseMatchPositiveInt(matchId);
  const routeSnapshotHash = getMatchDetailRouteSnapshotKey(routeSnapshot);
  const stableRouteSnapshot = useMemo(() => routeSnapshot, [routeSnapshotHash]);
  const [match, setMatch] = useState<DriverMatchItem | null>(null);
  const [quote, setQuote] = useState<QuoteDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const pendingRefetchResolversRef = useRef<Array<() => void>>([]);

  const bootstrapMatch = useMemo(
    () => normalizeMatchDetailRouteSnapshot(stableRouteSnapshot, safeMatchId),
    [safeMatchId, stableRouteSnapshot]
  );

  const refetch = useCallback(() => {
    return new Promise<void>((resolve) => {
      pendingRefetchResolversRef.current.push(resolve);
      setReloadTick((prev) => prev + 1);
    });
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadQuoteDetail = async (quoteId: unknown) => {
      const safeQuoteId = parseMatchPositiveInt(quoteId);
      if (safeQuoteId <= 0) {
        if (mounted) setQuote(null);
        return;
      }

      try {
        const quoteDetail = await getDriverQuoteSummaryDetail(safeQuoteId);
        if (!mounted) return;
        setQuote(quoteDetail ?? null);
      } catch {
        if (!mounted) return;
        setQuote(null);
      }
    };

    if (safeMatchId <= 0) {
      setMatch(null);
      setQuote(null);
      setIsLoading(false);
      setErrorMessage("유효한 매칭 ID가 아닙니다.");

      const resolvers = pendingRefetchResolversRef.current.splice(0);
      resolvers.forEach((resolve) => resolve());
      return () => {
        mounted = false;
      };
    }

    setIsLoading(true);
    setErrorMessage(null);
    setQuote(null);
    setMatch(bootstrapMatch);

    getDriverMatch(safeMatchId)
      .then(async (remoteMatch) => {
        if (!mounted) return;

        const normalizedRemote = normalizeMatchDetailRouteSnapshot(remoteMatch, safeMatchId);
        const resolvedMatch = normalizedRemote ?? bootstrapMatch;
        setMatch(resolvedMatch ?? null);

        if (!resolvedMatch) {
          setErrorMessage("매칭 정보를 찾을 수 없습니다.");
          return;
        }

        await loadQuoteDetail(resolvedMatch.quoteId);
      })
      .catch(async () => {
        if (!mounted) return;

        if (bootstrapMatch) {
          setMatch(bootstrapMatch);
          await loadQuoteDetail(bootstrapMatch.quoteId);
          return;
        }

        setErrorMessage(NETWORK_ERROR_TEXT);
      })
      .finally(() => {
        if (!mounted) return;
        setIsLoading(false);

        const resolvers = pendingRefetchResolversRef.current.splice(0);
        resolvers.forEach((resolve) => resolve());
      });

    return () => {
      mounted = false;
    };
  }, [bootstrapMatch, reloadTick, routeSnapshotHash, safeMatchId]);

  const quoteId = useMemo(() => {
    const fromQuote = parseMatchPositiveInt(quote?.quoteId);
    if (fromQuote > 0) return fromQuote;
    return parseMatchPositiveInt(match?.quoteId);
  }, [match?.quoteId, quote?.quoteId]);

  return useMemo(
    () => ({
      match,
      quote,
      quoteId,
      isLoading,
      errorMessage,
      refetch,
    }),
    [errorMessage, isLoading, match, quote, quoteId, refetch]
  );
}

export default useMatchDetail;
