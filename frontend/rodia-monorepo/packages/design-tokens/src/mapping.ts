// packages/design-tokens/src/mapping.ts
export type ShadcnVarName =
  | "background"
  | "foreground"
  | "primary"
  | "secondary"
  | "accent"
  | "destructive"
  | "muted"
  | "border";

export type RodiaPath =
  | "themes.light.colors.bg.main.value"
  | "themes.light.colors.text.main.value"
  | "themes.light.colors.brand.primary.value"
  | "themes.light.colors.brand.secondary.value"
  | "themes.light.colors.brand.accent.value"
  | "themes.light.colors.semantic.danger.value"
  | "themes.light.colors.bg.surfaceAlt.value"
  | "themes.light.colors.border.default.value"
  | "themes.dark.colors.bg.main.value"
  | "themes.dark.colors.text.main.value"
  | "themes.dark.colors.brand.primary.value"
  | "themes.dark.colors.brand.secondary.value"
  | "themes.dark.colors.brand.accent.value"
  | "themes.dark.colors.semantic.danger.value"
  | "themes.dark.colors.bg.surfaceAlt.value"
  | "themes.dark.colors.border.default.value";

export type MappingItem = {
  shadcnVar: ShadcnVarName;
  lightPath: RodiaPath;
  darkPath: RodiaPath;
  comment: string;
};

export const SHADCN_MAPPING: MappingItem[] = [
  {
    shadcnVar: "background",
    lightPath: "themes.light.colors.bg.main.value",
    darkPath: "themes.dark.colors.bg.main.value",
    comment: "Rodia bg.main"
  },
  {
    shadcnVar: "foreground",
    lightPath: "themes.light.colors.text.main.value",
    darkPath: "themes.dark.colors.text.main.value",
    comment: "Rodia text.main"
  },
  {
    shadcnVar: "primary",
    lightPath: "themes.light.colors.brand.primary.value",
    darkPath: "themes.dark.colors.brand.primary.value",
    comment: "Rodia brand.primary"
  },

  // ✅ FIX: shadcn secondary는 "중립 표면색" 용도 → brand.secondary 대신 surfaceAlt로 매핑
  {
    shadcnVar: "secondary",
    lightPath: "themes.light.colors.bg.surfaceAlt.value",
    darkPath: "themes.dark.colors.bg.surfaceAlt.value",
    comment: "Rodia bg.surfaceAlt (for shadcn secondary)"
  },

  // (선택) accent를 mint로 쓰고 싶으면 그대로 유지해도 되지만,
  // shadcn accent는 보통 "중립 강조 배경"이라 surfaceAlt로 두는 쪽이 안전함.
  {
    shadcnVar: "accent",
    lightPath: "themes.light.colors.bg.surfaceAlt.value",
    darkPath: "themes.dark.colors.bg.surfaceAlt.value",
    comment: "Rodia bg.surfaceAlt (for shadcn accent)"
  },

  {
    shadcnVar: "destructive",
    lightPath: "themes.light.colors.semantic.danger.value",
    darkPath: "themes.dark.colors.semantic.danger.value",
    comment: "Rodia semantic.danger"
  },

  // muted는 "더 약한 중립 배경" 용도라 surfaceAlt 유지 OK (secondary와 같아도 실사용에 문제 없음)
  {
    shadcnVar: "muted",
    lightPath: "themes.light.colors.bg.surfaceAlt.value",
    darkPath: "themes.dark.colors.bg.surfaceAlt.value",
    comment: "Rodia bg.surfaceAlt"
  },

  {
    shadcnVar: "border",
    lightPath: "themes.light.colors.border.default.value",
    darkPath: "themes.dark.colors.border.default.value",
    comment: "Rodia border.default"
  }
];