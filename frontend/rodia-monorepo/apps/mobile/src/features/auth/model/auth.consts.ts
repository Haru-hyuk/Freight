// apps/mobile/src/features/auth/model/auth.consts.ts

import type { UserRole } from "@/entities/user/types";

export const MOCK_PASSWORD = "123456";

export const MOCK_EMAIL_BY_ROLE: Record<UserRole, string> = {
  shipper: "shipper@mock.dev",
  driver: "driver@mock.dev",
};

export function inferMockRoleFromEmail(email: string): UserRole {
  const raw = (email ?? "").trim().toLowerCase();
  if (raw.includes("driver")) return "driver";
  if (raw.includes("shipper")) return "shipper";
  return "shipper";
}

export function makeMockTokens(role: UserRole) {
  return {
    accessToken: `mock-access-${role}`,
    refreshToken: `mock-refresh-${role}`,
  };
}

export function inferMockRoleFromTokens(refreshToken?: string | null): UserRole {
  const raw = (refreshToken ?? "").toLowerCase();
  if (raw.includes("driver")) return "driver";
  if (raw.includes("shipper")) return "shipper";
  return "shipper";
}

// 유효성 검증 메시지
export const AUTH_VALIDATION_MESSAGES = {
  email: {
    required: "이메일을 입력해주세요.",
    invalid: "올바른 이메일 형식이 아닙니다.",
  },
  password: {
    required: "비밀번호를 입력해주세요.",
    tooShort: "비밀번호는 6자 이상이어야 합니다.",
  },
  name: {
    required: "이름을 입력해주세요.",
  },
  confirmPassword: {
    mismatch: "비밀번호가 일치하지 않습니다.",
  },
} as const;

// 안내 메시지
export const AUTH_MESSAGES = {
  roleAutoDetect: "역할은 로그인 후 서버에서 자동 결정됩니다.",
  mockModeHint: (role: UserRole) =>
    `Mock 모드: ${
      role === "driver" ? "기사" : "화주" }로 분기됩니다. (driver/shipper 포함 → 해당 역할)`,
  carNumberHint: "* 정산 및 배차를 위해 필수입니다.",
} as const;

/**
 * 1) UserRole(admin 포함) 기준으로 Mock 계정/토큰/분기 규칙을 일관되게 유지.
 * 2) inferMockRoleFromEmail/Token에서 admin 우선 매칭으로 혼동 방지.
 * 3) UI 메시지는 역할 추가에도 깨지지 않게 분기 처리.
 */
