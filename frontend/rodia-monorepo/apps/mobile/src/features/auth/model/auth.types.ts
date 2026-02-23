// apps/mobile/src/features/auth/model/auth.types.ts

import type { AuthTokens } from "@/shared/lib/storage/tokenStorage";
import type { User, UserRole } from "@/entities/user/types";
import type {
  ApiErrorResponseDTO,
  AuthLoginRequestDTO,
  AuthTokenResponseDTO,
  DriverSignupRequestDTO,
  DriverSignupResponseDTO,
  ShipperSignupRequestDTO,
  ShipperSignupResponseDTO,
} from "@/entities/user/dto";

export type AuthUserRole = Extract<UserRole, "shipper" | "driver">;
export type AuthRole = AuthUserRole;

export type LoginParams = AuthLoginRequestDTO & {
  role?: AuthRole; // 통합 login()에서만 사용(명시 시 해당 role endpoint 호출)
};

export type LoginResult = {
  user: User | null;
  tokens: AuthTokens | null;
  tokenType?: string | null;
  expiresIn?: number | null;
};

export type DriverSignupParams = DriverSignupRequestDTO;
export type DriverSignupResult = {
  driverId: number | null;
  errorCode?: "INVALID_INPUT_VALUE" | "UNKNOWN";
  message?: string;
};

export type ShipperSignupParams = ShipperSignupRequestDTO;
export type ShipperSignupResult = {
  shipperId: number | null;
  errorCode?: "INVALID_INPUT_VALUE" | "UNKNOWN";
  message?: string;
};

export type LogoutResult = {
  ok: boolean;
};

export type DuplicateEmailCheckParams = {
  email: string;
  role?: AuthRole;
};

export type DuplicateEmailCheckResult = {
  isDuplicate: boolean | null;
};

export type {
  ApiErrorResponseDTO,
  AuthTokenResponseDTO,
  DriverSignupResponseDTO,
  ShipperSignupResponseDTO,
};

/**
 * 1) DTO는 entities/user/entities.dto.ts에서 가져오고, feature는 별칭만 제공.
 * 2) UserRole(admin 포함) 기반으로 role 캐스팅 제거.
 * 3) LoginResult에 tokenType/expiresIn을 옵션으로 제공(스펙 대응).
 */
