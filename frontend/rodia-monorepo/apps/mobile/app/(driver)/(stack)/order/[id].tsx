import { useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";

import { getDriverMarketRecommendationSelection } from "@/features/driver-orders/model/marketRecommendationSelection";
import DriverMarketRecommendationPage from "@/pages/driver/matching/DriverMarketRecommendationPage";
import DriverOrderDetailPage, { type DriverOrderRouteParams } from "@/pages/driver/order/DriverOrderDetailPage";

function parseRecommendKey(rawKey: string | string[] | undefined): string {
  const candidate = Array.isArray(rawKey) ? rawKey[0] : rawKey;
  return String(candidate ?? "").trim();
}

export default function DriverOrderDetailRoute() {
  const params = useLocalSearchParams<DriverOrderRouteParams>();
  const recommendKey = parseRecommendKey(params.recommendKey);
  const recommendationSelection = useMemo(
    () => (recommendKey ? getDriverMarketRecommendationSelection(recommendKey) : null),
    [recommendKey]
  );

  if (recommendationSelection) {
    return <DriverMarketRecommendationPage forcedKey={recommendKey} />;
  }

  return <DriverOrderDetailPage params={params} />;
}
