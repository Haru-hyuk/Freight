import { useParams } from "react-router-dom";

import { UserDetailView } from "@/features/users/ui/UserDetailView";

export default function UserDetailPage() {
  const { userId } = useParams();

  return <UserDetailView userId={userId ?? ""} />; // MODIFIED: 페이지는 조립만 담당
}
