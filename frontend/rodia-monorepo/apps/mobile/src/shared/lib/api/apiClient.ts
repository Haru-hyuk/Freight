import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import Constants from "expo-constants";
import { tokenStorage, type AuthTokens } from "../tokenStorage";

type AnyObj = Record<string, any>;

function isTruthyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function readEnv(key: string): string | undefined {
  try {
    const v = (process as any)?.env?.[key];
    return typeof v === "string" ? v : undefined;
  } catch {
    return undefined;
  }
}

function resolveBaseURL(): string {
  const envBase =
    readEnv("EXPO_PUBLIC_API_BASE_URL") ??
    readEnv("API_BASE_URL") ??
    (Constants as any)?.expoConfig?.extra?.apiBaseUrl ??
    (Constants as any)?.manifest?.extra?.apiBaseUrl;

  if (isTruthyString(envBase)) return envBase.trim();

  return "http://localhost:3000";
}

function resolveRefreshPath(): string {
  const envPath =
    readEnv("EXPO_PUBLIC_AUTH_REFRESH_PATH") ??
    readEnv("AUTH_REFRESH_PATH") ??
    (Constants as any)?.expoConfig?.extra?.authRefreshPath ??
    (Constants as any)?.manifest?.extra?.authRefreshPath;

  if (isTruthyString(envPath)) return envPath.trim();

  return "/auth/refresh";
}

function extractTokens(data: unknown): Partial<AuthTokens> | null {
  const d = (data ?? {}) as AnyObj;

  const accessToken =
    d?.accessToken ??
    d?.access_token ??
    d?.token ??
    d?.data?.accessToken ??
    d?.data?.access_token ??
    d?.tokens?.accessToken ??
    d?.tokens?.access_token;

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

  const refreshPath = resolveRefreshPath();

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

function setAuthHeader(config: InternalAxiosRequestConfig, accessToken: string) {
  const token = accessToken.trim();
  if (!token) return;

  // Axios v1: headers는 항상 존재하도록 보장(타입상 optional 아님)
  // 다만 런타임에서 비는 케이스 대비해 객체로 보정
  const h: AnyObj = (config.headers ?? {}) as AnyObj;

  if (!h.Authorization && !h.authorization) {
    h.Authorization = `Bearer ${token}`;
  }

  config.headers = h as any;
}

export function createApiClient(): AxiosInstance {
  const baseURL = resolveBaseURL();

  const client = axios.create({
    baseURL,
    timeout: 20_000,
    headers: { "Content-Type": "application/json" },
  });

  client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    const accessToken = await tokenStorage.getAccessToken();
    if (isTruthyString(accessToken)) {
      setAuthHeader(config, accessToken);
    }
    // ✅ 반드시 InternalAxiosRequestConfig 그대로 반환
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

      setAuthHeader(original, nextAccess);

      return client.request(original);
    }
  );

  return client;
}

export const apiClient = createApiClient();

/**
 * 1) axios v1 request interceptor는 InternalAxiosRequestConfig를 반환해야 해서 타입을 맞춤.
 * 2) headers가 비는 런타임 케이스를 대비해 객체로 보정 후 Authorization 주입.
 * 3) 401 발생 시 refresh 단일 비행 + 원요청 1회 재시도로 안정화.
 */
