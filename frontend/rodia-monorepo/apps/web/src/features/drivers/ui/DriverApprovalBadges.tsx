// src/features/drivers/ui/DriverApprovalBadges.tsx
import { Badge } from "@/shared/ui/shadcn/badge";
import type { ApprovalStatus, LicenseStatus } from "../model/types";

export function LicenseBadge({ status }: { status: LicenseStatus }) {
  return status === "검증됨" ? (
    <Badge className="bg-secondary text-foreground">검증됨</Badge>
  ) : (
    <Badge className="bg-destructive text-foreground">재요청</Badge>
  );
}

export function ApprovalBadge({ status }: { status: ApprovalStatus }) {
  if (status === "승인 완료") {
    return <Badge className="bg-secondary text-foreground">승인 완료</Badge>;
  }
  if (status === "승인 대기") {
    return <Badge className="bg-muted text-foreground">승인 대기</Badge>;
  }
  return <Badge className="bg-destructive text-foreground">보류</Badge>;
}
