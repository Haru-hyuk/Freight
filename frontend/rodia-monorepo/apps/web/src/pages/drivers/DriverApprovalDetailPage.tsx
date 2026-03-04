import { useParams } from "react-router-dom";

import { DriverApprovalDetailView } from "@/features/drivers/ui/DriverApprovalDetailView";

export default function DriverApprovalDetailPage() {
  const { driverId } = useParams<{ driverId: string }>();

  return <DriverApprovalDetailView driverId={driverId ?? ""} />;
}
