import React, { useCallback, useMemo, useState } from "react";
import {
  StyleSheet,
  TextInput,
  type TextInputProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
  View,
} from "react-native";
import { useAppTheme, createThemedStyles } from "../../theme/useAppTheme";
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
    const colors = theme?.colors;
    if (hasError) return colors?.semanticDanger ?? "#EF4444";
    if (focused) return colors?.brandAccent ?? "#00E5A8";
    return colors?.borderDefault ?? "#E2E8F0";
  }, [theme?.colors, hasError, focused]);

  const bgColor = theme?.colors?.bgSurfaceAlt ?? "#F1F5F9";
  const textColor = theme?.colors?.textMain ?? "#0F172A";
  const phColor = placeholderTextColor ?? (theme?.colors?.borderDefault ?? "#94A3B8");

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
        <AppText variant="caption" weight="700" color="textMain" style={styles.label}>
          {label}
        </AppText>
      ) : null}

      <View
        style={[
          styles.inputShell,
          {
            backgroundColor: bgColor,
            borderColor,
            opacity: isEditable ? 1 : 0.5,
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
        <AppText variant="caption" color="borderDefault" style={styles.helper}>
          {helperText}
        </AppText>
      ) : null}
    </View>
  );
}

const useStyles = createThemedStyles((_theme) => {
  return StyleSheet.create({
    root: {
      width: "100%",
      gap: 6,
    },
    label: {
      marginLeft: 2,
    },
    inputShell: {
      minHeight: 40,
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    input: {
      flex: 1,
      paddingVertical: 10,
      fontSize: 14,
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
