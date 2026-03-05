import * as React from "react";

import { fetchSettlementApprovals, reviewSettlement } from "@/features/settlements/api/settlementsApi";
import type { SettlementApprovalRow } from "@/features/settlements/model/types";
import { SettlementApprovalTable } from "@/features/settlements/ui/SettlementApprovalTable";
import { SettlementReviewDialog } from "@/features/settlements/ui/SettlementReviewDialog";

export function SettlementApprovalsView() {
  const [rows, setRows] = React.useState<SettlementApprovalRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selected, setSelected] = React.useState<SettlementApprovalRow | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchSettlementApprovals();
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
        <h2 className="text-2xl font-semibold text-foreground">정산 승인 관리</h2>
        <p className="mt-1 text-sm text-foreground/70">정산/결제 데이터를 기준으로 승인 대기 정산을 검토합니다.</p>
      </div>

      <SettlementApprovalTable rows={rows} loading={loading} onOpenReview={setSelected} />

      <SettlementReviewDialog
        row={selected}
        open={Boolean(selected)}
        onOpenChange={(open) => (open ? null : setSelected(null))}
        onApprove={async (settlementId) => {
          await reviewSettlement({ settlementId, action: "APPROVE" });
          await load();
        }}
        onReject={async (settlementId, reason) => {
          await reviewSettlement({ settlementId, action: "REJECT", reason });
          await load();
        }}
      />
    </div>
  );
}
