import React from "react";
import { ThemeProvider } from "@/src/shared/theme/ThemeProvider";

export default function RootLayout() {
  return <ThemeProvider>{/* Your navigators/screens here */}</ThemeProvider>;
}