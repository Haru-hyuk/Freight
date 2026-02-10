import React, { useEffect } from "react";
import { Stack  } from "expo-router";
import { ThemeProvider } from "@/shared/theme/ThemeProvider";
import { useAuth } from "@/features/auth/model/useAuth";

export default function RootLayout() {
  const { bootstrap } = useAuth();

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}
