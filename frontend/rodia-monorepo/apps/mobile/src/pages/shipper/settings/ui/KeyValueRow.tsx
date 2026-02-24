import React, { useMemo } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import type { AppTheme } from "@/shared/theme/types";
import { useAppTheme } from "@/shared/theme/useAppTheme";
import { AppText } from "@/shared/ui/kit/AppText";

type KeyValueRowProps = {
  label: string;
  value?: string;
  style?: StyleProp<ViewStyle>;
};

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    row: {
      minHeight: 24,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    label: {
      minWidth: 96,
      color: theme.colors.textMuted,
    },
    value: {
      flex: 1,
      color: theme.colors.textMain,
      textAlign: "right",
    },
  });
}

export function KeyValueRow({ label, value, style }: KeyValueRowProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const safeValue = String(value ?? "").trim() || "-";

  return (
    <View style={[styles.row, style]}>
      <AppText variant="detail" style={styles.label}>
        {label}
      </AppText>
      <AppText variant="detail" weight="700" style={styles.value}>
        {safeValue}
      </AppText>
    </View>
  );
}

export default KeyValueRow;

