import React from "react";
import { useActiveOrder } from "@/entities/order/model/active-order.store";
import { DriverOrdersBoard } from "@/widgets/driver-orders/DriverOrdersBoard";
import { RunActiveDetails } from "@/features/driver-run/ui/RunActiveDetails";
import { PrepareForRunScreen } from "@/features/driver-run/ui/PrepareForRunScreen";

export default function DriverRunIndexRoute() {
  const { activeOrder } = useActiveOrder();

  if (!activeOrder) {
    return <DriverOrdersBoard activeTab="my" onChangeTab={() => {}} assignedOnly />;
  }

  if (activeOrder.status === "PREPARING") {
    return <PrepareForRunScreen order={activeOrder} />;
  }

  // Any other status on an active order implies it's in progress.
  return <RunActiveDetails order={activeOrder} />;
}
