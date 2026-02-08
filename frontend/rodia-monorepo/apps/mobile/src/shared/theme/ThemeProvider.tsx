import React, { createContext, useContext, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import { useColorScheme } from "react-native";
import { rodiaTheme } from "@rodia/tokens";
import type { AppColorMode, AppTheme, AndroidCardRaisedStyle, IOSCardRaisedStyle } from "./types";

declare const __DEV__: boolean;

type ThemeContextValue = {
  theme: AppTheme;
  setMode: (mode: AppColorMode) => void;
};

type ButtonSizeToken = AppTheme["components"]["button"]["sizes"]["md"];
type TypeScaleToken = AppTheme["typography"]["scale"]["heading"];

const ThemeContext = createContext<ThemeContextValue | null>(null);
const warned = new Set<string>();

function warnOnce(key: string, message: string) {
  if (!__DEV__) return;
  if (warned.has(key)) return;
  warned.add(key);

  // eslint-disable-next-line no-console
  console.warn(message);
}

function readTokenString(input: unknown): string | null {
  if (typeof input === "string") return input;
  if (typeof input === "number" && Number.isFinite(input)) return String(input);

  if (input && typeof input === "object" && !Array.isArray(input)) {
    const v = (input as any)?.value;
    if (typeof v === "string") return v;
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }

  return null;
}

function readTokenNumber(input: unknown): number | null {
  if (typeof input === "number" && Number.isFinite(input)) return input;

  if (input && typeof input === "object" && !Array.isArray(input)) {
    const v = (input as any)?.value;
    if (typeof v === "number" && Number.isFinite(v)) return v;
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

function safeHexColor(input: unknown, fallback: string, warnKey?: string) {
  const raw = readTokenString(input)?.trim();
  if (raw && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(raw)) return raw;
  if (warnKey) warnOnce(warnKey, `[theme] missing/invalid HEX token: ${warnKey} -> fallback(${fallback})`);
  return fallback;
}

function safeNumber(input: unknown, fallback: number, warnKey?: string) {
  const n = readTokenNumber(input);
  if (typeof n === "number") return n;
  if (warnKey) warnOnce(warnKey, `[theme] missing/invalid number token: ${warnKey} -> fallback(${fallback})`);
  return fallback;
}

function safeNumberArray(input: unknown, fallback: number[], warnKey?: string) {
  if (!Array.isArray(input)) {
    if (warnKey) warnOnce(warnKey, `[theme] missing/invalid array token: ${warnKey} -> fallback`);
    return fallback;
  }

  const out = input.filter((item): item is number => typeof item === "number" && Number.isFinite(item));
  if (out.length === 0) {
    if (warnKey) warnOnce(warnKey, `[theme] empty/invalid array token: ${warnKey} -> fallback`);
    return fallback;
  }
  return out;
}

function safePlainObject<T extends object>(input: unknown, fallback: T) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return fallback;
  return input as T;
}

function readTypeScale(input: unknown, fallback: TypeScaleToken, path: string): TypeScaleToken {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    warnOnce(path, `[theme] missing/invalid scale token: ${path} -> fallback`);
    return fallback;
  }

  const s = input as any;
  return {
    size: safeNumber(s?.size, fallback.size, `${path}.size`),
    lineHeight: safeNumber(s?.lineHeight, fallback.lineHeight, `${path}.lineHeight`),
    weight: safeAnyColor(s?.weight, fallback.weight, `${path}.weight`),
    letterSpacing: safeNumber(s?.letterSpacing, fallback.letterSpacing, `${path}.letterSpacing`),
  };
}

function readButtonSizeToken(input: unknown, fallback: ButtonSizeToken, path: string): ButtonSizeToken {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    warnOnce(path, `[theme] missing/invalid button size token: ${path} -> fallback`);
    return fallback;
  }

  const s = input as any;
  return {
    minHeight: safeNumber(s?.minHeight, fallback.minHeight, `${path}.minHeight`),
    paddingX: safeNumber(s?.paddingX, fallback.paddingX, `${path}.paddingX`),
    paddingY: safeNumber(s?.paddingY, fallback.paddingY, `${path}.paddingY`),
    radius: safeNumber(s?.radius, fallback.radius, `${path}.radius`),
  };
}

export function resolveColorMode(mode: AppColorMode, system: ReturnType<typeof useColorScheme>): "light" | "dark" {
  if (mode === "system") return (system ?? "light") === "dark" ? "dark" : "light";
  return mode === "dark" ? "dark" : "light";
}

const FALLBACK_COLORS = Object.freeze({
  light: Object.freeze({
    bgMain: "#F8FAFC",
    bgSurface: "#FFFFFF",
    bgSurfaceAlt: "#F1F5F9",
    textMain: "#111827",
    textSub: "#334155",
    textMuted: "#475569",
    textInverse: "#FFFFFF",
    borderDefault: "#E2E8F0",
    borderStrong: "#CBD5E1",
    semanticDanger: "#EF4444",
    semanticSuccess: "#059669",
    semanticWarning: "#D97706",
    semanticInfo: "#CC5500",
    stateBrandPressed: "#CC5500",
    stateOverlayPressed: "#ECEDEE",
    stateDisabledBg: "#E2E8F0",
    stateDisabledText: "#94A3B8",
    stateDisabledBorder: "#E2E8F0",
  }),
  dark: Object.freeze({
    bgMain: "#0B0F19",
    bgSurface: "#111827",
    bgSurfaceAlt: "#1F2937",
    textMain: "#F8FAFC",
    textSub: "#CBD5E1",
    textMuted: "#94A3B8",
    textInverse: "#0B0F19",
    borderDefault: "#282F3C",
    borderStrong: "#363C49",
    semanticDanger: "#F87171",
    semanticSuccess: "#34D399",
    semanticWarning: "#FBBF24",
    semanticInfo: "#FF8A3D",
    stateBrandPressed: "#E65F00",
    stateOverlayPressed: "#282F3C",
    stateDisabledBg: "#232A38",
    stateDisabledText: "#626772",
    stateDisabledBorder: "#282F3C",
  }),
});

const FALLBACK_BRAND = Object.freeze({
  primary: "#FF6A00",
  secondary: "#111827",
  accent: "#00E5A8",
  onPrimary: "#FFFFFF",
});

const FALLBACK_SPACING_STEPS = Object.freeze([4, 8, 12, 16, 20, 24, 32, 40, 48]);

const FALLBACK_TYPE_SCALE = Object.freeze({
  display: { size: 28, lineHeight: 36, weight: "700", letterSpacing: -0.2 },
  title: { size: 22, lineHeight: 30, weight: "700", letterSpacing: -0.1 },
  heading: { size: 18, lineHeight: 26, weight: "600", letterSpacing: -0.1 },
  body: { size: 16, lineHeight: 24, weight: "400", letterSpacing: 0 },
  detail: { size: 14, lineHeight: 20, weight: "400", letterSpacing: 0 },
  caption: { size: 12, lineHeight: 16, weight: "500", letterSpacing: 0.1 },
});

const FALLBACK_BUTTON_SIZES = Object.freeze({
  sm: { minHeight: 36, paddingX: 12, paddingY: 10, radius: 12 },
  md: { minHeight: 44, paddingX: 16, paddingY: 12, radius: 12 },
  lg: { minHeight: 52, paddingX: 20, paddingY: 14, radius: 12 },
});

const FALLBACK_ANDROID_CARD_RAISED: AndroidCardRaisedStyle = Object.freeze({ elevation: 6 });
const FALLBACK_IOS_CARD_RAISED: IOSCardRaisedStyle = Object.freeze({
  shadowColor: "#000000",
  shadowOpacity: 0.12,
  shadowRadius: 10,
  shadowOffset: Object.freeze({ width: 0, height: 6 }),
});

export function createTheme(resolved: "light" | "dark", mode: AppColorMode): AppTheme {
  const isDark = resolved === "dark";
  const active = isDark ? (rodiaTheme as any)?.themes?.dark : (rodiaTheme as any)?.themes?.light;
  const colors = active?.colors ?? {};
  const fb = isDark ? FALLBACK_COLORS.dark : FALLBACK_COLORS.light;

  const bgMain = safeHexColor(colors?.bg?.main, fb.bgMain, "colors.bg.main");
  const bgSurface = safeHexColor(colors?.bg?.surface, fb.bgSurface, "colors.bg.surface");
  const bgSurfaceAlt = safeHexColor(colors?.bg?.surfaceAlt, fb.bgSurfaceAlt, "colors.bg.surfaceAlt");
  const textMain = safeHexColor(colors?.text?.main, fb.textMain, "colors.text.main");
  const textSub = safeHexColor(colors?.text?.sub, fb.textSub, "colors.text.sub");
  const textMuted = safeHexColor(colors?.text?.muted, fb.textMuted, "colors.text.muted");
  const textInverse = safeHexColor(colors?.text?.inverse, fb.textInverse, "colors.text.inverse");

  const brandPrimary = safeHexColor(colors?.brand?.primary, FALLBACK_BRAND.primary, "colors.brand.primary");
  const brandSecondary = safeHexColor(colors?.brand?.secondary, FALLBACK_BRAND.secondary, "colors.brand.secondary");
  const brandAccent = safeHexColor(colors?.brand?.accent, FALLBACK_BRAND.accent, "colors.brand.accent");
  const textOnBrand = safeFirstColor(
    [colors?.brand?.onPrimary, colors?.text?.onBrand],
    FALLBACK_BRAND.onPrimary,
    "colors.brand.onPrimary"
  );

  const borderDefault = safeHexColor(colors?.border?.default, fb.borderDefault, "colors.border.default");
  const borderStrong = safeHexColor(colors?.border?.strong, fb.borderStrong, "colors.border.strong");

  const semanticDanger = safeHexColor(colors?.semantic?.danger, fb.semanticDanger, "colors.semantic.danger.value");
  const semanticSuccess = safeHexColor(
    colors?.semantic?.success?.text,
    fb.semanticSuccess,
    "colors.semantic.success.text"
  );
  const semanticWarning = safeHexColor(
    colors?.semantic?.warning?.text,
    fb.semanticWarning,
    "colors.semantic.warning.text"
  );
  const semanticInfo = safeHexColor(colors?.semantic?.info?.text, fb.semanticInfo, "colors.semantic.info.text");

  const stateBrandPressed = safeHexColor(
    colors?.state?.brand?.pressed,
    fb.stateBrandPressed,
    "colors.state.brand.pressed"
  );
  const stateOverlayPressed = safeHexColor(
    colors?.state?.overlay?.pressed,
    fb.stateOverlayPressed,
    "colors.state.overlay.pressed"
  );
  const stateDisabledBg = safeHexColor(colors?.state?.disabled?.bg, fb.stateDisabledBg, "colors.state.disabled.bg");
  const stateDisabledText = safeHexColor(
    colors?.state?.disabled?.text,
    fb.stateDisabledText,
    "colors.state.disabled.text"
  );
  const stateDisabledBorder = safeHexColor(
    colors?.state?.disabled?.border,
    fb.stateDisabledBorder,
    "colors.state.disabled.border"
  );

  const layoutRoot = (rodiaTheme as any)?.layout;
  const radiusCard = safeNumber(layoutRoot?.radii?.card, 16, "layout.radii.card");
  const radiusControl = safeNumber(layoutRoot?.radii?.control, 12, "layout.radii.control");
  const radiusPill = safeNumber(layoutRoot?.radii?.pill, 999, "layout.radii.pill");
  const spacingBase = safeNumber(layoutRoot?.spacing?.base, 4, "layout.spacing.base");
  const spacingSteps = safeNumberArray(layoutRoot?.spacing?.steps, [...FALLBACK_SPACING_STEPS], "layout.spacing.steps");

  const typRoot = (rodiaTheme as any)?.typography;
  const displayScale = readTypeScale(typRoot?.scale?.display, FALLBACK_TYPE_SCALE.display, "typography.scale.display");
  const titleScale = readTypeScale(typRoot?.scale?.title, FALLBACK_TYPE_SCALE.title, "typography.scale.title");
  const headingScale = readTypeScale(typRoot?.scale?.heading, FALLBACK_TYPE_SCALE.heading, "typography.scale.heading");
  const bodyScale = readTypeScale(typRoot?.scale?.body, FALLBACK_TYPE_SCALE.body, "typography.scale.body");
  const detailScale = readTypeScale(typRoot?.scale?.detail, FALLBACK_TYPE_SCALE.detail, "typography.scale.detail");
  const captionScale = readTypeScale(typRoot?.scale?.caption, FALLBACK_TYPE_SCALE.caption, "typography.scale.caption");
  const fontFamilyPrimary = safeAnyColor(typRoot?.fontFamily?.primary, "System", "typography.fontFamily.primary");

  const componentRoot = (rodiaTheme as any)?.components;
  const buttonSizeSm = readButtonSizeToken(
    componentRoot?.button?.sizes?.sm,
    FALLBACK_BUTTON_SIZES.sm,
    "components.button.sizes.sm"
  );
  const buttonSizeMd = readButtonSizeToken(
    componentRoot?.button?.sizes?.md,
    FALLBACK_BUTTON_SIZES.md,
    "components.button.sizes.md"
  );
  const buttonSizeLg = readButtonSizeToken(
    componentRoot?.button?.sizes?.lg,
    FALLBACK_BUTTON_SIZES.lg,
    "components.button.sizes.lg"
  );

  const componentCardRadius = safeNumber(componentRoot?.card?.radius, radiusCard, "components.card.radius");
  const componentCardPaddingSm = safeNumber(componentRoot?.card?.padding?.sm, 16, "components.card.padding.sm");
  const componentCardPaddingMd = safeNumber(componentRoot?.card?.padding?.md, 20, "components.card.padding.md");

  const elevationApp = safePlainObject((rodiaTheme as any)?.elevation?.app, {
    android: { cardRaised: FALLBACK_ANDROID_CARD_RAISED },
    ios: { cardRaised: FALLBACK_IOS_CARD_RAISED },
  });

  const androidCardRaised = safePlainObject((elevationApp as any)?.android?.cardRaised, FALLBACK_ANDROID_CARD_RAISED);
  const iosCardRaised = safePlainObject((elevationApp as any)?.ios?.cardRaised, FALLBACK_IOS_CARD_RAISED);

  return {
    mode,
    isDark,
    colors: {
      bgMain,
      bgSurface,
      bgSurfaceAlt,
      textMain,
      textSub,
      textMuted,
      textInverse,
      textOnBrand,
      brandPrimary,
      brandSecondary,
      brandAccent,
      borderDefault,
      borderStrong,
      stateBrandPressed,
      stateOverlayPressed,
      stateDisabledBg,
      stateDisabledText,
      stateDisabledBorder,
      semanticDanger,
      semanticSuccess,
      semanticWarning,
      semanticInfo,
    },
    layout: {
      radii: {
        card: radiusCard,
        control: radiusControl,
        pill: radiusPill,
      },
      spacing: {
        base: spacingBase,
        steps: spacingSteps,
      },
    },
    typography: {
      headingSize: headingScale.size,
      bodySize: bodyScale.size,
      headingWeight: headingScale.weight,
      bodyWeight: bodyScale.weight,
      fontFamilyPrimary,
      scale: {
        display: displayScale,
        title: titleScale,
        heading: headingScale,
        body: bodyScale,
        detail: detailScale,
        caption: captionScale,
      },
    },
    elevation: {
      androidCardRaised,
      iosCardRaised,
    },
    components: {
      button: {
        sizes: {
          sm: buttonSizeSm,
          md: buttonSizeMd,
          lg: buttonSizeLg,
        },
      },
      card: {
        radius: componentCardRadius,
        paddingSm: componentCardPaddingSm,
        paddingMd: componentCardPaddingMd,
      },
    },
  };
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const system = useColorScheme();
  const [mode, setMode] = useState<AppColorMode>("system");

  const resolved = resolveColorMode(mode, system);
  const theme = useMemo(() => createTheme(resolved, mode), [resolved, mode]);

  return <ThemeContext.Provider value={{ theme, setMode }}>{children}</ThemeContext.Provider>;
}

export function useThemeContextOptional() {
  return useContext(ThemeContext);
}

export function useThemeContext() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    warnOnce("ThemeProvider.missing", "[theme] ThemeProvider is missing above in the tree.");
    throw new Error("[theme] ThemeProvider is missing above in the tree.");
  }
  return ctx;
}
