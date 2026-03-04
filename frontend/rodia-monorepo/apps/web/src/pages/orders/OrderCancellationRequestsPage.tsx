import { OrderCancellationRequestsView } from "@/features/orders/ui/OrderCancellationRequestsView";

export default function OrderCancellationRequestsPage() {
  return (
    <OrderCancellationRequestsView
      title="주문 취소 요청 관리"
      description="매칭된 주문의 취소 요청만 모아서 검토/승인/반려를 처리합니다."
      detailBasePath="/orders/cancellations"
    />
  );
}

