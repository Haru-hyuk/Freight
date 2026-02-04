import { useMemo } from "react";
import { StyleSheet, useColorScheme } from "react-native";
import type { AppColorMode, AppTheme } from "./types";
import { createTheme, resolveColorMode, useThemeContextOptional } from "./ThemeProvider";

declare const __DEV__: boolean;

const warned = new Set<string>();

function warnOnce(key: string, message: string) {
  if (!__DEV__) return;
  if (warned.has(key)) return;
  warned.add(key);

  const doWarn = () => {
    // eslint-disable-next-line no-console
    console.warn(message);
  };

  if (typeof window !== "undefined" && typeof (window as any)?.document !== "undefined") {
    setTimeout(doWarn, 0);
    return;
  }

  doWarn();
}

export function useAppTheme(): AppTheme {
  const system = useColorScheme();
  const ctx = useThemeContextOptional();

  const fallbackResolved = resolveColorMode("system", system);
  const fallbackTheme = useMemo(() => createTheme(fallbackResolved, "system"), [fallbackResolved]);

  if (!ctx?.theme) {
    warnOnce("ThemeProvider.missing.fallback", "[theme] ThemeProvider is missing. Using fallback theme.");
    return fallbackTheme;
  }

  return ctx.theme;
}

export function useAppThemeMode() {
  const system = useColorScheme();
  const ctx = useThemeContextOptional();

  const fallbackResolved = resolveColorMode("system", system);
  const fallbackTheme = useMemo(() => createTheme(fallbackResolved, "system"), [fallbackResolved]);

  if (!ctx?.theme) {
    warnOnce("ThemeProvider.missing.fallbackMode", "[theme] ThemeProvider is missing. Using fallback mode.");
    return {
      mode: fallbackTheme.mode,
      isDark: fallbackTheme.isDark,
      setMode: (_mode: AppColorMode) => {
        warnOnce("ThemeProvider.setMode.noop", "[theme] setMode ignored because ThemeProvider is missing.");
      },
    };
  }

  return {
    mode: ctx.theme.mode,
    isDark: ctx.theme.isDark,
    setMode: ctx.setMode,
  };
}

export function createThemedStyles<T extends StyleSheet.NamedStyles<T>>(factory: (theme: AppTheme) => T) {
  return function useThemedStyles() {
    const theme = useAppTheme();
    return useMemo(() => StyleSheet.create(factory(theme)), [theme]);
  };
}