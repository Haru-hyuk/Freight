import React, { useMemo } from "react";
import { StyleSheet, Text, type TextProps, type TextStyle } from "react-native";
import { useAppTheme } from "../../theme/useAppTheme";
import type { AppThemeColors } from "../../theme/types";

type AppTextVariant = "heading" | "body" | "caption";

export type AppTextProps = Omit<TextProps, "style"> & {
  variant?: AppTextVariant;
  size?: number;
  weight?: TextStyle["fontWeight"] | string | number;
  color?: keyof AppThemeColors | string;
  align?: TextStyle["textAlign"];
  style?: TextStyle;
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

  // numeric string
  if (/^\d{3}$/.test(raw)) {
    const n = Number(raw);
    if (n >= 100 && n <= 900 && n % 100 === 0) return n as TextStyle["fontWeight"];
  }

  // RN fontWeight keywords (subset + 확장 대응)
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
    const headingSize = theme?.typography?.headingSize ?? 18;
    const bodySize = theme?.typography?.bodySize ?? 14;

    const defaultHeadingWeight = normalizeFontWeight(theme?.typography?.headingWeight) ?? "700";
    const defaultBodyWeight = normalizeFontWeight(theme?.typography?.bodyWeight) ?? "400";

    const fontSize =
      typeof size === "number"
        ? size
        : variant === "heading"
          ? headingSize
          : variant === "caption"
            ? Math.max(10, bodySize - 2)
            : bodySize;

    const candidateWeight =
      weight != null
        ? weight
        : variant === "heading"
          ? theme?.typography?.headingWeight
          : theme?.typography?.bodyWeight;

    const fontWeight =
      normalizeFontWeight(candidateWeight) ?? (variant === "heading" ? defaultHeadingWeight : defaultBodyWeight);

    const themeColors = (theme?.colors ?? {
      bgMain: "#F8FAFC",
      bgSurfaceAlt: "#F1F5F9",
      textMain: "#0F172A",
      textOnBrand: "#FFFFFF",
      brandPrimary: "#FF6A00",
      brandSecondary: "#0F172A",
      brandAccent: "#00E5A8",
      borderDefault: "#E2E8F0",
      semanticDanger: "#EF4444",
    }) as AppThemeColors;

    const textColor = resolveColor(themeColors, color);

    return {
      fontSize,
      fontWeight,
      color: textColor,
      textAlign: align,
    };
  }, [
    theme?.typography?.headingSize,
    theme?.typography?.bodySize,
    theme?.typography?.headingWeight,
    theme?.typography?.bodyWeight,
    theme?.colors,
    variant,
    size,
    weight,
    color,
    align,
  ]);

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