import { completeTransit as completeTransitGenerated, startTransit as startTransitGenerated } from "@/shared/api/generated/driver-match-controller/driver-match-controller";
import { submitDriverGps as submitDriverGpsGenerated, updateTrackingSharing as updateTrackingSharingGenerated } from "@/shared/api/generated/tracking-controller/tracking-controller";
import type {
  GpsLogUpsertRequest,
  GpsLogUpsertResponse,
  TrackingShareStateResponse,
  TrackingShareUpdateRequest,
} from "@/shared/api/generated/schemas";
import type { DriverMatchItem } from "@/features/matching/api/shipper-match-api";
import { parseMatchPositiveInt, parseSingleMatchResponse } from "@/features/matching/api/shipper-match-parser";

type AnyObject = Record<string, unknown>;

export type DriverGpsSubmitInput = GpsLogUpsertRequest;
export type DriverTrackingShareUpdateInput = TrackingShareUpdateRequest;

function asObject(value: unknown): AnyObject {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as AnyObject;
  }
  return {};
}

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
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

function toGpsLogUpsertResponse(value: unknown): GpsLogUpsertResponse | null {
  const source = asObject(unwrapPayload(value));
  const gpsLogId = parseMatchPositiveInt(source.gpsLogId);
  const matchId = parseMatchPositiveInt(source.matchId);
  const loggedAt = toText(source.loggedAt);
  const deduplicated = toOptionalBoolean(source.deduplicated);
  const reason = toText(source.reason);

  if (gpsLogId <= 0 && matchId <= 0 && !loggedAt && typeof deduplicated === "undefined" && !reason) {
    return null;
  }

  return {
    ...(gpsLogId > 0 ? { gpsLogId } : {}),
    ...(matchId > 0 ? { matchId } : {}),
    ...(loggedAt ? { loggedAt } : {}),
    ...(typeof deduplicated !== "undefined" ? { deduplicated } : {}),
    ...(reason ? { reason } : {}),
  };
}

function toTrackingShareStateResponse(value: unknown): TrackingShareStateResponse | null {
  const source = asObject(unwrapPayload(value));
  const matchId = parseMatchPositiveInt(source.matchId);
  const enabled = toOptionalBoolean(source.enabled);
  const updatedAt = toText(source.updatedAt);

  if (matchId <= 0 && typeof enabled === "undefined" && !updatedAt) {
    return null;
  }

  return {
    ...(matchId > 0 ? { matchId } : {}),
    ...(typeof enabled !== "undefined" ? { enabled } : {}),
    ...(updatedAt ? { updatedAt } : {}),
  };
}

export async function startDriverTransit(matchId: number): Promise<DriverMatchItem | null> {
  const safeMatchId = parseMatchPositiveInt(matchId);
  if (safeMatchId <= 0) return null;

  const data = await startTransitGenerated(safeMatchId);
  return parseSingleMatchResponse(data);
}

export async function completeDriverTransit(matchId: number): Promise<DriverMatchItem | null> {
  const safeMatchId = parseMatchPositiveInt(matchId);
  if (safeMatchId <= 0) return null;

  const data = await completeTransitGenerated(safeMatchId);
  return parseSingleMatchResponse(data);
}

export async function submitDriverRunGps(
  matchId: number,
  payload: DriverGpsSubmitInput
): Promise<GpsLogUpsertResponse | null> {
  const safeMatchId = parseMatchPositiveInt(matchId);
  if (safeMatchId <= 0) return null;

  const data = await submitDriverGpsGenerated(safeMatchId, payload);
  return toGpsLogUpsertResponse(data);
}

export async function updateDriverRunTrackingSharing(
  matchId: number,
  payload: DriverTrackingShareUpdateInput
): Promise<TrackingShareStateResponse | null> {
  const safeMatchId = parseMatchPositiveInt(matchId);
  if (safeMatchId <= 0) return null;

  const data = await updateTrackingSharingGenerated(safeMatchId, payload);
  return toTrackingShareStateResponse(data);
}
