import { Download, X } from "lucide-react";

import { Badge } from "@/shared/ui/shadcn/badge";
import { Button } from "@/shared/ui/shadcn/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/shadcn/dialog";
import type { VerificationDocument } from "@/features/trucks/model/types";

type Props = {
  document?: VerificationDocument;
  onClose: () => void;
};

export function DocumentPreviewModal({ document: doc, onClose }: Props) {
  if (!doc) return null;

  const handleDownload = () => {
    const link = window.document.createElement("a");
    link.href = doc.imageUri;
    link.download = `${getTruckDocumentTitle(doc.documentType)}.jpg`;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  return (
    <Dialog open={Boolean(doc)} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl rounded-lg border border-border bg-background">
        <DialogHeader className="flex items-center justify-between">
          <DialogTitle className="text-xl font-semibold">{getTruckDocumentTitle(doc.documentType)}</DialogTitle>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-center rounded-lg border border-border bg-muted p-4">
            <img src={doc.imageUri} alt={getTruckDocumentTitle(doc.documentType)} className="max-h-[420px] w-auto rounded object-contain" />
          </div>

          <div className="rounded-lg border border-border bg-muted p-4">
            <div className="flex flex-wrap items-center gap-2 text-base">
              <span className="font-medium text-foreground/70">스캔 일시:</span>
              <span>{doc.scannedAt}</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-base">
              <span className="font-medium text-foreground/70">신뢰도:</span>
              <Badge variant={toConfidenceVariant(doc.confidence)}>{Math.round(doc.confidence * 100)}%</Badge>
            </div>
          </div>

          {doc.fields && Object.keys(doc.fields).length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-base font-semibold">추출 정보</h4>
              <div className="space-y-2 rounded-lg border border-border bg-muted p-4">
                {Object.entries(doc.fields).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between border-b border-border pb-2 text-base last:border-b-0">
                    <span className="text-foreground/70">{toTruckFieldLabel(key)}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="text-sm text-foreground/70">{toConfidenceLabel(doc.confidence)}</div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={handleDownload} className="gap-2 text-base">
              <Download className="h-4 w-4" />
              다운로드
            </Button>
            <Button type="button" variant="secondary" onClick={onClose} className="text-base">
              닫기
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getTruckDocumentTitle(type: string) {
  if (type === "truck_registration") return "차량 등록증";
  if (type === "truck_insurance") return "보험 증권";
  if (type === "truck_inspection") return "정기 검사증";
  return "문서";
}

function toTruckFieldLabel(key: string) {
  if (key === "plateNumber") return "차량번호";
  if (key === "vehicleType") return "차종";
  if (key === "manufacturer") return "제조사";
  if (key === "manufacturingYear") return "제조연도";
  if (key === "owner") return "소유자";
  if (key === "registerDate") return "등록일";
  if (key === "insuranceCompany") return "보험사";
  if (key === "policyNo") return "증권번호";
  if (key === "effectiveDate") return "보장 시작일";
  if (key === "expiryDate") return "보장 종료일";
  if (key === "coverageAmount") return "보장 금액";
  if (key === "inspectionDate") return "검사일";
  if (key === "nextInspection") return "다음 검사일";
  if (key === "result") return "검사 결과";
  if (key === "capacity") return "적재 용량";
  return key;
}

function toConfidenceVariant(confidence: number): "secondary" | "outline" | "destructive" {
  if (confidence >= 0.95) return "secondary";
  if (confidence >= 0.85) return "outline";
  return "destructive";
}

function toConfidenceLabel(confidence: number) {
  if (confidence >= 0.95) return "고품질 스캔";
  if (confidence >= 0.85) return "보통 품질 스캔";
  return "저품질 스캔 - 수동 검토 권장";
}
