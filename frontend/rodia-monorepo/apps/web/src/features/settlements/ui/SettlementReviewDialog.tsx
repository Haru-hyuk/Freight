import * as React from "react";

import { Button } from "@/shared/ui/shadcn/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/shadcn/dialog";
import { Label } from "@/shared/ui/shadcn/label";
import { Separator } from "@/shared/ui/shadcn/separator";
import { Textarea } from "@/shared/ui/shadcn/textarea";
import type { SettlementApprovalRow } from "@/features/settlements/model/types";

type Props = {
  row: SettlementApprovalRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (settlementId: string) => void;
  onReject: (settlementId: string, reason: string) => void;
};

export function SettlementReviewDialog({ row, open, onOpenChange, onApprove, onReject }: Props) {
  const [reason, setReason] = React.useState("");

  React.useEffect(() => {
    if (!open) setReason("");
  }, [open]);

  const canApprove = Boolean(row) && row?.approvalStatus === "PENDING";
  const canReject = Boolean(row) && reason.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-lg border border-border bg-background">
        <DialogHeader>
          <DialogTitle>정산 상세 검토</DialogTitle>
        </DialogHeader>

        {row ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted p-4">
              <ReviewRow label="정산 ID" value={row.settlementId} />
              <Separator className="my-2" />
              <ReviewRow label="매칭 ID" value={row.matchId} />
              <Separator className="my-2" />
              <ReviewRow label="차주" value={`${row.driverName} (${row.driverId})`} />
              <Separator className="my-2" />
              <ReviewRow label="화주" value={row.shipperName} />
              <Separator className="my-2" />
              <ReviewRow label="정산예정일" value={row.dueDate} />
              <Separator className="my-2" />
              <ReviewRow label="총 운임" value={`${row.totalFare.toLocaleString()}원`} />
              <Separator className="my-2" />
              <ReviewRow label="차주 지급액" value={`${row.driverPayout.toLocaleString()}원`} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="settlement-review-reason">상세 검토 메모 / 거부 사유</Label>
              <Textarea
                id="settlement-review-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="거부 시 사유를 반드시 입력하세요."
              />
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            닫기
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={!canApprove}
            onClick={() => {
              if (!row) return;
              onApprove(row.settlementId);
              onOpenChange(false);
            }}
          >
            승인 처리
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!canReject}
            onClick={() => {
              if (!row) return;
              onReject(row.settlementId, reason.trim());
              onOpenChange(false);
            }}
          >
            승인 거부
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
