// apps/mobile/src/shared/ui/kit/DebugOpenButton.tsx
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";

import { isApiDebugLogsEnabled } from "@/shared/lib/config/env";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { safeNumber, tint } from "@/shared/theme/colorUtils";
import { AppText } from "@/shared/ui/kit/AppText";

const useStyles = createThemedStyles((theme) => {
  const spacing = safeNumber(theme.layout.spacing.base, 4);

  return StyleSheet.create({
    root: {
      pointerEvents: "box-none",
    },
    button: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: spacing * 3,
      paddingVertical: spacing * 2,
    },
    icon: {
      fontSize: 18,
    },
    text: {
      fontSize: safeNumber(theme.typography.scale.caption.size, 12),
      lineHeight: safeNumber(theme.typography.scale.caption.lineHeight, 16),
      fontWeight: "900",
      letterSpacing: -0.2,
    },
  });
});

export function DebugOpenButton() {
  const styles = useStyles();
  const theme = useAppTheme();
  const router = useRouter();
  const pathname = usePathname();

  const enabled = isApiDebugLogsEnabled();

  if (!enabled) return null;
  if ((pathname ?? "") === "/debug/logs") return null;

  return (
    <View style={styles.root}>
      <Pressable
        onPress={() => router.push("/debug/logs")}
        style={[
          styles.button,
          {
            backgroundColor: tint(theme.colors.textMain, 0.06, theme.colors.bgSurface),
            borderColor: tint(theme.colors.textMain, 0.12, theme.colors.borderDefault),
          },
        ]}
      >
        <Ionicons name="bug-outline" style={[styles.icon, { color: theme.colors.textMain }]} />
        <AppText style={[styles.text, { color: theme.colors.textMain }]}>API Logs</AppText>
      </Pressable>
    </View>
  );
}