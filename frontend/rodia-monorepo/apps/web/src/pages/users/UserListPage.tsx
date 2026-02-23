import { UsersListView } from "@/features/users/ui/UsersListView";

export default function UserListPage() {
  return (
    <UsersListView
      title="전체 사용자 조회" // MODIFIED: 페이지 문구 정상화
      description="화주/차주 계정을 조회하고 상태를 확인합니다." // MODIFIED: 페이지 문구 정상화
    />
  );
}
