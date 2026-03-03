import type { DriverRouteRecommendationMode } from "@/features/matching/api";

export type DriverAcceptedRunGroup = {
  key: string;
  mode: DriverRouteRecommendationMode;
  pathLabel: string;
  matchIds: number[];
  quoteIds: number[];
  totalRevenue: number;
  estimatedTotalDistanceKm: number;
  acceptedAt: number;
};

const MAX_GROUP_HISTORY = 10;

let acceptedRunGroups: DriverAcceptedRunGroup[] = [];

function toSafeIdList(values: readonly number[]): number[] {
  return Array.from(
    new Set(
      values
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0)
    )
  );
}

export function addDriverAcceptedRunGroup(input: DriverAcceptedRunGroup): void {
  const safeMatchIds = toSafeIdList(input.matchIds);
  if (safeMatchIds.length <= 1) return;

  const safeQuoteIds = toSafeIdList(input.quoteIds);
  const safeKey = String(input.key || `run-group-${Date.now()}`).trim();
  const normalized: DriverAcceptedRunGroup = {
    key: safeKey,
    mode: input.mode === "BUNDLED" ? "BUNDLED" : "SINGLE",
    pathLabel: String(input.pathLabel ?? "").trim() || "추천 합짐 노선",
    matchIds: safeMatchIds,
    quoteIds: safeQuoteIds,
    totalRevenue: Math.max(0, Number(input.totalRevenue) || 0),
    estimatedTotalDistanceKm: Math.max(0, Number(input.estimatedTotalDistanceKm) || 0),
    acceptedAt: Math.max(1, Number(input.acceptedAt) || Date.now()),
  };

  const merged = [normalized, ...acceptedRunGroups.filter((entry) => entry.key !== normalized.key)];
  acceptedRunGroups = merged.slice(0, MAX_GROUP_HISTORY);
}

export function getDriverAcceptedRunGroups(): DriverAcceptedRunGroup[] {
  return acceptedRunGroups.map((entry) => ({
    ...entry,
    matchIds: [...entry.matchIds],
    quoteIds: [...entry.quoteIds],
  }));
}

export function pruneDriverAcceptedRunGroups(validMatchIds: readonly number[]): void {
  const safeValidMatchIds = new Set(toSafeIdList(validMatchIds));
  if (safeValidMatchIds.size <= 0) {
    acceptedRunGroups = [];
    return;
  }

  acceptedRunGroups = acceptedRunGroups
    .map((entry) => {
      const nextMatchIds = entry.matchIds.filter((id) => safeValidMatchIds.has(id));
      return {
        ...entry,
        matchIds: nextMatchIds,
      };
    })
    .filter((entry) => entry.matchIds.length > 1);
}

export function clearDriverAcceptedRunGroups(): void {
  acceptedRunGroups = [];
}

