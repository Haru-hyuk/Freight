import * as React from "react";

import { fetchDispatchRows } from "@/features/dispatch/api/dispatchApi";
import { toDispatchQuery, type DispatchFilterValue } from "@/features/dispatch/model/query";
import type { DispatchRow } from "@/features/dispatch/model/types";
import { DispatchFilters } from "@/features/dispatch/ui/DispatchFilters";
import { DispatchKpiCards } from "@/features/dispatch/ui/DispatchKpiCards";
import { DispatchTable } from "@/features/dispatch/ui/DispatchTable";
import { Separator } from "@/shared/ui/shadcn/separator";

export function DispatchManagementView() {
  const [filters, setFilters] = React.useState<DispatchFilterValue>({
    q: "",
    status: "all",
    dispatchState: "all",
    paymentStatus: "all",
    settlementStatus: "all",
  });
  const [page] = React.useState(1);
  const [size] = React.useState(20);

  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<DispatchRow[]>([]);
  const [total, setTotal] = React.useState(0);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const query = toDispatchQuery(filters, page, size);
      const response = await fetchDispatchRows(query);
      setRows(response.items);
      setTotal(response.total);
    } finally {
      setLoading(false);
    }
  }, [filters, page, size]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">배차 관리</h2>
          <p className="mt-1 text-sm text-foreground">
            ERD 기준 관리자 운영 항목(매칭, 견적, 경로, 결제, 정산, 알림, 이탈) 정보를 확인합니다.
          </p>
        </div>

        <DispatchKpiCards rows={rows} loading={loading} />

        <DispatchFilters value={filters} onChange={setFilters} onSubmit={load} loading={loading} />

        <Separator />

        <DispatchTable rows={rows} total={total} loading={loading} onRefresh={load} />
      </div>
    </div>
  );
}
