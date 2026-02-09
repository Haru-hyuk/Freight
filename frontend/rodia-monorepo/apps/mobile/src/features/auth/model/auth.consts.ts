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
  carNumber: {
    required: "차량 번호를 입력해주세요.",
  },
} as const;

// 안내 메시지
export const AUTH_MESSAGES = {
  roleAutoDetect: "역할은 로그인 후 서버에서 자동 결정됩니다.",
  mockModeHint: (role: UserRole) => 
    `Mock 모드: ${role === "driver" ? "기사" : "화주"}로 분기됩니다. (driver 포함 → 기사)`,
  carNumberHint: "* 정산 및 배차를 위해 필수입니다.",
} as const;

/**
 * 1) Mock 계정/규칙/토큰 포맷을 auth 도메인 상수로 묶어 UI/API 중복을 제거합니다.
 * 2) mock 토큰에 role을 포함해 앱 재실행 시에도 분기 테스트가 유지됩니다.
 * 3) 실서버 로직과 분리되어, 서버 연동 시 이 파일만 쉽게 축소/제거 가능합니다.
 * 4) 검증 메시지를 상수로 중앙화하여 일관성을 보장합니다.
 */