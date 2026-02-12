// packages/design-tokens/src/mapping.ts
export type ShadcnVarName =
  | "background"
  | "foreground"
  | "primary"
  | "primary-foreground"
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
  | "themes.light.colors.brand.onPrimary.value"
  | "themes.light.colors.semantic.danger.value"
  | "themes.light.colors.bg.surfaceAlt.value"
  | "themes.light.colors.border.default.value"
  | "themes.dark.colors.bg.main.value"
  | "themes.dark.colors.text.main.value"
  | "themes.dark.colors.brand.primary.value"
  | "themes.dark.colors.brand.secondary.value"
  | "themes.dark.colors.brand.accent.value"
  | "themes.dark.colors.brand.onPrimary.value"
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
    comment: "Rodia bg.main",
  },
  {
    shadcnVar: "foreground",
    lightPath: "themes.light.colors.text.main.value",
    darkPath: "themes.dark.colors.text.main.value",
    comment: "Rodia text.main",
  },
  {
    shadcnVar: "primary",
    lightPath: "themes.light.colors.brand.primary.value",
    darkPath: "themes.dark.colors.brand.primary.value",
    comment: "Rodia brand.primary",
  },
  {
    shadcnVar: "primary-foreground",
    lightPath: "themes.light.colors.brand.onPrimary.value",
    darkPath: "themes.dark.colors.brand.onPrimary.value",
    comment: "Rodia brand.onPrimary",
  },
  {
    shadcnVar: "secondary",
    lightPath: "themes.light.colors.bg.surfaceAlt.value",
    darkPath: "themes.dark.colors.bg.surfaceAlt.value",
    comment: "Rodia bg.surfaceAlt (for shadcn secondary)",
  },
  {
    shadcnVar: "accent",
    lightPath: "themes.light.colors.bg.surfaceAlt.value",
    darkPath: "themes.dark.colors.bg.surfaceAlt.value",
    comment: "Rodia bg.surfaceAlt (for shadcn accent)",
  },
  {
    shadcnVar: "destructive",
    lightPath: "themes.light.colors.semantic.danger.value",
    darkPath: "themes.dark.colors.semantic.danger.value",
    comment: "Rodia semantic.danger",
  },
  {
    shadcnVar: "muted",
    lightPath: "themes.light.colors.bg.surfaceAlt.value",
    darkPath: "themes.dark.colors.bg.surfaceAlt.value",
    comment: "Rodia bg.surfaceAlt",
  },
  {
    shadcnVar: "border",
    lightPath: "themes.light.colors.border.default.value",
    darkPath: "themes.dark.colors.border.default.value",
    comment: "Rodia border.default",
  },
];

/*
- shadcn Button 텍스트 색을 결정하는 primary-foreground를 brand.onPrimary로 매핑합니다.
- web에서 CSS var만으로 모바일(AppButton의 textOnBrand)과 동일한 “onPrimary”를 재현할 수 있습니다.
- 나머지 foreground류는 web index.css에서 파생해도 되지만, 핵심 누락(Primary FG)은 SoT에서 생성합니다.
*/