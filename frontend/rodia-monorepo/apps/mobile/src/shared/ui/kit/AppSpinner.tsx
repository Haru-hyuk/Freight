// apps/mobile/src/shared/ui/kit/AppSpinner.tsx
import React from "react";
import { ActivityIndicator, View } from "react-native";
import type { ViewStyle } from "react-native";

import { rgbaFromHex, safeString } from "@/shared/theme/colorUtils";
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

function applyAlpha(color: unknown, alpha: number, fallbackColor: string): string {
  const c = safeString(color, "").trim();
  const hexWithOpacity = rgbaFromHex(c, alpha);
  if (hexWithOpacity) return hexWithOpacity;

  if (c.startsWith("rgb(") || c.startsWith("rgba(")) return c;
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
  const resolvedLabel = safeString(label, "").trim();

  return (
    <View
      style={[containerStyle, style]}
      pointerEvents={mode === "overlay" ? "auto" : "none"}
      accessibilityRole="progressbar"
      accessibilityLabel={resolvedLabel || "Loading"}
    >
      <ActivityIndicator size={mapSize(size)} color={spinnerColor} />
      {resolvedLabel ? (
        <AppText variant="caption" color="textMain" align="center">
          {label}
        </AppText>
      ) : null}
    </View>
  );
}
