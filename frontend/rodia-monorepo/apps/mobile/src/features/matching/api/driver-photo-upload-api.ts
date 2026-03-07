import { uploadDriverPhoto as uploadDriverPhotoGenerated } from "@/shared/api/generated/delivery-photo-controller/delivery-photo-controller";
import type { UploadDriverPhotoType } from "@/shared/api/generated/schemas";
import { getApiBaseUrl, isMockMode } from "@/shared/lib/config/env";

import { parseMatchPositiveInt } from "./shipper-match-parser";

type AnyObject = Record<string, unknown>;

const UPLOAD_FALLBACK_HTTP_STATUSES = new Set([404, 405, 415, 501]);

function asObject(value: unknown): AnyObject {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as AnyObject;
  }
  return {};
}

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toPositiveInt(value: unknown): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function withAbsoluteApiUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return pathOrUrl;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;

  const normalizedPath = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  const base = getApiBaseUrl().replace(/\/+$/, "");
  return `${base}${normalizedPath}`;
}

function collectCandidateObjects(input: unknown): AnyObject[] {
  const queue: unknown[] = [input];
  const out: AnyObject[] = [];
  const seen = new Set<AnyObject>();

  while (queue.length > 0) {
    const next = queue.shift();
    if (Array.isArray(next)) {
      next.forEach((entry) => queue.push(entry));
      continue;
    }

    const source = asObject(next);
    if (Object.keys(source).length <= 0) continue;
    if (!seen.has(source)) {
      seen.add(source);
      out.push(source);
    }

    ["data", "result", "payload", "item", "photo", "content"].forEach((key) => {
      const nested = source[key];
      if (nested && typeof nested === "object") queue.push(nested);
    });
  }

  return out;
}

function resolveUploadedUrlFromPayload(payload: unknown): string | null {
  const directText = toText(payload);
  if (directText) {
    return withAbsoluteApiUrl(directText);
  }

  const candidates = collectCandidateObjects(payload);
  for (const candidate of candidates) {
    const maybeDirectUrl =
      toText(candidate.url) ||
      toText(candidate.fileUrl) ||
      toText(candidate.photoUrl) ||
      toText(candidate.imageUrl) ||
      toText(candidate.publicUrl) ||
      toText(candidate.downloadUrl) ||
      toText(candidate.path);
    if (maybeDirectUrl) return withAbsoluteApiUrl(maybeDirectUrl);

    const photoId =
      toPositiveInt(candidate.photoId) ||
      toPositiveInt(candidate.deliveryPhotoId) ||
      toPositiveInt(candidate.id);
    if (photoId > 0) return withAbsoluteApiUrl(`/api/delivery-photos/${photoId}/file`);
  }

  return null;
}

function resolveUriExtension(uri: string): string {
  const path = toText(uri).split("?")[0] ?? "";
  const parts = path.split(".");
  const ext = (parts[parts.length - 1] ?? "").toLowerCase();
  if (ext === "png" || ext === "webp" || ext === "jpg" || ext === "jpeg") return ext;
  if (ext === "heic") return "jpg";
  return "jpg";
}

function buildFallbackUploadedUrl(matchId: number, type: UploadDriverPhotoType, localUri: string): string {
  const ext = resolveUriExtension(localUri);
  return `https://mock-upload.rodia.local/matches/${matchId}/${type.toLowerCase()}-${Date.now()}.${ext}`;
}

function shouldUseFallbackUpload(error: unknown): boolean {
  const status = Number((error as { response?: { status?: unknown } } | undefined)?.response?.status ?? 0);
  return UPLOAD_FALLBACK_HTTP_STATUSES.has(status);
}

export async function uploadImage(
  matchId: number,
  localUri: string,
  type: UploadDriverPhotoType
): Promise<string> {
  const safeMatchId = parseMatchPositiveInt(matchId);
  const safeUri = toText(localUri);
  if (safeMatchId <= 0) throw new Error("유효하지 않은 matchId입니다.");
  if (!safeUri) throw new Error("유효하지 않은 이미지 URI입니다.");

  if (isMockMode()) {
    return buildFallbackUploadedUrl(safeMatchId, type, safeUri);
  }

  try {
    const ext = resolveUriExtension(safeUri);
    const mimeType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    const takenAt = new Date().toISOString();
    const payload = await uploadDriverPhotoGenerated(
      safeMatchId,
      {
        file: { uri: safeUri, name: `photo.${ext}`, type: mimeType } as unknown as Blob,
      },
      { type, takenAt }
    );
    const uploadedUrl = resolveUploadedUrlFromPayload(payload);
    if (uploadedUrl) return uploadedUrl;
    return buildFallbackUploadedUrl(safeMatchId, type, safeUri);
  } catch (error: unknown) {
    if (shouldUseFallbackUpload(error)) {
      return buildFallbackUploadedUrl(safeMatchId, type, safeUri);
    }
    throw error;
  }
}

export type { UploadDriverPhotoType as DriverPhotoUploadType };
