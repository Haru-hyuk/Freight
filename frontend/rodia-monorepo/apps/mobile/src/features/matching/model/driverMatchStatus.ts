const TERMINAL_MATCH_STATUSES = new Set(["CANCELED", "COMPLETED", "DROPOFF", "DELIVERED"]);
const ACCEPTABLE_MATCH_STATUSES = new Set(["READY", "OPEN", "NEGOTIATING"]);

export function normalizeDriverMatchStatus(status: unknown): string {
  const text = typeof status === "string" ? status.trim().toUpperCase() : "";
  if (!text) return "UNKNOWN";
  if (text === "CANCELLED") return "CANCELED";
  return text;
}

export function isDriverMatchTerminal(status: unknown): boolean {
  return TERMINAL_MATCH_STATUSES.has(normalizeDriverMatchStatus(status));
}

export function canDriverAcceptMatch(status: unknown): boolean {
  return ACCEPTABLE_MATCH_STATUSES.has(normalizeDriverMatchStatus(status));
}

export function toDriverMatchStatusLabel(status: unknown): string {
  const normalized = normalizeDriverMatchStatus(status);
  if (normalized === "READY") return "요청 접수";
  if (normalized === "OPEN") return "요청 접수";
  if (normalized === "NEGOTIATING") return "협상 중";
  if (normalized === "ASSIGNED") return "배차 완료";
  if (normalized === "PICKUP") return "상차 중";
  if (normalized === "TRANSIT") return "운송 중";
  if (normalized === "DROPOFF") return "하차 완료";
  if (normalized === "CANCELED") return "취소됨";
  return normalized;
}
