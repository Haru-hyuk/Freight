// apps/mobile/src/shared/lib/api/apiClient.ts

import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { tokenStorage, type AuthTokens } from "@/shared/lib/storage/tokenStorage";
import { getApiBaseUrl, getAuthRefreshPath } from "@/shared/lib/config/env";

type AnyObj = Record<string, any>;

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

type InternalConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshInFlight: Promise<string | null> | null = null;

function safeGetRefreshPath(): string {
  try {
    const p = getAuthRefreshPath?.();
    return isTruthyString(p) ? p.trim() : "";
  } catch {
    return "";
  }
}

function normalizePathFromUrl(url?: string): string {
  const u = (url ?? "").trim();
  if (!u) return "";
  if (u.startsWith("http://") || u.startsWith("https://")) {
    try {
      return new URL(u).pathname;
    } catch {
      return u;
    }
  }
  return u;
}

function isPublicAuthEndpoint(url?: string): boolean {
  const path = normalizePathFromUrl(url);

  // 회원가입/로그인은 토큰이 없어야 정상(붙어있어도 서버에서 무시되도록 주입 자체를 건너뜀)
  if (path === "/api/auth/driver/login") return true;
  if (path === "/api/auth/driver/signup") return true;
  if (path === "/api/auth/shipper/login") return true;
  if (path === "/api/auth/shipper/signup") return true;

  return false;
}

async function refreshAccessToken(baseURL: string): Promise<string | null> {
  const refreshPath = safeGetRefreshPath();
  if (!refreshPath) return null;

  const refreshToken = await tokenStorage.getRefreshToken();
  const accessToken = await tokenStorage.getAccessToken();

  if (!isTruthyString(refreshToken)) return null;

  // refreshToken이 accessToken과 동일한 경우(클라 fallback 저장) refresh 시도 자체를 막음
  if (isTruthyString(accessToken) && refreshToken.trim() === accessToken.trim()) return null;

  const refreshClient = axios.create({
    baseURL,
    timeout: 20_000,
    headers: { "Content-Type": "application/json" },
  });

  try {
    const res = await refreshClient.post(refreshPath, { refreshToken: refreshToken.trim() });
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
    if (isPublicAuthEndpoint(config?.url)) return config;

    const accessToken = await tokenStorage.getAccessToken();
    if (isTruthyString(accessToken)) {
      setAuthHeader(config, accessToken, false);
    }
    return config;
  });

  client.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
      const status = error?.response?.status;
      const original = (error?.config ?? undefined) as InternalConfig | undefined;

      if (!status || !original) return Promise.reject(error);
      if (status !== 401) return Promise.reject(error);

      // 로그인/회원가입은 refresh 대상이 아님
      if (isPublicAuthEndpoint(original?.url)) return Promise.reject(error);

      if (original._retry) return Promise.reject(error);
      original._retry = true;

      const refreshPath = safeGetRefreshPath();
      if (!refreshPath) {
        await tokenStorage.clearTokens();
        return Promise.reject(error);
      }

      const refreshToken = await tokenStorage.getRefreshToken();
      const accessToken = await tokenStorage.getAccessToken();

      if (!isTruthyString(refreshToken)) {
        await tokenStorage.clearTokens();
        return Promise.reject(error);
      }

      // refreshToken이 accessToken과 같으면 refresh 미지원 모드로 보고 세션 정리
      if (isTruthyString(accessToken) && refreshToken.trim() === accessToken.trim()) {
        await tokenStorage.clearTokens();
        return Promise.reject(error);
      }

      if (!refreshInFlight) {
        refreshInFlight = refreshAccessToken(baseURL).finally(() => {
          refreshInFlight = null;
        });
      }

      const nextAccess = await refreshInFlight;

      if (!isTruthyString(nextAccess)) {
        await tokenStorage.clearTokens();
        return Promise.reject(error);
      }

      setAuthHeader(original, nextAccess, true);
      return client.request(original);
    }
  );

  return client;
}

export const apiClient = createApiClient();

/**
 * 1) /api/auth/* (login/signup)는 Authorization 주입을 건너뛰어 경로 혼동/오작동 리스크를 줄임.
 * 2) refreshToken==accessToken(클라 fallback 저장)이면 refresh 시도를 막아 불필요한 401 루프를 방지.
 * 3) 나머지 요청은 기존처럼 401 → refresh 단일 비행 + 1회 재시도로 동작.
 */
