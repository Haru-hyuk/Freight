import type { ScrollViewProps, ViewStyle } from "react-native";
import { safeNumber } from "@/shared/theme/colorUtils";
import type { AppTheme } from "@/shared/theme/types";

export const QUOTE_PRESS_EFFECT: ViewStyle = { opacity: 0.92, transform: [{ scale: 0.98 }] };

export const QUOTE_SCROLL_VIEW_PROPS: Pick<
  ScrollViewProps,
  "showsVerticalScrollIndicator" | "overScrollMode" | "keyboardShouldPersistTaps"
> = {
  showsVerticalScrollIndicator: false,
  overScrollMode: "never",
  keyboardShouldPersistTaps: "handled",
};

export const QUOTE_PROGRESS_TOKENS = {
  circleSize: 30,
  lineHeight: 3,
} as const;

export function getQuoteFlatCardStyle(theme: AppTheme): ViewStyle {
  return {
    backgroundColor: theme.colors.bgSurface,
    borderRadius: safeNumber(theme.layout.radii.card, 16),
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
  };
}
