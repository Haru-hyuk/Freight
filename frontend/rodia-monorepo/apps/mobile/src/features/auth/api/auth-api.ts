// apps/mobile/src/features/auth/api/auth-api.ts

import { apiClient } from "@/shared/lib/api/apiClient";
import { tokenStorage, type AuthTokens } from "@/shared/lib/storage/tokenStorage";
import type { User, UserRole } from "@/entities/user/types";
import { isAuthDebugLogsEnabled, isMockAuthEnabled } from "@/shared/lib/config/env";
import { sanitizeDeep } from "@/shared/lib/debug/sanitize";
import {
  inferMockRoleFromEmail,
  inferMockRoleFromTokens,
  makeMockTokens,
  MOCK_EMAIL_BY_ROLE,
} from "@/features/auth/model/auth.consts";
import type {
  ApiErrorResponseDTO,
  AuthTokenResponseDTO,
  DriverSignupResponseDTO,
  ShipperSignupResponseDTO,
} from "@/entities/user/dto";
import type {
  AuthRole,
  DriverSignupParams,
  DriverSignupResult,
  LoginParams,
  LoginResult,
  LogoutResult,
  ShipperSignupParams,
  ShipperSignupResult,
  DuplicateEmailCheckParams,
  DuplicateEmailCheckResult,
} from "@/features/auth/model/auth.types";

type AnyObj = Record<string, any>;

declare const __DEV__: boolean;

const warned = new Set<string>();
const AUTH_DEBUG_LOGS_ENABLED = isAuthDebugLogsEnabled();

function warnOnce(key: string, message: string) {
  if (!__DEV__) return;
  if (!AUTH_DEBUG_LOGS_ENABLED) return;
  if (warned.has(key)) return;
  warned.add(key);
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

function toSafeEmail(v: unknown): string {
  return (pickString(v) ?? "").trim();
}

function toSafePassword(v: unknown): string {
  return (pickString(v) ?? "").trim();
}

function onlyDigits(v: unknown): string {
  return (pickString(v) ?? "").replace(/\D/g, "");
}

function normalizePhone(v: unknown): string {
  const digits = onlyDigits(v);
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
  if (digits.length === 10 && digits.startsWith("02")) return `02-${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  return (pickString(v) ?? "").trim();
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

function toSafePreview(input: unknown): string | undefined {
  try {
    const safe = sanitizeDeep(input);
    const json = JSON.stringify(safe);
    if (!isTruthyString(json) || json === "{}" || json === "[]") return undefined;
    return json.length > 240 ? `${json.slice(0, 240)}...` : json;
  } catch {
    return undefined;
  }
}

function isMockMode(): boolean {
  return isMockAuthEnabled();
}

function buildMockDisplayName(role: AuthRole): string {
  return role === "driver" ? "Mock Driver" : "Mock Shipper";
}

function buildMockUser(role: AuthRole, email: string): User {
  return {
    id: "mock-user",
    role,
    email,
    name: buildMockDisplayName(role),
  };
}

function buildMockLoginResult(role: AuthRole, email: string): LoginResult {
  return {
    user: buildMockUser(role, email),
    tokens: makeMockTokens(role),
  };
}

function normalizePositiveInt(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(pickString(v));
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  if (i <= 0) return null;
  return i;
}

function extractIdFromAny(data: unknown, keys: string[]): number | null {
  const root = (data ?? {}) as AnyObj;
  const sources: AnyObj[] = [root, (root?.data ?? {}) as AnyObj, (root?.result ?? {}) as AnyObj];

  for (const source of sources) {
    for (const key of keys) {
      const id = normalizePositiveInt(source?.[key]);
      if (id) return id;
    }
  }

  return null;
}

function normalizeRoleFromToken(roleRaw: unknown): UserRole | null {
  const r = (pickString(roleRaw) ?? "").toUpperCase();
  if (!r) return null;

  const normalized = r.startsWith("ROLE_") ? r.slice("ROLE_".length) : r;

  if (normalized.includes("DRIVER")) return "driver";
  if (normalized.includes("SHIPPER")) return "shipper";

  if (normalized === "DRIVER") return "driver";
  if (normalized === "SHIPPER") return "shipper";

  return null;
}

function normalizeUserId(raw: unknown): string | null {
  const s = pickString(raw);
  return s ? s : null;
}

function extractApiErrorMeta(err: unknown): { status?: number; code?: string; message?: string } {
  const e = err as AnyObj;
  const status = e?.response?.status ?? e?.status;
  const data = e?.response?.data ?? e?.data ?? null;

  const d = (data ?? {}) as ApiErrorResponseDTO & AnyObj;

  const code = pickString(d?.code, d?.errorCode, d?.error?.code, d?.name) ?? pickString(e?.code, e?.name);

  const message =
    pickString(d?.message, d?.error?.message, d?.errorMessage, e?.message, e?.toString?.()) ?? undefined;

  return { status: typeof status === "number" ? status : undefined, code: code ?? undefined, message };
}

function extractReadableApiErrorMessage(err: unknown, fallback?: string): string | undefined {
  const e = (err ?? {}) as AnyObj;
  const responseData = e?.response?.data ?? e?.data;
  const safeData = sanitizeDeep(responseData);

  if (typeof safeData === "string" && safeData.trim().length > 0) {
    return safeData.trim();
  }

  const dataObj = (safeData ?? {}) as AnyObj;
  const bodyMessage =
    pickString(
      dataObj?.message,
      dataObj?.errorMessage,
      dataObj?.error?.message,
      dataObj?.detail,
      dataObj?.reason,
      dataObj?.data?.message,
      dataObj?.result?.message
    ) ?? undefined;

  const bodyCode =
    pickString(dataObj?.code, dataObj?.errorCode, dataObj?.error?.code, dataObj?.statusCode, dataObj?.resultCode) ??
    undefined;

  if (bodyMessage && bodyCode && !bodyMessage.includes(bodyCode)) {
    return `${bodyMessage} (${bodyCode})`;
  }

  if (bodyMessage) return bodyMessage;

  const preview = toSafePreview(safeData);
  if (preview) return preview;
  return pickString(fallback);
}

function extractAuthTokenResponse(data: unknown): AuthTokenResponseDTO | null {
  const d = (data ?? {}) as AnyObj;

  const root =
    d?.data?.accessToken || d?.data?.tokenType || d?.data?.expiresIn || d?.data?.refreshToken
      ? d?.data
      : d?.result?.accessToken || d?.result?.tokenType || d?.result?.expiresIn || d?.result?.refreshToken
        ? d?.result
        : d;

  const accessToken = pickString(root?.accessToken, root?.access_token, root?.token);
  const refreshToken = pickString(root?.refreshToken, root?.refresh_token);
  const tokenType = pickString(root?.tokenType, root?.token_type) ?? "Bearer";

  const expiresInRaw = root?.expiresIn ?? root?.expires_in;
  const expiresInNum = typeof expiresInRaw === "number" ? expiresInRaw : Number(pickString(expiresInRaw));

  if (!accessToken) return null;

  return {
    accessToken,
    refreshToken,
    tokenType,
    expiresIn: Number.isFinite(expiresInNum) ? expiresInNum : 0,
  };
}

function buildTokensFromAuthTokenResponse(tokenRes: AuthTokenResponseDTO): AuthTokens {
  const access = pickString(tokenRes?.accessToken)?.trim() ?? "";
  const refresh = pickString(tokenRes?.refreshToken)?.trim() ?? "";
  if (!access) return { accessToken: "", refreshToken: "" };
  return { accessToken: access, refreshToken: refresh || access };
}

function base64UrlToBase64(input: string): string {
  const s = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return s + pad;
}

function base64ToBytes(base64: string): Uint8Array | null {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const lookup = new Uint8Array(256);
  lookup.fill(255);
  for (let i = 0; i < chars.length; i += 1) {
    lookup[chars.charCodeAt(i)] = i;
  }
  lookup["=".charCodeAt(0)] = 0;

  const clean = base64.replace(/[\r\n\s]/g, "");
  if (!clean) return null;

  const len = clean.length;
  if (len % 4 !== 0) return null;

  const out: number[] = [];

  for (let i = 0; i < len; i += 4) {
    const c1 = lookup[clean.charCodeAt(i)];
    const c2 = lookup[clean.charCodeAt(i + 1)];
    const c3 = lookup[clean.charCodeAt(i + 2)];
    const c4 = lookup[clean.charCodeAt(i + 3)];

    if (c1 === 255 || c2 === 255 || c3 === 255 || c4 === 255) return null;

    const triple = (c1 << 18) | (c2 << 12) | (c3 << 6) | c4;

    const b1 = (triple >> 16) & 0xff;
    const b2 = (triple >> 8) & 0xff;
    const b3 = triple & 0xff;

    out.push(b1);
    if (clean[i + 2] !== "=") out.push(b2);
    if (clean[i + 3] !== "=") out.push(b3);
  }

  return new Uint8Array(out);
}

function bytesToUtf8(bytes: Uint8Array): string {
  try {
    if (typeof TextDecoder !== "undefined") {
      return new TextDecoder("utf-8").decode(bytes);
    }
  } catch {
    // ignore
  }

  let bin = "";
  for (let i = 0; i < bytes.length; i += 1) {
    bin += String.fromCharCode(bytes[i] ?? 0);
  }

  try {
    return decodeURIComponent(escape(bin));
  } catch {
    return bin;
  }
}

function decodeJwtPayload(accessToken: string): AnyObj | null {
  const t = accessToken.trim();
  const parts = t.split(".");
  if (parts.length < 2) return null;

  const payloadB64 = base64UrlToBase64(parts[1] ?? "");
  const bytes = base64ToBytes(payloadB64);
  if (!bytes) return null;

  const json = bytesToUtf8(bytes);
  try {
    const obj = JSON.parse(json) as AnyObj;
    if (!obj || typeof obj !== "object") return null;
    return obj;
  } catch {
    return null;
  }
}

function extractUserFromAccessToken(accessToken: string): User | null {
  const payload = decodeJwtPayload(accessToken);
  if (!payload) return null;

  const role =
    normalizeRoleFromToken(payload?.role) ??
    normalizeRoleFromToken(payload?.roles) ??
    normalizeRoleFromToken(payload?.authority) ??
    normalizeRoleFromToken(payload?.auth) ??
    normalizeRoleFromToken(payload?.authorities?.[0]);

  const userId =
    normalizeUserId(payload?.userId) ?? normalizeUserId(payload?.id) ?? normalizeUserId(payload?.sub);

  const email = pickString(payload?.email);

  if (!role || !userId) return null;

  return {
    id: userId,
    role,
    email,
    name: undefined,
  };
}

function buildFallbackUser(role: AuthRole, email: string, accessToken?: string | null): User {
  const tokenUser = accessToken ? extractUserFromAccessToken(accessToken) : null;
  return (
    tokenUser ?? {
      id: "unknown",
      role,
      email,
      name: role === "driver" ? "Driver" : "Shipper",
    }
  );
}

function getRoleLoginPath(role: AuthRole): string {
  return role === "driver" ? "/api/auth/driver/login" : "/api/auth/shipper/login";
}

export async function driverSignup(params: DriverSignupParams): Promise<DriverSignupResult> {
  const payload: DriverSignupParams = {
    email: toSafeEmail(params?.email),
    password: toSafePassword(params?.password),
    name: pickString(params?.name) ?? "",
    phone: pickString(params?.phone) ?? "",
    address: pickString(params?.address) ?? "",
    addressDetail: pickString(params?.addressDetail) ?? "",
    bankName: pickString(params?.bankName) ?? "",
    bankAccount: pickString(params?.bankAccount) ?? "",
  };

  if (
    !payload.email ||
    !payload.password ||
    !payload.name ||
    !payload.phone ||
    !payload.address ||
    !payload.addressDetail ||
    !payload.bankName ||
    !payload.bankAccount
  ) {
    return { driverId: null, errorCode: "INVALID_INPUT_VALUE", message: "필수 입력값 누락" };
  }

  if (isMockMode()) {
    return { driverId: 1 };
  }

  warnOnce("auth.real.driver.signup", "[auth] driverSignup → POST /api/auth/driver/signup");

  try {
    const res = await apiClient.post("/api/auth/driver/signup", payload);
    const data = (res as any)?.data ?? null;
    const d = (data ?? {}) as DriverSignupResponseDTO & AnyObj;
    const driverId = extractIdFromAny(d, ["driverId", "driver_id", "userId", "memberId", "id"]);
    if (!driverId) {
      return {
        driverId: null,
        errorCode: "UNKNOWN",
        message: "회원가입 응답에서 기사 식별자(driverId)를 확인하지 못했습니다.",
      };
    }
    return { driverId };
  } catch (err) {
    const meta = extractApiErrorMeta(err);
    const isInvalid = meta?.status === 400;
    return { driverId: null, errorCode: isInvalid ? "INVALID_INPUT_VALUE" : "UNKNOWN", message: meta?.message };
  }
}

export async function shipperSignup(params: ShipperSignupParams): Promise<ShipperSignupResult> {
  const payload: ShipperSignupParams = {
    email: toSafeEmail(params?.email),
    password: toSafePassword(params?.password),
    name: pickString(params?.name) ?? "",
    companyName: pickString(params?.companyName) ?? "",
    phone: normalizePhone(params?.phone),
    address: pickString(params?.address) ?? "",
    addressDetail: pickString(params?.addressDetail) ?? "",
    bizRegNo: onlyDigits(params?.bizRegNo),
    bizPhone: normalizePhone(params?.bizPhone),
    openDate: normalizeOpenDate(params?.openDate),
    ownerName: pickString(params?.ownerName) ?? "",
  };

  if (
    !payload.email ||
    !payload.password ||
    !payload.name ||
    !payload.companyName ||
    !payload.phone ||
    !payload.address ||
    !payload.addressDetail ||
    !payload.bizRegNo ||
    !payload.bizPhone ||
    !payload.openDate ||
    !payload.ownerName
  ) {
    return { shipperId: null, errorCode: "INVALID_INPUT_VALUE", message: "필수 입력값 누락" };
  }

  if (onlyDigits(payload.phone).length < 10) {
    return { shipperId: null, errorCode: "INVALID_INPUT_VALUE", message: "전화번호는 숫자 10자리 이상 입력해 주세요." };
  }

  if (onlyDigits(payload.bizPhone).length < 10) {
    return {
      shipperId: null,
      errorCode: "INVALID_INPUT_VALUE",
      message: "사업장 연락처는 숫자 10자리 이상 입력해 주세요.",
    };
  }

  if (payload.bizRegNo.length < 10) {
    return {
      shipperId: null,
      errorCode: "INVALID_INPUT_VALUE",
      message: "사업자등록번호는 숫자 10자리로 입력해 주세요.",
    };
  }

  if (!isValidOpenDate(payload.openDate)) {
    return {
      shipperId: null,
      errorCode: "INVALID_INPUT_VALUE",
      message: "개업일자는 YYYYMMDD 형식(예: 20240131)으로 입력해 주세요.",
    };
  }

  if (isMockMode()) {
    return { shipperId: 1 };
  }

  warnOnce("auth.real.shipper.signup", "[auth] shipperSignup → POST /api/auth/shipper/signup");

  try {
    const res = await apiClient.post("/api/auth/shipper/signup", payload);
    const data = (res as any)?.data ?? null;
    const d = (data ?? {}) as ShipperSignupResponseDTO & AnyObj;
    const shipperId = extractIdFromAny(d, ["shipperId", "shipper_id", "userId", "memberId", "id"]);
    if (!shipperId) {
      return {
        shipperId: null,
        errorCode: "UNKNOWN",
        message: "회원가입 응답에서 화주 식별자(shipperId)를 확인하지 못했습니다.",
      };
    }
    return { shipperId };
  } catch (err) {
    const meta = extractApiErrorMeta(err);
    const isInvalid = meta?.status === 400;
    const message = extractReadableApiErrorMessage(err, meta?.message) ?? meta?.message;
    return { shipperId: null, errorCode: isInvalid ? "INVALID_INPUT_VALUE" : "UNKNOWN", message };
  }
}

async function loginByRole(role: AuthRole, email: string, password: string): Promise<LoginResult> {
  const path = getRoleLoginPath(role);

  const res = await apiClient.post(path, { email, password });
  const data = (res as any)?.data ?? null;

  const tokenRes = extractAuthTokenResponse(data);
  if (!tokenRes?.accessToken) return { user: null, tokens: null, tokenType: null, expiresIn: null };

  const tokens = buildTokensFromAuthTokenResponse(tokenRes);
  const user = buildFallbackUser(role, email, tokenRes.accessToken);

  return {
    user,
    tokens,
    tokenType: tokenRes.tokenType ?? null,
    expiresIn: typeof tokenRes.expiresIn === "number" ? tokenRes.expiresIn : null,
  };
}

export async function driverLogin(params: LoginParams): Promise<LoginResult> {
  const email = toSafeEmail(params?.email);
  const password = toSafePassword(params?.password);
  if (!email || !password) return { user: null, tokens: null };

  if (isMockMode()) return buildMockLoginResult("driver", email);

  warnOnce("auth.real.driver.login", "[auth] driverLogin → POST /api/auth/driver/login");
  return loginByRole("driver", email, password);
}

export async function shipperLogin(params: LoginParams): Promise<LoginResult> {
  const email = toSafeEmail(params?.email);
  const password = toSafePassword(params?.password);
  if (!email || !password) return { user: null, tokens: null };

  if (isMockMode()) return buildMockLoginResult("shipper", email);

  warnOnce("auth.real.shipper.login", "[auth] shipperLogin → POST /api/auth/shipper/login");
  return loginByRole("shipper", email, password);
}

export async function login(params: LoginParams): Promise<LoginResult> {
  const email = toSafeEmail(params?.email);
  const password = toSafePassword(params?.password);
  if (!email || !password) return { user: null, tokens: null };

  if (isMockMode()) {
    const role = params?.role ?? inferMockRoleFromEmail(email);
    return buildMockLoginResult(role, email);
  }

  const role: AuthRole = params?.role ?? inferMockRoleFromEmail(email);
  warnOnce("auth.real.login", `[auth] login(role=${role}) → POST ${getRoleLoginPath(role)}`);
  return loginByRole(role, email, password);
}

export async function logout(accessToken?: string): Promise<LogoutResult> {
  if (isMockMode()) return { ok: true };

  const token = pickString(accessToken);
  if (!token) return { ok: false };

  try {
    await apiClient.post("/api/auth/logout", undefined, { headers: { Authorization: `Bearer ${token}` } });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function me(): Promise<User | null> {
  if (isMockMode()) {
    const refresh = await tokenStorage.getRefreshToken();
    const role = inferMockRoleFromTokens(refresh);
    return buildMockUser(role, MOCK_EMAIL_BY_ROLE[role]);
  }

  const access = await tokenStorage.getAccessToken();
  if (!isTruthyString(access)) return null;

  return extractUserFromAccessToken(access) ?? null;
}

export async function checkDuplicateEmail(_: DuplicateEmailCheckParams): Promise<DuplicateEmailCheckResult> {
  // 스펙에 명시된 endpoint가 없어 클라이언트에서 추정 호출을 하지 않음(null로 위임)
  return { isDuplicate: null };
}

/**
 * 1) 로그인/회원가입 endpoint는 스펙 경로를 하드코딩해 경로 꼬임(가입→로그인 호출) 리스크를 제거.
 * 2) 서버가 accessToken만 내려줘도 refreshToken을 accessToken으로 채워 토큰 저장/부팅 크래시 방지.
 * 3) /me가 없어도 JWT payload 디코딩으로 role/userId를 복구해 Role Gate가 동작.
 */
