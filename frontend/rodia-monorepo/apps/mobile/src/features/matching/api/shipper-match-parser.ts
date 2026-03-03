import type { LoadPlanResponse } from "@/shared/api/generated/schemas/loadPlanResponse";
import type { TruckSpecReferenceResponse } from "@/shared/api/generated/schemas/truckSpecReferenceResponse";

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
  /** 적재 계획 데이터 (서버/mock 응답에 포함된 경우 그대로 전달) */
  loadPlan?: LoadPlanResponse;
  /** 차량 스펙 데이터 (서버/mock 응답에 포함된 경우 그대로 전달) */
  truckSpec?: TruckSpecReferenceResponse;
  /** 상차 사진 URIs */
  loadingPhotos?: string[];
  /** 하차 사진 URIs */
  unloadingPhotos?: string[];
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

function toStatusToken(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
}

function toNormalizedMatchStatus(value: unknown): string | undefined {
  const token = toStatusToken(value);
  if (!token) return undefined;

  if (token === "CANCELLED") return "CANCELED";
  if (token === "MATCHED") return "ASSIGNED";
  if (token === "IN_TRANSIT" || token === "DRIVING") return "TRANSIT";
  if (token === "DELIVERED" || token === "COMPLETED") return "DROPOFF";
  return token;
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
    // 선택적 페이로드 필드 — 서버/mock에서 내려오면 그대로 전달, 없으면 undefined
    loadPlan: source.loadPlan !== undefined ? (source.loadPlan as LoadPlanResponse) : undefined,
    truckSpec: source.truckSpec !== undefined ? (source.truckSpec as TruckSpecReferenceResponse) : undefined,
    loadingPhotos: Array.isArray(source.loadingPhotos) ? (source.loadingPhotos as string[]) : undefined,
    unloadingPhotos: Array.isArray(source.unloadingPhotos) ? (source.unloadingPhotos as string[]) : undefined,
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
