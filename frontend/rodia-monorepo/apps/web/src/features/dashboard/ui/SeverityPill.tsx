// src/features/dashboard/ui/SeverityPill.tsx
import type { DeviationSeverity } from "@/features/dashboard/model/types";
import { Badge } from "@/shared/ui/shadcn/badge";

type Props = { severity: DeviationSeverity };

const MAP: Record<DeviationSeverity, { label: string; className: string }> = {
  SEVERE: {
    label: "우선도 높음",
    className: "bg-destructive text-foreground",
  },
  MODERATE: {
    label: "우선도 보통",
    className: "bg-accent text-foreground",
  },
  MINOR: {
    label: "우선도 낮음",
    className: "bg-muted text-foreground",
  },
};

export function SeverityPill({ severity }: Props) {
  const { label, className } = MAP[severity];
  return <Badge className={className}>{label}</Badge>;
}
