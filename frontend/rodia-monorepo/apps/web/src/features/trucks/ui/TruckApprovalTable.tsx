import { Badge } from "@/shared/ui/shadcn/badge";
import { Button } from "@/shared/ui/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Skeleton } from "@/shared/ui/shadcn/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/shadcn/table";

import type { TruckApprovalRow } from "@/features/trucks/model/types";

type Props = {
  rows: TruckApprovalRow[];
  loading: boolean;
  onOpenReview: (row: TruckApprovalRow) => void;
};

export function TruckApprovalTable({ rows, loading, onOpenReview }: Props) {
  return (
    <Card className="rounded-lg border border-border bg-background">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl font-semibold">차량 승인 목록</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="rounded-b-lg border-t border-border bg-muted/40">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted hover:bg-muted">
                <TableHead className="text-base font-semibold text-foreground">요청 일시</TableHead>
                <TableHead className="text-base font-semibold text-foreground">기사</TableHead>
                <TableHead className="text-base font-semibold text-foreground">차량번호</TableHead>
                <TableHead className="text-base font-semibold text-foreground">차종 / 용량</TableHead>
                <TableHead className="text-base font-semibold text-foreground">보험 상태</TableHead>
                <TableHead className="text-base font-semibold text-foreground">승인 상태</TableHead>
                <TableHead className="text-right text-base font-semibold text-foreground">승인 처리</TableHead>
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
                  <TableCell colSpan={7} className="py-10 text-center text-base text-foreground/70">
                    차량 승인 요청이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.truckId} className="cursor-pointer hover:bg-muted" onClick={() => onOpenReview(row)}>
                    <TableCell className="py-3 text-base">{row.requestedAt}</TableCell>
                    <TableCell className="py-3 text-base font-semibold">{row.driverName}</TableCell>
                    <TableCell className="py-3 text-base font-semibold">{row.plateNumber}</TableCell>
                    <TableCell className="py-3 text-base">
                      <div>{row.vehicleType}</div>
                      <div className="text-sm text-foreground/70">{row.capacity.toLocaleString()}kg</div>
                    </TableCell>
                    <TableCell className="py-3">
                      {row.insuranceStatus === "VERIFIED" ? <Badge variant="secondary">인증 완료</Badge> : <Badge variant="destructive">미인증</Badge>}
                    </TableCell>
                    <TableCell className="py-3">
                      {row.approvalStatus === "PENDING" ? (
                        <Badge variant="outline">대기</Badge>
                      ) : row.approvalStatus === "APPROVED" ? (
                        <Badge variant="secondary">승인</Badge>
                      ) : (
                        <Badge variant="destructive">거절</Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <div className="inline-flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            onOpenReview(row);
                          }}
                          disabled={row.approvalStatus !== "PENDING"}
                        >
                          승인
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={(event) => {
                            event.stopPropagation();
                            onOpenReview(row);
                          }}
                          disabled={row.approvalStatus !== "PENDING"}
                        >
                          거절
                        </Button>
                      </div>
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
