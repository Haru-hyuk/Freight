import * as React from "react";

import { Button } from "@/shared/ui/shadcn/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/shadcn/dialog";
import { Label } from "@/shared/ui/shadcn/label";
import { Separator } from "@/shared/ui/shadcn/separator";
import { Textarea } from "@/shared/ui/shadcn/textarea";
import type { DriverApprovalRow } from "@/features/drivers/model/types";

type Props = {
  driver: DriverApprovalRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (driverId: string) => void;
  onReject: (driverId: string, reason: string) => void;
};

export function DriverApprovalReviewDialog({ driver, open, onOpenChange, onApprove, onReject }: Props) {
  const [reason, setReason] = React.useState("");

  React.useEffect(() => {
    if (!open) setReason("");
  }, [open]);

  const canReject = Boolean(driver) && reason.trim().length > 0;
  const canApprove = Boolean(driver) && driver?.approvalStatus === "PENDING";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-lg border border-border bg-background">
        <DialogHeader>
          <DialogTitle>차주 승인 상세 검토</DialogTitle>
        </DialogHeader>

        {driver ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted p-4">
              <Row label="차주 ID" value={driver.driverId} />
              <Separator className="my-2" />
              <Row label="이름" value={driver.name} />
              <Separator className="my-2" />
              <Row label="연락처" value={driver.phone} />
              <Separator className="my-2" />
              <Row label="차량 정보" value={driver.vehicleSummary} />
              <Separator className="my-2" />
              <Row label="신청 일시" value={driver.requestedAt} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="driver-review-reason">상세 검토 메모 / 거부 사유</Label>
              <Textarea
                id="driver-review-reason"
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
              if (!driver) return;
              onApprove(driver.driverId);
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
              if (!driver) return;
              onReject(driver.driverId, reason.trim());
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
