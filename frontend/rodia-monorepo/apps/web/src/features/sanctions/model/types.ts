// src/features/sanctions/model/types.ts
import type { UserRole } from "@/features/users/model/types";

export type SanctionType = "SUSPEND" | "DRIVE_BLOCK" | "FINE" | "WARNING";
export type SanctionStatus = "APPLIED" | "RELEASED";

export type SanctionRow = {
  id: string;

  targetId: string;
  targetRole: UserRole;
  targetName: string;

  type: SanctionType;
  status: SanctionStatus;

  createdAt: string;

  reason: string;
  amount?: number;
};
