import { useParams } from "react-router-dom";

import { DriverDetailView } from "@/features/users/ui/DriverDetailView";

export default function DriverDetailPage() {
  const { driverId } = useParams<{ driverId: string }>();

  return <DriverDetailView driverId={driverId ?? ""} />;
}
