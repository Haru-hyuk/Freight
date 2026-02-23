import { UsersListView } from "@/features/users/ui/UsersListView";

export default function ShipperListPage() {
  return (
    <UsersListView
      title="화주 조회" // MODIFIED: role 고정 페이지 문구 정리
      description="화주 계정을 조회하고 상태를 관리합니다." // MODIFIED: role 고정 페이지 문구 정리
      presetRole="SHIPPER" // MODIFIED: 화주 고정
    />
  );
}
