// apps/mobile/src/entities/user/dto.ts
export type AuthLoginRequestDTO = {
  email: string;
  password: string;
};

export type AuthTokenResponseDTO = {
  accessToken: string;
  tokenType: string; // "Bearer"
  expiresIn: number; // seconds
};

export type DriverSignupRequestDTO = {
  email: string;
  password: string;
  name: string;
  phone: string;
  address: string;
  addressDetail: string;
  bankName: string;
  bankAccount: string;
};

export type DriverSignupResponseDTO = {
  driverId: number;
};

export type ShipperSignupRequestDTO = {
  email: string;
  password: string;
  name: string;
  companyName: string;
  phone: string;
  address: string;
  addressDetail: string;
  bizRegNo: string;
  bizPhone: string;
  openDate: string; // "YYYYMMDD"
  ownerName: string;
};

export type ShipperSignupResponseDTO = {
  shipperId: number;
};

export type ApiErrorResponseDTO = {
  success?: boolean;
  message?: string;
  status?: number;
};

/**
 * 1) Auth 스펙의 Request/Response DTO를 엔티티 단에서 단일화.
 * 2) 화면/feature는 DTO를 재사용하고, 파싱/매핑은 api 레이어가 담당.
 * 3) 에러 응답도 최소 DTO로 중앙화해 런타임 분기 단순화.
 */
