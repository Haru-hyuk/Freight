import { OrderCancellationRequestsView } from "@/features/orders/ui/OrderCancellationRequestsView";

export function MatchingAnomalyManagementView() {
  return (
    <OrderCancellationRequestsView
      title="\uB9E4\uCE6D \uC774\uC0C1 \uAD00\uB9AC"
      description="\uCDE8\uC18C \uC694\uCCAD\uC774 \uC62C\uB77C\uC628 \uB9E4\uCE6D \uAC74\uC744 \uBAA8\uC544\uC11C \uAD00\uB9AC\uC790 \uC2B9\uC778/\uBC18\uB824\uB85C \uCC98\uB9AC\uD569\uB2C8\uB2E4."
      detailBasePath="/ops/matching-anomalies"
    />
  );
}
