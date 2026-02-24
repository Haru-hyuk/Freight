import * as React from "react";
import { X, Download } from "lucide-react";

import { Button } from "@/shared/ui/shadcn/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/shadcn/dialog";
import type { VerificationDocument } from "@/features/drivers/model/types";

type Props = {
  document?: VerificationDocument;
  onClose: () => void;
};

export function DocumentPreviewModal({ document, onClose }: Props) {
  if (!document) return null;

  const getDocumentTitle = (type: string) => {
    switch (type) {
      case "driver_cargo_license":
        return "화물운송 자격증";
      case "driver_vehicle_registration":
        return "차량등록증";
      default:
        return "문서";
    }
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = document.imageUri;
    link.download = `${getDocumentTitle(document.documentType)}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={Boolean(document)} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl rounded-lg border border-border bg-background">
        <DialogHeader className="flex items-center justify-between">
          <DialogTitle>{getDocumentTitle(document.documentType)}</DialogTitle>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-4">
          {/* 이미지 미리보기 */}
          <div className="flex justify-center bg-muted p-4 rounded-lg">
            <img
              src={document.imageUri}
              alt={getDocumentTitle(document.documentType)}
              className="max-h-[400px] w-auto object-contain rounded"
            />
          </div>

          {/* 문서 정보 */}
          <div className="space-y-3 bg-muted p-4 rounded-lg">
            <div className="text-sm">
              <span className="font-medium text-foreground">스캔 일시: </span>
              <span className="text-muted-foreground">{document.scannedAt}</span>
            </div>
            <div className="text-sm">
              <span className="font-medium text-foreground">신뢰도: </span>
              <span className={`font-semibold ${
                document.confidence >= 0.95 ? "text-green-600" :
                document.confidence >= 0.85 ? "text-yellow-600" :
                "text-red-600"
              }`}>
                {Math.round(document.confidence * 100)}%
              </span>
            </div>
          </div>

          {/* 추출된 정보 */}
          {document.fields && Object.keys(document.fields).length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">추출된 정보</h4>
              <div className="bg-muted p-4 rounded-lg space-y-2">
                {Object.entries(document.fields).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-b-0">
                    <span className="text-muted-foreground capitalize">
                      {key === "licenseNo" ? "면허번호" :
                       key === "issueDate" ? "발급일" :
                       key === "expiryDate" ? "만료일" :
                       key === "plateNumber" ? "차량번호" :
                       key === "vehicleType" ? "차량 유형" :
                       key === "owner" ? "소유자" :
                       key === "registerDate" ? "등록일" :
                       key === "name" ? "이름" :
                       key}
                    </span>
                    <span className="font-medium text-foreground">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {document.confidence >= 0.95 && "✓ 고품질 스캔"}
            {document.confidence >= 0.85 && document.confidence < 0.95 && "⚠ 보통 품질 스캔"}
            {document.confidence < 0.85 && "⚠ 저품질 스캔 - 재제출 권장"}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleDownload}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              다운로드
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
            >
              닫기
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
