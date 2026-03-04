import { useParams } from "react-router-dom";

import { ShipperDetailView } from "@/features/users/ui/ShipperDetailView";

export default function ShipperDetailPage() {
  const { shipperId } = useParams<{ shipperId: string }>();

  return <ShipperDetailView shipperId={shipperId ?? ""} />;
}
