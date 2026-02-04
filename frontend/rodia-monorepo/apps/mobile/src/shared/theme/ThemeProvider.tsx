import React, { createContext, useContext, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import { useColorScheme } from "react-native";
import { rodiaTheme } from "@rodia/tokens"; // ✅ dist 직접 import 금지
import type { AppColorMode, AppTheme } from "./types";

type ThemeContextValue = {
  theme: AppTheme;
  setMode: (mode: AppColorMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const warned = new Set<string>();

/**
 * 주의: console.warn은 React Native Web/Expo Web에서 오버레이/리렌더 타이밍에
 * 불필요한 노이즈를 만들 수 있어서, DEV에서도 "직접 호출" 대신 setTimeout으로 한 틱 뒤로 미룸.
 * (크래시 방지/UX 개선 목적, 로직에는 영향 없음)
 */
function warnOnce(key: string, message: string) {
  if (!__DEV__) return;
  if (warned.has(key)) return;
  warned.add(key);

  const doWarn = () => {
    // eslint-disable-next-line no-console
    console.warn(message);
  };

  // web 환경에서 동기 warn이 문제를 키우는 경우가 있어 비동기 처리
  if (typeof window !== "undefined" && typeof (window as any).document !== "undefined") {
    setTimeout(doWarn, 0);
    return;
  }

  doWarn();
}

function readTokenString(input: unknown): string | null {
  if (typeof input === "string") return input;
  if (input && typeof input === "object" && typeof (input as any)?.value === "string") return (input as any).value;
  return null;
}

function readTokenNumber(input: unknown): number | null {
  if (typeof input === "number" && Number.isFinite(input)) return input;
  if (
    input &&
    typeof input === "object" &&
    typeof (input as any)?.value === "number" &&
    Number.isFinite((input as any).value)
  ) {
    return (input as any).value;
  }
  return null;
}

function safeAnyColor(input: unknown, fallback: string, warnKey?: string) {
  const raw = readTokenString(input)?.trim();
  if (raw && raw.length > 0) return raw;
  if (warnKey) warnOnce(warnKey, `[theme] missing/invalid token: ${warnKey} -> fallback(${fallback})`);
  return fallback;
}

function safeFirstColor(inputs: unknown[], fallback: string, warnKey?: string) {
  for (const input of inputs) {
    const raw = readTokenString(input)?.trim();
    if (raw && raw.length > 0) return raw;
  }
  if (warnKey) warnOnce(warnKey, `[theme] missing/invalid token: ${warnKey} -> fallback(${fallback})`);
  return fallback;
}

/**
 * ✅ Hex 정책(스키마 기준): #RGB 또는 #RRGGBB만 허용
 */
function safeHexColor(input: unknown, fallback: string, warnKey: string) {
  const raw = readTokenString(input)?.trim();
  const ok = raw && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(raw);
  if (ok) return raw as string;

  warnOnce(warnKey, `[theme] missing/invalid HEX token: ${warnKey} -> fallback(${fallback})`);
  return fallback;
}

function safeNumber(input: unknown, fallback: number, warnKey?: string) {
  const n = readTokenNumber(input);
  if (typeof n === "number") return n;
  if (warnKey) warnOnce(warnKey, `[theme] missing/invalid number token: ${warnKey} -> fallback(${fallback})`);
  return fallback;
}

function safePlainObject<T extends object>(input: unknown, fallback: T) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return fallback;
  return input as T;
}

const FALLBACK_COLORS = Object.freeze({
  light: Object.freeze({
    bgMain: "#F8FAFC",
    bgSurfaceAlt: "#F1F5F9",
    textMain: "#0F172A",
    borderDefault: "#E2E8F0",
    semanticDanger: "#EF4444",
  }),
  dark: Object.freeze({
    bgMain: "#0F172A",
    bgSurfaceAlt: "#111827",
    textMain: "#F8FAFC",
    borderDefault: "#1F2937",
    semanticDanger: "#F87171",
  }),
});

const FALLBACK_BRAND = Object.freeze({
  primary: "#FF6A00",
  accent: "#00E5A8",
});

const FALLBACK_ANDROID_CARD_RAISED = Object.freeze({ elevation: 6 });
const FALLBACK_IOS_CARD_RAISED = Object.freeze({
  shadowColor: "#000000",
  shadowOpacity: 0.12,
  shadowRadius: 10,
  shadowOffset: Object.freeze({ width: 0, height: 6 }),
});

function resolveColorMode(mode: AppColorMode, system: ReturnType<typeof useColorScheme>): "light" | "dark" {
  if (mode === "system") return (system ?? "light") === "dark" ? "dark" : "light";
  return mode === "dark" ? "dark" : "light";
}

function buildTheme(resolved: "light" | "dark", mode: AppColorMode): AppTheme {
  const isDark = resolved === "dark";
  const active = isDark ? (rodiaTheme as any)?.themes?.dark : (rodiaTheme as any)?.themes?.light;

  const colors = active?.colors;
  const fb = isDark ? FALLBACK_COLORS.dark : FALLBACK_COLORS.light;

  const bgMain = safeHexColor(colors?.bg?.main, fb.bgMain, "colors.bg.main");
  const bgSurfaceAlt = safeHexColor(colors?.bg?.surfaceAlt, fb.bgSurfaceAlt, "colors.bg.surfaceAlt");
  const textMain = safeHexColor(colors?.text?.main, fb.textMain, "colors.text.main");

  const brandPrimary = safeAnyColor(colors?.brand?.primary, FALLBACK_BRAND.primary, "colors.brand.primary");
  const brandSecondary = safeAnyColor(colors?.brand?.secondary, textMain, "colors.brand.secondary");
  const brandAccent = safeAnyColor(colors?.brand?.accent, FALLBACK_BRAND.accent, "colors.brand.accent");

  const borderDefault = safeAnyColor(colors?.border?.default, fb.borderDefault, "colors.border.default");
  const semanticDanger = safeAnyColor(colors?.semantic?.danger, fb.semanticDanger, "colors.semantic.danger");

  const textOnBrand = safeFirstColor(
    [colors?.brand?.onPrimary, colors?.text?.onBrand],
    "#FFFFFF",
    "colors.brand.onPrimary (or colors.text.onBrand legacy)"
  );

  const cardRadius = safeNumber((rodiaTheme as any)?.layout?.radii?.card, 16, "layout.radii.card");

  const headingSize = safeNumber(
    (rodiaTheme as any)?.typography?.scale?.heading?.size,
    18,
    "typography.scale.heading.size"
  );
  const bodySize = safeNumber((rodiaTheme as any)?.typography?.scale?.body?.size, 14, "typography.scale.body.size");
  const headingWeight = safeAnyColor(
    (rodiaTheme as any)?.typography?.scale?.heading?.weight,
    "700",
    "typography.scale.heading.weight"
  );
  const bodyWeight = safeAnyColor(
    (rodiaTheme as any)?.typography?.scale?.body?.weight,
    "400",
    "typography.scale.body.weight"
  );

  const elevationApp = safePlainObject((rodiaTheme as any)?.elevation?.app, {
    android: { cardRaised: FALLBACK_ANDROID_CARD_RAISED },
    ios: { cardRaised: FALLBACK_IOS_CARD_RAISED },
  });

  const androidCardRaised = safePlainObject(elevationApp?.android?.cardRaised, FALLBACK_ANDROID_CARD_RAISED);
  const iosCardRaised = safePlainObject(elevationApp?.ios?.cardRaised, FALLBACK_IOS_CARD_RAISED);

  return {
    mode,
    isDark,
    colors: {
      bgMain,
      bgSurfaceAlt,
      textMain,
      textOnBrand,
      brandPrimary,
      brandSecondary,
      brandAccent,
      borderDefault,
      semanticDanger,
    },
    layout: { radii: { card: cardRadius } },
    typography: { headingSize, bodySize, headingWeight, bodyWeight },
    elevation: { androidCardRaised, iosCardRaised },
  };
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const system = useColorScheme();
  const [mode, setMode] = useState<AppColorMode>("system");

  const resolved = resolveColorMode(mode, system);
  const theme = useMemo(() => buildTheme(resolved, mode), [resolved, mode]);

  return <ThemeContext.Provider value={{ theme, setMode }}>{children}</ThemeContext.Provider>;
}

export function useThemeContext() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("[theme] ThemeProvider is missing above in the tree.");
  return ctx;
}

export function useAppTheme(): AppTheme {
  return useThemeContext().theme;
}

export function useAppColorMode() {
  const { theme, setMode } = useThemeContext();
  return { mode: theme?.mode ?? "system", setMode };
}