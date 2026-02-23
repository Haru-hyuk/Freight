import { UsersListView } from "@/features/users/ui/UsersListView";

export default function DriverListPage() {
  return (
    <UsersListView
      title="차주 조회" // MODIFIED: role 고정 페이지 문구 정리
      description="차주 계정을 조회하고 상태를 관리합니다." // MODIFIED: role 고정 페이지 문구 정리
      presetRole="DRIVER" // MODIFIED: 차주 고정
    />
  );
}
