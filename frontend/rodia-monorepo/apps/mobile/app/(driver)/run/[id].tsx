import React from "react";
import { Redirect, useLocalSearchParams } from "expo-router";

import DriverMatchDetailPage from "@/pages/driver/matches/DriverMatchDetailPage";
import DriverMyMatchesPage from "@/pages/driver/matches/DriverMyMatchesPage";
import {
  parseMatchDetailRouteParams,
  type MatchDetailRouteParams,
} from "@/features/matching/model/matchDetailRouteSnapshot";

export default function DriverRunRoute() {
  const params = useLocalSearchParams<MatchDetailRouteParams>();
  const { idText, matchId, snapshot } = parseMatchDetailRouteParams(params);

  if (!idText || idText === "current") {
    return <DriverMyMatchesPage />;
  }

  if (matchId <= 0) {
    return <Redirect href="/(driver)/run/current" />;
  }

  return <DriverMatchDetailPage matchId={matchId} routeSnapshot={snapshot} />;
}
