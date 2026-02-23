import * as React from "react";

import { fetchDriverApprovals, reviewDriverApproval } from "@/features/drivers/api/driverApprovalsApi";
import type { DriverApprovalRow } from "@/features/drivers/model/types";
import { DriverApprovalReviewDialog } from "@/features/drivers/ui/DriverApprovalReviewDialog";
import { DriverApprovalTable } from "@/features/drivers/ui/DriverApprovalTable";

export function DriverApprovalView() {
  const [rows, setRows] = React.useState<DriverApprovalRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selected, setSelected] = React.useState<DriverApprovalRow | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchDriverApprovals();
      setRows(response);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">차주 승인</h2>
        <p className="mt-1 text-sm text-foreground">drivers, trucks 기반으로 차주 계정 승인 요청을 검토합니다.</p>
      </div>

      <DriverApprovalTable rows={rows} loading={loading} onOpenReview={setSelected} />

      <DriverApprovalReviewDialog
        driver={selected}
        open={Boolean(selected)}
        onOpenChange={(open) => (open ? null : setSelected(null))}
        onApprove={async (driverId) => {
          await reviewDriverApproval({ driverId, action: "APPROVE" });
          await load();
        }}
        onReject={async (driverId, reason) => {
          await reviewDriverApproval({ driverId, action: "REJECT", reason });
          await load();
        }}
      />
    </div>
  );
}
