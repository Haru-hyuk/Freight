// src/features/users/ui/UserBadges.tsx
import { Badge } from "@/shared/ui/shadcn/badge";
import type { UserRole, UserStatus } from "../model/types";

export function UserRoleBadge({ role }: { role: UserRole }) {
  return <Badge variant="outline">{role === "SHIPPER" ? "화주" : "차주(기사)"}</Badge>;
}

export function UserStatusBadge({ status }: { status: UserStatus }) {
  if (status === "ACTIVE") return <Badge variant="secondary">활성</Badge>;
  if (status === "DRIVING_BLOCKED") return <Badge variant="outline">운행중지</Badge>;
  return <Badge variant="destructive">정지</Badge>;
}
