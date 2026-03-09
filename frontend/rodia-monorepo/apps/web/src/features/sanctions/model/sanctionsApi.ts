import type { SanctionRow, SanctionType } from "@/features/sanctions/model/types";
import type { UserRole } from "@/features/users/model/types";
import { appendActivityLog } from "@/shared/lib/activity-log";
import { apiClient } from "@/shared/lib/api/client";
import { apiPaths } from "@/shared/lib/api/endpoints";
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

const LEGACY_SANCTIONS_LOGS_PATH = "/api/admin/ops/sanctions/logs";
const SESSION_LOG_LIMIT = 100;
const sessionSanctionRows: SanctionRow[] = [];

export type SanctionCreatePayload = {
  targetId: string;
  targetRole: UserRole;
  targetName: string;
  type: SanctionType;
  reason: string;
  amount?: number;
};

export type SanctionCreateResult = {
  row: SanctionRow;
  mode: "REAL" | "LOCAL_SESSION";
  message?: string;
};

const MOCK_ROWS: SanctionRow[] = [
  {
    id: "S-1001",
    targetId: "D-2",
    targetRole: "DRIVER",
    targetName: "Driver-2",
    type: "WARNING",
    status: "APPLIED",
    createdAt: "2026-02-10T10:30:00.000Z",
    reason: "Repeated delay events in recent deliveries.",
  },
  {
    id: "S-1002",
    targetId: "S-1",
    targetRole: "SHIPPER",
    targetName: "Shipper-1",
    type: "FINE",
    status: "APPLIED",
    createdAt: "2026-02-10T11:10:00.000Z",
    reason: "Repeated cancellation after final confirmation.",
    amount: 30000,
  },
  {
    id: "S-1003",
    targetId: "D-9",
    targetRole: "DRIVER",
    targetName: "Driver-9",
    type: "SUSPEND",
    status: "RELEASED",
    createdAt: "2026-02-08T09:20:00.000Z",
    releasedAt: "2026-02-20T18:00:00.000Z",
    reason: "Safety policy violation while in transit.",
  },
];

function normalizePath(path: string): string {
  return path.replace(/\/+$/, "");
}

function shouldCallLegacySanctionsLogs(): boolean {
  return normalizePath(apiPaths.adminSanctionsLogs) !== normalizePath(LEGACY_SANCTIONS_LOGS_PATH);
}

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
  return date.toISOString();
}

function toStatus(value: unknown): "APPLIED" | "RELEASED" {
  const text = toStringValue(value).trim().toUpperCase();
  if (text === "RELEASED" || text === "RELEASE" || text === "ENDED") return "RELEASED";
  return "APPLIED";
}

function inferRoleFromText(text: string): UserRole {
  if (/(shipper|ship)/i.test(text)) return "SHIPPER";
  return "DRIVER";
}

function inferTypeFromText(text: string): SanctionType {
  if (/(drive block|driving blocked)/i.test(text)) return "DRIVE_BLOCK";
  if (/(suspend|block)/i.test(text)) return "SUSPEND";
  if (/(fine|penalty|fee)/i.test(text)) return "FINE";
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
  const targetRoleRaw = toStringValue(row.targetRole ?? row.target_role).toUpperCase();
  const targetRole: UserRole =
    targetRoleRaw === "SHIPPER" ? "SHIPPER" : targetRoleRaw === "DRIVER" ? "DRIVER" : inferRoleFromText(content);
  const typeRaw = toStringValue(row.type).toUpperCase();
  const type: SanctionType =
    typeRaw === "SUSPEND" || typeRaw === "DRIVE_BLOCK" || typeRaw === "FINE" || typeRaw === "WARNING"
      ? (typeRaw as SanctionType)
      : inferTypeFromText(content);
  const amount = toOptionalNumberValue(row.amount) ?? parseAmount(content);

  return {
    id: toStringValue(row.id ?? row.sanctionId ?? row.sanction_id ?? row.logId, `S-${Date.now()}`),
    targetId: toStringValue(row.targetId ?? row.target_id ?? row.userId ?? row.user_id, "-"),
    targetRole,
    targetName: toStringValue(row.targetName ?? row.target_name ?? row.userName ?? row.user_name ?? row.title, "-"),
    type,
    status: toStatus(row.status),
    createdAt: toDateText(toStringValue(row.createdAt ?? row.created_at ?? row.appliedAt, "")),
    releasedAt: toDateText(toStringValue(row.releasedAt ?? row.released_at ?? row.resolvedAt, "")),
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

function sortByCreatedAtDesc(rows: SanctionRow[]): SanctionRow[] {
  return rows.sort((a, b) => {
    const left = Date.parse(a.createdAt);
    const right = Date.parse(b.createdAt);
    const leftTs = Number.isFinite(left) ? left : 0;
    const rightTs = Number.isFinite(right) ? right : 0;
    return rightTs - leftTs;
  });
}

function mergeWithSessionRows(rows: SanctionRow[]): SanctionRow[] {
  if (sessionSanctionRows.length === 0) return sortByCreatedAtDesc(rows);

  const merged = new Map<string, SanctionRow>();
  for (const row of [...sessionSanctionRows, ...rows]) {
    if (!merged.has(row.id)) merged.set(row.id, row);
  }
  return sortByCreatedAtDesc(Array.from(merged.values()));
}

function pushSessionSanctionRow(row: SanctionRow) {
  sessionSanctionRows.unshift(row);
  if (sessionSanctionRows.length > SESSION_LOG_LIMIT) {
    sessionSanctionRows.splice(SESSION_LOG_LIMIT);
  }
}

function toLocalSessionSanction(payload: SanctionCreatePayload): SanctionRow {
  return {
    id: `S-LOCAL-${Date.now()}`,
    targetId: payload.targetId,
    targetRole: payload.targetRole,
    targetName: payload.targetName,
    type: payload.type,
    status: "APPLIED",
    createdAt: new Date().toISOString(),
    reason: payload.reason,
    amount: payload.amount,
  };
}

async function fetchFromPath(path: string): Promise<SanctionRow[] | null> {
  try {
    const response = await apiClient.get<BackendSanctionListPayload | unknown[]>(path);
    const payload = response.data;
    const rows = Array.isArray(payload) ? payload : Array.isArray(payload.items) ? payload.items : [];
    return rows.map(mapLiveSanction);
  } catch {
    return null;
  }
}

export async function fetchSanctionRows(): Promise<SanctionRow[]> {
  if (isMockModeEnabled()) {
    return mergeWithSessionRows([...MOCK_ROWS]);
  }

  const sanctionedRows = await fetchFromPath(apiPaths.adminSanctions);
  if (sanctionedRows && sanctionedRows.length > 0) {
    return mergeWithSessionRows(sanctionedRows);
  }

  if (shouldCallLegacySanctionsLogs()) {
    const legacyRows = await fetchFromPath(apiPaths.adminSanctionsLogs);
    if (legacyRows && legacyRows.length > 0) {
      return mergeWithSessionRows(legacyRows);
    }
  }

  try {
    const response = await apiClient.get<BackendAnnouncement[]>(apiPaths.adminAnnouncements);
    if (!Array.isArray(response.data)) return mergeWithSessionRows([]);

    return mergeWithSessionRows(
      response.data
        .filter((row) => /(sanction|penalty|warning|suspend|violation|제재|정지|벌점)/i.test(`${row.title} ${row.content}`))
        .map(mapAnnouncementToSanction),
    );
  } catch {
    return mergeWithSessionRows([]);
  }
}

export async function createSanction(payload: SanctionCreatePayload): Promise<SanctionCreateResult> {
  const requestBody = {
    targetId: payload.targetId,
    type: payload.type,
    reason: payload.reason,
    amount: payload.amount,
  };

  try {
    const response = await apiClient.post<unknown>(apiPaths.adminSanctions, requestBody);
    const row = mapLiveSanction(response.data);
    pushSessionSanctionRow(row);
    appendActivityLog({
      action: "SANCTION_CREATED",
      targetId: payload.targetId,
      mode: "REAL",
      message: `Sanction created (${row.id})`,
    });
    return {
      row,
      mode: "REAL",
    };
  } catch {
    const row = toLocalSessionSanction(payload);
    pushSessionSanctionRow(row);
    appendActivityLog({
      action: "SANCTION_CREATED",
      targetId: payload.targetId,
      mode: "REAL",
      message: `Sanction API failed, saved in local session (${row.id})`,
    });
    return {
      row,
      mode: "LOCAL_SESSION",
      message: "Backend sanction API is unavailable. Saved to local session only.",
    };
  }
}
