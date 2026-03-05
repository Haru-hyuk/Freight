import type { SanctionRow, SanctionType } from "@/features/sanctions/model/types";
import type { UserRole } from "@/features/users/model/types";
import { apiClient } from "@/shared/lib/api/client";
import { apiCapabilities, apiPaths } from "@/shared/lib/api/endpoints";
import { isMockModeEnabled } from "@/shared/lib/mock-mode";

type BackendSanctionListPayload = {
  items?: unknown[];
  total?: number;
};

type BackendAnnouncement = {
  announcementId: number;
  adminId: number;
  title: string;
  content: string;
  publishedAt: string | null;
  createdAt: string | null;
};

const MOCK_ROWS: SanctionRow[] = [
  {
    id: "S-1001",
    targetId: "U-2",
    targetRole: "DRIVER",
    targetName: "차주 김민수",
    type: "WARNING",
    status: "APPLIED",
    createdAt: "2026-02-10 10:30",
    reason: "최근 7일간 배송 지연 누적 3회",
  },
  {
    id: "S-1002",
    targetId: "U-1",
    targetRole: "SHIPPER",
    targetName: "화주 대한물류",
    type: "FINE",
    status: "APPLIED",
    createdAt: "2026-02-10 11:10",
    reason: "배차 확정 이후 반복 취소 2회",
    amount: 30000,
  },
  {
    id: "S-1003",
    targetId: "U-9",
    targetRole: "DRIVER",
    targetName: "차주 박준호",
    type: "SUSPEND",
    status: "RELEASED",
    createdAt: "2026-02-08 09:20",
    releasedAt: "2026-02-20 18:00",
    reason: "운행 중 안전 수칙 위반",
  },
];

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function toStringValue(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function toOptionalNumberValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function toDateText(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR", { hour12: false });
}

function toStatus(value: unknown): "APPLIED" | "RELEASED" {
  const text = toStringValue(value).trim().toUpperCase();
  if (text === "RELEASED") return "RELEASED";
  if (text === "RELEASE") return "RELEASED";
  if (text === "ENDED") return "RELEASED";
  if (text === "해제") return "RELEASED";
  if (text === "종료") return "RELEASED";
  return "APPLIED";
}

function inferRoleFromText(text: string): UserRole {
  if (/(shipper|화주|ship)/i.test(text)) return "SHIPPER";
  return "DRIVER";
}

function inferTypeFromText(text: string): SanctionType {
  if (/(drive block|운행정지|운행 중지)/i.test(text)) return "DRIVE_BLOCK";
  if (/(suspend|정지|block|차단)/i.test(text)) return "SUSPEND";
  if (/(fine|벌점|penalty|fee)/i.test(text)) return "FINE";
  return "WARNING";
}

function parseAmount(text: string): number | undefined {
  const matched = text.match(/(\d[\d,]{2,})/);
  if (!matched?.[1]) return undefined;
  const amount = Number(matched[1].replaceAll(",", ""));
  return Number.isFinite(amount) ? amount : undefined;
}

function mapLiveSanction(raw: unknown): SanctionRow {
  const row = toRecord(raw);
  const content = `${toStringValue(row.reason)} ${toStringValue(row.title)} ${toStringValue(row.content)}`;
  const targetRoleRaw = toStringValue(row.targetRole).toUpperCase();
  const targetRole: UserRole =
    targetRoleRaw === "SHIPPER" ? "SHIPPER" : targetRoleRaw === "DRIVER" ? "DRIVER" : inferRoleFromText(content);
  const typeRaw = toStringValue(row.type).toUpperCase();
  const type: SanctionType =
    typeRaw === "SUSPEND" || typeRaw === "DRIVE_BLOCK" || typeRaw === "FINE" || typeRaw === "WARNING"
      ? (typeRaw as SanctionType)
      : inferTypeFromText(content);
  const amount = toOptionalNumberValue(row.amount) ?? parseAmount(content);

  return {
    id: toStringValue(row.id ?? row.sanctionId ?? row.logId, `S-${Date.now()}`),
    targetId: toStringValue(row.targetId ?? row.userId, "-"),
    targetRole,
    targetName: toStringValue(row.targetName ?? row.userName ?? row.title, "-"),
    type,
    status: toStatus(row.status),
    createdAt: toDateText(toStringValue(row.createdAt ?? row.appliedAt, "")),
    releasedAt: toDateText(toStringValue(row.releasedAt ?? row.released_date ?? row.resolvedAt, "")),
    reason: toStringValue(row.reason ?? row.content ?? row.message, "-"),
    amount,
  };
}

function mapAnnouncementToSanction(row: BackendAnnouncement): SanctionRow {
  const text = `${row.title} ${row.content}`;
  const targetRole = inferRoleFromText(text);
  const type = inferTypeFromText(text);

  return {
    id: `ANN-${row.announcementId}`,
    targetId: row.adminId ? `ADMIN-${row.adminId}` : "-",
    targetRole,
    targetName: row.title,
    type,
    status: "APPLIED",
    createdAt: toDateText(row.publishedAt ?? row.createdAt),
    releasedAt: undefined,
    reason: row.content,
    amount: parseAmount(text),
  };
}

function filterAndSortSanctions(rows: BackendAnnouncement[]): SanctionRow[] {
  return rows
    .filter((row) => /(sanction|penalty|warning|suspend|violation|제재|정지|벌점)/i.test(`${row.title} ${row.content}`))
    .map(mapAnnouncementToSanction)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function fetchSanctionRows(): Promise<SanctionRow[]> {
  if (isMockModeEnabled()) {
    return [...MOCK_ROWS].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  if (!apiCapabilities.useDerivedAdminData) {
    try {
      const response = await apiClient.get<BackendSanctionListPayload | unknown[]>(apiPaths.adminSanctionsLogs);
      const payload = response.data;
      const rows = Array.isArray(payload) ? payload : Array.isArray(payload.items) ? payload.items : [];
      return rows
        .map(mapLiveSanction)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch {
      // fall back to announcements below
    }
  }

  const announcementPaths = apiCapabilities.useDerivedAdminData
    ? [apiPaths.publicAnnouncements]
    : [apiPaths.adminAnnouncements, apiPaths.publicAnnouncements];

  for (const path of announcementPaths) {
    try {
      const response = await apiClient.get<BackendAnnouncement[]>(path);
      if (!Array.isArray(response.data)) continue;
      return filterAndSortSanctions(response.data);
    } catch {
      // try next path
    }
  }

  return [];
}
