import { completeTransit as completeTransitGenerated, startTransit as startTransitGenerated } from "@/shared/api/generated/driver-match/driver-match";
import { getDriverMatchPhotos as getDriverMatchPhotosGenerated } from "@/shared/api/generated/delivery-photo/delivery-photo";
import { submitDriverGps as submitDriverGpsGenerated, updateTrackingSharing as updateTrackingSharingGenerated } from "@/shared/api/generated/tracking/tracking";
import type {
  DeliveryPhotoResponse,
  GpsLogUpsertRequest,
  GpsLogUpsertResponse,
  TrackingShareStateResponse,
  TrackingShareUpdateRequest,
  UploadDriverPhotoType,
} from "@/shared/api/generated/schemas";
import { uploadDriverPhotoMultipart } from "@/features/matching/api/driver-photo-upload-api";
import type { DriverMatchItem } from "@/features/matching/api/shipper-match-api";
import { parseMatchPositiveInt, parseSingleMatchResponse } from "@/features/matching/api/shipper-match-parser";
import { getApiBaseUrl } from "@/shared/lib/config/env";

type AnyObject = Record<string, unknown>;

export type DriverGpsSubmitInput = GpsLogUpsertRequest;
export type DriverTrackingShareUpdateInput = TrackingShareUpdateRequest;
export type DriverPhotoType = UploadDriverPhotoType;
export type DriverPhotoUploadInput = {
  localUri: string;
  type: UploadDriverPhotoType;
  takenAt?: string;
  lat?: number;
  lng?: number;
  stopOrder?: number;
  stopLabel?: string;
};

function asObject(value: unknown): AnyObject {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as AnyObject;
  }
  return {};
}

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toOptionalFiniteNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
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

function withAbsoluteApiUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return pathOrUrl;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;

  const normalizedPath = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  const base = getApiBaseUrl().replace(/\/+$/, "");
  return `${base}${normalizedPath}`;
}

function normalizePhotoType(value: unknown): UploadDriverPhotoType | undefined {
  const token = toText(value)
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
  if (token === "PICKUP" || token === "DELIVERY") {
    return token as UploadDriverPhotoType;
  }
  return undefined;
}

function toDeliveryPhotoResponse(value: unknown): DeliveryPhotoResponse | null {
  const source = asObject(unwrapPayload(value));
  const photoId = parseMatchPositiveInt(source.photoId);
  const matchId = parseMatchPositiveInt(source.matchId);
  const driverId = parseMatchPositiveInt(source.driverId);
  const type = normalizePhotoType(source.type);
  const fileUrl = toText(source.fileUrl);
  const takenAt = toText(source.takenAt);
  const lat = toOptionalFiniteNumber(source.lat);
  const lng = toOptionalFiniteNumber(source.lng);
  const fileSize = toOptionalFiniteNumber(source.fileSize);
  const mimeType = toText(source.mimeType);
  const stopOrder = parseMatchPositiveInt(source.stopOrder);
  const stopLabel = toText(source.stopLabel);
  const createdAt = toText(source.createdAt);

  if (
    photoId <= 0 &&
    matchId <= 0 &&
    driverId <= 0 &&
    !type &&
    !fileUrl &&
    !takenAt &&
    typeof lat === "undefined" &&
    typeof lng === "undefined" &&
    typeof fileSize === "undefined" &&
    !mimeType &&
    stopOrder <= 0 &&
    !stopLabel &&
    !createdAt
  ) {
    return null;
  }

  return {
    ...(photoId > 0 ? { photoId } : {}),
    ...(matchId > 0 ? { matchId } : {}),
    ...(driverId > 0 ? { driverId } : {}),
    ...(type ? { type } : {}),
    ...(fileUrl ? { fileUrl: withAbsoluteApiUrl(fileUrl) } : {}),
    ...(takenAt ? { takenAt } : {}),
    ...(typeof lat === "number" ? { lat } : {}),
    ...(typeof lng === "number" ? { lng } : {}),
    ...(typeof fileSize === "number" ? { fileSize } : {}),
    ...(mimeType ? { mimeType } : {}),
    ...(stopOrder > 0 ? { stopOrder } : {}),
    ...(stopLabel ? { stopLabel } : {}),
    ...(createdAt ? { createdAt } : {}),
  };
}

function toDeliveryPhotoList(value: unknown): DeliveryPhotoResponse[] {
  const payload = unwrapPayload(value);
  if (Array.isArray(payload)) {
    return payload
      .map((item) => toDeliveryPhotoResponse(item))
      .filter((item): item is DeliveryPhotoResponse => item !== null);
  }

  const source = asObject(payload);
  const items = Array.isArray(source.items)
    ? source.items
    : Array.isArray(source.list)
      ? source.list
      : Array.isArray(source.content)
        ? source.content
        : [];
  return items
    .map((item) => toDeliveryPhotoResponse(item))
    .filter((item): item is DeliveryPhotoResponse => item !== null);
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

export async function getDriverRunPhotos(matchId: number): Promise<DeliveryPhotoResponse[]> {
  const safeMatchId = parseMatchPositiveInt(matchId);
  if (safeMatchId <= 0) return [];

  const data = await getDriverMatchPhotosGenerated(safeMatchId);
  return toDeliveryPhotoList(data);
}

export async function uploadDriverRunPhoto(
  matchId: number,
  payload: DriverPhotoUploadInput
): Promise<DeliveryPhotoResponse | null> {
  const safeMatchId = parseMatchPositiveInt(matchId);
  const safeUri = toText(payload.localUri);
  if (safeMatchId <= 0 || !safeUri) return null;

  const data = await uploadDriverPhotoMultipart(safeMatchId, {
    localUri: safeUri,
    type: payload.type,
    takenAt: toText(payload.takenAt) || new Date().toISOString(),
    ...(typeof payload.lat === "number" ? { lat: payload.lat } : {}),
    ...(typeof payload.lng === "number" ? { lng: payload.lng } : {}),
    ...(parseMatchPositiveInt(payload.stopOrder) > 0 ? { stopOrder: parseMatchPositiveInt(payload.stopOrder) } : {}),
    ...(toText(payload.stopLabel) ? { stopLabel: toText(payload.stopLabel) } : {}),
  });

  return toDeliveryPhotoResponse(data);
}
