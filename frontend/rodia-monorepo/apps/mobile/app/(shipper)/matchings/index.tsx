// apps/mobile/app/(shipper)/matchings/index.tsx
import React from "react";
import { Redirect } from "expo-router";

export default function ShipperMatchingsRoute() {
  return <Redirect href={{ pathname: "/(shipper)/quotes", params: { tab: "IN_PROGRESS" } }} />;
}
