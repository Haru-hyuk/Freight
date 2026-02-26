import { Button } from "@/shared/ui/shadcn/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/shadcn/dialog";
import { Separator } from "@/shared/ui/shadcn/separator";

import type { DriverApprovalRow } from "../model/types";

type Props = {
  driver: DriverApprovalRow | null;
  onClose: () => void;
  onApprove: (driverId: string) => void;
};

export function DriverApprovalDialog({ driver, onClose, onApprove }: Props) {
  return (
    <Dialog open={Boolean(driver)} onOpenChange={onClose}>
      <DialogContent className="rounded-lg border border-border bg-background">
        <DialogHeader>
          <DialogTitle>기사 상세 정보</DialogTitle>
        </DialogHeader>

        {driver ? (
          <div className="space-y-4">
            <div className="space-y-3 rounded-lg border border-border bg-background p-4">
              <Row label="이름" value={driver.name} />
              <Separator />
              <Row label="연락처" value={driver.phone} />
              <Separator />
              <Row label="차량 정보" value={driver.vehicleSummary} />
              <Separator />
              <Row label="요청일" value={driver.requestedAt} />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold">제출 서류</p>
              <div className="flex h-40 items-center justify-center rounded-lg border border-border bg-muted text-sm text-foreground opacity-70">
                문서 미리보기는 검수 모달에서 확인할 수 있습니다.
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            닫기
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (!driver) return;
              onApprove(driver.driverId);
            }}
            disabled={!driver || driver.approvalStatus !== "PENDING"}
          >
            승인 처리
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-foreground opacity-70">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
