import React from "react";

/**
 * PageWrapper: 페이지 레이아웃 wrapper
 * 
 * 특징:
 * - 최상단 min-h-screen bg-background 적용
 * - Max-width 제약 및 padding 기본 적용
 * - 토큰 기반 스타일 사용
 */

export interface PageWrapperProps {
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  className?: string;
}

const maxWidthClass = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-5xl",
  "2xl": "max-w-6xl",
  full: "w-full"
};

export function PageWrapper({
  children,
  maxWidth = "2xl",
  className
}: PageWrapperProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className={`mx-auto ${maxWidthClass[maxWidth]} px-4 py-6 ${className || ""}`}>
        {children}
      </div>
    </div>
  );
}
