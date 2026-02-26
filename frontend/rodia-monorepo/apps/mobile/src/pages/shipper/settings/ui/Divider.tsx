import React, { useMemo } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import type { AppTheme } from "@/shared/theme/types";
import { useAppTheme } from "@/shared/theme/useAppTheme";

type DividerProps = {
  style?: StyleProp<ViewStyle>;
};

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    divider: {
      height: 1,
      backgroundColor: theme.colors.borderDefault,
      width: "100%",
    },
  });
}

export function Divider({ style }: DividerProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return <View style={[styles.divider, style]} />;
}

export default Divider;

