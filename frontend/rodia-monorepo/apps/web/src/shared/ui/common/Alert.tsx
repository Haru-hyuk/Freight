import React from "react";
import { AlertCircle, CheckCircle2, AlertTriangle, Info } from "lucide-react";

/**
 * Alert: 상태 기반 알림 메시지
 * 
 * 특징:
 * - variant (success, error, warning, info)에 따라 semantic 색상 자동 적용
 * - 아이콘 자동 표시
 * - 토큰 기반 배경/텍스트 색상만 사용
 * - dismissible 옵션 지원
 */

export type AlertVariant = "success" | "error" | "warning" | "info";

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  message: string;
  onDismiss?: () => void;
}

const variantConfig: Record<AlertVariant, { bg: string; border: string; text: string; iconColor: string }> = {
  success: {
    bg: "bg-success-light",
    border: "border-success-border",
    text: "text-success",
    iconColor: "text-success"
  },
  error: {
    bg: "bg-error-light",
    border: "border-error-border",
    text: "text-error",
    iconColor: "text-error"
  },
  warning: {
    bg: "bg-warning-light",
    border: "border-warning-border",
    text: "text-warning",
    iconColor: "text-warning"
  },
  info: {
    bg: "bg-info-light",
    border: "border-info-border",
    text: "text-info",
    iconColor: "text-info"
  }
};

const iconMap: Record<AlertVariant, typeof AlertCircle> = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info
};

export function Alert({
  variant = "info",
  title,
  message,
  onDismiss
}: AlertProps) {
  const config = variantConfig[variant];
  const Icon = iconMap[variant];

  return (
    <div
      className={`rounded-md border p-4 ${config.bg} ${config.border}`}
      role="alert"
    >
      <div className="flex gap-3">
        <Icon className={`h-5 w-5 flex-shrink-0 ${config.iconColor}`} />
        <div className="flex-1">
          {title && <h3 className={`font-semibold ${config.text}`}>{title}</h3>}
          <p className={`text-sm ${config.text}`}>{message}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className={`flex-shrink-0 text-xl leading-none ${config.text} opacity-70 hover:opacity-100`}
            aria-label="Close alert"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
