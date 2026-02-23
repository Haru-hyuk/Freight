import { apiClient } from "@/shared/lib/api/apiClient";
import { isMockQuoteEnabled } from "@/shared/lib/config/env";
import { cancelMatch as cancelMatchGenerated, getMyMatches as getMyMatchesGenerated } from "@/shared/api/generated/shipper-match-controller/shipper-match-controller";

type AnyObj = Record<string, unknown>;

export type ShipperMatchItem = {
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

interface ShipperMatchApi {
  listMyMatches: () => Promise<ShipperMatchItem[]>;
  cancelShipperMatch: (matchId: number) => Promise<void>;
}

const SHIPPER_MATCHES_PATH = "/api/shipper/matches";
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

function isCancelable(status: string): boolean {
  const normalized = status.trim().toUpperCase();
  if (!normalized) return true;
  return !UNAVAILABLE_CANCEL_STATUSES.has(normalized);
}

function toMatchItem(input: unknown): ShipperMatchItem {
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

function toMatchList(input: unknown): ShipperMatchItem[] {
  const list = pickListPayload(input);
  const mapped = list.map((item) => toMatchItem(item));
  return mapped.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

function createRealMatchApi(): ShipperMatchApi {
  return {
    async listMyMatches(): Promise<ShipperMatchItem[]> {
      const data = await getMyMatchesGenerated();
      return toMatchList(data);
    },

    async cancelShipperMatch(matchId: number): Promise<void> {
      const safeMatchId = normalizeMatchId(matchId);
      if (safeMatchId <= 0) return;

      try {
        await cancelMatchGenerated(String(safeMatchId));
      } catch {
        await apiClient.delete(`${SHIPPER_MATCHES_PATH}/${safeMatchId}`);
      }
    },
  };
}

function createMockMatchApi(): ShipperMatchApi {
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
        {
          matchId: 2,
          quoteId: 102,
          driverId: 11,
          accepted: true,
          status: "TRANSIT",
          createdAt: nowIso,
          updatedAt: nowIso,
          cancelable: true,
        },
      ];
    },

    async cancelShipperMatch(_matchId: number): Promise<void> {
      return;
    },
  };
}

function resolveMatchApi(): ShipperMatchApi {
  return isMockQuoteEnabled() ? createMockMatchApi() : createRealMatchApi();
}

const shipperMatchApi = resolveMatchApi();

export function listMyShipperMatches(): Promise<ShipperMatchItem[]> {
  return shipperMatchApi.listMyMatches();
}

export function listShipperMatches(): Promise<ShipperMatchItem[]> {
  return listMyShipperMatches();
}

export function cancelShipperMatch(matchId: number): Promise<void> {
  return shipperMatchApi.cancelShipperMatch(matchId);
}
