import { Button } from "@/shared/ui/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/shadcn/dialog";
import { Skeleton } from "@/shared/ui/shadcn/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/shadcn/table";
import { SettlementApprovalBadge, SettlementProgressBadge } from "@/features/settlements/ui/SettlementBadges";
import type { SettlementApprovalRow } from "@/features/settlements/model/types";
import * as React from "react";

type Props = {
  rows: SettlementApprovalRow[];
  loading: boolean;
};

export function SettlementHistoryTable({ rows, loading }: Props) {
  const [selected, setSelected] = React.useState<SettlementApprovalRow | null>(null);

  return (
    <>
      <Card className="rounded-lg border border-border bg-background">
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg">정산 승인 이력</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border bg-background">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead>정산 ID</TableHead>
                  <TableHead>매칭 ID</TableHead>
                  <TableHead>차주</TableHead>
                  <TableHead>정산상태</TableHead>
                  <TableHead>승인결과</TableHead>
                  <TableHead>메모</TableHead>
                  <TableHead className="text-right">상세</TableHead>
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
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-foreground">
                      정산 승인 이력이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.settlementId}>
                      <TableCell className="font-medium">{row.settlementId}</TableCell>
                      <TableCell>{row.matchId}</TableCell>
                      <TableCell>{row.driverName}</TableCell>
                      <TableCell>
                        <SettlementProgressBadge status={row.settlementStatus} />
                      </TableCell>
                      <TableCell>
                        <SettlementApprovalBadge status={row.approvalStatus} />
                      </TableCell>
                      <TableCell className="text-sm text-foreground">{row.reviewMemo ?? "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button type="button" variant="secondary" onClick={() => setSelected(row)}>
                          상세
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

      <Dialog open={Boolean(selected)} onOpenChange={(open) => (open ? null : setSelected(null))}>
        <DialogContent className="rounded-lg border border-border bg-background">
          <DialogHeader>
            <DialogTitle>정산 승인 이력 상세</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-3 text-sm">
              <InfoRow label="정산 ID" value={selected.settlementId} />
              <InfoRow label="매칭 ID" value={selected.matchId} />
              <InfoRow label="차주" value={selected.driverName} />
              <InfoRow label="화주" value={selected.shipperName} />
              <InfoRow label="승인 메모" value={selected.reviewMemo ?? "-"} />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted p-3">
      <div className="text-xs text-foreground">{label}</div>
      <div className="mt-1 font-medium text-foreground">{value}</div>
    </div>
  );
}
