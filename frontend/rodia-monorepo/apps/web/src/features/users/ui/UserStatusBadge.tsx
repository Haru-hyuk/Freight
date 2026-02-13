// src/features/users/ui/UserStatusBadge.tsx
import { Badge } from "@/shared/ui/shadcn/badge";
import type { UserStatus } from "../model/types";

export function UserStatusBadge({ status }: { status: UserStatus }) {
  if (status === "ACTIVE") return <Badge variant="secondary">활성</Badge>;
  if (status === "DRIVING_BLOCKED") return <Badge variant="outline">운행중지</Badge>;
  return <Badge variant="destructive">정지</Badge>;
}
