// src/pages/users/ShipperListPage.tsx
import { UsersListView } from "@/features/users/ui/UsersListView";

export default function ShipperListPage() {
  return (
    <UsersListView
      title="화주 조회"
      description="화주 계정을 조회하고, 견적/결제/정산 관련 상태를 확인해."
      presetRole="SHIPPER" // 추가: 역할 고정 프리셋
    />
  );
}
