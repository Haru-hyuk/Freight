import { z } from "zod";

const HexColor = z
  .string()
  .transform((s) => s.trim())
  .refine((s) => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s), {
    message: "Color must be #RGB or #RRGGBB hex"
  });

const FontWeight = z.union([z.string().min(1), z.number().int().nonnegative()]);

const IOSShadowOffset = z
  .object({
    width: z.number().finite(),
    height: z.number().finite()
  })
  .passthrough();

const IOSCardRaised = z
  .object({
    shadowColor: z.string().min(1),
    shadowOpacity: z.number().finite(),
    shadowRadius: z.number().finite(),
    shadowOffset: IOSShadowOffset
  })
  .passthrough();

const AndroidCardRaised = z
  .object({
    elevation: z.number().finite()
  })
  .passthrough();

const ColorToken = z
  .object({
    value: HexColor
  })
  .passthrough();

const ThemeColors = z
  .object({
    bg: z
      .object({
        main: ColorToken,
        surfaceAlt: ColorToken
      })
      .passthrough(),
    text: z
      .object({
        main: ColorToken
      })
      .passthrough(),
    brand: z
      .object({
        primary: ColorToken,
        secondary: ColorToken,
        accent: ColorToken,
        onPrimary: ColorToken
      })
      .passthrough(),
    border: z
      .object({
        default: ColorToken
      })
      .passthrough(),
    semantic: z
      .object({
        danger: ColorToken
      })
      .passthrough()
  })
  .passthrough();

const Theme = z
  .object({
    colors: ThemeColors
  })
  .passthrough();

const TokensSchema = z
  .object({
    themes: z
      .object({
        light: Theme,
        dark: Theme
      })
      .passthrough(),
    layout: z
      .object({
        radii: z
          .object({
            card: z.object({ value: z.number().nonnegative() }).passthrough()
          })
          .passthrough()
          .optional()
      })
      .passthrough()
      .optional(),
    typography: z
      .object({
        scale: z
          .object({
            heading: z
              .object({
                size: z.number().positive(),
                weight: FontWeight
              })
              .passthrough(),
            body: z
              .object({
                size: z.number().positive(),
                weight: FontWeight
              })
              .passthrough()
          })
          .passthrough()
          .optional()
      })
      .passthrough()
      .optional(),
    elevation: z
      .object({
        app: z
          .object({
            ios: z
              .object({
                cardRaised: IOSCardRaised
              })
              .passthrough()
              .optional(),
            android: z
              .object({
                cardRaised: AndroidCardRaised
              })
              .passthrough()
              .optional()
          })
          .passthrough()
          .optional()
      })
      .passthrough()
      .optional()
  })
  .passthrough();

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
