import React from "react";
import { Stack } from "expo-router";
import { ThemeProvider } from "../src/shared/theme/ThemeProvider";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <Stack />
    </ThemeProvider>
  );
}
