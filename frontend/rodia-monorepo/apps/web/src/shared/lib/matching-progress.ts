export type MatchingProgressStatus = "READY" | "IN_TRANSIT" | "COMPLETED" | "CANCELLED" | "UNMATCHED";

export function getMatchingProgressLabel(status: MatchingProgressStatus, accepted?: boolean): string {
  if (status === "CANCELLED") return "취소";
  if (status === "COMPLETED") return "배차완료";
  if (status === "IN_TRANSIT") return "배차중";
  if (status === "UNMATCHED") return "매칭중";
  return accepted ? "배차중" : "매칭중";
}

export function getMatchingProgressBadgeVariant(
  status: MatchingProgressStatus,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "CANCELLED") return "destructive";
  if (status === "COMPLETED") return "default";
  if (status === "IN_TRANSIT") return "secondary";
  return "outline";
}

