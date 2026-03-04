import { useParams } from "react-router-dom";

import { SanctionDetailView } from "@/features/sanctions/ui/SanctionDetailView";

export default function SanctionDetailPage() {
  const { sanctionId } = useParams<{ sanctionId: string }>();

  return <SanctionDetailView sanctionId={sanctionId ?? ""} />;
}
