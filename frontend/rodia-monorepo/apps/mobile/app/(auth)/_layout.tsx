import React from "react";
import { Redirect, Stack } from "expo-router";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useAuth } from "@/features/auth/model/useAuth";

export default function AuthLayout() {
  const auth = useAuth();

  if (auth.status === "checking") {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (auth.status === "authenticated" && auth.user?.role) {
    return <Redirect href={auth.user.role === "driver" ? "/(driver)/home" : "/(shipper)/home"} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});