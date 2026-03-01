import { useLocalSearchParams } from "expo-router";
import React from "react";

import { DriverMatchDetailPage } from "@/pages/driver/matching/DriverMatchDetailPage";

type DriverRunRouteParams = {
  id?: string | string[];
};

function parsePositiveRouteId(rawId: string | string[] | undefined): number {
  const candidate = Array.isArray(rawId) ? rawId[0] : rawId;
  const parsed = Number(candidate);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

export default function DriverRunDetailRoute() {
  const params = useLocalSearchParams<DriverRunRouteParams>();
  const matchId = parsePositiveRouteId(params.id);
  return <DriverMatchDetailPage matchId={matchId} />;
}
