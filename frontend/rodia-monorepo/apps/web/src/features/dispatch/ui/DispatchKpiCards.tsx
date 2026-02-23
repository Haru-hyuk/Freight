import type { DispatchRow } from "@/features/dispatch/model/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Skeleton } from "@/shared/ui/shadcn/skeleton";

type Props = {
  rows: DispatchRow[];
  loading: boolean;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

export function DispatchKpiCards({ rows, loading }: Props) {
  const waitingCount = rows.filter((row) => !row.accepted).length;
  const assignedCount = rows.filter((row) => row.accepted).length;
  const inTransitCount = rows.filter((row) => row.matchStatus === "IN_TRANSIT").length;
  const pendingSettlementCount = rows.filter((row) => row.settlementStatus === "PENDING" || row.settlementStatus === "PROCESSING").length;
  const severeDeviationCount = rows.filter((row) => row.deviationSeverity === "SEVERE").length;
  const totalRevenue = rows.reduce((sum, row) => sum + row.totalFare, 0);

  const items = [
    { label: "배차 대기", value: `${waitingCount}` },
    { label: "배차 완료", value: `${assignedCount}` },
    { label: "운송 중", value: `${inTransitCount}` },
    { label: "정산 진행", value: `${pendingSettlementCount}` },
    { label: "심각 이탈", value: `${severeDeviationCount}` },
    { label: "총 운임", value: `${formatCurrency(totalRevenue)} KRW` },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <Card key={item.label} className="rounded-lg border border-border bg-background">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground">{item.label}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-7 w-28" /> : <p className="text-2xl font-semibold text-foreground">{item.value}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
