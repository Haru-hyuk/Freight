// apps/mobile/src/shared/lib/config/env.ts
import Constants from "expo-constants";

type AnyObj = Record<string, any>;

declare const __DEV__: boolean;

const warned = new Set<string>();

function warnOnce(key: string, message: string) {
  if (!__DEV__) return;
  if (warned.has(key)) return;
  warned.add(key);
  // eslint-disable-next-line no-console
  console.warn(message);
}

function isTruthyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function readEnvRaw(key: string): unknown {
  try {
    const fromProcess = (process as any)?.env?.[key];
    if (typeof fromProcess !== "undefined") return fromProcess;
  } catch {
    // ignore
  }

  try {
    const extra = (Constants as any)?.expoConfig?.extra ?? (Constants as any)?.manifest?.extra ?? {};
    return (extra as AnyObj)?.[key];
  } catch {
    // ignore
  }

  return undefined;
}

function readEnvString(key: string): string | undefined {
  const raw = readEnvRaw(key);
  if (typeof raw === "string") return raw;
  if (typeof raw === "number") return String(raw);
  if (typeof raw === "boolean") return raw ? "true" : "false";
  return undefined;
}

function toBool(raw: string | undefined): boolean {
  const v = (raw ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

function readBoolOrUndefined(key: string): boolean | undefined {
  const raw = readEnvString(key);
  if (typeof raw === "undefined") return undefined;
  return toBool(raw);
}

function readBool(key: string, fallback: boolean): boolean {
  const v = readBoolOrUndefined(key);
  return typeof v === "boolean" ? v : fallback;
}

function readString(key: string, fallback: string): string {
  const raw = readEnvString(key);
  return isTruthyString(raw) ? raw.trim() : fallback;
}

function normalizeUrl(input: string): string {
  const v = input.trim();
  if (!v) return v;
  if (!/^https?:\/\//i.test(v)) return `http://${v}`;
  return v;
}

// 공통 API 베이스 URL
export function getApiBaseUrl(): string {
  const url = normalizeUrl(readString("EXPO_PUBLIC_API_BASE_URL", "http://localhost:3000"));

  // Metro 기본 포트(8081)를 API 포트로 잘못 넣는 실수 방지
  if (url.includes(":8081")) {
    warnOnce(
      "env.api.base_url.metro_port",
      "[env] API_BASE_URL이 8081입니다. 8081은 보통 Metro 포트입니다. 실제 백엔드 포트로 바꾸세요."
    );
  }

  // http를 실서버로 착각하는 케이스 방지(모바일에서 차단될 수 있음)
  if (__DEV__ && url.startsWith("http://") && !url.includes("localhost") && !url.includes("127.0.0.1")) {
    warnOnce(
      "env.api.base_url.http_warning",
      "[env] API_BASE_URL이 http:// 입니다. 실서버라면 https:// 권장(모바일 보안 설정에 의해 차단될 수 있음)."
    );
  }

  return url;
}

// auth 토큰 재발급 경로
export function getAuthRefreshPath(): string {
  return readString("EXPO_PUBLIC_AUTH_REFRESH_PATH", "/auth/refresh");
}

// 목업 모드는 EXPO_PUBLIC_MOCK_MODE 하나로 통합해서 사용한다.
function baseMockMode(): boolean {
  return readBool("EXPO_PUBLIC_MOCK_MODE", false);
}

export function isMockAuthEnabled(): boolean {
  return baseMockMode();
}

export function isMockQuoteEnabled(): boolean {
  return baseMockMode();
}

// auth 디버그 로그 출력 여부(개발 환경에서만 반영)
export function isAuthDebugLogsEnabled(): boolean {
  if (!__DEV__) return false;
  return readBool("EXPO_PUBLIC_AUTH_DEBUG_LOGS", false);
}

// API 전역 디버그 로그 출력 여부(개발 환경에서만 반영)
export function isApiDebugLogsEnabled(): boolean {
  if (!__DEV__) return false;
  return readBool("EXPO_PUBLIC_API_DEBUG_LOGS", readBool("EXPO_PUBLIC_AUTH_DEBUG_LOGS", false));
}

// 견적 API 경로
export function getShipperQuoteCreatePath(): string {
  return readString("EXPO_PUBLIC_SHIPPER_QUOTE_CREATE_PATH", "/api/shipper/quotes");
}