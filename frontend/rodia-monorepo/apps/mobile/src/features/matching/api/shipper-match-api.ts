import {
  acceptMatch as acceptDriverMatchGenerated,
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
  acceptMockDriverMatch,
  cancelMockMatch,
  createMockShipperMatch,
  getMockDriverMatch,
  listMockDriverMyMatches,
  listMockDriverOpenMatches,
  listMockShipperMatches,
  waitNetwork,
} from "@/shared/lib/mock/MockHub";

type AnyObject = Record<string, unknown>;

export type MatchResponseItem = {
  matchId: number;
  quoteId?: number;
  driverId?: number;
  accepted?: boolean;
  status?: string;
  acceptedAt?: string;
  createdAt?: string;
  updatedAt?: string;
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

const DRIVER_ACTION_GUARD_SERVER: DriverMatchActionGuard = {
  enabled: false,
  reason: "서버 권한/연동 준비중",
};

const DRIVER_ACTION_GUARD_MOCK: DriverMatchActionGuard = {
  enabled: true,
};

function asObject(value: unknown): AnyObject {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as AnyObject;
  }
  return {};
}

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

function normalizeStatus(value: unknown): string | undefined {
  const text = toOptionalText(value);
  if (!text) return undefined;
  const upper = text.toUpperCase();
  if (upper === "CANCELLED") return "CANCELED";
  return upper;
}

function unwrapPayload(value: unknown): unknown {
  const root = asObject(value);
  if (typeof root.data !== "undefined") return root.data;
  if (typeof root.result !== "undefined") return root.result;
  return value;
}

function unwrapListPayload(value: unknown): unknown[] {
  const payload = unwrapPayload(value);
  if (Array.isArray(payload)) return payload;

  const source = asObject(payload);
  if (Array.isArray(source.items)) return source.items;
  if (Array.isArray(source.list)) return source.list;
  if (Array.isArray(source.content)) return source.content;

  return [];
}

function toMatchResponseItem(value: unknown): MatchResponseItem | null {
  const source = asObject(value);
  const matchId = toPositiveInt(source.matchId);
  if (matchId <= 0) return null;

  const quoteId = toPositiveInt(source.quoteId);
  const driverId = toPositiveInt(source.driverId);

  return {
    matchId,
    quoteId: quoteId > 0 ? quoteId : undefined,
    driverId: driverId > 0 ? driverId : undefined,
    accepted: toOptionalBoolean(source.accepted),
    status: normalizeStatus(source.status),
    acceptedAt: toOptionalText(source.acceptedAt),
    createdAt: toOptionalText(source.createdAt),
    updatedAt: toOptionalText(source.updatedAt),
  };
}

function toDriverMatchList(value: unknown): DriverMatchItem[] {
  return unwrapListPayload(value)
    .map((item) => toMatchResponseItem(item))
    .filter((item): item is DriverMatchItem => item !== null)
    .sort((a, b) => {
      const aTs = Date.parse(a.updatedAt ?? "");
      const bTs = Date.parse(b.updatedAt ?? "");
      if (Number.isFinite(aTs) && Number.isFinite(bTs)) return bTs - aTs;
      if (Number.isFinite(bTs)) return 1;
      if (Number.isFinite(aTs)) return -1;
      return b.matchId - a.matchId;
    });
}

function toShipperMatchList(value: unknown): ShipperMatchItem[] {
  return toDriverMatchList(value).map((item) => {
    const status = normalizeStatus(item.status);
    const cancelable = status !== "CANCELED";
    return {
      ...item,
      cancelable,
    };
  });
}

function toSingleDriverMatch(value: unknown): DriverMatchItem | null {
  const payload = unwrapPayload(value);
  if (Array.isArray(payload)) {
    if (payload.length <= 0) return null;
    return toMatchResponseItem(payload[0]);
  }
  return toMatchResponseItem(payload);
}

export function getDriverMatchActionGuard(): DriverMatchActionGuard {
  return isMockMode() ? DRIVER_ACTION_GUARD_MOCK : DRIVER_ACTION_GUARD_SERVER;
}

export function getDriverMatchDetailBadges(match: DriverMatchItem | null): DriverMatchDetailBadge[] {
  if (!isMockMode()) return [];
  if (!match) return [];

  const safeMatchId = toPositiveInt(match.matchId);
  const status = normalizeStatus(match.status);
  if (safeMatchId <= 0) return [];

  const badges: DriverMatchDetailBadge[] = [];

  if (safeMatchId % 2 === 0) {
    badges.push({ key: "AI_RECOMMENDED", label: "AI 추천" });
  }

  if ((status === "OPEN" || status === "NEGOTIATING") && safeMatchId % 3 === 0) {
    badges.push({ key: "URGENT", label: "긴급 배차" });
  }

  return badges;
}

export async function listMyShipperMatches(): Promise<ShipperMatchItem[]> {
  if (isMockMode()) {
    await waitNetwork();
    return toShipperMatchList(listMockShipperMatches());
  }

  const data = await getMyShipperMatchesGenerated();
  return toShipperMatchList(data);
}

export function listShipperMatches(): Promise<ShipperMatchItem[]> {
  return listMyShipperMatches();
}

export async function createShipperMatch(quoteId: number): Promise<ShipperMatchItem | null> {
  const safeQuoteId = toPositiveInt(quoteId);
  if (safeQuoteId <= 0) return null;

  if (isMockMode()) {
    await waitNetwork();
    return toSingleDriverMatch(createMockShipperMatch({ quoteId: safeQuoteId })) as ShipperMatchItem | null;
  }

  const data = await createShipperMatchGenerated({ quoteId: safeQuoteId });
  const item = toSingleDriverMatch(data);
  if (!item) return null;
  return {
    ...item,
    cancelable: normalizeStatus(item.status) !== "CANCELED",
  };
}

export async function cancelShipperMatch(matchId: number): Promise<void> {
  const safeMatchId = toPositiveInt(matchId);
  if (safeMatchId <= 0) return;

  if (isMockMode()) {
    await waitNetwork();
    cancelMockMatch(safeMatchId);
    return;
  }

  await cancelShipperMatchGenerated(String(safeMatchId));
}

export async function listOpenDriverMatches(): Promise<DriverMatchItem[]> {
  if (isMockMode()) {
    await waitNetwork();
    return toDriverMatchList(listMockDriverOpenMatches());
  }

  const data = await getOpenDriverMatchesGenerated();
  return toDriverMatchList(data);
}

export async function listMyDriverMatches(): Promise<DriverMatchItem[]> {
  if (isMockMode()) {
    await waitNetwork();
    return toDriverMatchList(listMockDriverMyMatches());
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
  const safeMatchId = toPositiveInt(matchId);
  if (safeMatchId <= 0) return null;

  if (isMockMode()) {
    await waitNetwork();
    return toSingleDriverMatch(getMockDriverMatch(safeMatchId));
  }

  const data = await getDriverMatchGenerated(String(safeMatchId));
  return toSingleDriverMatch(data);
}

export async function acceptDriverMatch(matchId: number): Promise<DriverMatchItem | null> {
  const safeMatchId = toPositiveInt(matchId);
  if (safeMatchId <= 0) return null;

  if (isMockMode()) {
    await waitNetwork();
    return toSingleDriverMatch(acceptMockDriverMatch(safeMatchId));
  }

  const data = await acceptDriverMatchGenerated(String(safeMatchId));
  return toSingleDriverMatch(data);
}

export async function postCounterOffer(
  matchId: number,
  input: MatchCounterOfferInput,
  quoteIdHint?: number
): Promise<CounterOfferItem | null> {
  const safeMatchId = toPositiveInt(matchId);
  if (safeMatchId <= 0) return null;

  const safeQuoteIdHint = toPositiveInt(quoteIdHint);
  if (safeQuoteIdHint > 0) {
    return createDriverCounterOffer(safeQuoteIdHint, input ?? {});
  }

  const match = await getDriverMatch(safeMatchId);
  const safeQuoteId = toPositiveInt(match?.quoteId);
  if (safeQuoteId <= 0) return null;

  return createDriverCounterOffer(safeQuoteId, input ?? {});
}

export async function cancelDriverMatch(matchId: number): Promise<void> {
  const safeMatchId = toPositiveInt(matchId);
  if (safeMatchId <= 0) return;

  if (isMockMode()) {
    await waitNetwork();
    cancelMockMatch(safeMatchId);
    return;
  }

  await cancelDriverMatchGenerated(String(safeMatchId));
}
