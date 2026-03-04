import type { CancellationRequestRow } from "@/features/orders/model/types";
import { Badge } from "@/shared/ui/shadcn/badge";
import { Button } from "@/shared/ui/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Skeleton } from "@/shared/ui/shadcn/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/shadcn/table";

type Props = {
  rows: CancellationRequestRow[];
  total: number;
  loading: boolean;
  onOpenReview: (row: CancellationRequestRow) => void;
  onOpenDetail?: (row: CancellationRequestRow) => void;
};

function ApprovalStatusBadge({ status }: { status: CancellationRequestRow["approvalStatus"] }) {
  if (status === "APPROVED") return <Badge variant="secondary">{"승인"}</Badge>;
  if (status === "REJECTED") return <Badge variant="destructive">{"반려"}</Badge>;
  return <Badge variant="outline">{"대기"}</Badge>;
}

function RequesterRoleLabel({ role }: { role: CancellationRequestRow["requestedByRole"] }) {
  if (role === "SHIPPER") return <>{`화주`}</>;
  if (role === "DRIVER") return <>{`기사`}</>;
  return <>{`확인 필요`}</>;
}

export function CancellationApprovalTable({ rows, total, loading, onOpenReview, onOpenDetail }: Props) {
  return (
    <Card className="rounded-lg border border-border bg-background">
      <CardHeader className="space-y-1">
        <CardTitle className="text-lg font-semibold">{"취소 요청 목록"}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="rounded-b-lg border-t border-border bg-muted">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted">
                <TableHead className="text-foreground">{"요청시각"}</TableHead>
                <TableHead className="text-foreground">{"요청ID"}</TableHead>
                <TableHead className="text-foreground">{"요청자"}</TableHead>
                <TableHead className="text-foreground">{"화주/기사"}</TableHead>
                <TableHead className="text-foreground">{"운송구간"}</TableHead>
                <TableHead className="text-foreground">{"취소사유"}</TableHead>
                <TableHead className="text-foreground">{"상태"}</TableHead>
                <TableHead className="text-right text-foreground">{"조치"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <div className="space-y-2 p-2">
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-foreground">
                    {"취소 요청이 없습니다."}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow
                    key={row.requestId}
                    className={onOpenDetail ? "cursor-pointer hover:bg-muted" : undefined}
                    onClick={() => onOpenDetail?.(row)}
                  >
                    <TableCell className="py-3 text-sm">{row.requestedAt}</TableCell>
                    <TableCell className="py-3 text-sm">
                      <div className="font-semibold">{row.requestId}</div>
                      <div className="opacity-70">
                        {row.quoteId} / {row.matchId}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-sm">
                      <div className="font-semibold">
                        <RequesterRoleLabel role={row.requestedByRole} />
                      </div>
                      <div className="opacity-70">{row.requestedByName}</div>
                    </TableCell>
                    <TableCell className="py-3 text-sm">
                      <div className="font-semibold">{row.shipperName}</div>
                      <div className="opacity-70">{row.driverName}</div>
                    </TableCell>
                    <TableCell className="py-3 text-sm">
                      <div>{row.originAddress}</div>
                      <div className="opacity-70">{row.destinationAddress}</div>
                    </TableCell>
                    <TableCell className="py-3 text-sm">{row.cancelReason}</TableCell>
                    <TableCell className="py-3">
                      <ApprovalStatusBadge status={row.approvalStatus} />
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={row.approvalStatus !== "PENDING"}
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenReview(row);
                        }}
                      >
                        {"검토"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <div className="rounded-b-lg border-t border-border bg-background px-6 py-3 text-sm text-foreground">
        {`총 ${total}건`}
      </div>
    </Card>
  );
}

