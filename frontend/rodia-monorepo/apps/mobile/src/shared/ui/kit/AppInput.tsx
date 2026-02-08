import React, { useCallback, useMemo, useState } from "react";
import {
  StyleSheet,
  TextInput,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
  View,
} from "react-native";
import { createThemedStyles, useAppTheme } from "../../theme/useAppTheme";
import { AppText } from "./AppText";

export type AppInputProps = Omit<TextInputProps, "style"> & {
  label?: string;
  helperText?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  left?: React.ReactNode;
  right?: React.ReactNode;
};

export function AppInput({
  label,
  helperText,
  error,
  containerStyle,
  inputStyle,
  left,
  right,
  editable,
  onFocus,
  onBlur,
  placeholderTextColor,
  ...props
}: AppInputProps) {
  const theme = useAppTheme();
  const styles = useStyles();
  const [focused, setFocused] = useState(false);

  const isEditable = editable ?? true;
  const hasError = !!error?.trim();

  const borderColor = useMemo(() => {
    const colors = theme.colors;
    if (!isEditable) return colors.stateDisabledBorder;
    if (hasError) return colors.semanticDanger;
    if (focused) return colors.brandPrimary;
    return colors.borderDefault;
  }, [theme.colors, focused, hasError, isEditable]);

  const bgColor = isEditable ? theme.colors.bgSurface : theme.colors.stateDisabledBg;
  const textColor = isEditable ? theme.colors.textMain : theme.colors.stateDisabledText;
  const phColor = placeholderTextColor ?? theme.colors.textMuted;

  const handleFocus = useCallback(
    (e: any) => {
      setFocused(true);
      onFocus?.(e);
    },
    [onFocus]
  );

  const handleBlur = useCallback(
    (e: any) => {
      setFocused(false);
      onBlur?.(e);
    },
    [onBlur]
  );

  return (
    <View style={[styles.root, containerStyle as any]}>
      {label ? (
        <AppText variant="caption" weight="700" color="textSub" style={styles.label}>
          {label}
        </AppText>
      ) : null}

      <View
        style={[
          styles.inputShell,
          {
            backgroundColor: bgColor,
            borderColor,
          },
        ]}
      >
        {left ? <View style={styles.adornment}>{left}</View> : null}

        <TextInput
          {...props}
          editable={isEditable}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={phColor}
          style={[styles.input, { color: textColor }, inputStyle as any]}
        />

        {right ? <View style={styles.adornment}>{right}</View> : null}
      </View>

      {hasError ? (
        <AppText variant="caption" color="semanticDanger" style={styles.helper}>
          {error}
        </AppText>
      ) : helperText ? (
        <AppText variant="caption" color="textMuted" style={styles.helper}>
          {helperText}
        </AppText>
      ) : null}
    </View>
  );
}

const useStyles = createThemedStyles((theme) => {
  const minHeight = theme.components.button.sizes.md.minHeight;
  const radius = theme.layout.radii.control;
  const padX = Math.max(12, theme.layout.spacing.base * 3);

  return StyleSheet.create({
    root: {
      width: "100%",
      gap: 6,
    },
    label: {
      marginLeft: 2,
    },
    inputShell: {
      minHeight,
      borderWidth: 1,
      borderRadius: radius,
      paddingHorizontal: padX,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    input: {
      flex: 1,
      paddingVertical: 10,
      fontSize: theme.typography.scale.detail.size,
      lineHeight: theme.typography.scale.detail.lineHeight,
      fontFamily: theme.typography.fontFamilyPrimary || undefined,
    },
    adornment: {
      alignItems: "center",
      justifyContent: "center",
    },
    helper: {
      marginLeft: 2,
    },
  });
});
