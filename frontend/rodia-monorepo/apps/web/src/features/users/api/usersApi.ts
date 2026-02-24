import { apiClient } from "@/shared/lib/api/client";
import { isMockModeEnabled } from "@/shared/lib/mock-mode";
import type {
  UserDetailResponse,
  UserListItem,
  UserListQuery,
  UserListResponse,
  UserRole,
  UserStatus,
} from "../model/types";

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

const MOCK_USERS: UserListItem[] = [
  {
    id: "U-S-1001",
    role: "SHIPPER",
    name: "한빛물류",
    email: "ops@hanbit-logi.kr",
    phone: "010-1111-2222",
    status: "ACTIVE",
    createdAt: "2026-02-10 09:10",
    quotesCount: 38,
    matchesCount: 26,
  },
  {
    id: "U-S-1002",
    role: "SHIPPER",
    name: "미래가구",
    email: "admin@miraefurni.kr",
    phone: "010-2222-3333",
    status: "ACTIVE",
    createdAt: "2026-02-08 14:20",
    quotesCount: 24,
    matchesCount: 17,
  },
  {
    id: "U-D-2001",
    role: "DRIVER",
    name: "김민수",
    email: "driver.kim@rodia.kr",
    phone: "010-3333-4444",
    status: "ACTIVE",
    createdAt: "2026-02-05 07:40",
    quotesCount: 0,
    matchesCount: 42,
  },
  {
    id: "U-D-2002",
    role: "DRIVER",
    name: "박현우",
    email: "driver.park@rodia.kr",
    phone: "010-4444-5555",
    status: "DRIVING_BLOCKED",
    createdAt: "2026-01-29 11:05",
    quotesCount: 0,
    matchesCount: 19,
  },
];

const MOCK_USER_DETAIL: Record<string, UserDetailResponse> = {
  "U-S-1001": {
    user: {
      id: "U-S-1001",
      role: "SHIPPER",
      name: "한빛물류",
      email: "ops@hanbit-logi.kr",
      phone: "010-1111-2222",
      status: "ACTIVE",
      createdAt: "2026-02-10 09:10",
    },
    quotes: [
      { id: "Q-4401", status: "OPEN", createdAt: "2026-02-19 09:10" },
      { id: "Q-4408", status: "MATCHED", createdAt: "2026-02-18 18:30" },
    ],
    matches: [
      { id: "M-3201", status: "READY", createdAt: "2026-02-19 07:30" },
      { id: "M-3191", status: "COMPLETED", createdAt: "2026-02-17 15:20" },
    ],
    settlements: [{ id: "S-9801", status: "PROCESSING", totalFare: 640000, createdAt: "2026-02-19 11:00" }],
    deviations: [{ id: "DV-1001", severity: "MODERATE", status: "OPEN", createdAt: "2026-02-19 11:30" }],
  },
  "U-S-1002": {
    user: {
      id: "U-S-1002",
      role: "SHIPPER",
      name: "미래가구",
      email: "admin@miraefurni.kr",
      phone: "010-2222-3333",
      status: "ACTIVE",
      createdAt: "2026-02-08 14:20",
    },
    quotes: [{ id: "Q-4402", status: "DRAFT", createdAt: "2026-02-19 08:40" }],
    matches: [{ id: "M-3202", status: "READY", createdAt: "2026-02-19 06:50" }],
    settlements: [],
    deviations: [],
  },
  "U-D-2001": {
    user: {
      id: "U-D-2001",
      role: "DRIVER",
      name: "김민수",
      email: "driver.kim@rodia.kr",
      phone: "010-3333-4444",
      status: "ACTIVE",
      createdAt: "2026-02-05 07:40",
    },
    quotes: [],
    matches: [
      { id: "M-3201", status: "READY", createdAt: "2026-02-19 07:30" },
      { id: "M-3179", status: "COMPLETED", createdAt: "2026-02-14 12:15" },
    ],
    settlements: [{ id: "S-9792", status: "COMPLETED", totalFare: 521000, createdAt: "2026-02-16 09:00" }],
    deviations: [],
  },
  "U-D-2002": {
    user: {
      id: "U-D-2002",
      role: "DRIVER",
      name: "박현우",
      email: "driver.park@rodia.kr",
      phone: "010-4444-5555",
      status: "DRIVING_BLOCKED",
      createdAt: "2026-01-29 11:05",
    },
    quotes: [],
    matches: [{ id: "M-3155", status: "CANCELLED", createdAt: "2026-02-11 10:00" }],
    settlements: [{ id: "S-9755", status: "FAILED", totalFare: 0, createdAt: "2026-02-11 15:20" }],
    deviations: [{ id: "DV-0961", severity: "SEVERE", status: "APPLIED", createdAt: "2026-02-11 11:15" }],
  },
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

function filterMockUsers(query: UserListQuery): UserListResponse {
  const keyword = (query.q ?? "").toLowerCase();
  const page = query.page ?? 1;
  const size = query.size ?? 20;

  const filtered = MOCK_USERS.filter((user) => {
    const roleMatched = query.role ? user.role === query.role : true;
    const statusMatched = query.status ? user.status === query.status : true;
    const keywordMatched = keyword
      ? [user.id, user.name, user.email ?? "", user.phone ?? ""].join(" ").toLowerCase().includes(keyword)
      : true;
    return roleMatched && statusMatched && keywordMatched;
  });

  const start = (page - 1) * size;
  const end = start + size;
  return {
    items: filtered.slice(start, end),
    total: filtered.length,
  };
}

export async function fetchUsers(query: UserListQuery): Promise<UserListResponse> {
  if (isMockModeEnabled()) {
    return filterMockUsers(query);
  }

  try {
    const res = await apiClient.get<UsersApiResponse>("/admin/users", {
      params: {
        role: query.role,
        status: query.status,
        q: query.q,
        page: query.page ?? 1,
        size: query.size ?? 20,
      },
    });

    return {
      items: res.data.items.map(mapItem),
      total: res.data.total,
    };
  } catch {
    return { items: [], total: 0 };
  }
}

export async function fetchUserDetail(userId: string): Promise<UserDetailResponse> {
  if (isMockModeEnabled()) {
    const mock = MOCK_USER_DETAIL[userId];
    if (mock) return mock;
    throw new Error("USER_NOT_FOUND");
  }

  try {
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
  } catch {
    throw new Error("USER_NOT_FOUND");
  }
}

