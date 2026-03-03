import { useLocation } from "react-router-dom";

import { OrderCancellationRequestDetailView } from "@/features/orders/ui/OrderCancellationRequestDetailView";

export default function OrderCancellationRequestDetailPage() {
  const location = useLocation();
  const backTo = location.pathname.startsWith("/ops/matching-anomalies")
    ? "/ops/matching-anomalies"
    : "/orders/cancellations";

  return <OrderCancellationRequestDetailView backTo={backTo} />;
}
