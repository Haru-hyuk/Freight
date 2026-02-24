import {
  acceptMatch as acceptDriverMatchGenerated,
  cancelMatch1 as cancelDriverMatchGenerated,
  getMatch1 as getDriverMatchGenerated,
  getMyMatches1 as getMyDriverMatchesGenerated,
  getOpenMatches as getOpenDriverMatchesGenerated,
} from "@/shared/api/generated/driver-match-controller/driver-match-controller";
import {
  cancelMatch as cancelShipperMatchGenerated,
  createMatch as createShipperMatchGenerated,
  getMyMatches as getMyShipperMatchesGenerated,
} from "@/shared/api/generated/shipper-match-controller/shipper-match-controller";
import { isDriverMatchTerminal, normalizeDriverMatchStatus } from "@/features/matching/model/driverMatchStatus";

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

  return {
    matchId,
    quoteId: toPositiveInt(source.quoteId) || undefined,
    driverId: toPositiveInt(source.driverId) || undefined,
    accepted: toOptionalBoolean(source.accepted),
    status: toOptionalText(source.status),
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

function toSingleDriverMatch(value: unknown): DriverMatchItem | null {
  const payload = unwrapPayload(value);
  if (Array.isArray(payload)) {
    if (payload.length <= 0) return null;
    return toMatchResponseItem(payload[0]);
  }
  return toMatchResponseItem(payload);
}

function toShipperMatchList(value: unknown): ShipperMatchItem[] {
  return unwrapListPayload(value)
    .map((item) => toMatchResponseItem(item))
    .filter((item): item is MatchResponseItem => item !== null)
    .map((item) => {
      const status = normalizeDriverMatchStatus(item.status);
      return {
        ...item,
        cancelable: !isDriverMatchTerminal(status),
      };
    });
}

function toSingleShipperMatch(value: unknown): ShipperMatchItem | null {
  const item = toSingleDriverMatch(value);
  if (!item) return null;

  const status = normalizeDriverMatchStatus(item.status);
  return {
    ...item,
    cancelable: !isDriverMatchTerminal(status),
  };
}

function mergeDriverMatches(openMatches: DriverMatchItem[], myMatches: DriverMatchItem[]): DriverMatchItem[] {
  const merged = new Map<number, DriverMatchItem>();

  const push = (item: DriverMatchItem) => {
    const current = merged.get(item.matchId);
    if (!current) {
      merged.set(item.matchId, item);
      return;
    }

    const currentTs = Date.parse(current.updatedAt ?? "");
    const nextTs = Date.parse(item.updatedAt ?? "");
    if (!Number.isFinite(nextTs) || (Number.isFinite(currentTs) && nextTs <= currentTs)) return;
    merged.set(item.matchId, item);
  };

  openMatches.forEach(push);
  myMatches.forEach(push);

  return Array.from(merged.values()).sort((a, b) => b.matchId - a.matchId);
}

export async function listMyShipperMatches(): Promise<ShipperMatchItem[]> {
  const data = await getMyShipperMatchesGenerated();
  return toShipperMatchList(data);
}

export function listShipperMatches(): Promise<ShipperMatchItem[]> {
  return listMyShipperMatches();
}

export async function createShipperMatch(quoteId: number): Promise<ShipperMatchItem | null> {
  const safeQuoteId = toPositiveInt(quoteId);
  if (safeQuoteId <= 0) return null;

  const data = await createShipperMatchGenerated({ quoteId: safeQuoteId });
  return toSingleShipperMatch(data);
}

export async function cancelShipperMatch(matchId: number): Promise<void> {
  const safeMatchId = toPositiveInt(matchId);
  if (safeMatchId <= 0) return;

  await cancelShipperMatchGenerated(String(safeMatchId));
}

export async function listOpenDriverMatches(): Promise<DriverMatchItem[]> {
  const data = await getOpenDriverMatchesGenerated();
  return toDriverMatchList(data);
}

export async function listMyDriverMatches(): Promise<DriverMatchItem[]> {
  const data = await getMyDriverMatchesGenerated();
  return toDriverMatchList(data);
}

export async function listDriverMatches(): Promise<DriverMatchItem[]> {
  const [openMatches, myMatches] = await Promise.all([listOpenDriverMatches(), listMyDriverMatches()]);
  return mergeDriverMatches(openMatches, myMatches);
}

export async function getDriverMatch(matchId: number): Promise<DriverMatchItem | null> {
  const safeMatchId = toPositiveInt(matchId);
  if (safeMatchId <= 0) return null;

  const data = await getDriverMatchGenerated(String(safeMatchId));
  return toSingleDriverMatch(data);
}

export async function acceptDriverMatch(matchId: number): Promise<DriverMatchItem | null> {
  const safeMatchId = toPositiveInt(matchId);
  if (safeMatchId <= 0) return null;

  const data = await acceptDriverMatchGenerated(String(safeMatchId));
  return toSingleDriverMatch(data);
}

export async function cancelDriverMatch(matchId: number): Promise<void> {
  const safeMatchId = toPositiveInt(matchId);
  if (safeMatchId <= 0) return;

  await cancelDriverMatchGenerated(String(safeMatchId));
}
