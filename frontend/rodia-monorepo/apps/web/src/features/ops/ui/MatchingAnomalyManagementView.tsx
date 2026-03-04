import { OrderCancellationRequestsView } from "@/features/orders/ui/OrderCancellationRequestsView";

export function MatchingAnomalyManagementView() {
  return (
    <OrderCancellationRequestsView
      title="매칭 이상 관리"
      description="취소 요청이 올라온 매칭 건을 모아서 관리자 승인/반려로 처리합니다."
      detailBasePath="/ops/matching-anomalies"
    />
  );
}

