import React from "react";
import { Label } from "@/shared/ui/shadcn/label";
import { Input } from "@/shared/ui/shadcn/input";
import type { InputHTMLAttributes, ReactNode } from "react";

/**
 * FormField: 레이블 + 입력 필드 조합
 * 
 * 특징:
 * - Label과 Input/custom element를 semantic 색상으로 조합
 * - error 상태 지원 (destructive 색상)
 * - helperText 지원
 * - 토큰 기반 스타일만 사용
 * - input prop으로 custom element를 전달 가능
 */

export interface FormFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  type?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  input?: ReactNode; // 커스텀 input element를 전달할 수 있음
}

export const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, helperText, required, input, ...inputProps }, ref) => {
    return (
      <div className="space-y-2">
        <Label className="text-foreground">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {input ? (
          input
        ) : (
          <Input
            ref={ref}
            {...inputProps}
            className={error ? "border-destructive focus:ring-destructive" : ""}
          />
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {helperText && <p className="text-sm text-muted-foreground">{helperText}</p>}
      </div>
    );
  }
);

FormField.displayName = "FormField";
