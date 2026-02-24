import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { isMockMode } from "@/shared/lib/config/env";
import { tint } from "@/shared/theme/colorUtils";
import { createThemedStyles } from "@/shared/theme/useAppTheme";
import { AppText } from "@/shared/ui/kit/AppText";

declare const __DEV__: boolean;

type Props = {
  onFill: () => void;
  label?: string;
};

const useStyles = createThemedStyles((theme) =>
  StyleSheet.create({
    root: {
      alignItems: "flex-end",
    },
    button: {
      minHeight: 28,
      borderRadius: 999,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: tint(theme.colors.brandPrimary, 0.45, theme.colors.borderDefault),
      backgroundColor: tint(theme.colors.brandPrimary, 0.1, theme.colors.bgSurface),
      paddingHorizontal: theme.layout.spacing.base * 2,
      paddingVertical: theme.layout.spacing.base,
      justifyContent: "center",
      alignItems: "center",
    },
    buttonPressed: {
      opacity: 0.84,
    },
    label: {
      color: theme.colors.brandPrimary,
      letterSpacing: 0.2,
    },
  })
);

function canRenderMockAutofill() {
  const isDevRuntime = typeof __DEV__ !== "undefined" && __DEV__;
  return isDevRuntime && isMockMode();
}

export function MockAutofillButton({ onFill, label = "Fill Mock" }: Props) {
  const styles = useStyles();

  if (!canRenderMockAutofill()) {
    return null;
  }

  return (
    <View style={styles.root}>
      <Pressable accessibilityRole="button" onPress={onFill} style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
        <AppText variant="caption" weight="700" style={styles.label}>
          {label}
        </AppText>
      </Pressable>
    </View>
  );
}

export default MockAutofillButton;
