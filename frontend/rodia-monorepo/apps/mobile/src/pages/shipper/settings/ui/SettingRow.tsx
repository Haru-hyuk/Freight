import React, { useMemo } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { AppTheme } from "@/shared/theme/types";
import { useAppTheme } from "@/shared/theme/useAppTheme";
import { AppText } from "@/shared/ui/kit/AppText";

type SettingRowProps = {
  title: string;
  subtitle?: string;
  trailingText?: string;
  showChevron?: boolean;
  danger?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    row: {
      minHeight: 56,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: theme.colors.bgSurface,
    },
    rowPressed: {
      backgroundColor: theme.colors.stateOverlayPressed,
    },
    body: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    title: {
      color: theme.colors.textMain,
    },
    titleDanger: {
      color: theme.colors.semanticDanger,
    },
    subtitle: {
      color: theme.colors.textMuted,
    },
    trailingText: {
      color: theme.colors.textSub,
      textAlign: "right",
      maxWidth: 140,
    },
    chevron: {
      color: theme.colors.textMuted,
      fontSize: 16,
    },
  });
}

export function SettingRow({
  title,
  subtitle,
  trailingText,
  showChevron = true,
  danger = false,
  disabled = false,
  onPress,
  style,
}: SettingRowProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isDisabled = disabled || !onPress;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [styles.row, style, !isDisabled && pressed && styles.rowPressed]}
    >
      <View style={styles.body}>
        <AppText variant="body" weight="700" style={danger ? styles.titleDanger : styles.title}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" style={styles.subtitle}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {trailingText ? (
        <AppText variant="detail" weight="700" style={styles.trailingText}>
          {trailingText}
        </AppText>
      ) : null}
      {showChevron ? <Ionicons name="chevron-forward" style={styles.chevron} /> : null}
    </Pressable>
  );
}

export default SettingRow;

