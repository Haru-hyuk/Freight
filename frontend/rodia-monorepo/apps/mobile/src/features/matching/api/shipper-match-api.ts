import {
  acceptMatch as acceptDriverMatchGenerated,
  acceptMatches as acceptDriverMatchesGenerated,
  cancelMatch1 as cancelDriverMatchGenerated,
  getMatch1 as getDriverMatchGenerated,
  getMyMatches1 as getMyDriverMatchesGenerated,
  getOpenMatches as getOpenDriverMatchesGenerated,
} from "@/shared/api/generated/driver-match-controller/driver-match-controller";
import {
  createDriverCounterOffer,
  type CounterOfferItem,
  type DriverCounterOfferCreateInput,
} from "@/features/counter-offer/api";
import {
  cancelMatch as cancelShipperMatchGenerated,
  createMatch as createShipperMatchGenerated,
  getMyMatches as getMyShipperMatchesGenerated,
} from "@/shared/api/generated/shipper-match-controller/shipper-match-controller";
import { isMockMode } from "@/shared/lib/config/env";
import {
  acceptMockFlowDriverMatch,
  cancelMockFlowMatch,
  createMockFlowShipperMatch,
  getMockFlowDriverMatch,
  listMockFlowDriverMyMatches,
  listMockFlowDriverOpenMatches,
  listMockFlowShipperMatches,
  waitRandom,
} from "@/shared/lib/mock-flow";
import { BACKEND_STATUS, normalizeStatus } from "@/shared/lib/policy";
import {
  parseMatchListResponse,
  parseMatchPositiveInt,
  parseSingleMatchResponse,
} from "./shipper-match-parser";
import type { LoadPlanResponse, TruckSpecReferenceResponse } from "@/shared/api/generated/schemas";

export type MatchResponseItem = {
  matchId: number;
  quoteId?: number;
  driverId?: number;
  accepted?: boolean;
  status?: string;
  acceptedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  loadPlan?: LoadPlanResponse;
  truckSpec?: TruckSpecReferenceResponse;
  loadingPhotos?: string[];
  unloadingPhotos?: string[];
};

export type ShipperMatchItem = MatchResponseItem & {
  cancelable: boolean;
};

export type DriverMatchItem = MatchResponseItem;
export type MatchCounterOfferInput = DriverCounterOfferCreateInput;
export type DriverMatchDetailBadgeKey = "AI_RECOMMENDED" | "URGENT";

export type DriverMatchDetailBadge = {
  key: DriverMatchDetailBadgeKey;
  label: string;
};

export type DriverMatchActionGuard = {
  enabled: boolean;
  reason?: string;
};

export type DriverBatchAcceptInput = {
  matchIds: number[];
  routeType?: string;
  orderedQuoteIds?: number[];
};

const DRIVER_ACTION_GUARD_SERVER: DriverMatchActionGuard = {
  enabled: false,
  reason: "서버 권한/연동 준비중",
};

const DRIVER_ACTION_GUARD_MOCK: DriverMatchActionGuard = {
  enabled: true,
};

function toDriverMatchList(value: unknown): DriverMatchItem[] {
  return parseMatchListResponse(value);
}

function toShipperMatchList(value: unknown): ShipperMatchItem[] {
  return toDriverMatchList(value).map((item) => {
    const cancelable = normalizeStatus(item.status ?? "") !== BACKEND_STATUS.CANCELLED;
    return {
      ...item,
      cancelable,
    };
  });
}

function toSingleDriverMatch(value: unknown): DriverMatchItem | null {
  return parseSingleMatchResponse(value);
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function toBatchAcceptedMatches(value: unknown): DriverMatchItem[] {
  const payload = asObject(value);
  if (Array.isArray(payload.matches)) {
    return parseMatchListResponse(payload.matches);
  }
  return parseMatchListResponse(value);
}

export function getDriverMatchActionGuard(): DriverMatchActionGuard {
  return isMockMode() ? DRIVER_ACTION_GUARD_MOCK : DRIVER_ACTION_GUARD_SERVER;
}

export function getDriverMatchDetailBadges(match: DriverMatchItem | null): DriverMatchDetailBadge[] {
  if (!isMockMode()) return [];
  if (!match) return [];

  const safeMatchId = parseMatchPositiveInt(match.matchId);
  const status = normalizeStatus(match.status ?? "");
  if (safeMatchId <= 0) return [];

  const badges: DriverMatchDetailBadge[] = [];

  if (safeMatchId % 2 === 0) {
    badges.push({ key: "AI_RECOMMENDED", label: "AI 추천" });
  }

  if ((status === BACKEND_STATUS.OPEN || status === BACKEND_STATUS.MATCHED) && safeMatchId % 3 === 0) {
    badges.push({ key: "URGENT", label: "긴급 배차" });
  }

  return badges;
}

export async function listMyShipperMatches(): Promise<ShipperMatchItem[]> {
  if (isMockMode()) {
    await waitRandom();
    return toShipperMatchList(listMockFlowShipperMatches());
  }

  const data = await getMyShipperMatchesGenerated();
  return toShipperMatchList(data);
}

export function listShipperMatches(): Promise<ShipperMatchItem[]> {
  return listMyShipperMatches();
}

export async function createShipperMatch(quoteId: number): Promise<ShipperMatchItem | null> {
  const safeQuoteId = parseMatchPositiveInt(quoteId);
  if (safeQuoteId <= 0) return null;

  if (isMockMode()) {
    await waitRandom();
    return toSingleDriverMatch(createMockFlowShipperMatch({ quoteId: safeQuoteId })) as ShipperMatchItem | null;
  }

  const data = await createShipperMatchGenerated({ quoteId: safeQuoteId });
  const item = toSingleDriverMatch(data);
  if (!item) return null;
  return {
    ...item,
    cancelable: normalizeStatus(item.status ?? "") !== BACKEND_STATUS.CANCELLED,
  };
}

export async function cancelShipperMatch(matchId: number): Promise<void> {
  const safeMatchId = parseMatchPositiveInt(matchId);
  if (safeMatchId <= 0) return;

  if (isMockMode()) {
    await waitRandom();
    cancelMockFlowMatch(safeMatchId);
    return;
  }

  await cancelShipperMatchGenerated(safeMatchId);
}

export async function listOpenDriverMatches(): Promise<DriverMatchItem[]> {
  if (isMockMode()) {
    await waitRandom();
    return toDriverMatchList(listMockFlowDriverOpenMatches());
  }

  const data = await getOpenDriverMatchesGenerated();
  return toDriverMatchList(data);
}

export async function listMyDriverMatches(): Promise<DriverMatchItem[]> {
  if (isMockMode()) {
    await waitRandom();
    return toDriverMatchList(listMockFlowDriverMyMatches());
  }

  const data = await getMyDriverMatchesGenerated();
  return toDriverMatchList(data);
}

export async function listDriverMatches(): Promise<DriverMatchItem[]> {
  const [openMatches, myMatches] = await Promise.all([listOpenDriverMatches(), listMyDriverMatches()]);
  const merged = new Map<number, DriverMatchItem>();

  [...openMatches, ...myMatches].forEach((item) => {
    const current = merged.get(item.matchId);
    if (!current) {
      merged.set(item.matchId, item);
      return;
    }
    const currentTs = Date.parse(current.updatedAt ?? "");
    const nextTs = Date.parse(item.updatedAt ?? "");
    if (!Number.isFinite(nextTs) || (Number.isFinite(currentTs) && nextTs <= currentTs)) return;
    merged.set(item.matchId, item);
  });

  return Array.from(merged.values()).sort((a, b) => b.matchId - a.matchId);
}

export async function getDriverMatch(matchId: number): Promise<DriverMatchItem | null> {
  const safeMatchId = parseMatchPositiveInt(matchId);
  if (safeMatchId <= 0) return null;

  if (isMockMode()) {
    await waitRandom();
    return toSingleDriverMatch(getMockFlowDriverMatch(safeMatchId));
  }

  const data = await getDriverMatchGenerated(safeMatchId);
  return toSingleDriverMatch(data);
}

export async function acceptDriverMatch(matchId: number): Promise<DriverMatchItem | null> {
  const safeMatchId = parseMatchPositiveInt(matchId);
  if (safeMatchId <= 0) return null;

  if (isMockMode()) {
    await waitRandom();
    return toSingleDriverMatch(acceptMockFlowDriverMatch(safeMatchId));
  }

  const data = await acceptDriverMatchGenerated(safeMatchId);
  return toSingleDriverMatch(data);
}

export async function acceptDriverMatchesBatch(input: DriverBatchAcceptInput): Promise<DriverMatchItem[]> {
  const safeMatchIds = Array.from(
    new Set(
      (Array.isArray(input.matchIds) ? input.matchIds : [])
        .map((matchId) => parseMatchPositiveInt(matchId))
        .filter((matchId) => matchId > 0)
    )
  );
  if (safeMatchIds.length <= 0) return [];

  if (safeMatchIds.length === 1) {
    const single = await acceptDriverMatch(safeMatchIds[0]);
    return single ? [single] : [];
  }

  if (isMockMode()) {
    await waitRandom();
    return safeMatchIds
      .map((matchId) => toSingleDriverMatch(acceptMockFlowDriverMatch(matchId)))
      .filter((item): item is DriverMatchItem => Boolean(item));
  }

  const safeOrderedQuoteIds = Array.from(
    new Set(
      (Array.isArray(input.orderedQuoteIds) ? input.orderedQuoteIds : [])
        .map((quoteId) => parseMatchPositiveInt(quoteId))
        .filter((quoteId) => quoteId > 0)
    )
  );
  const payload = {
    matchIds: safeMatchIds,
    ...(typeof input.routeType === "string" && input.routeType.trim() ? { routeType: input.routeType.trim() } : {}),
    ...(safeOrderedQuoteIds.length > 0 ? { orderedQuoteIds: safeOrderedQuoteIds } : {}),
  };

  const data = await acceptDriverMatchesGenerated(payload as any);
  return toBatchAcceptedMatches(data);
}

export async function postCounterOffer(
  matchId: number,
  input: MatchCounterOfferInput,
  quoteIdHint?: number
): Promise<CounterOfferItem | null> {
  const safeMatchId = parseMatchPositiveInt(matchId);
  if (safeMatchId <= 0) return null;

  const safeQuoteIdHint = parseMatchPositiveInt(quoteIdHint);
  if (safeQuoteIdHint > 0) {
    return createDriverCounterOffer(safeQuoteIdHint, input ?? {});
  }

  const match = await getDriverMatch(safeMatchId);
  const safeQuoteId = parseMatchPositiveInt(match?.quoteId);
  if (safeQuoteId <= 0) return null;

  return createDriverCounterOffer(safeQuoteId, input ?? {});
}

export async function cancelDriverMatch(matchId: number): Promise<void> {
  const safeMatchId = parseMatchPositiveInt(matchId);
  if (safeMatchId <= 0) return;

  if (isMockMode()) {
    await waitRandom();
    cancelMockFlowMatch(safeMatchId);
    return;
  }

  await cancelDriverMatchGenerated(safeMatchId);
}
