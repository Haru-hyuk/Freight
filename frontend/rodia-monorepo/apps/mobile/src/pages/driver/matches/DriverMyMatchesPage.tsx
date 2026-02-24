import React from "react";
import { useRouter } from "expo-router";

import DriverOrdersBoard from "@/widgets/driver-orders/DriverOrdersBoard";

export function DriverMyMatchesPage() {
  const router = useRouter();

  return (
    <DriverOrdersBoard
      activeTab="my"
      onChangeTab={(nextTab) => {
        if (nextTab === "my") return;
        router.replace("/(driver)/quotes");
      }}
    />
  );
}

export default DriverMyMatchesPage;

