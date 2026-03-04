import * as React from "react";
import { ArrowLeft, Eye } from "lucide-react";
import { Link } from "react-router-dom";

import { fetchDriverApprovals, reviewDriverApproval } from "@/features/drivers/api/driverApprovalsApi";
import type { DriverApprovalRow, VerificationDocument } from "@/features/drivers/model/types";
import { DocumentPreviewModal } from "@/features/drivers/ui/DocumentPreviewModal";
import { DriverApprovalStatusBadge, DriverLicenseBadge } from "@/features/drivers/ui/DriverApprovalBadges";
import { useMockMode } from "@/shared/lib/hooks/useMockMode";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/shadcn/alert";
import { Button } from "@/shared/ui/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Label } from "@/shared/ui/shadcn/label";
import { Separator } from "@/shared/ui/shadcn/separator";
import { Textarea } from "@/shared/ui/shadcn/textarea";

type Props = {
  driverId: string;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-foreground/70">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function resolveDocumentLabel(type: VerificationDocument["documentType"]): string {
  if (type === "driver_cargo_license") return "화물 운송 자격증";
  return "차량 등록증";
}

export function DriverApprovalDetailView({ driverId }: Props) {
  const { enabled: mockModeEnabled } = useMockMode();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [row, setRow] = React.useState<DriverApprovalRow | null>(null);
  const [reason, setReason] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [selectedDocumentIndex, setSelectedDocumentIndex] = React.useState<number | null>(null);

  const load = React.useCallback(async () => {
    if (!driverId) {
      setRow(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const items = await fetchDriverApprovals();
      const target = items.find((item) => item.driverId === driverId) ?? null;
      setRow(target);
    } catch {
      setRow(null);
      setError("차주 승인 상세 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [driverId]);

  React.useEffect(() => {
    void load();
  }, [load, mockModeEnabled]);

  const handleReview = async (action: "APPROVE" | "REJECT") => {
    if (!row) return;
    const trimmed = reason.trim();
    if (action === "REJECT" && trimmed.length === 0) {
      setNotice("거절 처리 시 사유를 입력해 주세요.");
      return;
    }

    setSubmitting(true);
    setNotice(null);
    try {
      await reviewDriverApproval({
        driverId: row.driverId,
        action,
        reason: action === "REJECT" ? trimmed : undefined,
      });
      setReason("");
      setNotice(action === "APPROVE" ? "승인 처리가 완료되었습니다." : "거절 처리가 완료되었습니다.");
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const selectedDocument =
    row && selectedDocumentIndex !== null ? row.documents?.[selectedDocumentIndex] : undefined;

  if (!driverId) {
    return (
      <div className="min-h-screen rounded-lg border border-border bg-background p-6 text-foreground">
        잘못된 차주 승인 상세 경로입니다.
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-5 bg-background text-foreground">
      <div className="space-y-3">
        <Button asChild type="button" variant="secondary" size="sm">
          <Link to="/drivers/approvals" className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            차주 승인 목록으로 돌아가기
          </Link>
        </Button>

        <div>
          <h1 className="text-2xl font-semibold">차주 승인 상세</h1>
          <p className="text-sm text-foreground/70">차주 신청 정보와 제출 서류를 검토하고 승인 상태를 처리합니다.</p>
        </div>
      </div>

      {notice ? (
        <Alert className="border border-border bg-muted">
          <AlertTitle>검토 상태</AlertTitle>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>조회 실패</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <Card className="rounded-lg border border-border bg-background">
          <CardContent className="py-10 text-center text-sm text-foreground/70">로딩 중...</CardContent>
        </Card>
      ) : null}

      {!loading && !row ? (
        <Card className="rounded-lg border border-border bg-background">
          <CardContent className="py-10 text-center text-sm text-foreground/70">해당 차주 승인 건을 찾을 수 없습니다.</CardContent>
        </Card>
      ) : null}

      {row ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card className="rounded-lg border border-border bg-background xl:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <DetailRow label="기사 ID" value={row.driverId} />
              <Separator />
              <DetailRow label="이름" value={row.name} />
              <Separator />
              <DetailRow label="연락처" value={row.phone} />
              <Separator />
              <DetailRow label="차량" value={row.vehicleSummary} />
              <Separator />
              <DetailRow label="신청 일시" value={row.requestedAt} />
              <Separator />
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-foreground/70">면허 상태</span>
                <DriverLicenseBadge status={row.licenseStatus} />
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-foreground/70">승인 상태</span>
                <DriverApprovalStatusBadge status={row.approvalStatus} />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border border-border bg-background xl:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">서류 및 검토</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {row.documents && row.documents.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {row.documents.map((document, index) => (
                    <div key={`${document.documentType}-${index}`} className="rounded-lg border border-border bg-muted p-3">
                      <div className="aspect-[4/3] overflow-hidden rounded-md border border-border bg-background">
                        <img src={document.imageUri} alt={resolveDocumentLabel(document.documentType)} className="h-full w-full object-cover" />
                      </div>
                      <div className="mt-3 space-y-2">
                        <div className="text-sm font-semibold">{resolveDocumentLabel(document.documentType)}</div>
                        <div className="text-xs text-foreground/70">신뢰도: {Math.round(document.confidence * 100)}%</div>
                        <Button type="button" size="sm" variant="secondary" className="w-full" onClick={() => setSelectedDocumentIndex(index)}>
                          <Eye className="mr-1 h-3 w-3" />
                          상세보기
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-border bg-muted p-4 text-sm text-foreground/70">제출된 서류가 없습니다.</div>
              )}

              <div className="space-y-2">
                <Label htmlFor="driver-approval-reason" className="text-sm font-semibold">
                  상세 검토 메모 / 거절 사유
                </Label>
                <Textarea
                  id="driver-approval-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="거절 시 사유를 입력하세요."
                  className="border border-border bg-background text-foreground focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => void handleReview("APPROVE")}
                  disabled={submitting || row.approvalStatus !== "PENDING"}
                >
                  승인 처리
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => void handleReview("REJECT")}
                  disabled={submitting || row.approvalStatus !== "PENDING"}
                >
                  승인 거절
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <DocumentPreviewModal document={selectedDocument} onClose={() => setSelectedDocumentIndex(null)} />
    </div>
  );
}
