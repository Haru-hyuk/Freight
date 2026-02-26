import * as React from "react";

import { fetchDeliveryHistory } from "@/features/delivery/api/deliveryApi";
import { toDeliveryHistoryQuery, type DeliveryHistoryFilterValue } from "@/features/delivery/model/query";
import type { DeliveryHistoryRow } from "@/features/delivery/model/types";
import { DeliveryHistoryFilters } from "@/features/delivery/ui/DeliveryHistoryFilters";
import { DeliveryHistoryTable } from "@/features/delivery/ui/DeliveryHistoryTable";
import { Separator } from "@/shared/ui/shadcn/separator";

export function DeliveryHistoryView() {
  const [filters, setFilters] = React.useState<DeliveryHistoryFilterValue>({
    q: "",
    status: "all",
  });
  const [page] = React.useState(1);
  const [size] = React.useState(20);

  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<DeliveryHistoryRow[]>([]);
  const [total, setTotal] = React.useState(0);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const query = toDeliveryHistoryQuery(filters, page, size);
      const response = await fetchDeliveryHistory(query);
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
    <div className="space-y-7 rounded-xl bg-muted/40 p-4 sm:p-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">배송 이력</h2>
        <p className="mt-2 text-base text-foreground/70">matches, settlements 기준으로 배송 완료/진행 이력을 조회합니다.</p>
      </div>

      <DeliveryHistoryFilters value={filters} onChange={setFilters} onSubmit={load} loading={loading} />

      <Separator />

      <DeliveryHistoryTable rows={rows} total={total} loading={loading} />
    </div>
  );
}
