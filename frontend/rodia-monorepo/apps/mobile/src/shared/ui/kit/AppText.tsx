import React, { useMemo } from "react";
import { StyleSheet, Text, type StyleProp, type TextProps, type TextStyle } from "react-native";
import { useAppTheme } from "../../theme/useAppTheme";
import type { AppThemeColors } from "../../theme/types";

type AppTextVariant = "display" | "title" | "heading" | "body" | "detail" | "caption";

export type AppTextProps = Omit<TextProps, "style"> & {
  variant?: AppTextVariant;
  size?: number;
  weight?: TextStyle["fontWeight"] | string | number;
  color?: keyof AppThemeColors | string;
  align?: TextStyle["textAlign"];
  style?: StyleProp<TextStyle>;
};

const FALLBACK_COLORS: AppThemeColors = {
  bgMain: "#F8FAFC",
  bgSurface: "#FFFFFF",
  bgSurfaceAlt: "#F1F5F9",
  textMain: "#111827",
  textSub: "#334155",
  textMuted: "#475569",
  textInverse: "#FFFFFF",
  textOnBrand: "#FFFFFF",
  brandPrimary: "#FF6A00",
  brandSecondary: "#111827",
  brandAccent: "#00E5A8",
  borderDefault: "#E2E8F0",
  borderStrong: "#CBD5E1",
  stateBrandPressed: "#CC5500",
  stateOverlayPressed: "#ECEDEE",
  stateDisabledBg: "#E2E8F0",
  stateDisabledText: "#94A3B8",
  stateDisabledBorder: "#E2E8F0",
  semanticDanger: "#EF4444",
  semanticSuccess: "#059669",
  semanticWarning: "#D97706",
  semanticInfo: "#CC5500",
};

function resolveColor(themeColors: AppThemeColors, color?: keyof AppThemeColors | string) {
  if (!color) return themeColors.textMain;
  if (typeof color === "string" && (themeColors as any)?.[color]) return (themeColors as any)[color] as string;
  return typeof color === "string" ? color : themeColors.textMain;
}

function normalizeFontWeight(input: unknown): TextStyle["fontWeight"] {
  if (input == null) return undefined;

  if (typeof input === "number" && Number.isFinite(input)) {
    const n = Math.round(input);
    if (n >= 100 && n <= 900 && n % 100 === 0) return n as TextStyle["fontWeight"];
    return undefined;
  }

  const raw = String(input).trim();
  if (!raw) return undefined;

  if (/^\d{3}$/.test(raw)) {
    const n = Number(raw);
    if (n >= 100 && n <= 900 && n % 100 === 0) return n as TextStyle["fontWeight"];
  }

  const keywords = [
    "normal",
    "bold",
    "ultralight",
    "thin",
    "light",
    "medium",
    "regular",
    "semibold",
    "condensed",
    "black",
    "heavy",
    "100",
    "200",
    "300",
    "400",
    "500",
    "600",
    "700",
    "800",
    "900",
  ] as Array<NonNullable<TextStyle["fontWeight"]>>;

  if (keywords.includes(raw as any)) return raw as TextStyle["fontWeight"];
  return undefined;
}

export function AppText({
  variant = "body",
  size,
  weight,
  color,
  align,
  style,
  children,
  ...props
}: AppTextProps) {
  const theme = useAppTheme();

  const computed = useMemo<TextStyle>(() => {
    const scale = theme?.typography?.scale;
    const fontFamily = theme?.typography?.fontFamilyPrimary || undefined;
    const variantScale =
      scale?.[variant] ??
      ({
        display: { size: 28, lineHeight: 36, weight: "700", letterSpacing: -0.2 },
        title: { size: 22, lineHeight: 30, weight: "700", letterSpacing: -0.1 },
        heading: { size: 18, lineHeight: 26, weight: "600", letterSpacing: -0.1 },
        body: { size: 16, lineHeight: 24, weight: "400", letterSpacing: 0 },
        detail: { size: 14, lineHeight: 20, weight: "400", letterSpacing: 0 },
        caption: { size: 12, lineHeight: 16, weight: "500", letterSpacing: 0.1 },
      } satisfies Record<AppTextVariant, { size: number; lineHeight: number; weight: string; letterSpacing: number }>)[
        variant
      ];

    const fontSize = typeof size === "number" ? size : variantScale.size;
    const lineHeight =
      typeof size === "number" ? Math.max(size + 4, Math.round(size * 1.35)) : variantScale.lineHeight;
    const letterSpacing = variantScale.letterSpacing;

    const fontWeight = normalizeFontWeight(weight ?? variantScale.weight) ?? "400";
    const themeColors = (theme?.colors ?? FALLBACK_COLORS) as AppThemeColors;
    const textColor = resolveColor(themeColors, color);

    return {
      fontSize,
      lineHeight,
      letterSpacing,
      fontWeight,
      fontFamily,
      color: textColor,
      textAlign: align,
    };
  }, [theme, variant, size, weight, color, align]);

  return (
    <Text {...props} style={[styles.baseText, computed, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  baseText: {
    includeFontPadding: false,
    textAlignVertical: "center",
  },
});
