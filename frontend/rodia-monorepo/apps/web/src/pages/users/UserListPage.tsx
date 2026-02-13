// src/pages/users/UserListPage.tsx
import { UsersListView } from "@/features/users/ui/UsersListView";

export default function UserListPage() {
  return (
    <UsersListView
      title="전체 사용자 조회"
      description="화주/차주(기사) 계정을 조회하고 상태/제재를 관리해."
    />
  );
}
