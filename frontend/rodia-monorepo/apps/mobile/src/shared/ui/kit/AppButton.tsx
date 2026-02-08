import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native";
import { createThemedStyles, useAppTheme } from "../../theme/useAppTheme";
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
    const c = theme?.colors;
    const primary = c?.brandPrimary ?? "#FF6A00";
    const onPrimary = c?.textOnBrand ?? "#FFFFFF";
    const surface = c?.bgSurface ?? "#FFFFFF";
    const textMain = c?.textMain ?? "#111827";
    const border = c?.borderDefault ?? "#E2E8F0";
    const danger = c?.semanticDanger ?? "#EF4444";

    const disabledBg = c?.stateDisabledBg ?? "#E2E8F0";
    const disabledText = c?.stateDisabledText ?? "#94A3B8";
    const disabledBorder = c?.stateDisabledBorder ?? "#E2E8F0";
    const statePressedPrimary = c?.stateBrandPressed ?? primary;
    const statePressedOverlay = c?.stateOverlayPressed ?? border;

    if (variant === "secondary") {
      return {
        bg: surface,
        fg: textMain,
        border,
        spinner: textMain,
        pressedBg: statePressedOverlay,
        disabledBg,
        disabledFg: disabledText,
        disabledBorder,
      };
    }

    if (variant === "destructive") {
      return {
        bg: danger,
        fg: onPrimary,
        border: danger,
        spinner: onPrimary,
        pressedBg: danger,
        disabledBg,
        disabledFg: disabledText,
        disabledBorder,
      };
    }

    return {
      bg: primary,
      fg: onPrimary,
      border: primary,
      spinner: onPrimary,
      pressedBg: statePressedPrimary,
      disabledBg,
      disabledFg: disabledText,
      disabledBorder,
    };
  }, [theme?.colors, variant]);

  const sizeStyle = useMemo<ViewStyle>(() => {
    const token = theme?.components?.button?.sizes;
    const sm = token?.sm ?? { minHeight: 36, paddingX: 12, paddingY: 10, radius: 12 };
    const md = token?.md ?? { minHeight: 44, paddingX: 16, paddingY: 12, radius: 12 };
    const lg = token?.lg ?? { minHeight: 52, paddingX: 20, paddingY: 14, radius: 12 };
    const resolved = size === "sm" ? sm : size === "lg" ? lg : md;

    if (size === "icon") {
      return {
        minHeight: resolved.minHeight,
        width: resolved.minHeight,
        borderRadius: resolved.radius,
        paddingHorizontal: 0,
        paddingVertical: 0,
      };
    }

    return {
      minHeight: resolved.minHeight,
      borderRadius: resolved.radius,
      paddingHorizontal: resolved.paddingX,
      paddingVertical: resolved.paddingY,
    };
  }, [size, theme?.components?.button?.sizes]);

  const labelVariant = useMemo<"caption" | "detail" | "body">(() => {
    if (size === "sm" || size === "icon") return "caption";
    if (size === "lg") return "body";
    return "detail";
  }, [size]);

  const labelColor = isDisabled ? palette.disabledFg : palette.fg;
  const spinnerColor = isDisabled ? palette.disabledFg : palette.spinner;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      {...props}
      style={({ pressed }) => [
        styles.buttonBase,
        {
          backgroundColor: isDisabled ? palette.disabledBg : pressed ? palette.pressedBg : palette.bg,
          borderColor: isDisabled ? palette.disabledBorder : palette.border,
          transform: !isDisabled && pressed ? [{ scale: 0.98 }] : undefined,
        },
        sizeStyle,
        style as any,
      ]}
    >
      <View style={[styles.content, contentStyle as any]}>
        {left ? <View style={styles.side}>{left}</View> : null}

        {loading ? (
          <ActivityIndicator size="small" color={spinnerColor} />
        ) : title ? (
          <AppText variant={labelVariant} weight="700" color={labelColor} style={textStyle as any}>
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

const useStyles = createThemedStyles((theme) => {
  const gap = Math.max(8, theme.layout.spacing.base * 2);

  return {
    buttonBase: {
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    content: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap,
    },
    side: {
      alignItems: "center",
      justifyContent: "center",
    },
  };
});
