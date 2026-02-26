import * as React from "react";

import { fetchTruckApprovals, reviewTruckApproval } from "@/features/trucks/api/truckApprovalsApi";
import type { TruckApprovalRow } from "@/features/trucks/model/types";
import { TruckApprovalReviewDialog } from "@/features/trucks/ui/TruckApprovalReviewDialog";
import { TruckApprovalTable } from "@/features/trucks/ui/TruckApprovalTable";

export function TruckApprovalView() {
  const [rows, setRows] = React.useState<TruckApprovalRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selected, setSelected] = React.useState<TruckApprovalRow | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchTruckApprovals();
      setRows(response);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-7 rounded-xl bg-muted/40 p-4 sm:p-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">차량 승인</h2>
        <p className="mt-2 text-base text-foreground/70">차량 등록 승인 신청을 검토하고 승인/거부를 처리합니다.</p>
      </div>

      <TruckApprovalTable rows={rows} loading={loading} onOpenReview={setSelected} />

      <TruckApprovalReviewDialog
        truck={selected}
        open={Boolean(selected)}
        onOpenChange={(open) => (open ? null : setSelected(null))}
        onApprove={async (truckId) => {
          await reviewTruckApproval({ truckId, action: "APPROVE" });
          await load();
        }}
        onReject={async (truckId, reason) => {
          await reviewTruckApproval({ truckId, action: "REJECT", reason });
          await load();
        }}
      />
    </div>
  );
}
