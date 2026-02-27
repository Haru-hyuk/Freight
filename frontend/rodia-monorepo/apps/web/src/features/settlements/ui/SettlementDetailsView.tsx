import * as React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import {
  fetchSettlementApprovalHistory,
  fetchSettlementApprovals,
  fetchSettlementById,
  reviewSettlement,
} from "@/features/settlements/api/settlementsApi";
import type { SettlementApprovalRow } from "@/features/settlements/model/types";
import { SettlementApprovalBadge, SettlementProgressBadge } from "@/features/settlements/ui/SettlementBadges";
import { useMockMode } from "@/shared/lib/hooks/useMockMode";
import { Button } from "@/shared/ui/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/shadcn/dialog";
import { Label } from "@/shared/ui/shadcn/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/shadcn/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/shadcn/tabs";
import { Textarea } from "@/shared/ui/shadcn/textarea";

type SettlementDetailsViewProps = {
  settlementId: string;
};

type ReviewDialogState = {
  open: boolean;
  action: "APPROVE" | "REJECT";
  reason: string;
};

function mergeRows(approvals: SettlementApprovalRow[], history: SettlementApprovalRow[]): SettlementApprovalRow[] {
  const map = new Map<string, SettlementApprovalRow>();
  for (const row of [...approvals, ...history]) {
    map.set(row.settlementId, row);
  }
  return Array.from(map.values());
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-foreground opacity-70">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1 rounded-lg border border-border bg-background px-3 py-3">
      <p className="text-xs text-foreground opacity-70">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function paymentStatusLabel(value: string | undefined): string {
  const normalized = (value ?? "").toUpperCase();
  if (normalized === "COMPLETED") return "완료";
  if (normalized === "FAILED") return "실패";
  if (normalized === "REFUNDED") return "환불";
  if (normalized === "PENDING") return "대기";
  return value ?? "-";
}

function paymentMethodLabel(value: string | undefined): string {
  const normalized = (value ?? "").toUpperCase();
  if (normalized === "CARD") return "카드";
  if (normalized === "TRANSFER") return "계좌이체";
  if (normalized === "PREPAID") return "선불";
  return value ?? "-";
}

export function SettlementDetailsView({ settlementId }: SettlementDetailsViewProps) {
  const { enabled: mockModeEnabled } = useMockMode();

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [row, setRow] = React.useState<SettlementApprovalRow | null>(null);

  const [reviewDialog, setReviewDialog] = React.useState<ReviewDialogState>({
    open: false,
    action: "APPROVE",
    reason: "",
  });

  const load = React.useCallback(async () => {
    if (!settlementId) {
      setRow(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [pending, history] = await Promise.all([fetchSettlementApprovals(), fetchSettlementApprovalHistory()]);
      const merged = mergeRows(pending, history);
      const target = merged.find((item) => item.settlementId === settlementId);
      if (target) {
        setRow(target);
      } else {
        const single = await fetchSettlementById(settlementId);
        setRow(single);
      }
    } catch {
      setRow(null);
      setError("정산 상세 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [settlementId]);

  React.useEffect(() => {
    void load();
  }, [load, mockModeEnabled]);

  const openReview = (action: "APPROVE" | "REJECT") => {
    setReviewDialog({
      open: true,
      action,
      reason: "",
    });
  };

  const closeReview = () => {
    setReviewDialog({
      open: false,
      action: "APPROVE",
      reason: "",
    });
  };

  const submitReview = async () => {
    if (!row) return;
    if (reviewDialog.action === "REJECT" && reviewDialog.reason.trim().length === 0) return;

    await reviewSettlement({
      settlementId: row.settlementId,
      action: reviewDialog.action,
      reason: reviewDialog.reason.trim() || undefined,
    });

    closeReview();
    await load();
  };

  if (!settlementId) {
    return (
      <div className="min-h-screen rounded-lg border border-border bg-background p-6 text-foreground">잘못된 정산 경로입니다.</div>
    );
  }

  return (
    <div className="min-h-screen space-y-5 bg-background text-foreground">
      <div className="space-y-3">
        <Button asChild type="button" variant="secondary" size="sm">
          <Link to="/settlement" className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            정산 관리로 돌아가기
          </Link>
        </Button>

        <div>
          <h1 className="text-2xl font-semibold">정산 상세</h1>
          <p className="text-sm text-foreground opacity-70">정산 건의 상세 정보와 승인 처리 내역을 확인합니다.</p>
        </div>
      </div>

      {loading ? (
        <Card className="rounded-lg border border-border bg-background">
          <CardContent className="py-10 text-center text-foreground opacity-70">로딩 중...</CardContent>
        </Card>
      ) : null}

      {error ? (
        <Card className="rounded-lg border border-border bg-muted">
          <CardContent className="py-4 text-sm text-foreground">{error}</CardContent>
        </Card>
      ) : null}

      {!loading && !row ? (
        <Card className="rounded-lg border border-border bg-background">
          <CardContent className="py-10 text-center text-foreground opacity-70">해당 정산 건을 찾을 수 없습니다.</CardContent>
        </Card>
      ) : null}

      {row ? (
        <>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card className="rounded-lg border border-border bg-background xl:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">정산 요약</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="rounded-lg border border-border bg-muted p-4">
                  <p className="text-xs text-foreground opacity-70">정산번호</p>
                  <p className="mt-1 text-lg font-semibold">{row.settlementId}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <SettlementProgressBadge status={row.settlementStatus} />
                    <SettlementApprovalBadge status={row.approvalStatus} />
                  </div>
                </div>
                <div className="space-y-2 rounded-lg border border-border bg-background p-4">
                  <SummaryRow label="기사명" value={row.driverName} />
                  <SummaryRow label="화주명" value={row.shipperName} />
                  <SummaryRow label="정산 예정일" value={row.dueDate} />
                  <SummaryRow label="실지급액" value={`${Math.round(row.driverPayout).toLocaleString()}원`} />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-lg border border-border bg-background xl:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">핵심 정보</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3 pt-0 md:grid-cols-2">
                <InfoTile label="매칭번호" value={row.matchId} />
                <InfoTile label="기사번호" value={row.driverId} />
                <InfoTile label="총 운임" value={`${Math.round(row.totalFare).toLocaleString()}원`} />
                <InfoTile label="플랫폼 수수료" value={`${Math.round(row.platformFee ?? 0).toLocaleString()}원`} />
                <InfoTile label="긴급 수수료" value={`${Math.round(row.fastFee ?? 0).toLocaleString()}원`} />
                <InfoTile label="결제 상태" value={paymentStatusLabel(row.shipperPaymentStatus)} />
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="info">
            <TabsList className="grid w-full grid-cols-3 rounded-lg border border-border bg-muted p-1">
              <TabsTrigger
                value="info"
                className="text-foreground data-[state=active]:bg-secondary data-[state=active]:text-foreground"
              >
                정산 정보
              </TabsTrigger>
              <TabsTrigger
                value="review"
                className="text-foreground data-[state=active]:bg-secondary data-[state=active]:text-foreground"
              >
                승인 처리
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="text-foreground data-[state=active]:bg-secondary data-[state=active]:text-foreground"
              >
                상태 이력
              </TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="mt-4">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card className="rounded-lg border border-border bg-background">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">금액 구성</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    <SummaryRow label="총 운임" value={`${Math.round(row.totalFare).toLocaleString()}원`} />
                    <SummaryRow label="플랫폼 수수료" value={`${Math.round(row.platformFee ?? 0).toLocaleString()}원`} />
                    <SummaryRow label="긴급 수수료" value={`${Math.round(row.fastFee ?? 0).toLocaleString()}원`} />
                    <SummaryRow label="실지급액" value={`${Math.round(row.driverPayout).toLocaleString()}원`} />
                  </CardContent>
                </Card>

                <Card className="rounded-lg border border-border bg-background">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">기본 정보</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    <SummaryRow label="매칭번호" value={row.matchId} />
                    <SummaryRow label="기사번호" value={row.driverId} />
                    <SummaryRow label="기사명" value={row.driverName} />
                    <SummaryRow label="화주명" value={row.shipperName} />
                    <SummaryRow label="정산 예정일" value={row.dueDate} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="review" className="mt-4">
              <Card className="rounded-lg border border-border bg-background">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">정산 승인 처리</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="rounded-lg border border-border bg-muted p-4 text-sm">
                    <p className="text-foreground opacity-70">현재 승인 상태</p>
                    <div className="mt-2">
                      <SettlementApprovalBadge status={row.approvalStatus} />
                    </div>
                    <p className="mt-3 text-foreground opacity-70">검토 메모</p>
                    <p className="mt-1">{row.reviewMemo ?? "-"}</p>
                  </div>

                  {row.approvalStatus === "PENDING" ? (
                    <div className="flex gap-2">
                      <Button type="button" onClick={() => openReview("APPROVE")}>
                        승인
                      </Button>
                      <Button type="button" variant="destructive" onClick={() => openReview("REJECT")}>
                        거절
                      </Button>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground opacity-70">
                      이미 처리된 정산 건입니다.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <Card className="rounded-lg border border-border bg-background">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">상태 이력</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto rounded-lg border border-border bg-background">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted">
                          <TableHead>항목</TableHead>
                          <TableHead>내용</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">생성일</TableCell>
                          <TableCell>{row.createdAt ?? "-"}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">수정일</TableCell>
                          <TableCell>{row.updatedAt ?? "-"}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">완료일</TableCell>
                          <TableCell>{row.completedAt ?? "-"}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">화주 결제 상태</TableCell>
                          <TableCell>{paymentStatusLabel(row.shipperPaymentStatus)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">화주 결제 수단</TableCell>
                          <TableCell>{paymentMethodLabel(row.shipperPaymentMethod)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      ) : null}

      <Dialog open={reviewDialog.open} onOpenChange={(open) => (open ? null : closeReview())}>
        <DialogContent className="rounded-lg border border-border bg-background">
          <DialogHeader>
            <DialogTitle>{reviewDialog.action === "APPROVE" ? "정산 승인" : "정산 거절"}</DialogTitle>
          </DialogHeader>

          {reviewDialog.action === "REJECT" ? (
            <div className="space-y-2">
              <Label htmlFor="settlement-detail-reason">거절 사유</Label>
              <Textarea
                id="settlement-detail-reason"
                value={reviewDialog.reason}
                onChange={(event) => setReviewDialog((prev) => ({ ...prev, reason: event.target.value }))}
                placeholder="거절 사유를 입력하세요."
                className="border border-border bg-background text-foreground focus:ring-2 focus:ring-primary"
              />
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-muted px-4 py-3 text-sm text-foreground">해당 정산 건을 승인하시겠습니까?</div>
          )}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={closeReview}>
              취소
            </Button>
            <Button
              type="button"
              variant={reviewDialog.action === "APPROVE" ? "default" : "destructive"}
              onClick={() => void submitReview()}
              disabled={reviewDialog.action === "REJECT" && reviewDialog.reason.trim().length === 0}
            >
              {reviewDialog.action === "APPROVE" ? "승인 확정" : "거절 확정"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
