import * as React from "react";

import { fetchSettlementApprovalHistory } from "@/features/settlements/api/settlementsApi";
import type { SettlementApprovalRow } from "@/features/settlements/model/types";
import { SettlementHistoryTable } from "@/features/settlements/ui/SettlementHistoryTable";

export function SettlementHistoryView() {
  const [rows, setRows] = React.useState<SettlementApprovalRow[]>([]);
  const [loading, setLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchSettlementApprovalHistory();
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
        <h2 className="text-2xl font-semibold text-slate-900">정산 승인 이력</h2>
        <p className="mt-1 text-sm text-slate-600">승인/거부 결과를 포함한 정산 승인 이력을 조회합니다.</p>
      </div>

      <SettlementHistoryTable rows={rows} loading={loading} />
    </div>
  );
}
