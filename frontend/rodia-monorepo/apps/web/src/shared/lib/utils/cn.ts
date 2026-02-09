import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * className 병합 유틸
 * - tailwind class 충돌 해결
 * - 조건부 class 처리
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
