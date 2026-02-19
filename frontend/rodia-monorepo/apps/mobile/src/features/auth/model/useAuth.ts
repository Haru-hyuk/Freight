// apps/mobile/src/features/auth/model/useAuth.ts
import { useCallback, useSyncExternalStore } from "react";
import { tokenStorage, type AuthTokens } from "@/shared/lib/storage/tokenStorage";
import { verificationStorage } from "@/shared/lib/storage/verificationStorage";
import type { User } from "@/entities/user/types";
import { isMockAuthEnabled } from "@/shared/lib/config/env";
import type { AuthRole, AuthUserRole, DriverSignupParams, ShipperSignupParams } from "../model/auth.types";
import * as authApi from "../api/auth-api";

export type AuthStatus = "checking" | "authenticated" | "unauthenticated";

export type AuthState = {
  status: AuthStatus;
  user: User | null;
  isMockAuth: boolean;
  pendingVerificationRole: AuthUserRole | null;
  isBusy: boolean;
  errorMessage: string | null;
};

type SignUpParams = {
  email: string;
  password: string;
  name: string;
  phone: string;
  role: AuthUserRole;
};

type AuthActions = {
  bootstrap: () => Promise<void>;
  login: (params: { email: string; password: string; role?: AuthRole }) => Promise<boolean>;
  signUp: (params: SignUpParams) => Promise<boolean>;
  logout: () => Promise<void>;
  completeVerification: () => Promise<void>;
  clearPendingVerification: () => void;
  clearError: () => void;
};

export type AuthStore = AuthState & AuthActions;

type Listener = () => void;

let state: AuthState = {
  status: "checking",
  user: null,
  isMockAuth: isMockAuthEnabled(),
  pendingVerificationRole: null,
  isBusy: false,
  errorMessage: null,
};

const listeners = new Set<Listener>();
let bootstrapInFlight: Promise<void> | null = null;

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

function isTruthyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function safeTrim(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function onlyDigits(v: unknown): string {
  return safeTrim(v).replace(/\D/g, "");
}

function readMockAuthMode(): boolean {
  return isMockAuthEnabled();
}

function parseMetaRefreshToken(refreshToken: string): { role?: AuthRole; email?: string } | null {
  const rt = safeTrim(refreshToken);
  if (!rt.startsWith("meta:")) return null;

  const body = rt.slice("meta:".length);
  const [encoded] = body.split("|");

  if (!isTruthyString(encoded)) return null;

  try {
    const json = decodeURIComponent(encoded);
    const meta = JSON.parse(json) as { role?: AuthRole; email?: string } | null;
    if (!meta || typeof meta !== "object") return null;
    return meta;
  } catch {
    return null;
  }
}

function buildFallbackUser(role: AuthUserRole, email: string): User {
  return {
    id: "unknown",
    role,
    email,
    name: role === "driver" ? "Driver" : "Shipper",
  };
}

function buildDriverSignupPayload(params: SignUpParams): DriverSignupParams {
  const safeName = safeTrim(params?.name);
  const safePhone = safeTrim(params?.phone);

  return {
    email: safeTrim(params?.email),
    password: safeTrim(params?.password),
    name: safeName,
    phone: safePhone,
    address: "N/A",
    addressDetail: "-",
    bankName: "N/A",
    bankAccount: "000-000-0000",
  };
}

function buildShipperSignupPayload(params: SignUpParams): ShipperSignupParams {
  const safeName = safeTrim(params?.name);
  const safePhone = safeTrim(params?.phone);
  const phoneDigits = onlyDigits(safePhone);
  const bizPhone =
    phoneDigits.length === 11
      ? `${phoneDigits.slice(0, 3)}-${phoneDigits.slice(3, 7)}-${phoneDigits.slice(7, 11)}`
      : "02-1234-5678";
  const bizRegNo = "1234567890";
  const companyName = safeName ? `${safeName} 화주` : "로디아 화주";
  const ownerName = safeName || "홍길동";

  return {
    email: safeTrim(params?.email),
    password: safeTrim(params?.password),
    name: safeName,
    companyName,
    phone: safePhone,
    address: "서울특별시 강남구 테헤란로 1",
    addressDetail: "101호",
    bizRegNo,
    bizPhone,
    openDate: "20200101",
    ownerName,
  };
}

function toSignupErrorMessage(errorCode?: "INVALID_INPUT_VALUE" | "UNKNOWN", message?: string): string {
  const safeMessage = safeTrim(message);
  if (safeMessage) return safeMessage;
  if (errorCode === "INVALID_INPUT_VALUE") {
    return "Please check signup inputs.";
  }
  return "Signup failed. Please try again.";
}

async function safeSetTokens(tokens: AuthTokens | null) {
  const access = safeTrim(tokens?.accessToken);
  const refresh = safeTrim(tokens?.refreshToken) || access;

  if (!access || !refresh) return;

  await tokenStorage.setTokens({ accessToken: access, refreshToken: refresh });
}

async function safeClearTokens() {
  await tokenStorage.clearTokens();
}

async function runBootstrap() {
  setState({ status: "checking", errorMessage: null, isMockAuth: readMockAuthMode() });

  const tokens = await tokenStorage.getTokens();
  const access = safeTrim(tokens?.accessToken);
  const refresh = safeTrim(tokens?.refreshToken);

  if (!access || !refresh) {
    await safeClearTokens();
    await verificationStorage.clearPendingRole();
    setState({ status: "unauthenticated", user: null, pendingVerificationRole: null });
    return;
  }

  try {
    const user = await authApi.me();
    if (user?.role) {
      const pendingRole = await verificationStorage.getPendingRole();
      const nextPending = pendingRole === user.role ? pendingRole : null;
      setState({ status: "authenticated", user, pendingVerificationRole: nextPending, errorMessage: null });
      return;
    }
  } catch {
    // fallback below
  }

  const meta = parseMetaRefreshToken(refresh);
  const role = meta?.role;
  const email = meta?.email;

  if (role && email) {
    const pendingRole = await verificationStorage.getPendingRole();
    const nextPending = pendingRole === role ? pendingRole : null;
    setState({ status: "authenticated", user: buildFallbackUser(role, email), pendingVerificationRole: nextPending, errorMessage: null });
    return;
  }

  await safeClearTokens();
  await verificationStorage.clearPendingRole();
  setState({ status: "unauthenticated", user: null, pendingVerificationRole: null, errorMessage: "Session is invalid." });
}

async function bootstrapImpl() {
  if (bootstrapInFlight) {
    return bootstrapInFlight;
  }

  bootstrapInFlight = (async () => {
    try {
      await runBootstrap();
    } finally {
      bootstrapInFlight = null;
    }
  })();

  return bootstrapInFlight;
}

async function loginImpl(params: { email: string; password: string; role?: AuthRole }) {
  setState({ isBusy: true, errorMessage: null, isMockAuth: readMockAuthMode() });

  try {
    const { user: loginUser, tokens } = await authApi.login(params);

    const access = safeTrim(tokens?.accessToken);
    const refresh = safeTrim(tokens?.refreshToken) || access;

    if (!access || !refresh) {
      setState({ isBusy: false, errorMessage: "Login response has no token." });
      return false;
    }

    await safeSetTokens({ accessToken: access, refreshToken: refresh });

    const ensuredUser = loginUser?.role ? loginUser : null;

    if (!ensuredUser?.role) {
      const u = await authApi.me();
      if (!u?.role) {
        await safeClearTokens();
        await verificationStorage.clearPendingRole();
        setState({
          isBusy: false,
          status: "unauthenticated",
          user: null,
          pendingVerificationRole: null,
          errorMessage: "Could not load user info.",
        });
        return false;
      }

      const pendingRole = await verificationStorage.getPendingRole();
      const nextPending = pendingRole === u.role ? pendingRole : null;
      setState({ isBusy: false, status: "authenticated", user: u, pendingVerificationRole: nextPending, errorMessage: null });
      return true;
    }

    const pendingRole = await verificationStorage.getPendingRole();
    const nextPending = pendingRole === ensuredUser.role ? pendingRole : null;
    setState({
      isBusy: false,
      status: "authenticated",
      user: ensuredUser,
      pendingVerificationRole: nextPending,
      errorMessage: null,
    });

    return true;
  } catch (e: any) {
    const msg = typeof e?.message === "string" ? e.message : "Login failed.";
    setState({ isBusy: false, errorMessage: msg, status: "unauthenticated", user: null, pendingVerificationRole: null });
    return false;
  }
}

async function loginAfterSignupOrContinue(params: { email: string; password: string; role: AuthUserRole }) {
  const loggedIn = await loginImpl(params);
  if (loggedIn) return true;

  // 가입은 성공했고 자동 로그인이 실패한 경우, 가입 자체는 성공으로 처리.
  setState({ isBusy: false, errorMessage: null, status: "unauthenticated", user: null });
  return true;
}

async function signUpImpl(params: SignUpParams) {
  setState({ isBusy: true, errorMessage: null, isMockAuth: readMockAuthMode() });

  const email = safeTrim(params?.email);
  const password = safeTrim(params?.password);
  const name = safeTrim(params?.name);
  const phone = safeTrim(params?.phone);
  const role = params?.role;

  if (!email || !password || !name || !phone || (role !== "shipper" && role !== "driver")) {
    setState({ isBusy: false, errorMessage: "Please check signup inputs." });
    return false;
  }

  try {
    if (role === "shipper") {
      const payload = buildShipperSignupPayload({ email, password, name, phone, role });
      const res = await authApi.shipperSignup(payload);
      const shipperId = typeof res?.shipperId === "number" ? res.shipperId : null;
      if (shipperId && shipperId > 0) {
        await verificationStorage.setPendingRole(role);
        setState({ pendingVerificationRole: role });
        return loginAfterSignupOrContinue({ email, password, role });
      }

      setState({ isBusy: false, errorMessage: toSignupErrorMessage(res?.errorCode, res?.message) });
      return false;
    }

    const payload = buildDriverSignupPayload({ email, password, name, phone, role });
    const res = await authApi.driverSignup(payload);
    const driverId = typeof res?.driverId === "number" ? res.driverId : null;
    if (driverId && driverId > 0) {
      await verificationStorage.setPendingRole(role);
      setState({ pendingVerificationRole: role });
      return loginAfterSignupOrContinue({ email, password, role });
    }

    setState({ isBusy: false, errorMessage: toSignupErrorMessage(res?.errorCode, res?.message) });
    return false;
  } catch (e: any) {
    const msg = typeof e?.message === "string" ? e.message : "Signup failed.";
    setState({ isBusy: false, errorMessage: msg });
    return false;
  }
}

async function logoutImpl() {
  setState({ isBusy: true, errorMessage: null, isMockAuth: readMockAuthMode() });

  try {
    const access = await tokenStorage.getAccessToken();
    if (isTruthyString(access)) {
      await authApi.logout(access.trim());
    }
  } catch {
    // ignore
  } finally {
    await safeClearTokens();
    await verificationStorage.clearPendingRole();
    setState({ isBusy: false, status: "unauthenticated", user: null, pendingVerificationRole: null, errorMessage: null });
  }
}

async function completeVerificationImpl() {
  await verificationStorage.clearPendingRole();
  if (state.pendingVerificationRole == null) return;
  setState({ pendingVerificationRole: null });
}

function clearPendingVerificationImpl() {
  void verificationStorage.clearPendingRole();
  if (state.pendingVerificationRole == null) return;
  setState({ pendingVerificationRole: null });
}

function clearErrorImpl() {
  setState({ errorMessage: null });
}

export function useAuth(): AuthStore {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const bootstrap = useCallback(async () => {
    await bootstrapImpl();
  }, []);

  const login = useCallback(async (params: { email: string; password: string; role?: AuthRole }) => {
    return loginImpl(params);
  }, []);

  const signUp = useCallback(async (params: SignUpParams) => {
    return signUpImpl(params);
  }, []);

  const logout = useCallback(async () => {
    await logoutImpl();
  }, []);

  const completeVerification = useCallback(async () => {
    await completeVerificationImpl();
  }, []);

  const clearPendingVerification = useCallback(() => {
    clearPendingVerificationImpl();
  }, []);

  const clearError = useCallback(() => {
    clearErrorImpl();
  }, []);

  return {
    ...snap,
    bootstrap,
    login,
    signUp,
    logout,
    completeVerification,
    clearPendingVerification,
    clearError,
  };
}
