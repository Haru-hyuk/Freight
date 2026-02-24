import { Button } from "@/shared/ui/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/shadcn/table";
import { Skeleton } from "@/shared/ui/shadcn/skeleton";

import type { DriverApprovalRow } from "@/features/drivers/model/types";
import { DriverApprovalStatusBadge, DriverLicenseBadge } from "@/features/drivers/ui/DriverApprovalBadges";

type Props = {
  rows: DriverApprovalRow[];
  loading: boolean;
  onOpenReview: (row: DriverApprovalRow) => void;
};

export function DriverApprovalTable({ rows, loading, onOpenReview }: Props) {
  return (
    <Card className="rounded-lg border border-border bg-background">
      <CardHeader>
        <CardTitle className="text-lg">차주 승인 목록</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border bg-background">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted">
                <TableHead>신청일시</TableHead>
                <TableHead>차주</TableHead>
                <TableHead>차량</TableHead>
                <TableHead>면허상태</TableHead>
                <TableHead>승인상태</TableHead>
                <TableHead className="text-right">관리</TableHead>
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
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-foreground">
                    차주 승인 요청이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.driverId}>
                    <TableCell>{row.requestedAt}</TableCell>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>{row.vehicleSummary}</TableCell>
                    <TableCell>
                      <DriverLicenseBadge status={row.licenseStatus} />
                    </TableCell>
                    <TableCell>
                      <DriverApprovalStatusBadge status={row.approvalStatus} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button type="button" variant="secondary" onClick={() => onOpenReview(row)}>
                        상세 검토
                      </Button>
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
