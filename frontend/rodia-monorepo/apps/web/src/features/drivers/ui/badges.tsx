import { Badge } from "@/shared/ui/shadcn/badge";
import type { LicenseStatus, ApprovalStatus } from "../model/types";

export function LicenseBadge({ status }: { status: LicenseStatus }) {
  return status === "검증됨" ? (
    <Badge variant="secondary">검증됨</Badge>
  ) : (
    <Badge variant="destructive">재요청</Badge>
  );
}

export function ApprovalBadge({ status }: { status: ApprovalStatus }) {
  if (status === "승인 완료") return <Badge variant="secondary">승인 완료</Badge>;
  if (status === "승인 대기") return <Badge variant="outline">승인 대기</Badge>;
  return <Badge variant="destructive">보류</Badge>;
}
