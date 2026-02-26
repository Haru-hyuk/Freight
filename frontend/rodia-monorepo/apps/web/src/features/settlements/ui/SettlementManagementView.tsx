import * as React from "react";
import { useNavigate } from "react-router-dom";

import {
  fetchSettlementApprovalHistory,
  fetchSettlementApprovals,
  reviewSettlement,
} from "@/features/settlements/api/settlementsApi";
import type { SettlementApprovalRow } from "@/features/settlements/model/types";
import { SettlementApprovalBadge, SettlementProgressBadge } from "@/features/settlements/ui/SettlementBadges";
import { useMockMode } from "@/shared/lib/hooks/useMockMode";
import { Badge } from "@/shared/ui/shadcn/badge";
import { Button } from "@/shared/ui/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/shadcn/dialog";
import { Input } from "@/shared/ui/shadcn/input";
import { Label } from "@/shared/ui/shadcn/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/shadcn/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/shadcn/tabs";
import { Textarea } from "@/shared/ui/shadcn/textarea";

export type SettlementManagementTab = "approvals" | "withdrawals" | "history";

type SettlementManagementViewProps = {
  initialTab?: SettlementManagementTab;
};

type WithdrawalStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

type WithdrawalRow = {
  withdrawalNo: string;
  settlementId: string;
  driverName: string;
  requestedAt: string;
  amount: number;
  status: WithdrawalStatus;
  account: string;
};

type ReviewDialogState = {
  open: boolean;
  row: SettlementApprovalRow | null;
  action: "APPROVE" | "REJECT";
  reason: string;
};

const APPROVAL_STATUS_LABELS: Record<"ALL" | "PENDING" | "APPROVED" | "REJECTED", string> = {
  ALL: "전체",
  PENDING: "검토 대기",
  APPROVED: "승인",
  REJECTED: "거절",
};

const WITHDRAWAL_STATUS_LABELS: Record<"ALL" | WithdrawalStatus, string> = {
  ALL: "전체",
  PENDING: "출금 대기",
  PROCESSING: "처리 중",
  COMPLETED: "완료",
  FAILED: "실패",
};

function mergeRows(approvals: SettlementApprovalRow[], history: SettlementApprovalRow[]): SettlementApprovalRow[] {
  const map = new Map<string, SettlementApprovalRow>();
  for (const row of [...approvals, ...history]) {
    map.set(row.settlementId, row);
  }

  return Array.from(map.values()).sort((a, b) => {
    const aTime = new Date(a.dueDate).getTime();
    const bTime = new Date(b.dueDate).getTime();
    if (Number.isNaN(aTime) && Number.isNaN(bTime)) return a.settlementId.localeCompare(b.settlementId);
    if (Number.isNaN(aTime)) return 1;
    if (Number.isNaN(bTime)) return -1;
    return bTime - aTime;
  });
}

function toWithdrawalStatus(row: SettlementApprovalRow): WithdrawalStatus {
  if (row.approvalStatus === "REJECTED") return "FAILED";
  if (row.approvalStatus === "PENDING") return "PENDING";
  if (row.settlementStatus === "PROCESSING") return "PROCESSING";
  if (row.settlementStatus === "FAILED") return "FAILED";
  return "COMPLETED";
}

function toWithdrawalRows(rows: SettlementApprovalRow[]): WithdrawalRow[] {
  return rows.map((row, index) => ({
    withdrawalNo: `출금-${row.settlementId}`,
    settlementId: row.settlementId,
    driverName: row.driverName,
    requestedAt: row.dueDate,
    amount: row.driverPayout,
    status: toWithdrawalStatus(row),
    account: `정산계좌-${(index % 5) + 1} ${String(100000 + index).padStart(6, "0")}`,
  }));
}

function WithdrawalStatusBadge({ status }: { status: WithdrawalStatus }) {
  if (status === "COMPLETED") return <Badge variant="secondary">완료</Badge>;
  if (status === "FAILED") return <Badge variant="destructive">실패</Badge>;
  if (status === "PROCESSING") return <Badge variant="outline">처리 중</Badge>;
  return <Badge variant="outline">출금 대기</Badge>;
}

function getStatusOptions(activeTab: SettlementManagementTab): Array<{ value: string; label: string }> {
  if (activeTab === "withdrawals") {
    return Object.entries(WITHDRAWAL_STATUS_LABELS).map(([value, label]) => ({ value, label }));
  }
  return Object.entries(APPROVAL_STATUS_LABELS).map(([value, label]) => ({ value, label }));
}

export function SettlementManagementView({ initialTab = "approvals" }: SettlementManagementViewProps) {
  const navigate = useNavigate();
  const { enabled: mockModeEnabled } = useMockMode();

  const [activeTab, setActiveTab] = React.useState<SettlementManagementTab>(initialTab);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("ALL");

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pendingRows, setPendingRows] = React.useState<SettlementApprovalRow[]>([]);
  const [historyRows, setHistoryRows] = React.useState<SettlementApprovalRow[]>([]);

  const [reviewDialog, setReviewDialog] = React.useState<ReviewDialogState>({
    open: false,
    row: null,
    action: "APPROVE",
    reason: "",
  });

  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  React.useEffect(() => {
    setStatusFilter("ALL");
  }, [activeTab]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pending, history] = await Promise.all([fetchSettlementApprovals(), fetchSettlementApprovalHistory()]);
      setPendingRows(pending);
      setHistoryRows(history);
    } catch {
      setPendingRows([]);
      setHistoryRows([]);
      setError("정산 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load, mockModeEnabled]);

  const allRows = React.useMemo(() => mergeRows(pendingRows, historyRows), [pendingRows, historyRows]);
  const withdrawalRows = React.useMemo(() => toWithdrawalRows(allRows), [allRows]);

  const filteredApprovals = React.useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return pendingRows.filter((row) => {
      if (statusFilter !== "ALL" && row.approvalStatus !== statusFilter) return false;
      if (!keyword) return true;
      const text = `${row.settlementId} ${row.matchId} ${row.driverName} ${row.shipperName}`.toLowerCase();
      return text.includes(keyword);
    });
  }, [pendingRows, search, statusFilter]);

  const filteredHistory = React.useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return historyRows.filter((row) => {
      if (statusFilter !== "ALL" && row.approvalStatus !== statusFilter) return false;
      if (!keyword) return true;
      const text = `${row.settlementId} ${row.matchId} ${row.driverName} ${row.shipperName}`.toLowerCase();
      return text.includes(keyword);
    });
  }, [historyRows, search, statusFilter]);

  const filteredWithdrawals = React.useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return withdrawalRows.filter((row) => {
      if (statusFilter !== "ALL" && row.status !== statusFilter) return false;
      if (!keyword) return true;
      const text = `${row.withdrawalNo} ${row.settlementId} ${row.driverName} ${row.account}`.toLowerCase();
      return text.includes(keyword);
    });
  }, [withdrawalRows, search, statusFilter]);

  const summary = React.useMemo(() => {
    const pendingCount = pendingRows.length;
    const processingCount = withdrawalRows.filter((row) => row.status === "PROCESSING").length;
    const completedCount = allRows.filter((row) => row.settlementStatus === "COMPLETED").length;
    const totalPayout = allRows.reduce((sum, row) => sum + row.driverPayout, 0);
    return { pendingCount, processingCount, completedCount, totalPayout };
  }, [pendingRows, withdrawalRows, allRows]);

  const openReview = (row: SettlementApprovalRow, action: "APPROVE" | "REJECT") => {
    setReviewDialog({
      open: true,
      row,
      action,
      reason: "",
    });
  };

  const closeReview = () => {
    setReviewDialog({
      open: false,
      row: null,
      action: "APPROVE",
      reason: "",
    });
  };

  const submitReview = async () => {
    if (!reviewDialog.row) return;
    if (reviewDialog.action === "REJECT" && reviewDialog.reason.trim().length === 0) return;

    await reviewSettlement({
      settlementId: reviewDialog.row.settlementId,
      action: reviewDialog.action,
      reason: reviewDialog.reason.trim() || undefined,
    });

    closeReview();
    await load();
  };

  const statusOptions = React.useMemo(() => getStatusOptions(activeTab), [activeTab]);

  return (
    <div className="min-h-screen space-y-6 bg-background text-foreground">
      <div>
        <h1 className="text-3xl font-semibold">정산 관리</h1>
        <p className="text-sm text-foreground opacity-70">정산 승인, 출금 처리, 정산 이력을 한 화면에서 관리합니다.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <Card className="rounded-lg border border-border bg-background">
          <CardContent className="space-y-2 p-4">
            <p className="text-sm text-foreground opacity-70">승인 대기</p>
            <p className="text-2xl font-semibold">{summary.pendingCount}</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg border border-border bg-background">
          <CardContent className="space-y-2 p-4">
            <p className="text-sm text-foreground opacity-70">출금 처리 중</p>
            <p className="text-2xl font-semibold">{summary.processingCount}</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg border border-border bg-background">
          <CardContent className="space-y-2 p-4">
            <p className="text-sm text-foreground opacity-70">정산 완료</p>
            <p className="text-2xl font-semibold">{summary.completedCount}</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg border border-border bg-background">
          <CardContent className="space-y-2 p-4">
            <p className="text-sm text-foreground opacity-70">총 정산금</p>
            <p className="text-2xl font-semibold">{Math.round(summary.totalPayout).toLocaleString()}원</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-lg border border-border bg-background">
        <CardHeader>
          <CardTitle className="text-base">필터</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="정산번호, 매칭번호, 기사명, 화주명"
            className="border border-border bg-background text-foreground focus:ring-2 focus:ring-primary"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:ring-2 focus:ring-primary"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {error ? (
        <div className="rounded-lg border border-border bg-muted px-4 py-3 text-sm text-foreground">{error}</div>
      ) : null}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SettlementManagementTab)}>
        <TabsList className="grid w-full grid-cols-3 rounded-lg border border-border bg-muted p-1">
          <TabsTrigger
            value="approvals"
            className="text-foreground data-[state=active]:bg-secondary data-[state=active]:text-foreground"
          >
            정산 승인
          </TabsTrigger>
          <TabsTrigger
            value="withdrawals"
            className="text-foreground data-[state=active]:bg-secondary data-[state=active]:text-foreground"
          >
            출금 관리
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="text-foreground data-[state=active]:bg-secondary data-[state=active]:text-foreground"
          >
            정산 이력
          </TabsTrigger>
        </TabsList>

        <TabsContent value="approvals" className="mt-4">
          <Card className="rounded-lg border border-border bg-background">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">승인 대기 목록</CardTitle>
              <p className="text-sm text-foreground opacity-70">행을 클릭하면 정산 상세 페이지로 이동합니다.</p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto rounded-lg border border-border bg-background">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted">
                      <TableHead>정산번호</TableHead>
                      <TableHead>매칭번호</TableHead>
                      <TableHead>기사 / 화주</TableHead>
                      <TableHead>정산 예정일</TableHead>
                      <TableHead>정산 상태</TableHead>
                      <TableHead>승인 상태</TableHead>
                      <TableHead className="text-right">처리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-10 text-center text-foreground opacity-70">
                          로딩 중...
                        </TableCell>
                      </TableRow>
                    ) : filteredApprovals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-10 text-center text-foreground opacity-70">
                          승인 대기 건이 없습니다.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredApprovals.map((row) => (
                        <TableRow
                          key={row.settlementId}
                          className="cursor-pointer hover:bg-muted"
                          onClick={() => navigate(`/settlement/${row.settlementId}`)}
                        >
                          <TableCell className="font-semibold">{row.settlementId}</TableCell>
                          <TableCell>{row.matchId}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p>{row.driverName}</p>
                              <p className="text-sm text-foreground opacity-70">{row.shipperName}</p>
                            </div>
                          </TableCell>
                          <TableCell>{row.dueDate}</TableCell>
                          <TableCell>
                            <SettlementProgressBadge status={row.settlementStatus} />
                          </TableCell>
                          <TableCell>
                            <SettlementApprovalBadge status={row.approvalStatus} />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openReview(row, "APPROVE");
                                }}
                              >
                                승인
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openReview(row, "REJECT");
                                }}
                              >
                                거절
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdrawals" className="mt-4">
          <Card className="rounded-lg border border-border bg-background">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">출금 처리 목록</CardTitle>
              <p className="text-sm text-foreground opacity-70">행을 클릭하면 정산 상세 페이지로 이동합니다.</p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto rounded-lg border border-border bg-background">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted">
                      <TableHead>출금번호</TableHead>
                      <TableHead>정산번호</TableHead>
                      <TableHead>기사명</TableHead>
                      <TableHead>계좌 정보</TableHead>
                      <TableHead>출금액</TableHead>
                      <TableHead>출금 상태</TableHead>
                      <TableHead className="text-right">처리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-10 text-center text-foreground opacity-70">
                          로딩 중...
                        </TableCell>
                      </TableRow>
                    ) : filteredWithdrawals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-10 text-center text-foreground opacity-70">
                          출금 건이 없습니다.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredWithdrawals.map((row) => (
                        <TableRow
                          key={row.withdrawalNo}
                          className="cursor-pointer hover:bg-muted"
                          onClick={() => navigate(`/settlement/${row.settlementId}`)}
                        >
                          <TableCell className="font-semibold">{row.withdrawalNo}</TableCell>
                          <TableCell>{row.settlementId}</TableCell>
                          <TableCell>{row.driverName}</TableCell>
                          <TableCell>{row.account}</TableCell>
                          <TableCell>{Math.round(row.amount).toLocaleString()}원</TableCell>
                          <TableCell>
                            <WithdrawalStatusBadge status={row.status} />
                          </TableCell>
                          <TableCell className="text-right">
                            {row.status === "PENDING" ? (
                              <div className="flex justify-end gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    const source = allRows.find((item) => item.settlementId === row.settlementId);
                                    if (!source) return;
                                    openReview(source, "APPROVE");
                                  }}
                                >
                                  승인
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    const source = allRows.find((item) => item.settlementId === row.settlementId);
                                    if (!source) return;
                                    openReview(source, "REJECT");
                                  }}
                                >
                                  거절
                                </Button>
                              </div>
                            ) : (
                              <p className="text-sm text-foreground opacity-70">처리됨</p>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card className="rounded-lg border border-border bg-background">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">정산 이력</CardTitle>
              <p className="text-sm text-foreground opacity-70">행을 클릭하면 정산 상세 페이지로 이동합니다.</p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto rounded-lg border border-border bg-background">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted">
                      <TableHead>정산번호</TableHead>
                      <TableHead>매칭번호</TableHead>
                      <TableHead>기사명</TableHead>
                      <TableHead>정산 상태</TableHead>
                      <TableHead>승인 결과</TableHead>
                      <TableHead>검토 메모</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-foreground opacity-70">
                          로딩 중...
                        </TableCell>
                      </TableRow>
                    ) : filteredHistory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-foreground opacity-70">
                          정산 이력이 없습니다.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredHistory.map((row) => (
                        <TableRow
                          key={row.settlementId}
                          className="cursor-pointer hover:bg-muted"
                          onClick={() => navigate(`/settlement/${row.settlementId}`)}
                        >
                          <TableCell className="font-semibold">{row.settlementId}</TableCell>
                          <TableCell>{row.matchId}</TableCell>
                          <TableCell>{row.driverName}</TableCell>
                          <TableCell>
                            <SettlementProgressBadge status={row.settlementStatus} />
                          </TableCell>
                          <TableCell>
                            <SettlementApprovalBadge status={row.approvalStatus} />
                          </TableCell>
                          <TableCell>{row.reviewMemo ?? "-"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={reviewDialog.open} onOpenChange={(open) => (open ? null : closeReview())}>
        <DialogContent className="rounded-lg border border-border bg-background">
          <DialogHeader>
            <DialogTitle>{reviewDialog.action === "APPROVE" ? "정산 승인" : "정산 거절"}</DialogTitle>
          </DialogHeader>

          {reviewDialog.row ? (
            <div className="space-y-4">
              <div className="space-y-2 rounded-lg border border-border bg-muted p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-foreground opacity-70">정산번호</span>
                  <span className="font-medium">{reviewDialog.row.settlementId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-foreground opacity-70">기사명</span>
                  <span className="font-medium">{reviewDialog.row.driverName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-foreground opacity-70">정산금</span>
                  <span className="font-medium">{Math.round(reviewDialog.row.driverPayout).toLocaleString()}원</span>
                </div>
              </div>

              {reviewDialog.action === "REJECT" ? (
                <div className="space-y-2">
                  <Label htmlFor="settlement-reject-reason">거절 사유</Label>
                  <Textarea
                    id="settlement-reject-reason"
                    value={reviewDialog.reason}
                    onChange={(event) => setReviewDialog((prev) => ({ ...prev, reason: event.target.value }))}
                    placeholder="거절 사유를 입력하세요."
                    className="border border-border bg-background text-foreground focus:ring-2 focus:ring-primary"
                  />
                </div>
              ) : null}
            </div>
          ) : null}

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
