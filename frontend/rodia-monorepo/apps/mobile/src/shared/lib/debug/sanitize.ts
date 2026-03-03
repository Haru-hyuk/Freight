// apps/mobile/src/shared/lib/debug/sanitize.ts
type AnyObj = Record<string, any>;

type MaskMode = "partial" | "full";

declare const __DEV__: boolean;

// TEMP(DEV): Authorization 원문 노출 토글
// - 기본값: false (항상 마스킹)
// - 활성화 방법(둘 중 하나):
//   1) 환경변수: EXPO_PUBLIC_EXPOSE_AUTH_TOKEN=1
//   2) 런타임 플래그: (globalThis as any).__EXPOSE_AUTH_TOKEN__ = true
const EXPOSE_AUTH_TOKEN_IN_DEV =
  typeof __DEV__ !== "undefined" &&
  __DEV__ === true &&
  ((typeof process !== "undefined" &&
    typeof process.env !== "undefined" &&
    process.env.EXPO_PUBLIC_EXPOSE_AUTH_TOKEN === "1") ||
    (globalThis as any)?.__EXPOSE_AUTH_TOKEN__ === true);

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

// 일반적인 민감 정보 마스킹 대상 확인
function shouldMaskKey(key: string): boolean {
  const normalized = normalizeSensitiveKey(key);
  if (!normalized) return false;
  if (SENSITIVE_KEY_NORMALIZED.has(normalized)) return true;
  if (normalized.endsWith("token")) return true;
  if (normalized.endsWith("phone")) return true;
  return false;
}

// Authorization 등 전체 마스킹이 필요한 키 확인
function shouldFullMaskKey(key: string): boolean {
  const normalized = normalizeSensitiveKey(key);
  if (!normalized) return false;

  // DEV 토글이 켜져 있으면 Authorization은 full mask 하지 않음(원문 유지)
  if (normalized.includes("authorization")) {
    return !EXPOSE_AUTH_TOKEN_IN_DEV;
  }

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

// Bearer 접두어 제거
function stripBearer(input: string): string {
  const s = (input ?? "").trim();
  if (!s) return "";
  return s.toLowerCase().startsWith("bearer ") ? s.slice(7).trim() : s;
}

// Base64Url 형식을 표준 Base64로 변환 및 패딩 맞춤
function normalizeBase64UrlToBase64(base64Url: string): string {
  const s = (base64Url ?? "").trim().replace(/-/g, "+").replace(/_/g, "/");
  if (!s) return "";
  const padLen = (4 - (s.length % 4)) % 4;
  return s + "=".repeat(padLen);
}

// 브라우저 환경 (atob) 디코딩 시도
function tryAtobDecodeToUtf8(b64: string): string | undefined {
  if (typeof globalThis.atob !== "function") return undefined;

  try {
    const bin = globalThis.atob(b64);
    try {
      return decodeURIComponent(
        Array.prototype.map
          .call(bin, (c: string) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`)
          .join("")
      );
    } catch {
      return bin;
    }
  } catch {
    return undefined;
  }
}

// Node.js 환경 (Buffer) 디코딩 시도
function tryBufferDecodeToUtf8(b64: string): string | undefined {
  const globalBuffer = (globalThis as unknown as { Buffer?: { from: Function } }).Buffer;
  if (!globalBuffer || typeof globalBuffer.from !== "function") return undefined;

  try {
    const buf = globalBuffer.from(b64, "base64");
    return typeof (buf as any).toString === "function" ? (buf as any).toString("utf8") : String(buf);
  } catch {
    return undefined;
  }
}

function base64DecodeToUtf8(base64UrlOrBase64: string): string | undefined {
  const b64 = normalizeBase64UrlToBase64(base64UrlOrBase64);
  if (!b64) return undefined;

  const viaAtob = tryAtobDecodeToUtf8(b64);
  if (typeof viaAtob === "string" && viaAtob) return viaAtob;

  const viaBuf = tryBufferDecodeToUtf8(b64);
  if (typeof viaBuf === "string" && viaBuf) return viaBuf;

  return undefined;
}

// Unix timestamp를 사람이 읽기 쉬운 ISO 포맷으로 변환
function toIsoFromEpochSeconds(input: unknown): string | undefined {
  const n = typeof input === "number" ? input : Number(String(input ?? ""));
  if (!Number.isFinite(n) || n <= 0) return undefined;
  try {
    return new Date(n * 1000).toISOString();
  } catch {
    return undefined;
  }
}

// 디버깅에 필요한 핵심 클레임 정보만 화이트리스트 방식으로 필터링
function pickClaimsPreview(claims: AnyObj): AnyObj {
  const out: AnyObj = {};

  const keys = [
    "iss",
    "aud",
    "sub",
    "exp",
    "iat",
    "nbf",
    "jti",
    "scope",
    "scp",
    "roles",
    "role",
    "authorities",
    "permissions",
    "userId",
    "shipperId",
    "status",
    "enabled",
    "active",
  ];

  for (const k of keys) {
    if (claims?.[k] !== undefined) out[k] = claims[k];
  }

  const expIso = toIsoFromEpochSeconds(claims?.exp);
  const iatIso = toIsoFromEpochSeconds(claims?.iat);
  const nbfIso = toIsoFromEpochSeconds(claims?.nbf);

  if (expIso) out.expIso = expIso;
  if (iatIso) out.iatIso = iatIso;
  if (nbfIso) out.nbfIso = nbfIso;

  return out;
}

function tryExtractJwtClaims(value: unknown): AnyObj | undefined {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return undefined;

  const token = stripBearer(raw);
  if (!token) return undefined;

  const parts = token.split(".");
  if (parts.length < 2) return undefined;

  const payloadPart = (parts[1] ?? "").trim();
  if (!payloadPart) return undefined;

  const payloadJson = base64DecodeToUtf8(payloadPart);
  if (!payloadJson) return undefined;

  try {
    const parsed = JSON.parse(payloadJson);
    if (!isPlainObject(parsed)) return undefined;
    const preview = pickClaimsPreview(parsed);
    return Object.keys(preview).length ? preview : undefined;
  } catch {
    return undefined;
  }
}

// 토큰 정보 추출(클레임 파싱)을 시도해야 하는 키인지 확인
function shouldTryExtractClaimsForKey(key: string): boolean {
  const normalized = normalizeSensitiveKey(key);
  if (!normalized) return false;
  if (normalized.includes("authorization")) return true;
  if (normalized.endsWith("token")) return true;
  if (normalized === "token") return true;
  return false;
}

function shouldExposeAuthRawForKey(key: string): boolean {
  if (!EXPOSE_AUTH_TOKEN_IN_DEV) return false;
  const normalized = normalizeSensitiveKey(key);
  if (!normalized) return false;
  return normalized.includes("authorization");
}

export function sanitizeHeaders(headers: unknown): AnyObj | undefined {
  if (!headers) return undefined;

  const h = isPlainObject(headers) ? headers : undefined;
  if (!h) return undefined;

  const out: AnyObj = {};
  for (const [k, v] of Object.entries(h)) {
    if (shouldMaskKey(k)) {
      if (shouldExposeAuthRawForKey(k)) {
        out[k] = v; // DEV에서만 Authorization 원문 유지
      } else {
        out[k] = maskValue(v, shouldFullMaskKey(k) ? "full" : "partial");
      }

      if (shouldTryExtractClaimsForKey(k)) {
        const claims = tryExtractJwtClaims(v);
        if (claims) out[`${k}Claims`] = claims;
      }
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
        if (shouldExposeAuthRawForKey(k)) {
          out[k] = v; // DEV에서만 Authorization 원문 유지
        } else {
          out[k] = maskValue(v, shouldFullMaskKey(k) ? "full" : "partial");
        }

        if (depth <= 1 && shouldTryExtractClaimsForKey(k)) {
          const claims = tryExtractJwtClaims(v);
          if (claims) out[`${k}Claims`] = claims;
        }
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