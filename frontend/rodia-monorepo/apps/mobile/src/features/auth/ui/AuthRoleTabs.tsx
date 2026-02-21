// apps/mobile/src/features/auth/ui/AuthRoleTabs.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppText } from "@/shared/ui/kit/AppText";
import type { AuthUserRole } from "@/features/auth/model/auth.types";

type Props = {
  role: AuthUserRole;
  onChange: (role: AuthUserRole) => void;
  disabled?: boolean;
  onBeforeChange?: () => void;
};

const useStyles = createThemedStyles((t) =>
  StyleSheet.create({
    roleTabContainer: {
      flexDirection: "row",
      gap: t.layout.spacing.base / 2,
      backgroundColor: t.colors.bgSurfaceAlt,
      borderRadius: t.layout.radii.control,
      borderWidth: 1,
      borderColor: t.colors.borderDefault,
      padding: t.layout.spacing.base / 2,
      position: "relative",
    },
    highlight: {
      position: "absolute",
      top: t.layout.spacing.base / 2,
      bottom: t.layout.spacing.base / 2,
      left: t.layout.spacing.base / 2,
      backgroundColor: t.colors.bgSurface,
      borderRadius: t.layout.radii.control,
      borderWidth: 1,
      borderColor: t.colors.borderDefault,
      ...t.elevation.iosCardRaised,
      ...t.elevation.androidCardRaised,
    },
    roleTabButton: {
      flex: 1,
      minHeight: t.components.button.sizes.md.minHeight,
      borderRadius: t.layout.radii.control,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: t.layout.spacing.base * 2,
      paddingVertical: t.layout.spacing.base * 2,
    },
    roleTabButtonPressed: {
      backgroundColor: t.colors.stateOverlayPressed,
    },
    roleTabButtonDisabled: {
      opacity: 0.95,
    },
    roleTabText: {
      color: t.colors.textSub,
      fontWeight: "600",
    },
    roleTabTextActive: {
      color: t.colors.brandPrimary,
      fontWeight: "800",
    },
    roleTabTextDisabled: {
      color: t.colors.stateDisabledText,
    },
    containerDisabled: {
      backgroundColor: t.colors.stateDisabledBg,
      borderColor: t.colors.stateDisabledBorder,
    },
  })
);

export function AuthRoleTabs({ role, onChange, disabled = false, onBeforeChange }: Props) {
  const s = useStyles();
  const theme = useAppTheme();
  const [containerWidth, setContainerWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;

  const gap = theme.layout.spacing.base / 2;
  const padding = theme.layout.spacing.base / 2;

  const highlightWidth = useMemo(() => {
    if (containerWidth <= 0) return 0;
    const inner = Math.max(0, containerWidth - padding * 2);
    return Math.max(0, (inner - gap) / 2);
  }, [containerWidth, gap, padding]);

  const targetX = useMemo(() => {
    if (!highlightWidth) return 0;
    return role === "driver" ? highlightWidth + gap : 0;
  }, [gap, highlightWidth, role]);

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: targetX,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [targetX, translateX]);

  const handlePress = useCallback(
    (nextRole: AuthUserRole) => {
      if (disabled || nextRole === role) return;
      onBeforeChange?.();
      onChange(nextRole);
    },
    [disabled, onBeforeChange, onChange, role]
  );

  const highlightStyle = useMemo(() => {
    if (!highlightWidth || disabled) return undefined;
    return [
      s.highlight,
      {
        width: highlightWidth,
        transform: [{ translateX }],
      },
    ];
  }, [disabled, highlightWidth, s.highlight, translateX]);

  const shipperTextStyle = disabled
    ? s.roleTabTextDisabled
    : role === "shipper"
    ? s.roleTabTextActive
    : s.roleTabText;
  const driverTextStyle = disabled ? s.roleTabTextDisabled : role === "driver" ? s.roleTabTextActive : s.roleTabText;

  return (
    <View
      style={[s.roleTabContainer, disabled && s.containerDisabled]}
      onLayout={(e) => setContainerWidth(e?.nativeEvent?.layout?.width ?? 0)}
    >
      {highlightStyle ? <Animated.View pointerEvents="none" style={highlightStyle} /> : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled, selected: role === "shipper" }}
        style={({ pressed }) => [
          s.roleTabButton,
          pressed && !disabled ? s.roleTabButtonPressed : undefined,
          disabled ? s.roleTabButtonDisabled : undefined,
        ]}
        onPress={() => handlePress("shipper")}
        disabled={disabled}
      >
        <AppText variant="detail" style={shipperTextStyle}>
          화주
        </AppText>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled, selected: role === "driver" }}
        style={({ pressed }) => [
          s.roleTabButton,
          pressed && !disabled ? s.roleTabButtonPressed : undefined,
          disabled ? s.roleTabButtonDisabled : undefined,
        ]}
        onPress={() => handlePress("driver")}
        disabled={disabled}
      >
        <AppText variant="detail" style={driverTextStyle}>
          기사
        </AppText>
      </Pressable>
    </View>
  );
}
