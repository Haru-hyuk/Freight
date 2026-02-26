import { Badge } from "@/shared/ui/shadcn/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Skeleton } from "@/shared/ui/shadcn/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/shadcn/table";

import type { DeliveryHistoryRow } from "@/features/delivery/model/types";

type Props = {
  rows: DeliveryHistoryRow[];
  total: number;
  loading: boolean;
};

function MatchStatusBadge({ status }: { status: DeliveryHistoryRow["matchStatus"] }) {
  if (status === "COMPLETED") return <Badge variant="secondary">완료</Badge>;
  if (status === "CANCELLED") return <Badge variant="destructive">취소</Badge>;
  if (status === "IN_TRANSIT") return <Badge variant="default">진행 중</Badge>;
  return <Badge variant="outline">대기</Badge>;
}

function SettlementStatusBadge({ status }: { status: DeliveryHistoryRow["settlementStatus"] }) {
  if (status === "COMPLETED") return <Badge variant="secondary">완료</Badge>;
  if (status === "FAILED") return <Badge variant="destructive">실패</Badge>;
  if (status === "PROCESSING") return <Badge variant="default">처리 중</Badge>;
  return <Badge variant="outline">대기</Badge>;
}

export function DeliveryHistoryTable({ rows, total, loading }: Props) {
  return (
    <Card className="rounded-lg border border-border bg-background">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl font-semibold">배송 목록</CardTitle>
        <p className="text-base text-foreground/70">총 {total}건</p>
      </CardHeader>

      <CardContent>
        <div className="rounded-lg border border-border bg-muted/40">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted hover:bg-muted">
                <TableHead className="text-base font-semibold text-foreground">매칭 ID</TableHead>
                <TableHead className="text-base font-semibold text-foreground">견적 ID</TableHead>
                <TableHead className="text-base font-semibold text-foreground">화주 / 기사</TableHead>
                <TableHead className="text-base font-semibold text-foreground">출발 / 도착</TableHead>
                <TableHead className="text-base font-semibold text-foreground">배송 상태</TableHead>
                <TableHead className="text-base font-semibold text-foreground">정산 상태</TableHead>
                <TableHead className="text-right text-base font-semibold text-foreground">운임</TableHead>
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
                  <TableCell colSpan={7} className="py-10 text-center text-base text-foreground/70">
                    배송 이력이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.matchId} className="hover:bg-secondary/80">
                    <TableCell className="text-base font-semibold">{row.matchId}</TableCell>
                    <TableCell className="text-base">{row.quoteId}</TableCell>
                    <TableCell className="text-base">
                      <div className="space-y-1">
                        <div className="font-medium">{row.shipperName}</div>
                        <div className="text-foreground/70">{row.driverName}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-base">
                      <div className="space-y-1">
                        <div>{row.originAddress}</div>
                        <div className="text-foreground/70">{row.destinationAddress}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-base">
                      <div className="space-y-2">
                        <MatchStatusBadge status={row.matchStatus} />
                        <div className="text-sm text-foreground/70">
                          {row.departAt}
                          {row.arriveAt ? ` ~ ${row.arriveAt}` : ""}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <SettlementStatusBadge status={row.settlementStatus} />
                    </TableCell>
                    <TableCell className="text-right text-base">
                      <div className="font-semibold">{row.totalFare.toLocaleString()}원</div>
                      <div className="text-sm text-foreground/70">기사 정산 {row.driverPayout.toLocaleString()}원</div>
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
