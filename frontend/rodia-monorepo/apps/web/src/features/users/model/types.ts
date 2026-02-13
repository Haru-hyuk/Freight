// src/features/users/model/types.ts

export type UserRole = "SHIPPER" | "DRIVER";

export type UserStatus = "ACTIVE" | "SUSPENDED" | "DRIVING_BLOCKED";

export type UserListItem = {
  id: string;
  role: UserRole;

  name: string;
  email?: string;
  phone?: string;

  status: UserStatus;

  createdAt: string;

  quotesCount?: number;
  matchesCount?: number;
};

export type UserListQuery = {
  role?: UserRole;
  status?: UserStatus; // 수정: status 쿼리도 준비(백엔드 무시해도 UI는 안전)
  q?: string;
  page?: number;
  size?: number;
};

export type UserListResponse = {
  items: UserListItem[];
  total: number;
};

/**
 * 상세 응답 (ERD 기반)
 * - user: shippers 또는 drivers에서 온 기본 정보(관리자용 합본)
 * - quotes: quotes 테이블
 * - matches: matches 테이블
 * - settlements: settlements 테이블
 * - deviations: deviation_events 테이블
 */
export type UserDetailUser = {
  id: string;
  role: UserRole;

  name: string;
  email?: string;
  phone?: string;

  status: UserStatus;

  createdAt: string;
};

export type UserDetailQuote = {
  id: string;
  status: string;
  createdAt: string;
};

export type UserDetailMatch = {
  id: string;
  status: string;
  createdAt: string;
};

export type UserDetailSettlement = {
  id: string;
  status: string;
  totalFare?: number;
  createdAt: string;
};

export type UserDetailDeviation = {
  id: string;
  severity: string;
  status: string;
  createdAt: string;
};

export type UserDetailResponse = {
  user: UserDetailUser;
  quotes: UserDetailQuote[];
  matches: UserDetailMatch[];
  settlements: UserDetailSettlement[];
  deviations: UserDetailDeviation[];
};
