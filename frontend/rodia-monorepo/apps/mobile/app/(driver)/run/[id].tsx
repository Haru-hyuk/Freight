import React from "react";
import { Redirect, useLocalSearchParams } from "expo-router";

import DriverMatchDetailPage from "@/pages/driver/matches/DriverMatchDetailPage";
import DriverMyMatchesPage from "@/pages/driver/matches/DriverMyMatchesPage";

function readParam(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" ? raw.trim() : "";
}

function toPositiveInt(value: string): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

export default function DriverRunRoute() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const idText = readParam(params?.id);

  if (!idText || idText === "current") {
    return <DriverMyMatchesPage />;
  }

  const matchId = toPositiveInt(idText);
  if (matchId <= 0) {
    return <Redirect href="/(driver)/run/current" />;
  }

  return <DriverMatchDetailPage matchId={matchId} />;
}
