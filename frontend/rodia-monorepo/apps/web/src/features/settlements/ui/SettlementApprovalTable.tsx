import type { SettlementApprovalRow } from "@/features/settlements/model/types";
import { SettlementApprovalBadge, SettlementProgressBadge } from "@/features/settlements/ui/SettlementBadges";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Skeleton } from "@/shared/ui/shadcn/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/shadcn/table";

type Props = {
  rows: SettlementApprovalRow[];
  loading: boolean;
  onOpenReview: (row: SettlementApprovalRow) => void;
};

export function SettlementApprovalTable({ rows, loading, onOpenReview }: Props) {
  return (
    <Card className="rounded-lg border border-border bg-background">
      <CardHeader className="space-y-1">
        <CardTitle className="text-lg">정산 승인 관리</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border bg-background">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted">
                <TableHead>정산 ID</TableHead>
                <TableHead>매칭 ID</TableHead>
                <TableHead>차주/화주</TableHead>
                <TableHead>정산예정일</TableHead>
                <TableHead>정산상태</TableHead>
                <TableHead>승인상태</TableHead>
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
                    검토 대기 중인 정산이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.settlementId} className="cursor-pointer hover:bg-muted" onClick={() => onOpenReview(row)}>
                    <TableCell className="font-medium">{row.settlementId}</TableCell>
                    <TableCell>{row.matchId}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">{row.driverName}</div>
                        <div className="text-sm text-foreground">{row.shipperName}</div>
                      </div>
                    </TableCell>
                    <TableCell>{row.dueDate}</TableCell>
                    <TableCell>
                      <SettlementProgressBadge status={row.settlementStatus} />
                    </TableCell>
                    <TableCell>
                      <SettlementApprovalBadge status={row.approvalStatus} />
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
