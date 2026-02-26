import * as React from "react";
import { Eye } from "lucide-react";

import { Button } from "@/shared/ui/shadcn/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/shadcn/dialog";
import { Label } from "@/shared/ui/shadcn/label";
import { Separator } from "@/shared/ui/shadcn/separator";
import { Textarea } from "@/shared/ui/shadcn/textarea";
import type { DriverApprovalRow } from "@/features/drivers/model/types";
import { DocumentPreviewModal } from "@/features/drivers/ui/DocumentPreviewModal";

type Props = {
  driver: DriverApprovalRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (driverId: string) => void;
  onReject: (driverId: string, reason: string) => void;
};

export function DriverApprovalReviewDialog({ driver, open, onOpenChange, onApprove, onReject }: Props) {
  const [reason, setReason] = React.useState("");
  const [selectedDocumentIndex, setSelectedDocumentIndex] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!open) setReason("");
  }, [open]);

  const canReject = Boolean(driver) && reason.trim().length > 0;
  const canApprove = Boolean(driver) && driver?.approvalStatus === "PENDING";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-lg border border-border bg-background">
          <DialogHeader className="border-b border-border pb-3">
            <DialogTitle className="text-xl font-semibold">기사 승인 상세 검토</DialogTitle>
          </DialogHeader>

          {driver ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted p-4">
                <div className="space-y-2">
                  <Row label="기사 ID" value={driver.driverId} />
                  <Separator />
                  <Row label="이름" value={driver.name} />
                  <Separator />
                  <Row label="연락처" value={driver.phone} />
                  <Separator />
                  <Row label="차량 정보" value={driver.vehicleSummary} />
                  <Separator />
                  <Row label="신청 일시" value={driver.requestedAt} />
                </div>
              </div>

              {driver.documents && driver.documents.length > 0 ? (
                <div className="space-y-3">
                  <Label className="text-base font-semibold">제출 서류</Label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {driver.documents.map((doc, idx) => (
                      <div key={`${doc.documentType}-${idx}`} className="rounded-lg border border-border bg-background p-3">
                        <div className="aspect-square overflow-hidden rounded-md border border-border bg-muted">
                          <img src={doc.imageUri} alt={doc.documentType} className="h-full w-full object-cover" />
                        </div>
                        <div className="mt-3 space-y-2">
                          <div className="text-base font-semibold">{getDriverDocumentLabel(doc.documentType)}</div>
                          <div className="text-sm text-foreground/70">신뢰도: {Math.round(doc.confidence * 100)}%</div>
                          <Button type="button" variant="secondary" className="h-8 w-full text-sm" onClick={() => setSelectedDocumentIndex(idx)}>
                            <Eye className="mr-1 h-3 w-3" />
                            상세보기
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="driver-review-reason" className="text-base font-semibold">
                  상세 검토 메모 / 거부 사유
                </Label>
                <Textarea
                  id="driver-review-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="거부 시 사유를 입력하세요."
                  className="min-h-24 border-border bg-background text-foreground focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
            </div>
          ) : null}

          <DialogFooter className="mt-2 border-t border-border pt-4">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} className="text-base">
              닫기
            </Button>
            <Button
              type="button"
              disabled={!canApprove}
              onClick={() => {
                if (!driver) return;
                onApprove(driver.driverId);
                onOpenChange(false);
              }}
              className="text-base"
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
              className="text-base"
            >
              승인 거부
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DocumentPreviewModal
        document={driver && selectedDocumentIndex !== null ? driver.documents?.[selectedDocumentIndex] : undefined}
        onClose={() => setSelectedDocumentIndex(null)}
      />
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-base">
      <span className="font-medium text-foreground/70">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}

function getDriverDocumentLabel(type: string) {
  if (type === "driver_cargo_license") return "화물 운송 자격증";
  if (type === "driver_vehicle_registration") return "차량 등록증";
  return "문서";
}
