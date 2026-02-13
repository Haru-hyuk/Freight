// src/pages/users/DriverListPage.tsx
import { UsersListView } from "@/features/users/ui/UsersListView";

export default function DriverListPage() {
  return (
    <UsersListView
      title="차주 조회"
      description="차주(기사) 계정을 조회하고, 매칭/운행/리스크 관련 상태를 확인해."
      presetRole="DRIVER" // 추가: 역할 고정 프리셋
    />
  );
}
