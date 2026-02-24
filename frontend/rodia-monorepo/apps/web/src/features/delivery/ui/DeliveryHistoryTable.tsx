import { Badge } from "@/shared/ui/shadcn/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/shadcn/table";
import { Skeleton } from "@/shared/ui/shadcn/skeleton";

import type { DeliveryHistoryRow } from "@/features/delivery/model/types";

type Props = {
  rows: DeliveryHistoryRow[];
  total: number;
  loading: boolean;
};

function MatchStatusBadge({ status }: { status: DeliveryHistoryRow["matchStatus"] }) {
  if (status === "COMPLETED") return <Badge variant="secondary">완료</Badge>;
  if (status === "CANCELLED") return <Badge variant="destructive">취소</Badge>;
  if (status === "IN_TRANSIT") return <Badge variant="outline">운행중</Badge>;
  return <Badge variant="outline">대기</Badge>;
}

function SettlementStatusBadge({ status }: { status: DeliveryHistoryRow["settlementStatus"] }) {
  if (status === "COMPLETED") return <Badge variant="secondary">완료</Badge>;
  if (status === "FAILED") return <Badge variant="destructive">실패</Badge>;
  if (status === "PROCESSING") return <Badge variant="outline">처리중</Badge>;
  return <Badge variant="outline">대기</Badge>;
}

export function DeliveryHistoryTable({ rows, total, loading }: Props) {
  return (
    <Card className="rounded-lg border border-border bg-background">
      <CardHeader className="space-y-1">
        <CardTitle className="text-lg">배송 이력</CardTitle>
        <p className="text-sm text-foreground">총 {total}건</p>
      </CardHeader>

      <CardContent>
        <div className="rounded-lg border border-border bg-background">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted">
                <TableHead>매칭 ID</TableHead>
                <TableHead>견적 ID</TableHead>
                <TableHead>화주/차주</TableHead>
                <TableHead>출발/도착</TableHead>
                <TableHead>운행</TableHead>
                <TableHead>정산</TableHead>
                <TableHead className="text-right">요금</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <div className="space-y-2 p-2">
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-foreground">
                    배송 이력 데이터가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.matchId}>
                    <TableCell className="font-medium">{row.matchId}</TableCell>
                    <TableCell>{row.quoteId}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm font-medium">{row.shipperName}</div>
                        <div className="text-sm text-foreground">{row.driverName}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">{row.originAddress}</div>
                        <div className="text-sm text-foreground">{row.destinationAddress}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <MatchStatusBadge status={row.matchStatus} />
                        <div className="text-xs text-foreground">
                          {row.departAt}
                          {row.arriveAt ? ` ~ ${row.arriveAt}` : ""}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <SettlementStatusBadge status={row.settlementStatus} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="text-sm font-medium">{row.totalFare.toLocaleString()}원</div>
                      <div className="text-xs text-foreground">차주 지급 {row.driverPayout.toLocaleString()}원</div>
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
