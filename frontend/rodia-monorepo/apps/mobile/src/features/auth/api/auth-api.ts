// apps/mobile/src/features/auth/api/auth-api.ts
import { apiClient } from "@/shared/lib/api/apiClient";
import { tokenStorage, type AuthTokens } from "@/shared/lib/storage/tokenStorage";
import type { User, UserRole } from "@/entities/user/types";
import { getAuthLoginPath, getAuthMePath, isMockAuthEnabled } from "@/shared/lib/config/env";
import {
  inferMockRoleFromEmail,
  inferMockRoleFromTokens,
  makeMockTokens,
  MOCK_EMAIL_BY_ROLE,
} from "@/features/auth/model/auth.consts";

type AnyObj = Record<string, any>;

export type LoginParams = {
  email: string;
  password: string;
};

export type LoginResult = {
  user: User | null;
  tokens: AuthTokens | null;
};

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

function pickString(...candidates: unknown[]): string | undefined {
  for (const c of candidates) {
    if (isTruthyString(c)) return c.trim();
  }
  return undefined;
}

function normalizeRole(v: unknown): UserRole | null {
  const raw = pickString(v);
  if (!raw) return null;
  if (raw === "shipper" || raw === "driver") return raw;
  return null;
}

function extractTokens(data: unknown): AuthTokens | null {
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

  const a = pickString(accessToken);
  const r = pickString(refreshToken);

  if (!a || !r) return null;
  return { accessToken: a, refreshToken: r };
}

function extractUser(data: unknown): User | null {
  const d = (data ?? {}) as AnyObj;

  const u =
    d?.user ??
    d?.me ??
    d?.profile ??
    d?.data?.user ??
    d?.data?.me ??
    d?.data?.profile ??
    d?.data ??
    d;

  const id = pickString(u?.id, u?._id, u?.userId, u?.uid);
  const role = normalizeRole(u?.role) ?? normalizeRole(d?.role) ?? null;

  if (!id || !role) return null;

  return {
    id,
    role,
    email: pickString(u?.email, u?.username),
    name: pickString(u?.name, u?.fullName, u?.nickname),
    createdAt: pickString(u?.createdAt),
    updatedAt: pickString(u?.updatedAt),
  };
}

export async function login(params: LoginParams): Promise<LoginResult> {
  const email = (params?.email ?? "").trim();
  const password = (params?.password ?? "").trim();

  if (!email || !password) return { user: null, tokens: null };

  if (isMockAuthEnabled()) {
    const role = inferMockRoleFromEmail(email);
    const tokens = makeMockTokens(role);

    const user: User = {
      id: "mock-user",
      role,
      email,
      name: role === "driver" ? "Mock Driver" : "Mock Shipper",
    };

    return { user, tokens };
  }

  warnOnce(
    "auth.mock.off",
    "[auth] MOCK_AUTH가 꺼져 있어 실제 네트워크 로그인(auth login path)을 호출합니다. 백엔드 없이 테스트하려면 EXPO_PUBLIC_MOCK_AUTH=1을 설정하세요."
  );

  const res = await apiClient.post(getAuthLoginPath(), { email, password });
  const data = (res as any)?.data ?? null;

  const tokens = extractTokens(data);
  const user = extractUser(data);

  return { user, tokens };
}

export async function me(): Promise<User | null> {
  if (isMockAuthEnabled()) {
    const refresh = await tokenStorage.getRefreshToken();
    const role = inferMockRoleFromTokens(refresh);

    return {
      id: "mock-user",
      role,
      email: MOCK_EMAIL_BY_ROLE[role],
      name: role === "driver" ? "Mock Driver" : "Mock Shipper",
    };
  }

  const res = await apiClient.get(getAuthMePath());
  const data = (res as any)?.data ?? null;

  return extractUser(data);
}

/**
 * 1) Real Mode: role 파라미터 없이 /auth/login → (필요 시) /auth/me로 role 포함 유저 확정.
 * 2) Mock Mode: 이메일 규칙으로 role 추정 + mock 토큰에 role을 인코딩해 재실행에도 분기 유지.
 * 3) 경로(login/me)는 shared/lib/config/env에서만 가져와 서버 연동 시 변경 지점을 단일화합니다.
 */