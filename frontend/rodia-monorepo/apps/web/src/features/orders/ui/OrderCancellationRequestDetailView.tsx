import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { fetchCancellationRequestDetail, reviewCancellationRequest } from "@/features/orders/api/ordersApi";
import type {
  CancellationApprovalStatus,
  CancellationRequestDetail,
  CancellationReviewPayload,
} from "@/features/orders/model/types";
import { CancellationReviewDialog } from "@/features/orders/ui/CancellationReviewDialog";
import { Badge } from "@/shared/ui/shadcn/badge";
import { Button } from "@/shared/ui/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Separator } from "@/shared/ui/shadcn/separator";

type Props = {
  backTo: "/orders/cancellations" | "/ops/matching-anomalies";
};

function approvalLabel(status: CancellationApprovalStatus): string {
  if (status === "APPROVED") return "승인";
  if (status === "REJECTED") return "반려";
  return "대기";
}

function approvalBadge(status: CancellationApprovalStatus): "default" | "secondary" | "destructive" | "outline" {
  if (status === "APPROVED") return "secondary";
  if (status === "REJECTED") return "destructive";
  return "outline";
}

function requesterRoleLabel(role: CancellationRequestDetail["request"]["requestedByRole"]): string {
  if (role === "SHIPPER") return "화주";
  if (role === "DRIVER") return "기사";
  return "확인 필요";
}

function matchStatusLabel(status: string, accepted: boolean): string {
  const upper = status.trim().toUpperCase();
  if (upper === "CANCELLED" || upper === "CANCELED") return "취소";
  if (upper === "COMPLETED" || upper === "DELIVERED") return "배차완료";
  if (upper === "IN_TRANSIT" || upper === "TRANSIT") return "배차중";
  if (upper === "READY" || upper === "MATCHED" || upper === "ACCEPTED") return accepted ? "배차중" : "매칭중";
  return status || "-";
}

function quoteStatusLabel(status: string): string {
  const upper = status.trim().toUpperCase();
  if (upper === "CANCELLED" || upper === "CANCELED") return "취소";
  if (upper === "COMPLETED" || upper === "DELIVERED") return "배차완료";
  if (upper === "IN_TRANSIT" || upper === "TRANSIT") return "배차중";
  if (upper === "MATCHED" || upper === "ACCEPTED") return "배차중";
  if (upper === "OPEN" || upper === "READY") return "매칭중";
  return status || "-";
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-foreground">{label}</span>
      <span className="text-foreground opacity-80">{value}</span>
    </div>
  );
}

export function OrderCancellationRequestDetailView({ backTo }: Props) {
  const navigate = useNavigate();
  const { requestId } = useParams<{ requestId: string }>();
  const [detail, setDetail] = React.useState<CancellationRequestDetail | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = React.useState(false);
  const [reviewSubmitting, setReviewSubmitting] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!requestId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetchCancellationRequestDetail(requestId);
      if (!response) {
        setDetail(null);
        setError("요청 정보를 찾을 수 없습니다.");
        return;
      }
      setDetail(response);
    } catch {
      setError("상세 정보를 불러오지 못했습니다.");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const handleReview = async (payload: CancellationReviewPayload) => {
    setReviewSubmitting(true);
    try {
      await reviewCancellationRequest(payload);
      setNotice(`요청 ${payload.requestId} 검토를 완료했습니다.`);
      await load();
      setReviewOpen(false);
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Card className="rounded-lg border border-border bg-background">
          <CardContent className="p-6 text-sm text-foreground">
            {"상세 정보를 불러오는 중입니다."}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Card className="rounded-lg border border-border bg-background">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base font-semibold">{"취소 요청 상세"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-foreground">{error ?? "상세 정보가 없습니다."}</p>
            <Button type="button" variant="secondary" onClick={() => navigate(backTo)}>
              {"목록으로"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { request, shipper, driver, quote, match, payment, settlement } = detail;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="space-y-4">
        {notice ? (
          <Card className="rounded-lg border border-border bg-background">
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <p className="text-sm text-foreground">{notice}</p>
              <Button type="button" size="sm" variant="secondary" onClick={() => setNotice(null)}>
                {"닫기"}
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <Card className="rounded-lg border border-border bg-background">
          <CardHeader className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-lg font-semibold">{"취소 요청 상세"}</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant={approvalBadge(request.approvalStatus)}>{approvalLabel(request.approvalStatus)}</Badge>
                <Button type="button" variant="secondary" asChild>
                  <Link to={backTo}>{"목록으로"}</Link>
                </Button>
                <Button
                  type="button"
                  onClick={() => setReviewOpen(true)}
                  disabled={request.approvalStatus !== "PENDING"}
                >
                  {"검토 처리"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow label="요청 ID" value={request.requestId} />
            <Separator />
            <DetailRow label="요청자" value={`${requesterRoleLabel(request.requestedByRole)} / ${request.requestedByName}`} />
            <Separator />
            <DetailRow label="요청 시각" value={request.requestedAt} />
            <Separator />
            <DetailRow label="취소 사유" value={request.cancelReason} />
            {request.reviewedAt ? (
              <>
                <Separator />
                <DetailRow label="검토 시각" value={request.reviewedAt} />
              </>
            ) : null}
            {request.reviewMemo ? (
              <>
                <Separator />
                <DetailRow label="검토 메모" value={request.reviewMemo} />
              </>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="rounded-lg border border-border bg-background">
            <CardHeader className="space-y-1">
              <CardTitle className="text-base font-semibold">{"화주 정보"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <DetailRow label="화주 ID" value={shipper.id} />
              <Separator />
              <DetailRow label="이름" value={shipper.name} />
              <Separator />
              <DetailRow label="연락처" value={shipper.phone} />
              <Separator />
              <DetailRow label="이메일" value={shipper.email ?? "-"} />
              <Separator />
              <DetailRow label="상태" value={shipper.status ?? "-"} />
            </CardContent>
          </Card>

          <Card className="rounded-lg border border-border bg-background">
            <CardHeader className="space-y-1">
              <CardTitle className="text-base font-semibold">{"기사 정보"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <DetailRow label="기사 ID" value={driver.id} />
              <Separator />
              <DetailRow label="이름" value={driver.name} />
              <Separator />
              <DetailRow label="연락처" value={driver.phone} />
              <Separator />
              <DetailRow label="이메일" value={driver.email ?? "-"} />
              <Separator />
              <DetailRow label="상태" value={driver.status ?? "-"} />
            </CardContent>
          </Card>

          <Card className="rounded-lg border border-border bg-background">
            <CardHeader className="space-y-1">
              <CardTitle className="text-base font-semibold">{"견적/매칭 정보"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <DetailRow label="견적 ID" value={quote.quoteId} />
              <Separator />
              <DetailRow label="견적 상태" value={quoteStatusLabel(quote.status)} />
              <Separator />
              <DetailRow label="매칭 ID" value={match.matchId} />
              <Separator />
              <DetailRow label="매칭 상태" value={matchStatusLabel(match.status, match.accepted)} />
              <Separator />
              <DetailRow label="화물" value={quote.cargoName} />
              <Separator />
              <DetailRow label="상차지" value={quote.originAddress} />
              <Separator />
              <DetailRow label="하차지" value={quote.destinationAddress} />
              <Separator />
              <DetailRow
                label="운임"
                value={typeof quote.finalPrice === "number" ? `${quote.finalPrice.toLocaleString()}원` : "-"}
              />
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-lg border border-border bg-background">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base font-semibold">{"결제/정산 정보"}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-muted p-3">
              <div className="mb-2 text-sm font-semibold text-foreground">{"결제"}</div>
              <div className="space-y-2">
                <DetailRow label="결제 상태" value={payment?.status ?? "-"} />
                <Separator />
                <DetailRow
                  label="결제 금액"
                  value={typeof payment?.totalAmount === "number" ? `${payment.totalAmount.toLocaleString()}원` : "-"}
                />
                <Separator />
                <DetailRow label="결제 시각" value={payment?.paidAt ?? "-"} />
              </div>
            </div>
            <div className="rounded-lg border border-border bg-muted p-3">
              <div className="mb-2 text-sm font-semibold text-foreground">{"정산"}</div>
              <div className="space-y-2">
                <DetailRow label="정산 상태" value={settlement?.status ?? "-"} />
                <Separator />
                <DetailRow
                  label="정산 운임"
                  value={typeof settlement?.totalFare === "number" ? `${settlement.totalFare.toLocaleString()}원` : "-"}
                />
                <Separator />
                <DetailRow label="정산 완료" value={settlement?.completedAt ?? "-"} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <CancellationReviewDialog
        row={detail.request}
        open={reviewOpen}
        submitting={reviewSubmitting}
        onOpenChange={setReviewOpen}
        onReview={handleReview}
      />
    </div>
  );
}

