import React from "react";
import { Redirect, useLocalSearchParams } from "expo-router";

import {
  parseMatchDetailRouteParams,
  type MatchDetailRouteParams,
} from "@/features/matching/model/matchDetailRouteSnapshot";

export default function DriverRunRoute() {
  const params = useLocalSearchParams<MatchDetailRouteParams>();
  const { idText, matchId } = parseMatchDetailRouteParams(params);

  if (!idText || idText === "current" || matchId <= 0) {
    return <Redirect href="/(driver)/run" />;
  }

  return <Redirect href="/(driver)/run" />;
}
