import * as React from "react";
import { Eye } from "lucide-react";

import { Button } from "@/shared/ui/shadcn/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/shadcn/dialog";
import { Label } from "@/shared/ui/shadcn/label";
import { Separator } from "@/shared/ui/shadcn/separator";
import { Textarea } from "@/shared/ui/shadcn/textarea";
import type { TruckApprovalRow } from "@/features/trucks/model/types";
import { DocumentPreviewModal } from "@/features/trucks/ui/DocumentPreviewModal";

type Props = {
  truck: TruckApprovalRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (truckId: string) => void;
  onReject: (truckId: string, reason: string) => void;
};

export function TruckApprovalReviewDialog({ truck, open, onOpenChange, onApprove, onReject }: Props) {
  const [reason, setReason] = React.useState("");
  const [selectedDocumentIndex, setSelectedDocumentIndex] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!open) setReason("");
  }, [open]);

  const canReject = Boolean(truck) && reason.trim().length > 0;
  const canApprove = Boolean(truck) && truck?.approvalStatus === "PENDING";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="rounded-lg border border-border bg-background max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>차량 승인 상세 검토</DialogTitle>
          </DialogHeader>

          {truck ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted p-4">
                <Row label="차량 ID" value={truck.truckId} />
                <Separator className="my-2" />
                <Row label="기사명" value={truck.driverName} />
                <Separator className="my-2" />
                <Row label="차량번호" value={truck.plateNumber} />
                <Separator className="my-2" />
                <Row label="차종" value={truck.vehicleType} />
                <Separator className="my-2" />
                <Row label="적재용량" value={`${truck.capacity}kg`} />
                <Separator className="my-2" />
                <Row label="제조년도" value={String(truck.manufacturingYear)} />
                <Separator className="my-2" />
                <Row label="신청 일시" value={truck.requestedAt} />
              </div>

              {truck.documents && truck.documents.length > 0 && (
                <div className="space-y-2">
                  <Label>제출 서류</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {truck.documents.map((doc, idx) => (
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
                            {doc.documentType === "truck_registration"
                              ? "차량등록증"
                              : doc.documentType === "truck_insurance"
                              ? "보험증권"
                              : "정기검사증"}
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
                <Label htmlFor="truck-review-reason">상세 검토 메모 / 거부 사유</Label>
                <Textarea
                  id="truck-review-reason"
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
                if (!truck) return;
                onApprove(truck.truckId);
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
                if (!truck) return;
                onReject(truck.truckId, reason.trim());
                onOpenChange(false);
              }}
            >
              승인 거부
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DocumentPreviewModal
        document={truck && selectedDocumentIndex !== null ? truck.documents?.[selectedDocumentIndex] : undefined}
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
