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

/**
 * 1) Mock 계정/규칙/토큰 포맷을 auth 도메인 상수로 묶어 UI/API 중복을 제거합니다.
 * 2) mock 토큰에 role을 포함해 앱 재실행 시에도 분기 테스트가 유지됩니다.
 * 3) 실서버 로직과 분리되어, 서버 연동 시 이 파일만 쉽게 축소/제거 가능합니다.
 */