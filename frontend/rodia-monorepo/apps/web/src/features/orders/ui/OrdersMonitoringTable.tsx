import type { OrderMonitoringRow } from "@/features/orders/model/types";
import { getMatchingProgressBadgeVariant, getMatchingProgressLabel } from "@/shared/lib/matching-progress";
import { Badge } from "@/shared/ui/shadcn/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Skeleton } from "@/shared/ui/shadcn/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/shadcn/table";

type Props = {
  rows: OrderMonitoringRow[];
  loading: boolean;
};

function quoteStatusLabel(status: OrderMonitoringRow["quoteStatus"]): string {
  if (status === "OPEN") return "매칭중";
  if (status === "MATCHED") return "배차중";
  if (status === "IN_TRANSIT") return "배차중";
  if (status === "DELIVERED") return "배차완료";
  if (status === "CANCELLED") return "취소";
  return "확인 필요";
}

function paymentStatusLabel(status: OrderMonitoringRow["paymentStatus"]): string {
  if (status === "PENDING") return "대기";
  if (status === "COMPLETED") return "완료";
  if (status === "FAILED") return "실패";
  return "확인 필요";
}

function settlementStatusLabel(status: OrderMonitoringRow["settlementStatus"]): string {
  if (status === "PENDING") return "대기";
  if (status === "PROCESSING") return "처리중";
  if (status === "COMPLETED") return "완료";
  if (status === "FAILED") return "실패";
  return "확인 필요";
}

function RiskBadge({ risk }: { risk: OrderMonitoringRow["riskState"] }) {
  if (risk === "ACTION_REQUIRED") return <Badge variant="destructive">{"조치 필요"}</Badge>;
  if (risk === "WATCH") return <Badge variant="outline">{"주의"}</Badge>;
  return <Badge variant="secondary">{"정상"}</Badge>;
}

function MatchStatusBadge({ status }: { status: OrderMonitoringRow["matchStatus"] }) {
  return <Badge variant={getMatchingProgressBadgeVariant(status)}>{getMatchingProgressLabel(status)}</Badge>;
}

export function OrdersMonitoringTable({ rows, loading }: Props) {
  return (
    <Card className="rounded-lg border border-border bg-background">
      <CardHeader className="space-y-1">
        <CardTitle className="text-lg font-semibold">{"주문 모니터링"}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="rounded-b-lg border-t border-border bg-muted">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted">
                <TableHead className="text-foreground">{"견적 / 매칭"}</TableHead>
                <TableHead className="text-foreground">{"상태"}</TableHead>
                <TableHead className="text-foreground">{"화주 / 기사"}</TableHead>
                <TableHead className="text-foreground">{"운송구간"}</TableHead>
                <TableHead className="text-foreground">{"결제 / 정산"}</TableHead>
                <TableHead className="text-right text-foreground">{"운임"}</TableHead>
                <TableHead className="text-foreground">{"리스크"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <div className="space-y-2 p-2">
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-foreground">
                    {"조회 결과가 없습니다."}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={`${row.quoteId}-${row.matchId}`}>
                    <TableCell className="py-3 text-sm">
                      <div className="font-semibold">{row.quoteId}</div>
                      <div className="opacity-70">{row.matchId}</div>
                      <div className="opacity-70">{row.requestedAt}</div>
                    </TableCell>
                    <TableCell className="py-3 text-sm">
                      <div className="mb-2">{quoteStatusLabel(row.quoteStatus)}</div>
                      <MatchStatusBadge status={row.matchStatus} />
                    </TableCell>
                    <TableCell className="py-3 text-sm">
                      <div className="font-semibold">{row.shipperName}</div>
                      <div className="opacity-70">{row.driverName}</div>
                      <div className="opacity-70">{row.cargoName}</div>
                    </TableCell>
                    <TableCell className="py-3 text-sm">
                      <div>{row.originAddress}</div>
                      <div className="opacity-70">{row.destinationAddress}</div>
                    </TableCell>
                    <TableCell className="py-3 text-sm">
                      <div>{paymentStatusLabel(row.paymentStatus)}</div>
                      <div className="opacity-70">{settlementStatusLabel(row.settlementStatus)}</div>
                    </TableCell>
                    <TableCell className="py-3 text-right text-sm font-semibold">
                      {`${row.totalFare.toLocaleString()}원`}
                    </TableCell>
                    <TableCell className="py-3">
                      <RiskBadge risk={row.riskState} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

