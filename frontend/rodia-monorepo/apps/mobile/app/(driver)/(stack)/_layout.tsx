import React, { useMemo } from "react";
import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useAuth } from "@/features/auth/model/useAuth";
import { safeString } from "@/shared/theme/colorUtils";
import { useAppTheme } from "@/shared/theme/useAppTheme";

export default function DriverStackLayout() {
  const theme = useAppTheme();
  const auth = useAuth();
  const cBgBase = safeString(theme?.colors?.bgSurfaceAlt, "#F3F4F6");
  const cText = safeString(theme?.colors?.textMain, "#111827");

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: cBgBase },
        center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: cBgBase },
      }),
    [cBgBase]
  );

  if (auth.status === "checking") {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={cText} />
      </View>
    );
  }

  if (auth.status !== "authenticated") {
    return <Redirect href="/(auth)/login" />;
  }

  if (auth.user?.role !== "driver") {
    return <Redirect href="/(shipper)/home" />;
  }

  if (auth.pendingVerificationRole === "driver") {
    return <Redirect href="/(driver)/verification" />;
  }

  return (
    <View style={styles.root}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: cBgBase },
        }}
      />
    </View>
  );
}
