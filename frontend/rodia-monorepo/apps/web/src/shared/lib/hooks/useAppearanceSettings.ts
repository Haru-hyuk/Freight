import * as React from "react";

export type PrimaryColorPreset = "brand" | "accent" | "destructive" | "foreground";

export type AppearanceSettings = {
  darkMode: boolean;
  primaryColorPreset: PrimaryColorPreset;
};

type PrimaryPresetStyle = {
  primary: string;
  primaryForeground: string;
};

export const PRIMARY_COLOR_PRESET_OPTIONS: Array<{
  value: PrimaryColorPreset;
  label: string;
  description: string;
}> = [
  {
    value: "brand",
    label: "브랜드 오렌지",
    description: "기본 브랜드 중심 색상입니다.",
  },
  {
    value: "accent",
    label: "강조 톤",
    description: "부드러운 강조 전달에 적합합니다.",
  },
  {
    value: "destructive",
    label: "강한 대비",
    description: "경고 중심 운영 화면에 적합합니다.",
  },
  {
    value: "foreground",
    label: "모노 톤",
    description: "텍스트 중심 가독성 테마입니다.",
  },
];

const STORAGE_KEY = "rodia_web_appearance_settings";

const DEFAULT_SETTINGS: AppearanceSettings = {
  darkMode: false,
  primaryColorPreset: "brand",
};

const PRIMARY_PRESET_STYLES: Record<PrimaryColorPreset, PrimaryPresetStyle> = {
  brand: {
    primary: "var(--rd-brand-primary-hsl)",
    primaryForeground: "var(--foreground)",
  },
  accent: {
    primary: "var(--accent)",
    primaryForeground: "var(--foreground)",
  },
  destructive: {
    primary: "var(--destructive)",
    primaryForeground: "var(--foreground)",
  },
  foreground: {
    primary: "var(--foreground)",
    primaryForeground: "var(--background)",
  },
};

function isPrimaryColorPreset(value: string): value is PrimaryColorPreset {
  return value === "brand" || value === "accent" || value === "destructive" || value === "foreground";
}

function readStoredSettings(): AppearanceSettings | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<AppearanceSettings>;
    const darkMode = typeof parsed.darkMode === "boolean" ? parsed.darkMode : null;
    const primaryColorPreset =
      typeof parsed.primaryColorPreset === "string" && isPrimaryColorPreset(parsed.primaryColorPreset)
        ? parsed.primaryColorPreset
        : null;

    if (darkMode === null || primaryColorPreset === null) return null;
    return { darkMode, primaryColorPreset };
  } catch {
    return null;
  }
}

function getInitialSettings(): AppearanceSettings {
  if (typeof document === "undefined") return DEFAULT_SETTINGS;
  const stored = readStoredSettings();
  if (stored) return stored;

  return {
    ...DEFAULT_SETTINGS,
    darkMode: document.documentElement.classList.contains("dark"),
  };
}

function applySettings(settings: AppearanceSettings) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.classList.toggle("dark", settings.darkMode);

  const preset = PRIMARY_PRESET_STYLES[settings.primaryColorPreset];
  root.style.setProperty("--primary", preset.primary);
  root.style.setProperty("--primary-foreground", preset.primaryForeground);
  root.style.setProperty("--ring", preset.primary);
}

function persistSettings(settings: AppearanceSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function initializeAppearanceSettings() {
  applySettings(getInitialSettings());
}

export function useAppearanceSettings() {
  const [settings, setSettings] = React.useState<AppearanceSettings>(getInitialSettings);

  React.useEffect(() => {
    applySettings(settings);
    persistSettings(settings);
  }, [settings]);

  const setDarkMode = React.useCallback((darkMode: boolean) => {
    setSettings((prev) => ({ ...prev, darkMode }));
  }, []);

  const setPrimaryColorPreset = React.useCallback((primaryColorPreset: PrimaryColorPreset) => {
    setSettings((prev) => ({ ...prev, primaryColorPreset }));
  }, []);

  const resetToDefault = React.useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return {
    settings,
    setDarkMode,
    setPrimaryColorPreset,
    resetToDefault,
  };
}
