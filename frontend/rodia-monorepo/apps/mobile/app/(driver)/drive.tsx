import React from "react";
import { Redirect } from "expo-router";
import { useActiveOrder } from "@/entities/order/model/active-order.store";

export default function DriverDriveRoute() {
  const { activeOrder } = useActiveOrder();

  if (activeOrder) {
    return <Redirect href="/(driver)/run" />;
  }

  return <Redirect href="/(driver)/quotes" />;
}

