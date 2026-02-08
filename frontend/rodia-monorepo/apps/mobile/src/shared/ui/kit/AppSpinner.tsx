// apps/mobile/src/shared/ui/kit/AppSpinner.tsx
import React from "react";
import { ActivityIndicator, View } from "react-native";
import type { ViewStyle } from "react-native";
import { createThemedStyles, useAppTheme } from "../../theme/useAppTheme";
import { AppText } from "./AppText";

export type AppSpinnerSize = "sm" | "md" | "lg";
export type AppSpinnerMode = "inline" | "overlay";

export type AppSpinnerProps = {
  mode?: AppSpinnerMode;
  size?: AppSpinnerSize;
  label?: string;
  style?: ViewStyle;
};

function safeString(input: unknown): string {
  return typeof input === "string" ? input.trim() : "";
}

function isHexColor(input: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(input);
}

function expandHex(hex: string): string {
  const raw = hex.replace("#", "");
  if (raw.length === 3) {
    const r = raw[0] + raw[0];
    const g = raw[1] + raw[1];
    const b = raw[2] + raw[2];
    return `#${r}${g}${b}`.toUpperCase();
  }
  return `#${raw}`.toUpperCase();
}

function hexToRgba(hex: string, alpha: number): string | null {
  if (!isHexColor(hex)) return null;
  const full = expandHex(hex);
  const raw = full.replace("#", "");
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return null;

  const a = Number.isFinite(alpha) ? Math.min(1, Math.max(0, alpha)) : 1;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function applyAlpha(color: unknown, alpha: number, fallbackColor: string): string {
  // ✅ TS가 never로 추론하지 않도록 명시적으로 string 고정
  const c: string = safeString(color);

  if (isHexColor(c)) return hexToRgba(c, alpha) ?? fallbackColor;

  // rgb/rgba 문자열은 그대로 허용
  if (c.startsWith("rgb(") || c.startsWith("rgba(")) return c;

  // 그 외(토큰/이름색 등)는 값이 있으면 사용, 없으면 fallback
  return c.length > 0 ? c : fallbackColor;
}

function mapSize(size: AppSpinnerSize) {
  if (size === "lg") return "large" as const;
  return "small" as const;
}

const useStyles = createThemedStyles((theme) => ({
  inlineRoot: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  overlayRoot: {
    position: "absolute",
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: applyAlpha(theme?.colors?.bgMain, 0.72, theme?.colors?.bgMain ?? "#FFFFFF"),
  },
}));

export function AppSpinner({ mode = "inline", size = "md", label, style }: AppSpinnerProps) {
  const theme = useAppTheme();
  const styles = useStyles();

  const spinnerColor = theme?.colors?.brandPrimary ?? theme?.colors?.textMain ?? "#000000";
  const containerStyle = mode === "overlay" ? styles.overlayRoot : styles.inlineRoot;

  return (
    <View
      style={[containerStyle, style]}
      pointerEvents={mode === "overlay" ? "auto" : "none"}
      accessibilityRole="progressbar"
      accessibilityLabel={safeString(label) || "Loading"}
    >
      <ActivityIndicator size={mapSize(size)} color={spinnerColor} />
      {safeString(label) ? (
        <AppText variant="caption" color="textMain" align="center">
          {label}
        </AppText>
      ) : null}
    </View>
  );
}

// 요약(3줄)
// - applyAlpha에서 color를 string으로 명시 고정해 `never` 추론으로 인한 startsWith/length 오류를 제거했습니다.
// - overlay 배경은 테마 색에 alpha를 적용하되, 입력이 비정상이면 fallback으로 안전하게 처리합니다.
// - ThemeProvider 누락/토큰 누락 상황에서도 크래시 없이 렌더링됩니다.