import React, { useMemo } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import type { AppTheme } from "@/shared/theme/types";
import { useAppTheme } from "@/shared/theme/useAppTheme";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppText } from "@/shared/ui/kit/AppText";

type SettingSectionProps = {
  title: string;
  description?: string;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    section: {
      marginBottom: 16,
      borderRadius: 16,
      overflow: "hidden",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: 16,
      gap: 12,
    },
    titleWrap: {
      flex: 1,
      gap: 4,
    },
    title: {
      color: theme.colors.textMain,
    },
    description: {
      color: theme.colors.textMuted,
    },
    body: {
      paddingHorizontal: 16,
      paddingBottom: 16,
      paddingTop: 12,
      gap: 10,
    },
  });
}

export function SettingSection({ title, description, right, style, children }: SettingSectionProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <AppCard outlined elevated={false} style={[styles.section, style]}>
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <AppText variant="heading" weight="800" style={styles.title}>
            {title}
          </AppText>
          {description ? (
            <AppText variant="detail" style={styles.description}>
              {description}
            </AppText>
          ) : null}
        </View>
        {right}
      </View>
      <View style={styles.body}>{children}</View>
    </AppCard>
  );
}

export default SettingSection;

