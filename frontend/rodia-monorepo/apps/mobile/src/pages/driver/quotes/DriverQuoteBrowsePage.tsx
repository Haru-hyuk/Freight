import React from "react";
import { useRouter } from "expo-router";

import DriverOrdersBoard from "@/widgets/driver-orders/DriverOrdersBoard";

export function DriverQuoteBrowsePage() {
  const router = useRouter();

  return (
    <DriverOrdersBoard
      activeTab="market"
      onChangeTab={(nextTab) => {
        if (nextTab === "market") return;
        router.replace("/(driver)/run/current");
      }}
    />
  );
}

export default DriverQuoteBrowsePage;

