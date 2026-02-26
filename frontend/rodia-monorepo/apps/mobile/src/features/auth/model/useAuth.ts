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
  address?: string;
  addressDetail?: string;
  bankName?: string;
  bankAccount?: string;
  role: AuthUserRole;
  companyName?: string;
  ownerName?: string;
  bizRegNo?: string;
  bizPhone?: string;
  openDate?: string;
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

function toPhoneHyphen(v: unknown): string {
  const digits = onlyDigits(v);
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
  }
  if (digits.length === 10 && digits.startsWith("02")) {
    return `02-${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }
  return safeTrim(v);
}

function normalizeOpenDate(v: unknown): string {
  const digits = onlyDigits(v);
  return digits.length >= 8 ? digits.slice(0, 8) : digits;
}

function isValidOpenDate(v: string): boolean {
  if (!/^\d{8}$/.test(v)) return false;
  const y = Number(v.slice(0, 4));
  const m = Number(v.slice(4, 6));
  const d = Number(v.slice(6, 8));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return false;
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

function isPositiveSignupId(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v > 0;
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
  const safePhone = toPhoneHyphen(params?.phone);
  const safeAddress = safeTrim(params?.address);
  const safeAddressDetail = safeTrim(params?.addressDetail);
  const safeBankName = safeTrim(params?.bankName);
  const safeBankAccount = safeTrim(params?.bankAccount);

  return {
    email: safeTrim(params?.email),
    password: safeTrim(params?.password),
    name: safeName,
    phone: safePhone,
    address: safeAddress,
    addressDetail: safeAddressDetail,
    bankName: safeBankName,
    bankAccount: safeBankAccount,
  };
}

function buildShipperSignupPayload(params: SignUpParams): ShipperSignupParams {
  const safeName = safeTrim(params?.name);
  const safePhone = toPhoneHyphen(params?.phone);
  const safeBizPhone = toPhoneHyphen(params?.bizPhone);
  const bizRegNo = onlyDigits(params?.bizRegNo);
  const companyName = safeTrim(params?.companyName);
  const ownerName = safeTrim(params?.ownerName);
  const safeAddress = safeTrim(params?.address);
  const safeAddressDetail = safeTrim(params?.addressDetail);
  const openDate = normalizeOpenDate(params?.openDate);

  return {
    email: safeTrim(params?.email),
    password: safeTrim(params?.password),
    name: safeName,
    companyName,
    phone: safePhone,
    address: safeAddress,
    addressDetail: safeAddressDetail,
    bizRegNo,
    bizPhone: safeBizPhone,
    openDate,
    ownerName,
  };
}

function toSignupErrorMessage(errorCode?: "INVALID_INPUT_VALUE" | "UNKNOWN", message?: string): string {
  const safeMessage = safeTrim(message);
  if (safeMessage) return safeMessage;
  if (errorCode === "INVALID_INPUT_VALUE") {
    return "필수 입력값 누락";
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
  const address = safeTrim(params?.address);
  const addressDetail = safeTrim(params?.addressDetail);
  const role = params?.role;

  if (!email || !password || !name || !phone || !address || !addressDetail || (role !== "shipper" && role !== "driver")) {
    setState({ isBusy: false, errorMessage: "필수 입력값 누락" });
    return false;
  }

  try {
    if (role === "shipper") {
      const companyName = safeTrim(params?.companyName);
      const ownerName = safeTrim(params?.ownerName);
      const bizRegNo = onlyDigits(params?.bizRegNo);
      const bizPhoneDigits = onlyDigits(params?.bizPhone);
      const openDate = normalizeOpenDate(params?.openDate);
      const phoneDigits = onlyDigits(phone);

      if (!companyName || !ownerName || !bizRegNo || !bizPhoneDigits || !openDate) {
        setState({ isBusy: false, errorMessage: "필수 입력값 누락" });
        return false;
      }

      if (bizRegNo.length < 10) {
        setState({ isBusy: false, errorMessage: "사업자등록번호는 숫자 10자리로 입력해 주세요." });
        return false;
      }

      if (phoneDigits.length < 10 || bizPhoneDigits.length < 10) {
        setState({ isBusy: false, errorMessage: "전화번호는 숫자 10자리 이상으로 입력해 주세요." });
        return false;
      }

      if (!isValidOpenDate(openDate)) {
        setState({ isBusy: false, errorMessage: "개업일자는 YYYYMMDD 형식(예: 20240131)으로 입력해 주세요." });
        return false;
      }

      const payload = buildShipperSignupPayload({
        email,
        password,
        name,
        phone,
        address,
        addressDetail,
        role,
        companyName,
        ownerName,
        bizRegNo,
        bizPhone: params?.bizPhone,
        openDate,
      });
      const res = await authApi.shipperSignup(payload);
      const shipperId = res?.shipperId;
      if (isPositiveSignupId(shipperId)) {
        await verificationStorage.setPendingRole(role);
        setState({ pendingVerificationRole: role });
        return loginAfterSignupOrContinue({ email, password, role });
      }

      setState({
        isBusy: false,
        errorMessage: toSignupErrorMessage(
          res?.errorCode,
          res?.message ?? "회원가입 응답에서 화주 식별자(shipperId)를 확인하지 못했습니다."
        ),
      });
      return false;
    }

    const bankName = safeTrim(params?.bankName);
    const bankAccount = safeTrim(params?.bankAccount);
    const phoneDigits = onlyDigits(phone);

    if (!bankName || !bankAccount) {
      setState({ isBusy: false, errorMessage: "필수 입력값 누락" });
      return false;
    }

    if (phoneDigits.length < 10) {
      setState({ isBusy: false, errorMessage: "전화번호는 숫자 10자리 이상으로 입력해 주세요." });
      return false;
    }

    const payload = buildDriverSignupPayload({
      email,
      password,
      name,
      phone,
      address,
      addressDetail,
      bankName,
      bankAccount,
      role,
    });
    const res = await authApi.driverSignup(payload);
    const driverId = res?.driverId;
    if (isPositiveSignupId(driverId)) {
      await verificationStorage.setPendingRole(role);
      setState({ pendingVerificationRole: role });
      return loginAfterSignupOrContinue({ email, password, role });
    }

    setState({
      isBusy: false,
      errorMessage: toSignupErrorMessage(
        res?.errorCode,
        res?.message ?? "회원가입 응답에서 기사 식별자(driverId)를 확인하지 못했습니다."
      ),
    });
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
