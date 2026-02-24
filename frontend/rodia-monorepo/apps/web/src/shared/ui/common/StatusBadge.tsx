import React from "react";

/**
 * StatusBadge: 상태 표시 배지
 * 
 * 특징:
 * - semantic 색상으로 상태 표현
 * - 컴팩트한 디자인
 * - 토큰 기반 색상만 사용
 * - variant/label 또는 status/className 모두 지원
 */

export type BadgeVariant = "primary" | "secondary" | "success" | "warning" | "error" | "muted";

export interface StatusBadgeProps {
  variant?: BadgeVariant;
  label?: string;
  status?: string; // enum value like "ACTIVE"
  className?: string; // custom className for status
  size?: "sm" | "md";
}

const variantConfig: Record<BadgeVariant, { bg: string; text: string }> = {
  primary: { bg: "bg-primary/10", text: "text-primary" },
  secondary: { bg: "bg-secondary/10", text: "text-secondary" },
  success: { bg: "bg-success-light", text: "text-success" },
  warning: { bg: "bg-warning-light", text: "text-warning" },
  error: { bg: "bg-error-light", text: "text-error" },
  muted: { bg: "bg-muted", text: "text-muted-foreground" }
};

export function StatusBadge({
  variant = "muted",
  label,
  status,
  className,
  size = "md"
}: StatusBadgeProps) {
  const sizeClass = size === "sm" ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm";
  
  // If status and className are provided, use custom styling
  if (status && className) {
    return (
      <span className={`inline-flex font-medium rounded-full border ${sizeClass} ${className}`}>
        {status}
      </span>
    );
  }
  
  // Otherwise use variant/label
  const config = variantConfig[variant];
  const displayLabel = label || status || '';

  return (
    <span className={`inline-flex font-medium rounded-full ${sizeClass} ${config.bg} ${config.text}`}>
      {displayLabel}
    </span>
  );
}
