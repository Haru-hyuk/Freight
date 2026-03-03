import { OrderCancellationRequestsView } from "@/features/orders/ui/OrderCancellationRequestsView";

export default function OrderCancellationRequestsPage() {
  return (
    <OrderCancellationRequestsView
      title="\uC8FC\uBB38 \uCDE8\uC18C \uC694\uCCAD \uAD00\uB9AC"
      description="\uB9E4\uCE6D\uB41C \uC8FC\uBB38\uC758 \uCDE8\uC18C \uC694\uCCAD\uB9CC \uBAA8\uC544\uC11C \uAC80\uD1A0/\uC2B9\uC778/\uBC18\uB824\uB97C \uCC98\uB9AC\uD569\uB2C8\uB2E4."
      detailBasePath="/orders/cancellations"
    />
  );
}
