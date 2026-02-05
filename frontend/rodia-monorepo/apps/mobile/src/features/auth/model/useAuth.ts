// apps/mobile/src/features/auth/model/useAuth.ts
import { useCallback, useSyncExternalStore } from "react";
import { tokenStorage, type AuthTokens } from "@/shared/lib/storage/tokenStorage";
import type { User } from "@/entities/user/types";
import { isMockAuthEnabled } from "@/shared/lib/config/env";
import * as authApi from "../api/auth-api";

export type AuthStatus = "checking" | "authenticated" | "unauthenticated";

export type AuthState = {
  status: AuthStatus;
  user: User | null;

  // DEV/테스트용(백엔드 없이 분기 확인)
  isMockAuth: boolean;

  // UX용
  isBusy: boolean;
  errorMessage: string | null;
};

type AuthActions = {
  bootstrap: () => Promise<void>;
  login: (params: { email: string; password: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
};

export type AuthStore = AuthState & AuthActions;

type Listener = () => void;

const MOCK_AUTH_ENABLED = isMockAuthEnabled();

let state: AuthState = {
  status: "checking",
  user: null,
  isMockAuth: MOCK_AUTH_ENABLED,
  isBusy: false,
  errorMessage: null,
};

const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l());
}

function setState(patch: Partial<AuthState>) {
  state = { ...state, ...patch };
  emit();
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

async function safeSetTokens(tokens: AuthTokens | null) {
  if (!tokens?.accessToken || !tokens?.refreshToken) return;
  await tokenStorage.setTokens(tokens);
}

async function safeClearTokens() {
  await tokenStorage.clearTokens();
}

async function bootstrapImpl() {
  setState({ status: "checking", errorMessage: null, isMockAuth: MOCK_AUTH_ENABLED });

  const tokens = await tokenStorage.getTokens();

  if (!tokens?.accessToken || !tokens?.refreshToken) {
    await safeClearTokens();
    setState({ status: "unauthenticated", user: null });
    return;
  }

  try {
    const user = await authApi.me();
    if (!user?.role) {
      await safeClearTokens();
      setState({ status: "unauthenticated", user: null, errorMessage: "세션 정보가 올바르지 않습니다." });
      return;
    }

    setState({ status: "authenticated", user, errorMessage: null });
  } catch (e: any) {
    await safeClearTokens();
    const msg = typeof e?.message === "string" ? e.message : "세션 확인에 실패했습니다.";
    setState({ status: "unauthenticated", user: null, errorMessage: msg });
  }
}

async function loginImpl(params: { email: string; password: string }) {
  setState({ isBusy: true, errorMessage: null, isMockAuth: MOCK_AUTH_ENABLED });

  try {
    const { user: loginUser, tokens } = await authApi.login(params);

    if (!tokens?.accessToken || !tokens?.refreshToken) {
      setState({ isBusy: false, errorMessage: "로그인 응답에 토큰이 없습니다." });
      return false;
    }

    await safeSetTokens(tokens);

    const ensuredUser = loginUser?.role ? loginUser : await authApi.me();

    if (!ensuredUser?.role) {
      await safeClearTokens();
      setState({ isBusy: false, status: "unauthenticated", user: null, errorMessage: "유저 정보를 불러오지 못했습니다." });
      return false;
    }

    setState({
      isBusy: false,
      status: "authenticated",
      user: ensuredUser,
      errorMessage: null,
    });

    return true;
  } catch (e: any) {
    const msg = typeof e?.message === "string" ? e.message : "로그인에 실패했습니다.";
    setState({ isBusy: false, errorMessage: msg, status: "unauthenticated", user: null });
    return false;
  }
}

async function logoutImpl() {
  setState({ isBusy: true, errorMessage: null, isMockAuth: MOCK_AUTH_ENABLED });

  try {
    await safeClearTokens();
  } finally {
    setState({ isBusy: false, status: "unauthenticated", user: null, errorMessage: null });
  }
}

function clearErrorImpl() {
  setState({ errorMessage: null });
}

export function useAuth(): AuthStore {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const bootstrap = useCallback(async () => {
    await bootstrapImpl();
  }, []);

  const login = useCallback(async (params: { email: string; password: string }) => {
    return loginImpl(params);
  }, []);

  const logout = useCallback(async () => {
    await logoutImpl();
  }, []);

  const clearError = useCallback(() => {
    clearErrorImpl();
  }, []);

  return {
    ...snap,
    bootstrap,
    login,
    logout,
    clearError,
  };
}

/**
 * 1) bootstrap: 토큰 존재 시 /me로 role 포함 유저를 확정(없으면 세션 정리).
 * 2) login: /login → 토큰 저장 → user 없으면 /me로 보강하여 Gatekeeper 분기가 항상 가능하게 함.
 * 3) Mock/Real 전환은 env 단일 소스로만 결정되어 서버 연동 시 변경이 최소화됩니다.
 */