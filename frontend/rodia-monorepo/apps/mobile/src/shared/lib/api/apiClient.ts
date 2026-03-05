// apps/mobile/src/shared/lib/api/apiClient.ts
import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";

import { getApiBaseUrl, getAuthRefreshPath, isApiDebugLogsEnabled } from "@/shared/lib/config/env";
import { debugLogStore, type DebugLogPhase, type DebugLogTag } from "@/shared/lib/debug/debugLogStore";
import { sanitizeDeep, sanitizeHeaders } from "@/shared/lib/debug/sanitize";
import { tokenStorage, type AuthTokens } from "@/shared/lib/storage/tokenStorage";

type AnyObj = Record<string, any>;

type ApiMeta = {
  tag?: DebugLogTag;
  skipDebugLog?: boolean;
};

type ApiTimingMeta = {
  startAt: number;
  requestId: string;
};

type InternalConfig = InternalAxiosRequestConfig & { _retry?: boolean; meta?: ApiMeta; __timing?: ApiTimingMeta };

type SessionExpiredApiError = Error & {
  code: "SESSION_EXPIRED";
  status: 401;
  isSessionExpired: true;
  originalError?: unknown;
};

export const SESSION_EXPIRED_MESSAGE = "세션이 만료되었습니다. 다시 로그인해 주세요.";

function isTruthyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function extractTokens(data: unknown): Partial<AuthTokens> | null {
  const d = (data ?? {}) as AnyObj;

  const accessToken = d?.accessToken;
  const refreshToken = d?.refreshToken;

  const a = isTruthyString(accessToken) ? accessToken.trim() : "";
  const r = isTruthyString(refreshToken) ? refreshToken.trim() : "";

  if (!a && !r) return null;

  return {
    accessToken: a || undefined,
    refreshToken: r || undefined,
  };
}

let refreshInFlight: Promise<string | null> | null = null;

function safeGetRefreshPath(): string {
  try {
    const path = getAuthRefreshPath?.();
    return String(path ?? "").trim();
  } catch {
    return "";
  }
}

function buildSessionExpiredError(originalError?: unknown): SessionExpiredApiError {
  const err = new Error(SESSION_EXPIRED_MESSAGE) as SessionExpiredApiError;
  err.name = "SessionExpiredError";
  err.code = "SESSION_EXPIRED";
  err.status = 401;
  err.isSessionExpired = true;
  err.originalError = originalError;
  return err;
}

export function isSessionExpiredApiError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as {
    code?: unknown;
    status?: unknown;
    isSessionExpired?: unknown;
    response?: { status?: unknown };
  };
  if (e.isSessionExpired === true) return true;
  if (String(e.code ?? "").toUpperCase() === "SESSION_EXPIRED") return true;
  const status = Number(e.status ?? e.response?.status ?? 0);
  return status === 401;
}

function stripQueryAndHash(input: string): string {
  const raw = (input ?? "").trim();
  if (!raw) return "";
  const noHash = raw.split("#")[0] ?? raw;
  const noQuery = noHash.split("?")[0] ?? noHash;
  return noQuery.trim();
}

function normalizePathFromUrl(url?: string): string {
  const u = (url ?? "").trim();
  if (!u) return "";

  if (u.startsWith("http://") || u.startsWith("https://")) {
    try {
      return stripQueryAndHash(new URL(u).pathname);
    } catch {
      return stripQueryAndHash(u);
    }
  }

  return stripQueryAndHash(u);
}

function isPublicAuthEndpoint(url?: string): boolean {
  const path = normalizePathFromUrl(url);
  if (path === "/api/auth/driver/login") return true;
  if (path === "/api/auth/driver/signup") return true;
  if (path === "/api/auth/shipper/login") return true;
  if (path === "/api/auth/shipper/signup") return true;
  return false;
}

function makeRequestId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function safeTag(meta?: ApiMeta, url?: string): DebugLogTag {
  const t = (meta?.tag ?? "").trim();
  if (t) return t as DebugLogTag;

  const path = normalizePathFromUrl(url);
  if (path.startsWith("/api/auth/")) return "AUTH";
  if (path.includes("/quotes") && path.includes("/counter-offers")) return "OFFER";
  if (path.includes("/matches")) return "MATCH";
  if (path.includes("/quotes")) return "QUOTE";
  if (path.includes("/notifications")) return "NOTI";
  return "UNKNOWN";
}

function buildFullUrl(baseURL: string, url?: string): string {
  const u = (url ?? "").trim();
  if (!u) return baseURL;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;

  const b = (baseURL ?? "").trim();
  if (!b) return u;

  if (b.endsWith("/") && u.startsWith("/")) return `${b.slice(0, -1)}${u}`;
  if (!b.endsWith("/") && !u.startsWith("/")) return `${b}/${u}`;
  return `${b}${u}`;
}

function toSafeLogUrl(input?: string): string {
  const raw = (input ?? "").trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const u = new URL(raw);
      return `${u.origin}${stripQueryAndHash(u.pathname)}`;
    } catch {
      return stripQueryAndHash(raw);
    }
  }
  return stripQueryAndHash(raw);
}

function safeMethod(method?: string): string {
  return (method ?? "GET").toUpperCase();
}

function isFormDataPayload(value: unknown): boolean {
  if (typeof FormData === "undefined") return false;
  return value instanceof FormData;
}

function normalizeMultipartHeaders(config: InternalAxiosRequestConfig): void {
  if (!isFormDataPayload(config.data)) return;

  const headers = (config.headers ?? {}) as AnyObj;
  const contentType = String(headers["Content-Type"] ?? headers["content-type"] ?? "").toLowerCase();
  if (!contentType.includes("application/json")) return;

  delete headers["Content-Type"];
  delete headers["content-type"];
  config.headers = headers as any;
}

function shouldDebugLog(): boolean {
  try {
    return isApiDebugLogsEnabled();
  } catch {
    return false;
  }
}

function addApiLog(entry: {
  phase: DebugLogPhase;
  requestId?: string;
  level: "info" | "warn" | "error";
  tag: DebugLogTag;
  title: string;
  method?: string;
  path?: string;
  url?: string;
  status?: number | "NETWORK_ERROR";
  durationMs?: number;
  request?: unknown;
  response?: unknown;
  error?: unknown;
}) {
  if (!shouldDebugLog()) return;

  debugLogStore.add({
    requestId: entry.requestId,
    phase: entry.phase,
    level: entry.level,
    tag: entry.tag,
    title: entry.title,
    method: entry.method,
    path: entry.path,
    url: entry.url,
    status: entry.status,
    durationMs: entry.durationMs,
    request: entry.request,
    response: entry.response,
    error: entry.error,
  });

  // eslint-disable-next-line no-console
  console.log(
    `[api:${entry.tag}] ${entry.title}`,
    sanitizeDeep({
      requestId: entry.requestId,
      method: entry.method,
      path: entry.path,
      url: entry.url,
      status: entry.status,
      durationMs: entry.durationMs,
    })
  );
}

async function refreshAccessToken(baseURL: string, refreshPath: string): Promise<string | null> {
  if (!isTruthyString(refreshPath)) return null;
  const refreshToken = await tokenStorage.getRefreshToken();
  const accessToken = await tokenStorage.getAccessToken();

  if (!isTruthyString(refreshToken)) return null;
  if (isTruthyString(accessToken) && refreshToken.trim() === accessToken.trim()) return null;

  const refreshClient = axios.create({
    baseURL,
    timeout: 20_000,
    headers: { "Content-Type": "application/json" },
  });

  try {
    const res = await refreshClient.post(refreshPath.trim(), { refreshToken: refreshToken.trim() });
    const tokens = extractTokens((res as AxiosResponse)?.data);

    const nextAccess = (tokens?.accessToken ?? "").trim();
    const nextRefresh = (tokens?.refreshToken ?? "").trim();

    if (!nextAccess) return null;

    await tokenStorage.setTokens({
      accessToken: nextAccess,
      refreshToken: nextRefresh || refreshToken.trim(),
    });

    return nextAccess;
  } catch {
    return null;
  }
}

function setAuthHeader(config: InternalAxiosRequestConfig, accessToken: string, force: boolean) {
  const token = accessToken.trim();
  if (!token) return;

  const h: AnyObj = (config.headers ?? {}) as AnyObj;

  if (force || (!h.Authorization && !h.authorization)) {
    h.Authorization = `Bearer ${token}`;
  }

  config.headers = h as any;
}

export function createApiClient(): AxiosInstance {
  const baseURL = (() => {
    try {
      const v = getApiBaseUrl?.();
      return isTruthyString(v) ? v.trim() : "";
    } catch {
      return "";
    }
  })();

  const client = axios.create({
    baseURL,
    timeout: 20_000,
    headers: { "Content-Type": "application/json" },
  });

  client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    const cfg = config as InternalConfig;
    normalizeMultipartHeaders(cfg);
    const requestId = cfg.__timing?.requestId ?? makeRequestId();
    cfg.__timing = { startAt: Date.now(), requestId };

    const safePath = normalizePathFromUrl(cfg.url);
    const fullUrl = buildFullUrl(baseURL, cfg.url);
    const safeUrl = toSafeLogUrl(fullUrl);

    if (isPublicAuthEndpoint(cfg?.url)) {
      if (!cfg.meta?.skipDebugLog) {
        addApiLog({
          phase: "request",
          requestId,
          level: "info",
          tag: safeTag(cfg.meta, cfg.url),
          title: `→ ${safeMethod(cfg.method)} ${safePath || cfg.url || ""}`,
          method: safeMethod(cfg.method),
          path: safePath,
          url: safeUrl,
          request: sanitizeDeep({
            headers: sanitizeHeaders(cfg.headers),
            params: cfg.params,
            data: cfg.data,
          }),
        });
      }
      return cfg;
    }

    const accessToken = await tokenStorage.getAccessToken();
    if (isTruthyString(accessToken)) {
      setAuthHeader(cfg, accessToken, false);
    }

    if (!cfg.meta?.skipDebugLog) {
      addApiLog({
        phase: "request",
        requestId,
        level: "info",
        tag: safeTag(cfg.meta, cfg.url),
        title: `→ ${safeMethod(cfg.method)} ${safePath || cfg.url || ""}`,
        method: safeMethod(cfg.method),
        path: safePath,
        url: safeUrl,
        request: sanitizeDeep({
          headers: sanitizeHeaders(cfg.headers),
          params: cfg.params,
          data: cfg.data,
        }),
      });
    }

    return cfg;
  });

  client.interceptors.response.use(
    (response: AxiosResponse) => {
      const cfg = (response?.config ?? {}) as InternalConfig;
      const started = cfg.__timing?.startAt ?? 0;
      const durationMs = started ? Date.now() - started : undefined;
      const requestId = cfg.__timing?.requestId ?? makeRequestId();

      const safePath = normalizePathFromUrl(cfg.url);
      const fullUrl = buildFullUrl(baseURL, cfg.url);
      const safeUrl = toSafeLogUrl(fullUrl);

      if (!cfg.meta?.skipDebugLog) {
        addApiLog({
          phase: "response",
          requestId,
          level: "info",
          tag: safeTag(cfg.meta, cfg.url),
          title: `← ${safeMethod(cfg.method)} ${safePath || cfg.url || ""} (${response.status})`,
          method: safeMethod(cfg.method),
          path: safePath,
          url: safeUrl,
          status: response.status,
          durationMs,
          response: sanitizeDeep(response.data),
        });
      }

      return response;
    },
    async (error: AxiosError) => {
      const status = error?.response?.status;
      const original = (error?.config ?? undefined) as InternalConfig | undefined;

      const started = original?.__timing?.startAt ?? 0;
      const durationMs = started ? Date.now() - started : undefined;
      const requestId = original?.__timing?.requestId ?? makeRequestId();

      const level: "warn" | "error" = status && status >= 500 ? "error" : "warn";

      if (original && !original.meta?.skipDebugLog) {
        const safePath = normalizePathFromUrl(original.url);
        const fullUrl = buildFullUrl(baseURL, original.url);
        const safeUrl = toSafeLogUrl(fullUrl);

        addApiLog({
          phase: "error",
          requestId,
          level,
          tag: safeTag(original.meta, original.url),
          title: `✕ ${safeMethod(original.method)} ${safePath || original.url || ""} (${status ?? "NETWORK_ERROR"})`,
          method: safeMethod(original.method),
          path: safePath,
          url: safeUrl,
          status: (status ?? "NETWORK_ERROR") as number | "NETWORK_ERROR",
          durationMs,
          request: sanitizeDeep({
            headers: sanitizeHeaders(original.headers),
            params: (original as any)?.params,
            data: (original as any)?.data,
          }),
          error: sanitizeDeep(error?.response?.data ?? error?.message ?? error),
        });
      }

      if (!status || !original) return Promise.reject(error);
      if (status !== 401) return Promise.reject(error);

      if (isPublicAuthEndpoint(original?.url)) return Promise.reject(error);

      if (original._retry) return Promise.reject(error);
      original._retry = true;

      const refreshPath = safeGetRefreshPath();
      if (!isTruthyString(refreshPath)) {
        await tokenStorage.clearTokens();
        return Promise.reject(buildSessionExpiredError(error));
      }

      const refreshToken = await tokenStorage.getRefreshToken();
      const accessToken = await tokenStorage.getAccessToken();

      if (!isTruthyString(refreshToken)) {
        await tokenStorage.clearTokens();
        return Promise.reject(buildSessionExpiredError(error));
      }

      if (isTruthyString(accessToken) && refreshToken.trim() === accessToken.trim()) {
        await tokenStorage.clearTokens();
        return Promise.reject(buildSessionExpiredError(error));
      }

      if (!refreshInFlight) {
        refreshInFlight = refreshAccessToken(baseURL, refreshPath).finally(() => {
          refreshInFlight = null;
        });
      }

      const nextAccess = await refreshInFlight;

      if (!isTruthyString(nextAccess)) {
        await tokenStorage.clearTokens();
        return Promise.reject(buildSessionExpiredError(error));
      }

      setAuthHeader(original, nextAccess, true);
      return client.request(original);
    }
  );

  return client;
}

export const apiClient = createApiClient();
