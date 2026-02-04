import { useMemo } from "react";
import { StyleSheet } from "react-native";
import type { AppTheme } from "./types";
import { useThemeContext } from "./ThemeProvider";

export function useAppTheme() {
  return useThemeContext().theme;
}

export function useAppThemeMode() {
  const ctx = useThemeContext();
  return { mode: ctx.theme.mode, isDark: ctx.theme.isDark, setMode: ctx.setMode };
}

export function createThemedStyles<T extends StyleSheet.NamedStyles<T>>(factory: (theme: AppTheme) => T) {
  return function useThemedStyles() {
    const theme = useAppTheme();
    return useMemo(() => StyleSheet.create(factory(theme)), [theme]);
  };
}
