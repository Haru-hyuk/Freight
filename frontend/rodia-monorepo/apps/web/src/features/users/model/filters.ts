// src/features/users/model/filters.ts
import type { UserListQuery, UserRole, UserStatus } from "./types";

export type UserFilterValue = {
  q: string;
  role: "all" | UserRole;
  status: "all" | UserStatus;
};

export function toUserListQuery(filters: UserFilterValue, page: number, size: number): UserListQuery {
  // 수정: Fast Refresh 경고 해결을 위해 컴포넌트 파일(UserFilters.tsx)에서 유틸 분리
  return {
    role: filters.role === "all" ? undefined : filters.role,
    status: filters.status === "all" ? undefined : filters.status,
    q: filters.q.trim() ? filters.q.trim() : undefined,
    page,
    size,
  };
}
