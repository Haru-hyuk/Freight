import React from "react";

import DriverOrdersBoard from "@/widgets/driver-orders/DriverOrdersBoard";

export function DriverMyMatchesPage() {
  //오더 탭-오더 보드에서 탭이 my인 상태(내 오더)
  return <DriverOrdersBoard initialTab="my" />;
}

export default DriverMyMatchesPage;
