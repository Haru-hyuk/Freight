export type MatchingProgressStatus = "READY" | "IN_TRANSIT" | "COMPLETED" | "CANCELLED" | "UNMATCHED";

export function getMatchingProgressLabel(status: MatchingProgressStatus, accepted?: boolean): string {
  if (status === "CANCELLED") return "\uCDE8\uC18C";
  if (status === "COMPLETED") return "\uBC30\uCC28\uC644\uB8CC";
  if (status === "IN_TRANSIT") return "\uBC30\uCC28\uC911";
  if (status === "UNMATCHED") return "\uB9E4\uCE6D\uC911";
  return accepted ? "\uBC30\uCC28\uC911" : "\uB9E4\uCE6D\uC911";
}

export function getMatchingProgressBadgeVariant(
  status: MatchingProgressStatus,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "CANCELLED") return "destructive";
  if (status === "COMPLETED") return "default";
  if (status === "IN_TRANSIT") return "secondary";
  return "outline";
}
