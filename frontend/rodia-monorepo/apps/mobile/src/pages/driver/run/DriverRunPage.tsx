import React from "react";

import { useActiveOrder } from "@/entities/order/model/active-order.store";
import { DriverOrdersBoard } from "@/features/driver-orders/ui/DriverOrdersBoard";
import { PrepareForRunScreen } from "@/features/driver-run/ui/PrepareForRunScreen";
import { RunActiveDetails } from "@/features/driver-run/ui/RunActiveDetails";
import {
  getDriverBadge,
  getDriverCta,
  getDriverStatusTitle,
  getDriverUiStateFromRawStatus,
} from "@/shared/lib/policy";

export default function DriverRunPage() {
  const { activeOrder } = useActiveOrder();

  if (!activeOrder) {
    return <DriverOrdersBoard assignedOnly />;
  }

  if (activeOrder.status === "PREPARING") {
    return <PrepareForRunScreen order={activeOrder} />;
  }

  // Any other status on an active order implies it's in progress.
  const rawStatus = typeof activeOrder.status === "string" ? activeOrder.status : "";
  const uiState = getDriverUiStateFromRawStatus(rawStatus);
  const badge = getDriverBadge(uiState);
  const driverStatusTitle = getDriverStatusTitle(uiState);
  const driverCta = getDriverCta(uiState, true);

  return (
    <RunActiveDetails
      order={activeOrder}
      driverBadgeLabel={badge.label}
      driverBadgeTone={badge.tone}
      driverStatusTitle={driverStatusTitle}
      driverCta={driverCta}
    />
  );
}
