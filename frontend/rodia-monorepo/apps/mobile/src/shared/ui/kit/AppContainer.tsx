// apps/mobile/src/shared/ui/kit/AppContainer.tsx
import React, { useMemo } from "react";
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme, createThemedStyles } from "@/shared/theme/useAppTheme";
import type { AppThemeColors } from "@/shared/theme/types";

export type AppContainerProps = {
  children?: React.ReactNode;
  scroll?: boolean;
  padding?: number;
  backgroundColor?: keyof AppThemeColors | string;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  edges?: Array<"top" | "right" | "bottom" | "left">;
  includeBottomSafeArea?: boolean;
};

function resolveBg(themeColors: AppThemeColors, input?: keyof AppThemeColors | string) {
  const colors = (themeColors ?? ({} as any)) as AppThemeColors;

  if (!input) return (colors as any)?.bgMain ?? "#FFFFFF";

  if (typeof input === "string") {
    const key = input as keyof AppThemeColors;
    const byKey = (colors as any)?.[key];
    if (typeof byKey === "string" && byKey.length > 0) return byKey;
    return input;
  }

  return (colors as any)?.bgMain ?? "#FFFFFF";
}

export function AppContainer({
  children,
  scroll = false,
  padding = 16,
  backgroundColor,
  style,
  contentStyle,
  edges,
  includeBottomSafeArea = false,
}: AppContainerProps) {
  const theme = useAppTheme();
  const styles = useStyles();

  const bg = useMemo(
    () => resolveBg((theme?.colors ?? ({} as any)) as AppThemeColors, backgroundColor),
    [theme?.colors, backgroundColor]
  );

  const resolvedEdges = useMemo(() => {
    if (Array.isArray(edges) && edges.length > 0) return edges as AppContainerProps["edges"];
    return (includeBottomSafeArea ? ["bottom"] : []) as AppContainerProps["edges"];
  }, [edges, includeBottomSafeArea]);

  const resolvedPadding = Number.isFinite(padding) ? (padding as number) : 16;

  if (scroll) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: bg }, style]} edges={resolvedEdges}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { padding: resolvedPadding }, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }, style]} edges={resolvedEdges}>
      <View style={[styles.content, { padding: resolvedPadding }, contentStyle]}>{children}</View>
    </SafeAreaView>
  );
}

const useStyles = createThemedStyles((_theme) => {
  return StyleSheet.create({
    safe: { flex: 1 },
    content: { flex: 1 },
    scrollContent: { flexGrow: 1 },
  });
});