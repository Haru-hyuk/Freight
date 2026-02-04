import React, { useMemo } from "react";
import {
  SafeAreaView,
  ScrollView,
  type StyleProp,
  StyleSheet,
  type ViewStyle,
  View,
} from "react-native";
import { useAppTheme, createThemedStyles } from "../../theme/useAppTheme";
import type { AppThemeColors } from "../../theme/types";

export type AppContainerProps = {
  children?: React.ReactNode;
  scroll?: boolean;
  padding?: number;
  backgroundColor?: keyof AppThemeColors | string;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

function resolveBg(themeColors: AppThemeColors, input?: keyof AppThemeColors | string) {
  if (!input) return themeColors.bgMain;
  if (typeof input === "string" && (themeColors as any)?.[input]) return (themeColors as any)[input] as string;
  if (typeof input === "string") return input;
  return themeColors.bgMain;
}

export function AppContainer({
  children,
  scroll = false,
  padding = 16,
  backgroundColor,
  style,
  contentStyle,
}: AppContainerProps) {
  const theme = useAppTheme();
  const styles = useStyles();

  const bg = useMemo(() => resolveBg(theme?.colors ?? ({} as any), backgroundColor), [theme?.colors, backgroundColor]);

  if (scroll) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: bg }, style as any]}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { padding: padding ?? 16 }, contentStyle as any]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }, style as any]}>
      <View style={[styles.content, { padding: padding ?? 16 }, contentStyle as any]}>{children}</View>
    </SafeAreaView>
  );
}

const useStyles = createThemedStyles((_theme) => {
  return StyleSheet.create({
    safe: {
      flex: 1,
    },
    content: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
    },
  });
});
