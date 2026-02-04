import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  type StyleProp,
  StyleSheet,
  type TextStyle,
  type ViewStyle,
  View,
} from "react-native";
import { useAppTheme, createThemedStyles } from "../../theme/useAppTheme";
import { AppText } from "./AppText";

export type AppButtonVariant = "primary" | "secondary" | "destructive";
export type AppButtonSize = "sm" | "md" | "lg" | "icon";

export type AppButtonProps = Omit<PressableProps, "style" | "children"> & {
  title?: string;
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  loading?: boolean;
  left?: React.ReactNode;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  children?: React.ReactNode;
};

export function AppButton({
  title,
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  left,
  right,
  style,
  contentStyle,
  textStyle,
  children,
  ...props
}: AppButtonProps) {
  const theme = useAppTheme();
  const styles = useStyles();

  const isDisabled = !!disabled || !!loading;

  const palette = useMemo(() => {
    const colors = theme?.colors;
    const bgMain = colors?.bgMain ?? "#F8FAFC";
    const surface = colors?.bgSurfaceAlt ?? "#F1F5F9";
    const border = colors?.borderDefault ?? "#E2E8F0";
    const textMain = colors?.textMain ?? "#0F172A";
    const danger = colors?.semanticDanger ?? "#EF4444";

    const primaryBg = colors?.brandPrimary ?? "#FF6A00";
    const primaryFg = colors?.textOnBrand ?? "#FFFFFF";

    if (variant === "secondary") {
      return {
        bg: surface,
        fg: textMain,
        border,
        spinner: textMain,
      };
    }

    if (variant === "destructive") {
      return {
        bg: danger,
        fg: "#FFFFFF",
        border: danger,
        spinner: "#FFFFFF",
      };
    }

    return {
      bg: primaryBg,
      fg: primaryFg,
      border: primaryBg,
      spinner: primaryFg,
    };
  }, [theme?.colors, variant]);

  const sizeStyle = useMemo<ViewStyle>(() => {
    if (size === "sm") return { height: 36, paddingHorizontal: 12, borderRadius: 12 };
    if (size === "lg") return { height: 44, paddingHorizontal: 18, borderRadius: 14 };
    if (size === "icon") return { height: 40, width: 40, paddingHorizontal: 0, borderRadius: 12 };
    return { height: 40, paddingHorizontal: 16, borderRadius: 12 };
  }, [size]);

  const labelSize = useMemo<"body" | "caption">(() => (size === "sm" || size === "icon" ? "caption" : "body"), [size]);

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      {...props}
      style={({ pressed }) => [
        styles.buttonBase,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity: isDisabled ? 0.5 : pressed ? 0.9 : 1,
        },
        sizeStyle,
        variant === "secondary" ? styles.secondaryOutline : null,
        style as any,
      ]}
    >
      <View style={[styles.content, contentStyle as any]}>
        {left ? <View style={styles.side}>{left}</View> : null}

        {loading ? (
          <ActivityIndicator size="small" color={palette.spinner} />
        ) : title ? (
          <AppText variant={labelSize} weight="700" color={palette.fg} style={textStyle as any}>
            {title}
          </AppText>
        ) : (
          children
        )}

        {right ? <View style={styles.side}>{right}</View> : null}
      </View>
    </Pressable>
  );
}

const useStyles = createThemedStyles((_theme) => {
  return {
    buttonBase: {
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    secondaryOutline: {
      // secondary는 표면색 + 기본 보더
    },
    content: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    side: {
      alignItems: "center",
      justifyContent: "center",
    },
  };
});
