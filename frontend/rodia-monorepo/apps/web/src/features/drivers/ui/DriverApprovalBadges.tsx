import { Badge } from "@/shared/ui/shadcn/badge";
import type { DriverApprovalLicenseStatus, DriverApprovalStatus } from "@/features/drivers/model/types";

type LicenseBadgeProps = {
  status: DriverApprovalLicenseStatus;
};

type ApprovalBadgeProps = {
  status: DriverApprovalStatus;
};

export function DriverLicenseBadge({ status }: LicenseBadgeProps) {
  if (status === "VERIFIED") return <Badge variant="secondary">인증완료</Badge>;
  return <Badge variant="destructive">미인증</Badge>;
}

export function DriverApprovalStatusBadge({ status }: ApprovalBadgeProps) {
  if (status === "APPROVED") return <Badge variant="secondary">승인</Badge>;
  if (status === "REJECTED") return <Badge variant="destructive">거부</Badge>;
  return <Badge variant="outline">대기</Badge>;
}
