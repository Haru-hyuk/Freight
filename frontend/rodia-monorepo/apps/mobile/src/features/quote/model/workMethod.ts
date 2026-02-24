import type { QuoteWorkMethod } from "@/entities/quote/dto";

export type WorkActor = "SHIPPER" | "DRIVER";
export type WorkKind = "MANUAL" | "FORKLIFT" | "LADDER" | "WAIST_BEAR";

export type WorkMethodOption = {
  value: QuoteWorkMethod;
  label: string;
};

export const LOAD_METHOD_OPTIONS: readonly WorkMethodOption[] = [
  { value: "SHIPPER:MANUAL", label: "고객 상차" },
  { value: "DRIVER:MANUAL", label: "기사 상차" },
  { value: "DRIVER:FORKLIFT", label: "지게차" },
  { value: "DRIVER:LADDER", label: "사다리차" },
  { value: "DRIVER:WAIST_BEAR", label: "허리베어" },
] as const;

export const UNLOAD_METHOD_OPTIONS: readonly WorkMethodOption[] = [
  { value: "DRIVER:MANUAL", label: "기사 하차" },
  { value: "SHIPPER:MANUAL", label: "고객 하차" },
  { value: "DRIVER:FORKLIFT", label: "지게차" },
  { value: "DRIVER:LADDER", label: "사다리차" },
  { value: "DRIVER:WAIST_BEAR", label: "허리베어" },
] as const;

export const DEFAULT_LOAD_METHOD: QuoteWorkMethod = "SHIPPER:MANUAL";
export const DEFAULT_UNLOAD_METHOD: QuoteWorkMethod = "DRIVER:MANUAL";

function toText(value: unknown): string {
  return String(value ?? "").trim();
}

function parseActor(value: string): WorkActor | null {
  const normalized = value.toUpperCase();
  if (normalized.startsWith("SHIPPER")) return "SHIPPER";
  if (normalized.startsWith("DRIVER")) return "DRIVER";
  if (normalized.includes("고객") || normalized.includes("화주")) return "SHIPPER";
  if (normalized.includes("기사")) return "DRIVER";
  if (normalized === "수작업") return "SHIPPER";
  return null;
}

function parseKind(value: string): WorkKind {
  const normalized = value.toUpperCase();
  if (normalized.includes("FORKLIFT") || normalized.includes("지게차")) return "FORKLIFT";
  if (normalized.includes("LADDER") || normalized.includes("사다리차")) return "LADDER";
  if (normalized.includes("WAIST_BEAR") || normalized.includes("허리베어")) return "WAIST_BEAR";
  return "MANUAL";
}

function buildMethodValue(actor: WorkActor, kind: WorkKind): QuoteWorkMethod {
  if (actor === "SHIPPER") return "SHIPPER:MANUAL";
  if (kind === "MANUAL") return "DRIVER:MANUAL";
  if (kind === "FORKLIFT") return "DRIVER:FORKLIFT";
  if (kind === "LADDER") return "DRIVER:LADDER";
  return "DRIVER:WAIST_BEAR";
}

export function normalizeWorkMethodValue(value: unknown, fallback: QuoteWorkMethod): QuoteWorkMethod {
  const raw = toText(value);
  if (!raw) return fallback;

  const actor = parseActor(raw);
  if (!actor) return fallback;

  const kind = parseKind(raw);
  return buildMethodValue(actor, kind);
}

export function mapDraftWorkMethodToApi(value: unknown): QuoteWorkMethod {
  return normalizeWorkMethodValue(value, DEFAULT_LOAD_METHOD);
}

export function toActorOnlyWorkMethod(value: unknown): QuoteWorkMethod {
  const normalized = normalizeWorkMethodValue(value, DEFAULT_LOAD_METHOD);
  const actor = parseActor(normalized);
  return actor === "SHIPPER" ? "SHIPPER" : "DRIVER";
}

export function toDraftLoadMethod(value: unknown): QuoteWorkMethod {
  return normalizeWorkMethodValue(value, DEFAULT_LOAD_METHOD);
}

export function toDraftUnloadMethod(value: unknown): QuoteWorkMethod {
  return normalizeWorkMethodValue(value, DEFAULT_UNLOAD_METHOD);
}

export function formatWorkMethodLabel(value: unknown): string {
  const raw = toText(value);
  if (!raw) return "-";

  const actor = parseActor(raw);
  if (!actor) return raw;

  const kind = parseKind(raw);
  if (kind === "MANUAL") {
    return actor === "SHIPPER" ? "고객 수작업" : "기사 수작업";
  }

  if (kind === "FORKLIFT") return "지게차";
  if (kind === "LADDER") return "사다리차";
  return "허리베어";
}
