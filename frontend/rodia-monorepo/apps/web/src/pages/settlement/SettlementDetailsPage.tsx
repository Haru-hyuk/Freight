import { useParams } from "react-router-dom";

import { SettlementDetailsView } from "@/features/settlements/ui/SettlementDetailsView";

export default function SettlementDetailsPage() {
  const { settlementId } = useParams<{ settlementId: string }>();
  return <SettlementDetailsView settlementId={settlementId ?? ""} />;
}
