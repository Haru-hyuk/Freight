import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { QuoteDetailResponse } from "@/entities/quote/model/quote.types";
import { type DriverMatchItem, getDriverMatch } from "@/features/matching/api";
import { getShipperQuoteDetailByIdentifier } from "@/features/quote/api";
import { readApiErrorMessage } from "@/shared/lib/api/readApiErrorMessage";

export type MatchDetailRouteSnapshot = Partial<DriverMatchItem>;

type UseMatchDetailViewModel = {
  match: DriverMatchItem | null;
  quote: QuoteDetailResponse | null;
  quoteId: number;
  isLoading: boolean;
  errorMessage: string | null;
  refetch: () => Promise<void>;
};

function toPositiveInt(value: unknown): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function toOptionalText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  return text ? text : undefined;
}

function toOptionalBoolean(value: unknown): boolean | undefined {
  if (typeof value !== "boolean") return undefined;
  return value;
}

function normalizeMatch(value: Partial<DriverMatchItem> | null | undefined): DriverMatchItem | null {
  if (!value) return null;

  const matchId = toPositiveInt(value.matchId);
  if (matchId <= 0) return null;

  const quoteId = toPositiveInt(value.quoteId);
  const driverId = toPositiveInt(value.driverId);

  return {
    matchId,
    quoteId: quoteId > 0 ? quoteId : undefined,
    driverId: driverId > 0 ? driverId : undefined,
    accepted: toOptionalBoolean(value.accepted),
    status: toOptionalText(value.status),
    acceptedAt: toOptionalText(value.acceptedAt),
    createdAt: toOptionalText(value.createdAt),
    updatedAt: toOptionalText(value.updatedAt),
  };
}

function snapshotKey(snapshot?: MatchDetailRouteSnapshot): string {
  if (!snapshot) return "";
  return [
    toPositiveInt(snapshot.matchId),
    toPositiveInt(snapshot.quoteId),
    toPositiveInt(snapshot.driverId),
    typeof snapshot.accepted === "boolean" ? String(snapshot.accepted) : "",
    toOptionalText(snapshot.status) ?? "",
    toOptionalText(snapshot.createdAt) ?? "",
    toOptionalText(snapshot.updatedAt) ?? "",
    toOptionalText(snapshot.acceptedAt) ?? "",
  ].join("|");
}

export function useMatchDetail(matchId: number, routeSnapshot?: MatchDetailRouteSnapshot): UseMatchDetailViewModel {
  const safeMatchId = toPositiveInt(matchId);
  const routeSnapshotHash = snapshotKey(routeSnapshot);
  const [match, setMatch] = useState<DriverMatchItem | null>(null);
  const [quote, setQuote] = useState<QuoteDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const pendingRefetchResolversRef = useRef<Array<() => void>>([]);

  const bootstrapMatch = useMemo(
    () => normalizeMatch({ matchId: safeMatchId, ...(routeSnapshot ?? {}) }),
    [
      safeMatchId,
      routeSnapshotHash,
      routeSnapshot?.accepted,
      routeSnapshot?.acceptedAt,
      routeSnapshot?.createdAt,
      routeSnapshot?.driverId,
      routeSnapshot?.matchId,
      routeSnapshot?.quoteId,
      routeSnapshot?.status,
      routeSnapshot?.updatedAt,
    ]
  );

  const refetch = useCallback(() => {
    return new Promise<void>((resolve) => {
      pendingRefetchResolversRef.current.push(resolve);
      setReloadTick((prev) => prev + 1);
    });
  }, []);

  useEffect(() => {
    let mounted = true;

    if (safeMatchId <= 0) {
      setMatch(null);
      setQuote(null);
      setIsLoading(false);
      setErrorMessage("유효한 오더 ID가 아닙니다.");

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

        const normalizedRemote = normalizeMatch(remoteMatch);
        const resolvedMatch = normalizedRemote ?? bootstrapMatch;
        setMatch(resolvedMatch ?? null);

        if (!resolvedMatch) {
          setErrorMessage("오더 정보를 찾을 수 없습니다.");
          return;
        }

        const safeQuoteId = toPositiveInt(resolvedMatch.quoteId);
        if (safeQuoteId <= 0) {
          setQuote(null);
          return;
        }

        try {
          const quoteDetail = await getShipperQuoteDetailByIdentifier(String(safeQuoteId));
          if (!mounted) return;
          setQuote(quoteDetail ?? null);
        } catch {
          if (!mounted) return;
          setQuote(null);
        }
      })
      .catch((error: unknown) => {
        if (!mounted) return;
        if (!bootstrapMatch) {
          setErrorMessage(readApiErrorMessage(error, "오더 상세를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."));
        }
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
    const fromQuote = toPositiveInt(quote?.quoteId);
    if (fromQuote > 0) return fromQuote;
    return toPositiveInt(match?.quoteId);
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
