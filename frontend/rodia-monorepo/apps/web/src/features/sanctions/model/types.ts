export type SanctionType = "SUSPEND" | "DRIVE_BLOCK" | "FINE" | "WARNING";

export type SanctionTarget = "SHIPPER" | "DRIVER";

export type SanctionPayload = {
  targetId: string;
  targetType: SanctionTarget;
  sanctionType: SanctionType;
  reason: string;
  amount?: number;
};
