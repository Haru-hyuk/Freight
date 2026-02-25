import { BACKEND_STATUS, normalizeStatus } from "@/shared/lib/policy";

type AnyObject = Record<string, unknown>;

/**
 * Shipper match parser boundary
 * - driver/shipper match 응답 payload를 단일 형태로 풀어내고 최소 정규화한다.
 * - 목록/단건 unwrap, id/status/nullable 처리, 기본 정렬만 담당한다.
 * - cancelable 계산, 배지/CTA 정책 같은 도메인 해석은 API/정책 계층에 남긴다.
 */
export type ParsedMatchResponseItem = {
  matchId: number;
  quoteId?: number;
  driverId?: number;
  accepted?: boolean;
  status?: string;
  acceptedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

function asObject(value: unknown): AnyObject {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as AnyObject;
  }
  return {};
}

export function parseMatchPositiveInt(value: unknown): number {
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

function toNormalizedMatchStatus(value: unknown): string | undefined {
  const text = toOptionalText(value);
  if (!text) return undefined;
  const normalized = normalizeStatus(text);
  return normalized === BACKEND_STATUS.UNKNOWN ? undefined : normalized;
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

function parseMatchResponseItem(value: unknown): ParsedMatchResponseItem | null {
  const source = asObject(value);
  const matchId = parseMatchPositiveInt(source.matchId);
  if (matchId <= 0) return null;

  const quoteId = parseMatchPositiveInt(source.quoteId);
  const driverId = parseMatchPositiveInt(source.driverId);

  return {
    matchId,
    quoteId: quoteId > 0 ? quoteId : undefined,
    driverId: driverId > 0 ? driverId : undefined,
    accepted: toOptionalBoolean(source.accepted),
    status: toNormalizedMatchStatus(source.status),
    acceptedAt: toOptionalText(source.acceptedAt),
    createdAt: toOptionalText(source.createdAt),
    updatedAt: toOptionalText(source.updatedAt),
  };
}

function sortByUpdatedAtDesc(a: ParsedMatchResponseItem, b: ParsedMatchResponseItem): number {
  const aTs = Date.parse(a.updatedAt ?? "");
  const bTs = Date.parse(b.updatedAt ?? "");
  if (Number.isFinite(aTs) && Number.isFinite(bTs)) return bTs - aTs;
  if (Number.isFinite(bTs)) return 1;
  if (Number.isFinite(aTs)) return -1;
  return b.matchId - a.matchId;
}

export function parseMatchListResponse(value: unknown): ParsedMatchResponseItem[] {
  return unwrapListPayload(value)
    .map((item) => parseMatchResponseItem(item))
    .filter((item): item is ParsedMatchResponseItem => item !== null)
    .sort(sortByUpdatedAtDesc);
}

export function parseSingleMatchResponse(value: unknown): ParsedMatchResponseItem | null {
  const payload = unwrapPayload(value);
  if (Array.isArray(payload)) {
    if (payload.length <= 0) return null;
    return parseMatchResponseItem(payload[0]);
  }
  return parseMatchResponseItem(payload);
}
