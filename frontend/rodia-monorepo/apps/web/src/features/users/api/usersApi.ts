// src/features/users/api/usersApi.ts
import { apiClient } from "@/shared/lib/api/client";
import type {
  UserDetailResponse,
  UserListItem,
  UserListQuery,
  UserListResponse,
  UserRole,
  UserStatus,
} from "../model/types";

/**
 * 목록 Raw (예시)
 * - 실제 백엔드 스펙 확정 시 여기만 바꾸면 UI 유지
 */
type UsersApiResponse = {
  items: Array<{
    id: string;
    role: "SHIPPER" | "DRIVER";
    name: string;
    email?: string;
    phone?: string;
    status: "ACTIVE" | "SUSPENDED" | "DRIVING_BLOCKED";
    created_at: string;
    quotes_count?: number;
    matches_count?: number;
  }>;
  total: number;
};

function mapRole(raw: UsersApiResponse["items"][number]["role"]): UserRole {
  return raw;
}

function mapStatus(raw: UsersApiResponse["items"][number]["status"]): UserStatus {
  return raw;
}

function mapItem(raw: UsersApiResponse["items"][number]): UserListItem {
  return {
    id: raw.id,
    role: mapRole(raw.role),
    name: raw.name,
    email: raw.email,
    phone: raw.phone,
    status: mapStatus(raw.status),
    createdAt: raw.created_at,
    quotesCount: raw.quotes_count,
    matchesCount: raw.matches_count,
  };
}

export async function fetchUsers(query: UserListQuery): Promise<UserListResponse> {
  const res = await apiClient.get<UsersApiResponse>("/admin/users", {
    params: {
      role: query.role,
      status: query.status, // 수정: status도 전달(백엔드에서 지원 시 그대로 사용)
      q: query.q,
      page: query.page ?? 1,
      size: query.size ?? 20,
    },
  });

  return {
    items: res.data.items.map(mapItem),
    total: res.data.total,
  };
}

/**
 * 상세 Raw (예시)
 * - /admin/users/:id 로 합본 내려주는 형태를 가정
 * - 백엔드 스펙 확정 시 맵핑만 수정
 */
type UserDetailApiResponse = {
  user: {
    id: string;
    role: "SHIPPER" | "DRIVER";
    name: string;
    email?: string;
    phone?: string;
    status: "ACTIVE" | "SUSPENDED" | "DRIVING_BLOCKED";
    created_at: string;
  };
  quotes: Array<{ id: string; status: string; created_at: string }>;
  matches: Array<{ id: string; status: string; created_at: string }>;
  settlements: Array<{ id: string; status: string; total_fare?: number; created_at: string }>;
  deviation_events: Array<{ id: string; severity: string; status: string; created_at: string }>;
};

export async function fetchUserDetail(userId: string): Promise<UserDetailResponse> {
  const res = await apiClient.get<UserDetailApiResponse>(`/admin/users/${userId}`);

  return {
    user: {
      id: res.data.user.id,
      role: res.data.user.role,
      name: res.data.user.name,
      email: res.data.user.email,
      phone: res.data.user.phone,
      status: res.data.user.status,
      createdAt: res.data.user.created_at,
    },
    quotes: res.data.quotes.map((q) => ({ id: q.id, status: q.status, createdAt: q.created_at })),
    matches: res.data.matches.map((m) => ({ id: m.id, status: m.status, createdAt: m.created_at })),
    settlements: res.data.settlements.map((s) => ({
      id: s.id,
      status: s.status,
      totalFare: s.total_fare,
      createdAt: s.created_at,
    })),
    deviations: res.data.deviation_events.map((d) => ({
      id: d.id,
      severity: d.severity,
      status: d.status,
      createdAt: d.created_at,
    })),
  };
}
