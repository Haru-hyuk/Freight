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

  const accessToken =
    d?.accessToken ??
    d?.access_token ??
    d?.token ??
    d?.data?.accessToken ??
    d?.data?.access_token ??
    d?.data?.token ??
    d?.tokens?.accessToken ??
    d?.tokens?.access_token ??
    d?.tokens?.token;

  const refreshToken =
    d?.refreshToken ??
    d?.refresh_token ??
    d?.data?.refreshToken ??
    d?.data?.refresh_token ??
    d?.tokens?.refreshToken ??
    d?.tokens?.refresh_token;

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

async function refreshAccessToken(baseURL: string): Promise<string | null> {
  const refreshToken = await tokenStorage.getRefreshToken();
  if (!isTruthyString(refreshToken)) return null;

  const refreshPath = getAuthRefreshPath();

  const refreshClient = axios.create({
    baseURL,
    timeout: 20_000,
    headers: { "Content-Type": "application/json" },
  });

  try {
    const res = await refreshClient.post(refreshPath, { refreshToken });
    const tokens = extractTokens((res as AxiosResponse)?.data);

    const nextAccess = (tokens?.accessToken ?? "").trim();
    const nextRefresh = (tokens?.refreshToken ?? "").trim();

    if (!nextAccess) return null;

    await tokenStorage.setTokens({
      accessToken: nextAccess,
      refreshToken: nextRefresh || refreshToken,
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
  const baseURL = getApiBaseUrl();

  const client = axios.create({
    baseURL,
    timeout: 20_000,
    headers: { "Content-Type": "application/json" },
  });

  client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
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

      if (original._retry) return Promise.reject(error);
      original._retry = true;

      const existingRefresh = await tokenStorage.getRefreshToken();
      if (!isTruthyString(existingRefresh)) {
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
 * 1) baseURL/refreshPath는 shared/lib/config/env 단일 소스에서만 가져옵니다.
 * 2) 401 → refresh 단일 비행 + 원요청 1회 재시도로 안정화합니다.
 * 3) headers 런타임 빈 값 대비를 포함해 Authorization 주입이 안전하게 동작합니다.
 */