import React from "react";
import { AlertCircle } from "lucide-react";

import { Button } from "@/shared/ui/shadcn/button";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-muted px-6 py-12 text-center">
      {icon ? <div className="mb-4 text-foreground/70">{icon}</div> : <AlertCircle className="mb-4 h-12 w-12 text-foreground/70" />}

      <h3 className="text-lg font-semibold text-foreground">{title}</h3>

      {description ? <p className="mt-2 max-w-sm text-sm text-foreground/70">{description}</p> : null}

      {action ? (
        <Button type="button" variant="secondary" className="mt-4" onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}
