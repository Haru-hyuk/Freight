// apps/mobile/src/shared/ui/kit/BottomNavButton.tsx
import React, { useMemo } from "react";
import { Pressable, StyleSheet, View, type TextStyle, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { safeString, tint } from "@/shared/theme/colorUtils";
import { useAppTheme } from "../../theme/useAppTheme";
import { AppText } from "./AppText";

type BottomNavButtonProps = {
  label: string;
  active: boolean;
  iconActive: keyof typeof Ionicons.glyphMap;
  iconInactive: keyof typeof Ionicons.glyphMap;
  onPress: () => void;

  testID?: string;
  accessibilityLabel?: string;

  activeIconColor?: string;
  inactiveIconColor?: string;
  activeTextColor?: string;
  inactiveTextColor?: string;

  hitSlop?: number;
};

const PRESSED: ViewStyle = { opacity: 0.85 };

export function BottomNavButton(props: BottomNavButtonProps) {
  const theme = useAppTheme();

  const textMain = safeString(theme?.colors?.textMain, "#111827");
  const primary = safeString(theme?.colors?.brandPrimary, "#FF6A00");

  const defaultInactive = useMemo(() => tint(textMain, 0.55, "rgba(17,24,39,0.55)"), [textMain]);

  const iconColor = props.active
    ? safeString(props.activeIconColor, primary)
    : safeString(props.inactiveIconColor, defaultInactive);

  const labelColor = props.active
    ? safeString(props.activeTextColor, textMain)
    : safeString(props.inactiveTextColor, defaultInactive);

  const styles = useMemo(() => createStyles(), []);

  return (
    <Pressable
      testID={props.testID}
      onPress={props.onPress}
      hitSlop={props.hitSlop ?? 8}
      accessibilityRole="tab"
      accessibilityState={{ selected: props.active }}
      accessibilityLabel={props.accessibilityLabel ?? props.label}
      style={({ pressed }) => [styles.root, pressed ? PRESSED : undefined]}
    >
      <Ionicons name={props.active ? props.iconActive : props.iconInactive} size={22} color={iconColor} />
      <AppText variant="caption" weight="800" color={labelColor} style={styles.label}>
        {props.label}
      </AppText>
    </Pressable>
  );
}

function createStyles() {
  return StyleSheet.create({
    root: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 8,
    },
    label: {
      marginTop: 4,
    } as TextStyle,
  });
}

/*
요약(3줄)
- 바텀 네비 “버튼 1개”를 BottomNavButton으로 분리해 홈/다른 화면에서 재사용 가능하게 했습니다.
- 색상은 useAppTheme 기반(옵션으로 override 가능)이고, pressed/접근성(tab role/selected) 규칙을 고정했습니다.
- 기존 home.tsx의 BottomNavItem 호출만 BottomNavButton으로 교체하면 됩니다.
*/
