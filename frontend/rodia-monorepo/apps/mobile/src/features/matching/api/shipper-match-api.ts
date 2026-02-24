import { apiClient } from "@/shared/lib/api/apiClient";
import { isMockQuoteEnabled } from "@/shared/lib/config/env";
import {
  cancelMatch as cancelShipperMatchGenerated,
  createMatch as createShipperMatchGenerated,
  getMyMatches as getMyShipperMatchesGenerated,
} from "@/shared/api/generated/shipper-match-controller/shipper-match-controller";
import {
  acceptMatch as acceptDriverMatchGenerated,
  cancelMatch1 as cancelDriverMatchGenerated,
  getMyMatches1 as getMyDriverMatchesGenerated,
  getOpenMatches as getOpenDriverMatchesGenerated,
} from "@/shared/api/generated/driver-match-controller/driver-match-controller";

type AnyObj = Record<string, unknown>;

export type MatchItem = {
  matchId: number;
  quoteId: number;
  driverId: number;
  accepted: boolean;
  status: string;
  acceptedAt?: string;
  createdAt: string;
  updatedAt: string;
  cancelable: boolean;
};

export type ShipperMatchItem = MatchItem;
export type DriverMatchItem = MatchItem;

interface ShipperMatchApi {
  listMyMatches: () => Promise<ShipperMatchItem[]>;
  createShipperMatch: (quoteId: number) => Promise<ShipperMatchItem | null>;
  cancelShipperMatch: (matchId: number) => Promise<void>;
}

interface DriverMatchApi {
  listOpenMatches: () => Promise<DriverMatchItem[]>;
  listMyMatches: () => Promise<DriverMatchItem[]>;
  acceptDriverMatch: (matchId: number) => Promise<DriverMatchItem | null>;
  cancelDriverMatch: (matchId: number) => Promise<void>;
}

const SHIPPER_MATCHES_PATH = "/api/shipper/matches";
const DRIVER_MATCHES_PATH = "/api/driver/matches";
const UNAVAILABLE_CANCEL_STATUSES = new Set(["CANCELED", "COMPLETED", "DROPOFF", "DELIVERED"]);

function isPlainObject(input: unknown): input is AnyObj {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function asObject(input: unknown): AnyObj {
  return isPlainObject(input) ? input : {};
}

function safeNumber(input: unknown, fallback = 0): number {
  const value = typeof input === "number" ? input : Number(input);
  return Number.isFinite(value) ? value : fallback;
}

function safeInt(input: unknown, fallback = 0): number {
  return Math.trunc(safeNumber(input, fallback));
}

function safeString(input: unknown, fallback = ""): string {
  if (typeof input === "string") return input.trim();
  if (typeof input === "number" || typeof input === "boolean") return String(input);
  return fallback;
}

function safeIsoDate(input: unknown, fallback: string): string {
  const raw = safeString(input, "");
  if (!raw) return fallback;
  const ts = Date.parse(raw);
  return Number.isFinite(ts) ? new Date(ts).toISOString() : fallback;
}

function pickPayload(input: unknown): unknown {
  const root = asObject(input);
  if (typeof root.data !== "undefined" && root.data !== null) return root.data;
  if (typeof root.result !== "undefined" && root.result !== null) return root.result;
  return input;
}

function pickListPayload(input: unknown): unknown[] {
  const payload = pickPayload(input);
  if (Array.isArray(payload)) return payload;

  const obj = asObject(payload);
  const candidates = [obj.items, obj.list, obj.content, obj.data, obj.result];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
}

function normalizeMatchId(matchId: number): number {
  if (!Number.isFinite(matchId)) return 0;
  return Math.max(0, Math.trunc(matchId));
}

function normalizeQuoteId(quoteId: number): number {
  if (!Number.isFinite(quoteId)) return 0;
  return Math.max(0, Math.trunc(quoteId));
}

function isCancelable(status: string): boolean {
  const normalized = status.trim().toUpperCase();
  if (!normalized) return true;
  return !UNAVAILABLE_CANCEL_STATUSES.has(normalized);
}

function toMatchItem(input: unknown): MatchItem {
  const nowIso = new Date().toISOString();
  const source = asObject(input);

  const matchId = Math.max(0, safeInt(source.matchId, 0));
  const quoteId = Math.max(0, safeInt(source.quoteId, 0));
  const status = safeString(source.status, "UNKNOWN");

  return {
    matchId,
    quoteId,
    driverId: Math.max(0, safeInt(source.driverId, 0)),
    accepted: Boolean(source.accepted),
    status,
    acceptedAt: safeString(source.acceptedAt, "") || undefined,
    createdAt: safeIsoDate(source.createdAt, nowIso),
    updatedAt: safeIsoDate(source.updatedAt, nowIso),
    cancelable: matchId > 0 && isCancelable(status),
  };
}

function toMatchList(input: unknown): MatchItem[] {
  const list = pickListPayload(input);
  const mapped = list.map((item) => toMatchItem(item));
  return mapped.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

function toSingleMatch(input: unknown): MatchItem | null {
  const payload = pickPayload(input);
  if (Array.isArray(payload)) return payload.length > 0 ? toMatchItem(payload[0]) : null;
  const obj = asObject(payload);
  const matchId = Math.max(0, safeInt(obj.matchId, 0));
  if (matchId <= 0) return null;
  return toMatchItem(obj);
}

function mergeDriverMatches(openMatches: DriverMatchItem[], myMatches: DriverMatchItem[]): DriverMatchItem[] {
  const merged = new Map<string, DriverMatchItem>();

  const push = (item: DriverMatchItem) => {
    const key = item.matchId > 0 ? `m:${item.matchId}` : `q:${item.quoteId}:${item.status}:${item.createdAt}`;
    const current = merged.get(key);
    if (!current) {
      merged.set(key, item);
      return;
    }

    const currentUpdatedAt = Date.parse(current.updatedAt);
    const nextUpdatedAt = Date.parse(item.updatedAt);
    if (Number.isFinite(nextUpdatedAt) && nextUpdatedAt > currentUpdatedAt) {
      merged.set(key, item);
    }
  };

  openMatches.forEach(push);
  myMatches.forEach(push);

  return Array.from(merged.values()).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

function createRealShipperMatchApi(): ShipperMatchApi {
  return {
    async listMyMatches(): Promise<ShipperMatchItem[]> {
      const data = await getMyShipperMatchesGenerated();
      return toMatchList(data);
    },

    async createShipperMatch(quoteId: number): Promise<ShipperMatchItem | null> {
      const safeQuoteId = normalizeQuoteId(quoteId);
      if (safeQuoteId <= 0) return null;

      try {
        const data = await createShipperMatchGenerated({ quoteId: safeQuoteId });
        return toSingleMatch(data);
      } catch {
        const res = await apiClient.post(SHIPPER_MATCHES_PATH, { quoteId: safeQuoteId });
        return toSingleMatch((res as { data?: unknown })?.data);
      }
    },

    async cancelShipperMatch(matchId: number): Promise<void> {
      const safeMatchId = normalizeMatchId(matchId);
      if (safeMatchId <= 0) return;

      try {
        await cancelShipperMatchGenerated(String(safeMatchId));
      } catch {
        await apiClient.delete(`${SHIPPER_MATCHES_PATH}/${safeMatchId}`);
      }
    },
  };
}

function createMockShipperMatchApi(): ShipperMatchApi {
  return {
    async listMyMatches(): Promise<ShipperMatchItem[]> {
      const nowIso = new Date().toISOString();
      return [
        {
          matchId: 1,
          quoteId: 101,
          driverId: 10,
          accepted: true,
          status: "ASSIGNED",
          createdAt: nowIso,
          updatedAt: nowIso,
          cancelable: true,
        },
      ];
    },

    async createShipperMatch(quoteId: number): Promise<ShipperMatchItem | null> {
      const safeQuoteId = normalizeQuoteId(quoteId);
      if (safeQuoteId <= 0) return null;
      const nowIso = new Date().toISOString();
      return {
        matchId: Math.max(1, safeQuoteId + 9000),
        quoteId: safeQuoteId,
        driverId: 0,
        accepted: false,
        status: "OPEN",
        createdAt: nowIso,
        updatedAt: nowIso,
        cancelable: true,
      };
    },

    async cancelShipperMatch(_matchId: number): Promise<void> {
      return;
    },
  };
}

function createRealDriverMatchApi(): DriverMatchApi {
  return {
    async listOpenMatches(): Promise<DriverMatchItem[]> {
      const data = await getOpenDriverMatchesGenerated();
      return toMatchList(data);
    },

    async listMyMatches(): Promise<DriverMatchItem[]> {
      const data = await getMyDriverMatchesGenerated();
      return toMatchList(data);
    },

    async acceptDriverMatch(matchId: number): Promise<DriverMatchItem | null> {
      const safeMatchId = normalizeMatchId(matchId);
      if (safeMatchId <= 0) return null;

      try {
        const data = await acceptDriverMatchGenerated(String(safeMatchId));
        return toSingleMatch(data);
      } catch {
        const res = await apiClient.post(`${DRIVER_MATCHES_PATH}/${safeMatchId}/accept`);
        return toSingleMatch((res as { data?: unknown })?.data);
      }
    },

    async cancelDriverMatch(matchId: number): Promise<void> {
      const safeMatchId = normalizeMatchId(matchId);
      if (safeMatchId <= 0) return;

      try {
        await cancelDriverMatchGenerated(String(safeMatchId));
      } catch {
        await apiClient.delete(`${DRIVER_MATCHES_PATH}/${safeMatchId}`);
      }
    },
  };
}

function createMockDriverMatchApi(): DriverMatchApi {
  return {
    async listOpenMatches(): Promise<DriverMatchItem[]> {
      const nowIso = new Date().toISOString();
      return [
        {
          matchId: 201,
          quoteId: 101,
          driverId: 0,
          accepted: false,
          status: "OPEN",
          createdAt: nowIso,
          updatedAt: nowIso,
          cancelable: false,
        },
      ];
    },

    async listMyMatches(): Promise<DriverMatchItem[]> {
      const nowIso = new Date().toISOString();
      return [
        {
          matchId: 202,
          quoteId: 102,
          driverId: 1,
          accepted: true,
          status: "ASSIGNED",
          createdAt: nowIso,
          updatedAt: nowIso,
          cancelable: true,
        },
      ];
    },

    async acceptDriverMatch(matchId: number): Promise<DriverMatchItem | null> {
      const safeMatchId = normalizeMatchId(matchId);
      if (safeMatchId <= 0) return null;
      const nowIso = new Date().toISOString();
      return {
        matchId: safeMatchId,
        quoteId: safeMatchId,
        driverId: 1,
        accepted: true,
        status: "ASSIGNED",
        createdAt: nowIso,
        updatedAt: nowIso,
        cancelable: true,
      };
    },

    async cancelDriverMatch(_matchId: number): Promise<void> {
      return;
    },
  };
}

function resolveShipperMatchApi(): ShipperMatchApi {
  return isMockQuoteEnabled() ? createMockShipperMatchApi() : createRealShipperMatchApi();
}

function resolveDriverMatchApi(): DriverMatchApi {
  return isMockQuoteEnabled() ? createMockDriverMatchApi() : createRealDriverMatchApi();
}

const shipperMatchApi = resolveShipperMatchApi();
const driverMatchApi = resolveDriverMatchApi();

export function listMyShipperMatches(): Promise<ShipperMatchItem[]> {
  return shipperMatchApi.listMyMatches();
}

export function listShipperMatches(): Promise<ShipperMatchItem[]> {
  return listMyShipperMatches();
}

export function createShipperMatch(quoteId: number): Promise<ShipperMatchItem | null> {
  return shipperMatchApi.createShipperMatch(quoteId);
}

export function cancelShipperMatch(matchId: number): Promise<void> {
  return shipperMatchApi.cancelShipperMatch(matchId);
}

export function listOpenDriverMatches(): Promise<DriverMatchItem[]> {
  return driverMatchApi.listOpenMatches();
}

export function listMyDriverMatches(): Promise<DriverMatchItem[]> {
  return driverMatchApi.listMyMatches();
}

export async function listDriverMatches(): Promise<DriverMatchItem[]> {
  const [openMatches, myMatches] = await Promise.all([listOpenDriverMatches(), listMyDriverMatches()]);
  return mergeDriverMatches(openMatches, myMatches);
}

export function acceptDriverMatch(matchId: number): Promise<DriverMatchItem | null> {
  return driverMatchApi.acceptDriverMatch(matchId);
}

export function cancelDriverMatch(matchId: number): Promise<void> {
  return driverMatchApi.cancelDriverMatch(matchId);
}
