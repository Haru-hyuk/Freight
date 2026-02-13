import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/shadcn/dialog";
import { Button } from "@/shared/ui/shadcn/button";
import { Separator } from "@/shared/ui/shadcn/separator";
import type { DriverApprovalRow } from "../model/types";

type Props = {
  driver: DriverApprovalRow | null;
  onClose: () => void;
  onApprove: (id: string) => void;
};

export function DriverApprovalDialog({ driver, onClose, onApprove }: Props) {
  return (
    <Dialog open={Boolean(driver)} onOpenChange={onClose}>
      <DialogContent className="rounded-lg border border-border bg-background">
        <DialogHeader>
          <DialogTitle>기사 상세 정보</DialogTitle>
        </DialogHeader>

        {driver && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-background p-4 space-y-3">
              <Row label="이름" value={driver.name} />
              <Separator />
              <Row label="차량 정보" value={driver.vehicle} />
              <Separator />
              <Row label="연락처" value={driver.phone} />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-semibold">제출 서류</div>
              <div className="flex h-44 items-center justify-center rounded-lg border border-border bg-muted text-sm opacity-70">
                자격증 이미지 미리보기
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            닫기
          </Button>
          <Button
            onClick={() => driver && onApprove(driver.id)}
            disabled={!driver || driver.approvalStatus !== "승인 대기"}
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
    <div className="flex justify-between text-sm">
      <span className="opacity-70">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
