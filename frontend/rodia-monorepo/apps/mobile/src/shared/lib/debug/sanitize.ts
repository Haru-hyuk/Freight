// apps/mobile/src/shared/lib/debug/sanitize.ts
type AnyObj = Record<string, any>;

type MaskMode = "partial" | "full";

const SENSITIVE_KEY_NORMALIZED = new Set<string>([
  "password",
  "pass",
  "pwd",
  "accesstoken",
  "refreshtoken",
  "token",
  "idtoken",
  "authorization",
  "phone",
  "bizregno",
  "bankaccount",
  "bizphone",
  "ownername",
  "contactphone",
]);

function isPlainObject(v: unknown): v is AnyObj {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function normalizeSensitiveKey(key: string): string {
  return (key ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function shouldMaskKey(key: string): boolean {
  const normalized = normalizeSensitiveKey(key);
  if (!normalized) return false;
  if (SENSITIVE_KEY_NORMALIZED.has(normalized)) return true;
  if (normalized.endsWith("token")) return true;
  if (normalized.endsWith("phone")) return true;
  return false;
}

function shouldFullMaskKey(key: string): boolean {
  const normalized = normalizeSensitiveKey(key);
  if (!normalized) return false;
  return normalized.includes("authorization");
}

function maskValue(value: unknown, mode: MaskMode = "partial"): unknown {
  if (value == null) return value;

  if (mode === "full") return "[REDACTED]";

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return trimmed;
    if (trimmed.length <= 4) return "****";
    return `${trimmed.slice(0, 2)}****${trimmed.slice(-2)}`;
  }
  if (typeof value === "number" || typeof value === "boolean") return "****";
  return "****";
}

export function sanitizeHeaders(headers: unknown): AnyObj | undefined {
  if (!headers) return undefined;

  const h = isPlainObject(headers) ? headers : undefined;
  if (!h) return undefined;

  const out: AnyObj = {};
  for (const [k, v] of Object.entries(h)) {
    if (shouldMaskKey(k)) {
      out[k] = maskValue(v, shouldFullMaskKey(k) ? "full" : "partial");
      continue;
    }
    out[k] = v;
  }
  return out;
}

export function sanitizeDeep(input: unknown, depth = 0): unknown {
  if (depth > 6) return "[truncated]";

  if (Array.isArray(input)) {
    return input.slice(0, 50).map((x) => sanitizeDeep(x, depth + 1));
  }

  if (isPlainObject(input)) {
    const out: AnyObj = {};
    const entries = Object.entries(input).slice(0, 120);
    for (const [k, v] of entries) {
      if (shouldMaskKey(k)) {
        out[k] = maskValue(v, shouldFullMaskKey(k) ? "full" : "partial");
        continue;
      }
      out[k] = sanitizeDeep(v, depth + 1);
    }
    return out;
  }

  if (typeof input === "string") {
    const s = input;
    if (s.length > 4000) return `${s.slice(0, 4000)}…`;
    return s;
  }

  if (typeof input === "number" || typeof input === "boolean" || input == null) return input;

  return String(input);
}

export function safeJsonPreview(input: unknown): string {
  try {
    const sanitized = sanitizeDeep(input);
    const json = JSON.stringify(sanitized, null, 2);
    if (json.length > 12000) return `${json.slice(0, 12000)}\n…(truncated)`;
    return json;
  } catch {
    try {
      const s = String(input);
      return s.length > 12000 ? `${s.slice(0, 12000)}…(truncated)` : s;
    } catch {
      return "[unprintable]";
    }
  }
}
