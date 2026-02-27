import React from "react";
import { useRouter } from "expo-router";
import DriverOrdersBoard from "@/widgets/driver-orders/DriverOrdersBoard";

export function DriverMyOrdersPage() {
  const router = useRouter();

  return (
    <DriverOrdersBoard
      activeTab="my"
      onChangeTab={(nextTab) => {
        if (nextTab === "market") {
          router.replace("/(driver)/quotes/market");
        }
      }}
    />
  );
}

export default DriverMyOrdersPage;
