import { Button } from "@/shared/ui/shadcn/button";
import type { DriverApprovalRow } from "@/features/drivers/model/types";
import { DriverApprovalStatusBadge, DriverLicenseBadge } from "@/features/drivers/ui/DriverApprovalBadges";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Skeleton } from "@/shared/ui/shadcn/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/shadcn/table";

type Props = {
  rows: DriverApprovalRow[];
  loading: boolean;
  onOpenReview: (row: DriverApprovalRow) => void;
};

export function DriverApprovalTable({ rows, loading, onOpenReview }: Props) {
  return (
    <Card className="rounded-lg border border-border bg-background">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl font-semibold">기사 승인 목록</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="rounded-b-lg border-t border-border bg-muted/40">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted hover:bg-muted">
                <TableHead className="text-base font-semibold text-foreground">요청 일시</TableHead>
                <TableHead className="text-base font-semibold text-foreground">기사</TableHead>
                <TableHead className="text-base font-semibold text-foreground">차량</TableHead>
                <TableHead className="text-base font-semibold text-foreground">면허 상태</TableHead>
                <TableHead className="text-base font-semibold text-foreground">승인 상태</TableHead>
                <TableHead className="text-right text-base font-semibold text-foreground">승인 처리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <div className="space-y-2 p-2">
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-base text-foreground/70">
                    기사 승인 요청이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.driverId} className="cursor-pointer hover:bg-muted" onClick={() => onOpenReview(row)}>
                    <TableCell className="py-3 text-base">{row.requestedAt}</TableCell>
                    <TableCell className="py-3 text-base font-semibold">{row.name}</TableCell>
                    <TableCell className="py-3 text-base text-foreground/80">{row.vehicleSummary}</TableCell>
                    <TableCell className="py-3">
                      <DriverLicenseBadge status={row.licenseStatus} />
                    </TableCell>
                    <TableCell className="py-3">
                      <DriverApprovalStatusBadge status={row.approvalStatus} />
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
