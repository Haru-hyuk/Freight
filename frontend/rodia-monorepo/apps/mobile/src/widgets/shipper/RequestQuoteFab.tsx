import React from "react";
import { Platform, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { safeNumber, safeString } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";

type RequestQuoteFabProps = {
  onPress: () => void;
  accessibilityLabel?: string;
};

const FAB_PRESSED = { transform: [{ scale: 0.95 }] } as const;

const useStyles = createThemedStyles((theme) => {
  const spacing = safeNumber(theme?.layout?.spacing?.base, 4);
  const radiusControl = safeNumber(theme?.layout?.radii?.control, 12);
  const size = safeNumber(theme?.components?.button?.sizes?.lg?.minHeight, 52) + spacing;

  const cText = safeString(theme?.colors?.textMain, "#111827");

  return StyleSheet.create({
    fab: {
      width: size,
      height: size,
      borderRadius: radiusControl + spacing,
      alignItems: "center",
      justifyContent: "center",
      ...Platform.select({
        ios: {
          shadowColor: cText,
          shadowOpacity: 0.16,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
        },
        android: { elevation: 6 },
      }),
    },
  });
});

export function RequestQuoteFab({ onPress, accessibilityLabel = "견적 요청 생성" }: RequestQuoteFabProps) {
  const styles = useStyles();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  const cPrimary = safeString(theme?.colors?.brandPrimary, "#FF6A00");
  const cOnBrand = safeString(theme?.colors?.textOnBrand, "#FFFFFF");
  const bottomInset = Math.max(0, safeNumber(insets?.bottom, 0));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.fab,
        { backgroundColor: cPrimary, marginBottom: Math.max(8, bottomInset + 2), marginRight: 2 },
        pressed ? FAB_PRESSED : undefined,
      ]}
    >
      <Ionicons name="add" size={26} color={cOnBrand} />
    </Pressable>
  );
}

export default RequestQuoteFab;
