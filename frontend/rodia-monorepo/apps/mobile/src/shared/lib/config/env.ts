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
    const v = (process as any)?.env?.[key];
    if (typeof v !== "undefined") return v;
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
  const v = readEnvRaw(key);
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  return undefined;
}

function isEnvTrue(v: string | undefined): boolean {
  const raw = (v ?? "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

function normalizeUrl(input: string): string {
  const v = input.trim();
  if (!v) return v;
  if (!/^https?:\/\//i.test(v)) return `http://${v}`;
  return v;
}

export function getApiBaseUrl(): string {
  const envBase =
    readEnvString("EXPO_PUBLIC_API_BASE_URL") ??
    readEnvString("API_BASE_URL") ??
    readEnvString("VITE_API_BASE_URL") ??
    readEnvString("apiBaseUrl");

  if (isTruthyString(envBase)) {
    const url = normalizeUrl(envBase);
    if (url.includes(":8081")) {
      warnOnce(
        "env.api.baseUrl.8081",
        "[env] API_BASE_URL이 8081로 설정되어 있습니다. 8081은 Metro(번들러) 포트일 가능성이 높습니다. 실제 백엔드 포트로 변경하세요."
      );
    }
    return url;
  }

  return "http://localhost:3000";
}

export function getAuthLoginPath(): string {
  const envPath =
    readEnvString("EXPO_PUBLIC_AUTH_LOGIN_PATH") ??
    readEnvString("AUTH_LOGIN_PATH") ??
    readEnvString("VITE_AUTH_LOGIN_PATH") ??
    readEnvString("authLoginPath");

  if (isTruthyString(envPath)) return envPath.trim();
  return "/auth/login";
}

export function getAuthMePath(): string {
  const envPath =
    readEnvString("EXPO_PUBLIC_AUTH_ME_PATH") ??
    readEnvString("AUTH_ME_PATH") ??
    readEnvString("VITE_AUTH_ME_PATH") ??
    readEnvString("authMePath");

  if (isTruthyString(envPath)) return envPath.trim();
  return "/auth/me";
}

export function getAuthRefreshPath(): string {
  const envPath =
    readEnvString("EXPO_PUBLIC_AUTH_REFRESH_PATH") ??
    readEnvString("AUTH_REFRESH_PATH") ??
    readEnvString("VITE_AUTH_REFRESH_PATH") ??
    readEnvString("authRefreshPath");

  if (isTruthyString(envPath)) return envPath.trim();
  return "/auth/refresh";
}

export function isMockAuthEnabled(): boolean {
  return (
    isEnvTrue(readEnvString("EXPO_PUBLIC_MOCK_AUTH")) ||
    isEnvTrue(readEnvString("MOCK_AUTH")) ||
    isEnvTrue(readEnvString("VITE_MOCK_AUTH"))
  );
}

/**
 * 1) env는 process.env(EXPO_PUBLIC_*) 우선, 필요 시 expoConfig.extra도 보조로 읽습니다.
 * 2) baseURL/login/me/refresh/mock 판단을 한 곳으로 고정해 중복을 제거합니다.
 * 3) 8081(번들러 포트) 실수 방지를 위해 DEV에서만 1회 경고를 냅니다.
 */