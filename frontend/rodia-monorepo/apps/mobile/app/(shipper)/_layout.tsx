import React from "react";
import { Redirect, Stack } from "expo-router";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useAuth } from "@/features/auth/model/useAuth";

export default function ShipperLayout() {
  const auth = useAuth();

  if (auth.status === "checking") {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (auth.status !== "authenticated") {
    return <Redirect href="/(auth)/login" />;
  }

  // 로그인은 되었는데 role이 아직 없으면(백엔드 /me 미연동 등) 루프 방지: 여기서는 대기
  if (!auth.user?.role) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (auth.user.role !== "shipper") {
    return <Redirect href="/(driver)/home" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});