import type { CounterOfferCreateRequest, MatchResponse } from "@/shared/api/generated/schemas";

export type DriverMatchSummary = Required<Pick<MatchResponse, "matchId">> &
  Omit<MatchResponse, "matchId">;

const matchCache = new Map<number, DriverMatchSummary>();
const latestCounterOfferByMatch = new Map<number, CounterOfferCreateRequest>();

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

function toSummary(value: Partial<DriverMatchSummary>): DriverMatchSummary | null {
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

function mergeSummary(base: DriverMatchSummary | null, incoming: Partial<DriverMatchSummary>): DriverMatchSummary | null {
  const normalized = toSummary(incoming);
  if (!normalized) return base;

  if (!base) return normalized;

  return {
    matchId: base.matchId,
    quoteId: normalized.quoteId ?? base.quoteId,
    driverId: normalized.driverId ?? base.driverId,
    accepted: typeof normalized.accepted === "boolean" ? normalized.accepted : base.accepted,
    status: normalized.status ?? base.status,
    acceptedAt: normalized.acceptedAt ?? base.acceptedAt,
    createdAt: normalized.createdAt ?? base.createdAt,
    updatedAt: normalized.updatedAt ?? base.updatedAt,
  };
}

function persistSummary(summary: DriverMatchSummary | null): DriverMatchSummary | null {
  if (!summary) return null;
  matchCache.set(summary.matchId, summary);
  return summary;
}

export function cacheDriverMatches(items: Array<Partial<DriverMatchSummary>>): void {
  if (!Array.isArray(items)) return;

  items.forEach((item) => {
    const summary = toSummary(item);
    if (!summary) return;
    matchCache.set(summary.matchId, summary);
  });
}

export function resolveDriverMatchFromCache(
  matchId: number,
  routeSnapshot?: Partial<DriverMatchSummary>
): DriverMatchSummary | null {
  const safeMatchId = toPositiveInt(matchId);
  if (safeMatchId <= 0) return null;

  const fromCache = matchCache.get(safeMatchId) ?? null;
  const withRoute = mergeSummary(fromCache, { matchId: safeMatchId, ...(routeSnapshot ?? {}) });
  if (!withRoute) return null;
  return persistSummary(withRoute);
}

export function applyMockAccept(matchId: number): DriverMatchSummary | null {
  const current = resolveDriverMatchFromCache(matchId);
  if (!current) return null;

  return persistSummary({
    ...current,
    accepted: true,
    status: "ASSIGNED",
    updatedAt: new Date().toISOString(),
  });
}

export function applyMockCancel(matchId: number): DriverMatchSummary | null {
  const current = resolveDriverMatchFromCache(matchId);
  if (!current) return null;

  return persistSummary({
    ...current,
    accepted: false,
    status: "CANCELED",
    updatedAt: new Date().toISOString(),
  });
}

export function setLatestMockCounterOffer(matchId: number, input: CounterOfferCreateRequest): CounterOfferCreateRequest | null {
  const safeMatchId = toPositiveInt(matchId);
  if (safeMatchId <= 0) return null;

  const proposedPrice = Number.isFinite(Number(input?.proposedPrice))
    ? Math.trunc(Number(input?.proposedPrice))
    : undefined;
  const message = toOptionalText(input?.message);

  if ((!proposedPrice || proposedPrice <= 0) && !message) return null;

  const payload: CounterOfferCreateRequest = {
    ...(proposedPrice && proposedPrice > 0 ? { proposedPrice } : {}),
    ...(message ? { message } : {}),
  };

  latestCounterOfferByMatch.set(safeMatchId, payload);
  return payload;
}

export function getLatestMockCounterOffer(matchId: number): CounterOfferCreateRequest | null {
  const safeMatchId = toPositiveInt(matchId);
  if (safeMatchId <= 0) return null;
  return latestCounterOfferByMatch.get(safeMatchId) ?? null;
}
