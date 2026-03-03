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
  if (status === "APPROVED") return <Badge variant="secondary">{"\uC2B9\uC778"}</Badge>;
  if (status === "REJECTED") return <Badge variant="destructive">{"\uBC18\uB824"}</Badge>;
  return <Badge variant="outline">{"\uB300\uAE30"}</Badge>;
}

function RequesterRoleLabel({ role }: { role: CancellationRequestRow["requestedByRole"] }) {
  if (role === "SHIPPER") return <>{`\uD654\uC8FC`}</>;
  if (role === "DRIVER") return <>{`\uAE30\uC0AC`}</>;
  return <>{`\uD655\uC778 \uD544\uC694`}</>;
}

export function CancellationApprovalTable({ rows, total, loading, onOpenReview, onOpenDetail }: Props) {
  return (
    <Card className="rounded-lg border border-border bg-background">
      <CardHeader className="space-y-1">
        <CardTitle className="text-lg font-semibold">{"\uCDE8\uC18C \uC694\uCCAD \uBAA9\uB85D"}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="rounded-b-lg border-t border-border bg-muted">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted">
                <TableHead className="text-foreground">{"\uC694\uCCAD\uC2DC\uAC01"}</TableHead>
                <TableHead className="text-foreground">{"\uC694\uCCADID"}</TableHead>
                <TableHead className="text-foreground">{"\uC694\uCCAD\uC790"}</TableHead>
                <TableHead className="text-foreground">{"\uD654\uC8FC/\uAE30\uC0AC"}</TableHead>
                <TableHead className="text-foreground">{"\uC6B4\uC1A1\uAD6C\uAC04"}</TableHead>
                <TableHead className="text-foreground">{"\uCDE8\uC18C\uC0AC\uC720"}</TableHead>
                <TableHead className="text-foreground">{"\uC0C1\uD0DC"}</TableHead>
                <TableHead className="text-right text-foreground">{"\uC870\uCE58"}</TableHead>
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
                    {"\uCDE8\uC18C \uC694\uCCAD\uC774 \uC5C6\uC2B5\uB2C8\uB2E4."}
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
                        {"\uAC80\uD1A0"}
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
        {`\uCD1D ${total}\uAC74`}
      </div>
    </Card>
  );
}
