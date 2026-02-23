import * as React from "react";
import { Eye } from "lucide-react";

import { Button } from "@/shared/ui/shadcn/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/shadcn/dialog";
import { Label } from "@/shared/ui/shadcn/label";
import { Separator } from "@/shared/ui/shadcn/separator";
import { Textarea } from "@/shared/ui/shadcn/textarea";
import type { DriverApprovalRow } from "@/features/drivers/model/types";
import { DocumentPreviewModal } from "./DocumentPreviewModal";

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
        <DialogContent className="rounded-lg border border-border bg-background max-h-[90vh] overflow-y-auto">
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

              {driver.documents && driver.documents.length > 0 && (
                <div className="space-y-2">
                  <Label>제출 서류</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {driver.documents.map((doc, idx) => (
                      <div
                        key={idx}
                        className="relative overflow-hidden rounded-lg border border-border bg-muted p-3"
                      >
                        <div className="aspect-square relative bg-background flex items-center justify-center mb-2 rounded overflow-hidden">
                          <img
                            src={doc.imageUri}
                            alt={doc.documentType}
                            className="w-full h-full object-cover opacity-50"
                          />
                        </div>
                        <div className="text-xs text-foreground mb-2">
                          <div className="font-medium">
                            {doc.documentType === "driver_cargo_license"
                              ? "화물운송 자격증"
                              : "차량등록증"}
                          </div>
                          <div className="text-muted-foreground text-xs mt-1">
                            신뢰도: {Math.round(doc.confidence * 100)}%
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="w-full h-8 text-xs"
                          onClick={() => setSelectedDocumentIndex(idx)}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          상세보기
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="driver-review-reason">상세 검토 메모 / 거부 사유</Label>
                <Textarea
                  id="driver-review-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="거부 시 사유를 반드시 입력하세요."
                  className="min-h-24"
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

      <DocumentPreviewModal
        document={driver && selectedDocumentIndex !== null ? driver.documents?.[selectedDocumentIndex] : undefined}
        onClose={() => setSelectedDocumentIndex(null)}
      />
    </>
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
