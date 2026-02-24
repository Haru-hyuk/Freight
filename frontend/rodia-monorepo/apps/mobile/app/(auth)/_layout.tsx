import React, { useMemo } from "react";
import { Redirect, Stack } from "expo-router";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useAuth } from "@/features/auth/model/useAuth";
import { safeNumber } from "@/shared/theme/colorUtils";
import { useAppTheme } from "@/shared/theme/useAppTheme";
import { DebugOpenButton } from "@/shared/ui/kit/DebugOpenButton";

export default function AuthLayout() {
  const auth = useAuth();
  const theme = useAppTheme();
  const spacing = safeNumber(theme.layout.spacing.base, 4);
  const styles = useMemo(() => createStyles(spacing), [spacing]);

  if (auth.status === "checking") {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (auth.status === "authenticated" && auth.user?.role) {
    if (auth.pendingVerificationRole === auth.user.role) {
      return <Redirect href={auth.user.role === "driver" ? "/(driver)/verification" : "/(shipper)/verification"} />;
    }
    return <Redirect href={auth.user.role === "driver" ? "/(driver)/home" : "/(shipper)/home"} />;
  }

  return (
    <View style={styles.root}>
      <Stack screenOptions={{ headerShown: false }} />
      <View style={styles.debugFloating} pointerEvents="box-none">
        <DebugOpenButton />
      </View>
    </View>
  );
}

function createStyles(spacing: number) {
  return StyleSheet.create({
    root: { flex: 1 },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    debugFloating: {
      position: "absolute",
      right: spacing * 5,
      bottom: spacing * 5,
      zIndex: 90,
      elevation: 90,
      alignItems: "flex-end",
    },
  });
}
