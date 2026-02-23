import { Badge } from "@/shared/ui/shadcn/badge";
import type { SettlementApprovalStatus, SettlementProgressStatus } from "@/features/settlements/model/types";

export function SettlementProgressBadge({ status }: { status: SettlementProgressStatus }) {
  if (status === "COMPLETED") return <Badge variant="secondary">완료</Badge>;
  if (status === "FAILED") return <Badge variant="destructive">실패</Badge>;
  if (status === "PROCESSING") return <Badge variant="outline">처리중</Badge>;
  return <Badge variant="outline">대기</Badge>;
}

export function SettlementApprovalBadge({ status }: { status: SettlementApprovalStatus }) {
  if (status === "APPROVED") return <Badge variant="secondary">승인</Badge>;
  if (status === "REJECTED") return <Badge variant="destructive">거부</Badge>;
  return <Badge variant="outline">검토중</Badge>;
}
