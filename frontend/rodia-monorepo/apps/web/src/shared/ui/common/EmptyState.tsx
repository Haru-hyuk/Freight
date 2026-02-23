import React from "react";
import { AlertCircle } from "lucide-react";

/**
 * EmptyState: 데이터가 없을 때 표시
 * 
 * 특징:
 * - 일관된 빈 상태 UI
 * - 아이콘, 제목, 설명 포함
 * - 선택적 Action 버튼
 * - 토큰 기반 색상
 */

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  icon,
  title,
  description,
  action
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-muted/50 px-6 py-12 text-center">
      {icon ? (
        <div className="mb-4 text-muted-foreground">
          {icon}
        </div>
      ) : (
        <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground" />
      )}
      
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      
      {description && (
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
          {description}
        </p>
      )}
      
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 rounded px-4 py-2 bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
