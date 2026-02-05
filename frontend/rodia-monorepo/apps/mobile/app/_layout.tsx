import React, { useEffect } from "react";
import { Slot } from "expo-router";
import { ThemeProvider } from "@/shared/theme/ThemeProvider";
import { useAuth } from "@/features/auth/model/useAuth";

export default function RootLayout() {
  const { bootstrap } = useAuth();

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  return (
    <ThemeProvider>
      <Slot />
    </ThemeProvider>
  );
}
