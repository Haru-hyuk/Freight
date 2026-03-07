import { useLocalSearchParams } from "expo-router";
import React from "react";

import DriverOrderDetailPage, { type DriverOrderRouteParams } from "@/pages/driver/order/DriverOrderDetailPage";

export default function DriverRunDetailRoute() {
  const params = useLocalSearchParams<DriverOrderRouteParams>();
  const runParams: DriverOrderRouteParams = {
    ...params,
    source: "run",
  };

  return <DriverOrderDetailPage params={runParams} />;
}
