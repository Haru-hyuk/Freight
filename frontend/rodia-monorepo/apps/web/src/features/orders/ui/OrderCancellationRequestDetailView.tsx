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
  if (status === "APPROVED") return "\uC2B9\uC778";
  if (status === "REJECTED") return "\uBC18\uB824";
  return "\uB300\uAE30";
}

function approvalBadge(status: CancellationApprovalStatus): "default" | "secondary" | "destructive" | "outline" {
  if (status === "APPROVED") return "secondary";
  if (status === "REJECTED") return "destructive";
  return "outline";
}

function requesterRoleLabel(role: CancellationRequestDetail["request"]["requestedByRole"]): string {
  if (role === "SHIPPER") return "\uD654\uC8FC";
  if (role === "DRIVER") return "\uAE30\uC0AC";
  return "\uD655\uC778 \uD544\uC694";
}

function matchStatusLabel(status: string, accepted: boolean): string {
  const upper = status.trim().toUpperCase();
  if (upper === "CANCELLED" || upper === "CANCELED") return "\uCDE8\uC18C";
  if (upper === "COMPLETED" || upper === "DELIVERED") return "\uBC30\uCC28\uC644\uB8CC";
  if (upper === "IN_TRANSIT" || upper === "TRANSIT") return "\uBC30\uCC28\uC911";
  if (upper === "READY" || upper === "MATCHED" || upper === "ACCEPTED") return accepted ? "\uBC30\uCC28\uC911" : "\uB9E4\uCE6D\uC911";
  return status || "-";
}

function quoteStatusLabel(status: string): string {
  const upper = status.trim().toUpperCase();
  if (upper === "CANCELLED" || upper === "CANCELED") return "\uCDE8\uC18C";
  if (upper === "COMPLETED" || upper === "DELIVERED") return "\uBC30\uCC28\uC644\uB8CC";
  if (upper === "IN_TRANSIT" || upper === "TRANSIT") return "\uBC30\uCC28\uC911";
  if (upper === "MATCHED" || upper === "ACCEPTED") return "\uBC30\uCC28\uC911";
  if (upper === "OPEN" || upper === "READY") return "\uB9E4\uCE6D\uC911";
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
        setError("\uC694\uCCAD \uC815\uBCF4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
        return;
      }
      setDetail(response);
    } catch {
      setError("\uC0C1\uC138 \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
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
      setNotice(`\uC694\uCCAD ${payload.requestId} \uAC80\uD1A0\uB97C \uC644\uB8CC\uD588\uC2B5\uB2C8\uB2E4.`);
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
            {"\uC0C1\uC138 \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4."}
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
            <CardTitle className="text-base font-semibold">{"\uCDE8\uC18C \uC694\uCCAD \uC0C1\uC138"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-foreground">{error ?? "\uC0C1\uC138 \uC815\uBCF4\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4."}</p>
            <Button type="button" variant="secondary" onClick={() => navigate(backTo)}>
              {"\uBAA9\uB85D\uC73C\uB85C"}
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
                {"\uB2EB\uAE30"}
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <Card className="rounded-lg border border-border bg-background">
          <CardHeader className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-lg font-semibold">{"\uCDE8\uC18C \uC694\uCCAD \uC0C1\uC138"}</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant={approvalBadge(request.approvalStatus)}>{approvalLabel(request.approvalStatus)}</Badge>
                <Button type="button" variant="secondary" asChild>
                  <Link to={backTo}>{"\uBAA9\uB85D\uC73C\uB85C"}</Link>
                </Button>
                <Button
                  type="button"
                  onClick={() => setReviewOpen(true)}
                  disabled={request.approvalStatus !== "PENDING"}
                >
                  {"\uAC80\uD1A0 \uCC98\uB9AC"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow label="\uC694\uCCAD ID" value={request.requestId} />
            <Separator />
            <DetailRow label="\uC694\uCCAD\uC790" value={`${requesterRoleLabel(request.requestedByRole)} / ${request.requestedByName}`} />
            <Separator />
            <DetailRow label="\uC694\uCCAD \uC2DC\uAC01" value={request.requestedAt} />
            <Separator />
            <DetailRow label="\uCDE8\uC18C \uC0AC\uC720" value={request.cancelReason} />
            {request.reviewedAt ? (
              <>
                <Separator />
                <DetailRow label="\uAC80\uD1A0 \uC2DC\uAC01" value={request.reviewedAt} />
              </>
            ) : null}
            {request.reviewMemo ? (
              <>
                <Separator />
                <DetailRow label="\uAC80\uD1A0 \uBA54\uBAA8" value={request.reviewMemo} />
              </>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="rounded-lg border border-border bg-background">
            <CardHeader className="space-y-1">
              <CardTitle className="text-base font-semibold">{"\uD654\uC8FC \uC815\uBCF4"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <DetailRow label="\uD654\uC8FC ID" value={shipper.id} />
              <Separator />
              <DetailRow label="\uC774\uB984" value={shipper.name} />
              <Separator />
              <DetailRow label="\uC5F0\uB77D\uCC98" value={shipper.phone} />
              <Separator />
              <DetailRow label="\uC774\uBA54\uC77C" value={shipper.email ?? "-"} />
              <Separator />
              <DetailRow label="\uC0C1\uD0DC" value={shipper.status ?? "-"} />
            </CardContent>
          </Card>

          <Card className="rounded-lg border border-border bg-background">
            <CardHeader className="space-y-1">
              <CardTitle className="text-base font-semibold">{"\uAE30\uC0AC \uC815\uBCF4"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <DetailRow label="\uAE30\uC0AC ID" value={driver.id} />
              <Separator />
              <DetailRow label="\uC774\uB984" value={driver.name} />
              <Separator />
              <DetailRow label="\uC5F0\uB77D\uCC98" value={driver.phone} />
              <Separator />
              <DetailRow label="\uC774\uBA54\uC77C" value={driver.email ?? "-"} />
              <Separator />
              <DetailRow label="\uC0C1\uD0DC" value={driver.status ?? "-"} />
            </CardContent>
          </Card>

          <Card className="rounded-lg border border-border bg-background">
            <CardHeader className="space-y-1">
              <CardTitle className="text-base font-semibold">{"\uACAC\uC801/\uB9E4\uCE6D \uC815\uBCF4"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <DetailRow label="\uACAC\uC801 ID" value={quote.quoteId} />
              <Separator />
              <DetailRow label="\uACAC\uC801 \uC0C1\uD0DC" value={quoteStatusLabel(quote.status)} />
              <Separator />
              <DetailRow label="\uB9E4\uCE6D ID" value={match.matchId} />
              <Separator />
              <DetailRow label="\uB9E4\uCE6D \uC0C1\uD0DC" value={matchStatusLabel(match.status, match.accepted)} />
              <Separator />
              <DetailRow label="\uD654\uBB3C" value={quote.cargoName} />
              <Separator />
              <DetailRow label="\uC0C1\uCC28\uC9C0" value={quote.originAddress} />
              <Separator />
              <DetailRow label="\uD558\uCC28\uC9C0" value={quote.destinationAddress} />
              <Separator />
              <DetailRow
                label="\uC6B4\uC784"
                value={typeof quote.finalPrice === "number" ? `${quote.finalPrice.toLocaleString()}\uC6D0` : "-"}
              />
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-lg border border-border bg-background">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base font-semibold">{"\uACB0\uC81C/\uC815\uC0B0 \uC815\uBCF4"}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-muted p-3">
              <div className="mb-2 text-sm font-semibold text-foreground">{"\uACB0\uC81C"}</div>
              <div className="space-y-2">
                <DetailRow label="\uACB0\uC81C \uC0C1\uD0DC" value={payment?.status ?? "-"} />
                <Separator />
                <DetailRow
                  label="\uACB0\uC81C \uAE08\uC561"
                  value={typeof payment?.totalAmount === "number" ? `${payment.totalAmount.toLocaleString()}\uC6D0` : "-"}
                />
                <Separator />
                <DetailRow label="\uACB0\uC81C \uC2DC\uAC01" value={payment?.paidAt ?? "-"} />
              </div>
            </div>
            <div className="rounded-lg border border-border bg-muted p-3">
              <div className="mb-2 text-sm font-semibold text-foreground">{"\uC815\uC0B0"}</div>
              <div className="space-y-2">
                <DetailRow label="\uC815\uC0B0 \uC0C1\uD0DC" value={settlement?.status ?? "-"} />
                <Separator />
                <DetailRow
                  label="\uC815\uC0B0 \uC6B4\uC784"
                  value={typeof settlement?.totalFare === "number" ? `${settlement.totalFare.toLocaleString()}\uC6D0` : "-"}
                />
                <Separator />
                <DetailRow label="\uC815\uC0B0 \uC644\uB8CC" value={settlement?.completedAt ?? "-"} />
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
