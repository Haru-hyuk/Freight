// packages/design-tokens/scripts/build-tokens.ts
import fs from "node:fs";
import path from "node:path";
import { parseTokens, type RodiaTokens } from "../src/schema";
import { SHADCN_MAPPING, type RodiaPath } from "../src/mapping";
import { hexToHslTriplet, isHexColor } from "./color";

const ROOT = path.resolve(process.cwd());
const SRC_JSON = path.join(ROOT, "src", "rodia.tokens.json");
const DIST_DIR = path.join(ROOT, "dist");

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function stripBom(s: string) {
  return s.replace(/^\uFEFF/, "");
}

/**
 * Robust JSON reader:
 * - If file contains NUL bytes, assume UTF-16LE (common on Windows/Notepad).
 * - Otherwise read as UTF-8.
 * - Always strip BOM before JSON.parse.
 */
function readJson(filePath: string) {
  const buf = fs.readFileSync(filePath);
  const hasNull = buf.includes(0);

  const text = stripBom(hasNull ? buf.toString("utf16le") : buf.toString("utf8"));

  try {
    return JSON.parse(text);
  } catch (e: any) {
    const msg = e?.message ? String(e.message) : "unknown JSON parse error";
    throw new Error(`[tokens] failed to parse JSON (${path.basename(filePath)}): ${msg}`);
  }
}

function getByPath(obj: unknown, p: string) {
  const parts = (p ?? "").split(".").filter(Boolean);
  let cur: any = obj;
  for (const key of parts) {
    cur = cur?.[key];
    if (cur === undefined || cur === null) return undefined;
  }
  return cur;
}

function requireHex(tokensRaw: unknown, p: RodiaPath) {
  const v = getByPath(tokensRaw, p);
  const s = typeof v === "string" ? v : undefined;
  if (!s || !isHexColor(s)) {
    throw new Error(`[tokens] expected hex color at "${p}", got: ${JSON.stringify(v)}`);
  }
  return s;
}

type CssColorVar = {
  varName: string;
  value: string;
  tokenPath: string;
};

function toCssSegment(input: string) {
  return input
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function collectThemeColorVars(themeColors: unknown) {
  const out: CssColorVar[] = [];

  const walk = (node: unknown, rawPath: string[], cssPath: string[]) => {
    if (!node || typeof node !== "object" || Array.isArray(node)) return;
    const record = node as Record<string, unknown>;

    const maybeValue = record?.value;
    if (typeof maybeValue === "string" && isHexColor(maybeValue) && cssPath.length > 0) {
      out.push({
        varName: `--rd-color-${cssPath.join("-")}`,
        value: maybeValue,
        tokenPath: rawPath.join("."),
      });
    }

    for (const [key, value] of Object.entries(record)) {
      if (key === "value") continue;
      walk(value, [...rawPath, key], [...cssPath, toCssSegment(key)]);
    }
  };

  walk(themeColors, [], []);
  return out.sort((a, b) => a.varName.localeCompare(b.varName));
}

function collectHexVars(node: unknown, prefix: string, basePath: string[]) {
  const out: CssColorVar[] = [];

  const walk = (input: unknown, rawPath: string[], cssPath: string[]) => {
    if (typeof input === "string") {
      if (!isHexColor(input) || cssPath.length === 0) return;
      out.push({
        varName: `--${prefix}-${cssPath.join("-")}`,
        value: input,
        tokenPath: rawPath.join("."),
      });
      return;
    }

    if (!input || typeof input !== "object" || Array.isArray(input)) return;
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      walk(value, [...rawPath, key], [...cssPath, toCssSegment(key)]);
    }
  };

  walk(node, [...basePath], []);
  return out.sort((a, b) => a.varName.localeCompare(b.varName));
}

function emitCss(tokensRaw: unknown) {
  const lightLines: string[] = [];
  const darkLines: string[] = [];

  lightLines.push(":root {");
  lightLines.push("  /* Shadcn Semantic Mapping (HSL triplets) */");

  darkLines.push(".dark {");
  darkLines.push("  /* Shadcn Semantic Mapping (HSL triplets) */");

  for (const m of SHADCN_MAPPING) {
    const lightHex = requireHex(tokensRaw, m.lightPath);
    const darkHex = requireHex(tokensRaw, m.darkPath);

    const lightHsl = hexToHslTriplet(lightHex);
    const darkHsl = hexToHslTriplet(darkHex);

    if (!lightHsl || !darkHsl) {
      throw new Error(`[tokens] failed to convert hex→hsl for "${m.shadcnVar}"`);
    }

    lightLines.push(`  --${m.shadcnVar}: ${lightHsl}; /* ${m.comment} */`);
    darkLines.push(`  --${m.shadcnVar}: ${darkHsl}; /* ${m.comment} */`);
  }

  // Raw helper vars (both :root and .dark)
  const rawPrimaryLight = requireHex(tokensRaw, "themes.light.colors.brand.primary.value");
  const rawPrimaryDark = requireHex(tokensRaw, "themes.dark.colors.brand.primary.value");

  const rawOnPrimaryLight = requireHex(tokensRaw, "themes.light.colors.brand.onPrimary.value");
  const rawOnPrimaryDark = requireHex(tokensRaw, "themes.dark.colors.brand.onPrimary.value");

  const primaryHslLight = hexToHslTriplet(rawPrimaryLight);
  const primaryHslDark = hexToHslTriplet(rawPrimaryDark);

  const onPrimaryHslLight = hexToHslTriplet(rawOnPrimaryLight);
  const onPrimaryHslDark = hexToHslTriplet(rawOnPrimaryDark);

  if (!primaryHslLight || !primaryHslDark) {
    throw new Error(`[tokens] failed to convert hex→hsl for "rd-brand-primary"`);
  }
  if (!onPrimaryHslLight || !onPrimaryHslDark) {
    throw new Error(`[tokens] failed to convert hex→hsl for "rd-brand-on-primary"`);
  }

  const cardRadius = getByPath(tokensRaw, "layout.radii.card.value");
  const radiusPx = typeof cardRadius === "number" ? `${cardRadius}px` : "16px";

  lightLines.push("");
  lightLines.push("  /* Rodia Raw Tokens (helpers) */");
  lightLines.push(`  --rd-brand-primary-hex: ${rawPrimaryLight};`);
  lightLines.push(`  --rd-brand-primary-hsl: ${primaryHslLight};`);
  lightLines.push(`  --rd-brand-on-primary-hex: ${rawOnPrimaryLight};`);
  lightLines.push(`  --rd-brand-on-primary-hsl: ${onPrimaryHslLight};`);
  lightLines.push(`  --rd-radius-card: ${radiusPx};`);

  const lightColorVars = collectThemeColorVars(getByPath(tokensRaw, "themes.light.colors"));
  if (lightColorVars.length > 0) {
    lightLines.push("");
    lightLines.push("  /* Rodia Theme Color Tokens (raw hex) */");
    for (const item of lightColorVars) {
      lightLines.push(`  ${item.varName}: ${item.value}; /* ${item.tokenPath} */`);
    }
  }

  const paletteVars = collectHexVars(getByPath(tokensRaw, "palette"), "rd-palette", ["palette"]);
  if (paletteVars.length > 0) {
    lightLines.push("");
    lightLines.push("  /* Rodia Palette Tokens (raw hex) */");
    for (const item of paletteVars) {
      lightLines.push(`  ${item.varName}: ${item.value}; /* ${item.tokenPath} */`);
    }
  }
  lightLines.push("}");

  darkLines.push("");
  darkLines.push("  /* Rodia Raw Tokens (helpers) */");
  darkLines.push(`  --rd-brand-primary-hex: ${rawPrimaryDark};`);
  darkLines.push(`  --rd-brand-primary-hsl: ${primaryHslDark};`);
  darkLines.push(`  --rd-brand-on-primary-hex: ${rawOnPrimaryDark};`);
  darkLines.push(`  --rd-brand-on-primary-hsl: ${onPrimaryHslDark};`);
  darkLines.push(`  --rd-radius-card: ${radiusPx};`);

  const darkColorVars = collectThemeColorVars(getByPath(tokensRaw, "themes.dark.colors"));
  if (darkColorVars.length > 0) {
    darkLines.push("");
    darkLines.push("  /* Rodia Theme Color Tokens (raw hex) */");
    for (const item of darkColorVars) {
      darkLines.push(`  ${item.varName}: ${item.value}; /* ${item.tokenPath} */`);
    }
  }
  darkLines.push("}");

  return `${lightLines.join("\n")}\n\n${darkLines.join("\n")}\n`;
}

function emitThemeJs(tokens: RodiaTokens) {
  const json = JSON.stringify(tokens, null, 2);
  return `/* eslint-disable */
// AUTO-GENERATED by build:tokens. Do not edit directly.

export const rodiaTheme = ${json};

`;
}

function emitThemeDts() {
  return `/* eslint-disable */
// AUTO-GENERATED by build:tokens. Do not edit directly.

export type ColorToken = { readonly value: string } & { readonly [k: string]: unknown };

export type ThemeColors = {
  readonly bg: {
    readonly main: ColorToken;
    readonly surfaceAlt: ColorToken;
    readonly [k: string]: unknown;
  };
  readonly text: {
    readonly main: ColorToken;
    readonly [k: string]: unknown;
  };
  readonly brand: {
    readonly primary: ColorToken;
    readonly secondary: ColorToken;
    readonly accent: ColorToken;
    readonly onPrimary: ColorToken;
    readonly [k: string]: unknown;
  };
  readonly border: {
    readonly default: ColorToken;
    readonly [k: string]: unknown;
  };
  readonly semantic: {
    readonly danger: ColorToken;
    readonly [k: string]: unknown;
  };
  readonly [k: string]: unknown;
};

export type Theme = {
  readonly colors: ThemeColors;
  readonly [k: string]: unknown;
};

export type RodiaTheme = {
  readonly themes: {
    readonly light: Theme;
    readonly dark: Theme;
    readonly [k: string]: unknown;
  };
  readonly layout?: unknown;
  readonly typography?: unknown;
  readonly elevation?: unknown;
  readonly [k: string]: unknown;
};

export declare const rodiaTheme: RodiaTheme;
`;
}

function emitIndexJs() {
  return `/* eslint-disable */
// AUTO-GENERATED by build:tokens. Do not edit directly.

export { rodiaTheme } from "./theme.js";

`;
}

function emitIndexDts() {
  return `/* eslint-disable */
// AUTO-GENERATED by build:tokens. Do not edit directly.

export { rodiaTheme } from "./theme.js";
export type { RodiaTheme } from "./theme.js";

`;
}

function emitWebTokensJs() {
  return `/* eslint-disable */
// AUTO-GENERATED by build:tokens. Do not edit directly.

export const shadcnColors = {
  border: "hsl(var(--border) / <alpha-value>)",
  background: "hsl(var(--background) / <alpha-value>)",
  foreground: "hsl(var(--foreground) / <alpha-value>)",
  primary: {
    DEFAULT: "hsl(var(--primary) / <alpha-value>)",
    foreground: "hsl(var(--primary-foreground) / <alpha-value>)"
  },
  secondary: {
    DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
    foreground: "hsl(var(--secondary-foreground) / <alpha-value>)"
  },
  accent: {
    DEFAULT: "hsl(var(--accent) / <alpha-value>)",
    foreground: "hsl(var(--accent-foreground) / <alpha-value>)"
  },
  destructive: {
    DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
    foreground: "hsl(var(--destructive-foreground) / <alpha-value>)"
  },
  muted: {
    DEFAULT: "hsl(var(--muted) / <alpha-value>)",
    foreground: "hsl(var(--muted-foreground) / <alpha-value>)"
  },
  card: {
    DEFAULT: "hsl(var(--card) / <alpha-value>)",
    foreground: "hsl(var(--card-foreground) / <alpha-value>)"
  },
  popover: {
    DEFAULT: "hsl(var(--popover) / <alpha-value>)",
    foreground: "hsl(var(--popover-foreground) / <alpha-value>)"
  },
  input: "hsl(var(--input) / <alpha-value>)",
  ring: "hsl(var(--ring) / <alpha-value>)"
};

`;
}

function emitWebTokensDts() {
  return `/* eslint-disable */
// AUTO-GENERATED by build:tokens. Do not edit directly.

export declare const shadcnColors: {
  readonly border: string;
  readonly background: string;
  readonly foreground: string;
  readonly primary: { readonly DEFAULT: string; readonly foreground: string };
  readonly secondary: { readonly DEFAULT: string; readonly foreground: string };
  readonly accent: { readonly DEFAULT: string; readonly foreground: string };
  readonly destructive: { readonly DEFAULT: string; readonly foreground: string };
  readonly muted: { readonly DEFAULT: string; readonly foreground: string };
  readonly card: { readonly DEFAULT: string; readonly foreground: string };
  readonly popover: { readonly DEFAULT: string; readonly foreground: string };
  readonly input: string;
  readonly ring: string;
};

`;
}

function writeFile(fp: string, content: string) {
  fs.writeFileSync(fp, content, "utf8");
}

function main() {
  ensureDir(DIST_DIR);

  const tokensRaw = readJson(SRC_JSON);
  const tokens = parseTokens(tokensRaw);

  writeFile(path.join(DIST_DIR, "index.css"), emitCss(tokensRaw));

  writeFile(path.join(DIST_DIR, "theme.js"), emitThemeJs(tokens));
  writeFile(path.join(DIST_DIR, "theme.d.ts"), emitThemeDts());

  writeFile(path.join(DIST_DIR, "index.js"), emitIndexJs());
  writeFile(path.join(DIST_DIR, "index.d.ts"), emitIndexDts());

  writeFile(path.join(DIST_DIR, "web-tokens.js"), emitWebTokensJs());
  writeFile(path.join(DIST_DIR, "web-tokens.d.ts"), emitWebTokensDts());

  // eslint-disable-next-line no-console
  console.log("[tokens] generated dist: index.css, theme.js/.d.ts, index.js/.d.ts, web-tokens.js/.d.ts");
}

main();

/*
- brand.onPrimary를 HSL helper(--rd-brand-on-primary-hsl)로 생성하고, shadcn primary-foreground까지 SoT에서 출력합니다.
- web에서 하드코딩 없이 버튼 텍스트(white 등)를 tokens로만 결정할 수 있어 모바일(AppButton)과 일치합니다.
- theme.d.ts에 onPrimary를 추가해 RN 테마 코드가 any 없이도 안전하게 접근 가능해집니다.
*/
