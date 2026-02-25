import React from "react";
import { Redirect } from "expo-router";

export default function DriverMyMatchesLegacyRoute() {
  // Legacy alias: canonical driver run list route is `/(driver)/run/current`.
  return <Redirect href="/(driver)/run/current" />;
}
