import { z } from "zod";

const HexColor = z
  .string()
  .transform((s) => s.trim())
  .refine((s) => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s), {
    message: "Color must be #RGB or #RRGGBB hex"
  });

const ColorToken = z.object({
  value: HexColor
});

const ThemeColors = z.object({
  bg: z.object({
    main: ColorToken,
    surfaceAlt: ColorToken
  }),
  text: z.object({
    main: ColorToken
  }),
  brand: z.object({
    primary: ColorToken,
    secondary: ColorToken,
    accent: ColorToken,
    onPrimary: ColorToken
  }),
  border: z.object({
    default: ColorToken
  }),
  semantic: z.object({
    danger: ColorToken
  })
});

const Theme = z.object({
  colors: ThemeColors
});

const TokensSchema = z.object({
  themes: z.object({
    light: Theme,
    dark: Theme
  }),
  layout: z
    .object({
      radii: z
        .object({
          card: z.object({ value: z.number().nonnegative() })
        })
        .optional()
    })
    .optional(),
  typography: z
    .object({
      scale: z
        .object({
          heading: z.object({
            size: z.number().positive(),
            weight: z.string().min(1)
          }),
          body: z.object({
            size: z.number().positive(),
            weight: z.string().min(1)
          })
        })
        .optional()
    })
    .optional(),
  elevation: z.any().optional()
});

export type RodiaTokens = z.infer<typeof TokensSchema>;

export function parseTokens(input: unknown): RodiaTokens {
  const result = TokensSchema.safeParse(input);
  if (!result.success) {
    const message =
      result.error?.issues
        ?.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("\n") || "Invalid tokens schema";
    throw new Error(`[tokens] schema validation failed:\n${message}`);
  }
  return result.data;
}
