import type { DriverMatchItem } from "@/features/matching/api";

export type MatchDetailRouteSnapshot = Partial<DriverMatchItem>;

export type MatchDetailRouteParams = {
  id?: string | string[];
  matchId?: string | string[];
  quoteId?: string | string[];
  status?: string | string[];
  createdAt?: string | string[];
  updatedAt?: string | string[];
  accepted?: string | string[];
  acceptedAt?: string | string[];
  driverId?: string | string[];
};

type MatchSnapshotSeed = Partial<DriverMatchItem> | null | undefined;

export function readRouteParamText(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" ? raw.trim() : "";
}

function toPositiveInt(value: unknown): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function toOptionalText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  return text || undefined;
}

function toOptionalBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return undefined;

  const text = value.trim().toLowerCase();
  if (text === "true") return true;
  if (text === "false") return false;
  return undefined;
}

export function normalizeMatchDetailRouteSnapshot(
  input: MatchSnapshotSeed,
  fallbackMatchId = 0
): DriverMatchItem | null {
  const seed = input ?? {};
  const matchId = toPositiveInt(seed.matchId) || toPositiveInt(fallbackMatchId);
  if (matchId <= 0) return null;

  const quoteId = toPositiveInt(seed.quoteId);
  const driverId = toPositiveInt(seed.driverId);

  return {
    matchId,
    quoteId: quoteId > 0 ? quoteId : undefined,
    driverId: driverId > 0 ? driverId : undefined,
    accepted: toOptionalBoolean(seed.accepted),
    status: toOptionalText(seed.status),
    acceptedAt: toOptionalText(seed.acceptedAt),
    createdAt: toOptionalText(seed.createdAt),
    updatedAt: toOptionalText(seed.updatedAt),
  };
}

export function getMatchDetailRouteSnapshotKey(snapshot?: MatchDetailRouteSnapshot): string {
  const normalized = normalizeMatchDetailRouteSnapshot(snapshot);
  if (!normalized) return "";

  return [
    normalized.matchId,
    normalized.quoteId ?? "",
    normalized.driverId ?? "",
    typeof normalized.accepted === "boolean" ? String(normalized.accepted) : "",
    normalized.status ?? "",
    normalized.createdAt ?? "",
    normalized.updatedAt ?? "",
    normalized.acceptedAt ?? "",
  ].join("|");
}

export function parseMatchDetailRouteParams(params: MatchDetailRouteParams): {
  idText: string;
  matchId: number;
  snapshot?: MatchDetailRouteSnapshot;
} {
  const idText = readRouteParamText(params.id) || readRouteParamText(params.matchId);
  const matchId = toPositiveInt(idText);

  const snapshot = normalizeMatchDetailRouteSnapshot(
    {
      matchId,
      quoteId: toPositiveInt(readRouteParamText(params.quoteId)),
      driverId: toPositiveInt(readRouteParamText(params.driverId)),
      status: readRouteParamText(params.status) || undefined,
      createdAt: readRouteParamText(params.createdAt) || undefined,
      updatedAt: readRouteParamText(params.updatedAt) || undefined,
      acceptedAt: readRouteParamText(params.acceptedAt) || undefined,
      accepted: toOptionalBoolean(readRouteParamText(params.accepted)),
    },
    matchId
  );

  return {
    idText,
    matchId,
    snapshot: snapshot ?? undefined,
  };
}
