import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { ThemeProvider } from "@/shared/theme/ThemeProvider";
import { useAuth } from "@/features/auth/model/useAuth";
import { initLayoutAnimationForAndroid } from "@/shared/lib/ui/layoutAnimationInit";

import { ActiveOrderProvider } from "@/entities/order/model/active-order.store";

initLayoutAnimationForAndroid();

export default function RootLayout() {
  const { bootstrap } = useAuth();

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  return (
    <ThemeProvider>
      <ActiveOrderProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </ActiveOrderProvider>
    </ThemeProvider>
  );
}
