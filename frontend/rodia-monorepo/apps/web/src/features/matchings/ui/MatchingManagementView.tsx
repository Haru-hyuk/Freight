import * as React from "react";
import { Loader2, RefreshCw, Search } from "lucide-react";

import {
  cancelMatching,
  fetchMatchings,
  MatchingSource,
  MatchingStatus,
  type MatchingActionResult,
  type MatchingItem,
  type MatchingResponse,
} from "@/features/matchings/api/matchingsApi";
import { useMockMode } from "@/shared/lib/hooks/useMockMode";
import { useRefreshCooldown } from "@/shared/lib/hooks/useRefreshCooldown";
import { getMatchingProgressBadgeVariant, getMatchingProgressLabel } from "@/shared/lib/matching-progress";
import { Badge } from "@/shared/ui/shadcn/badge";
import { Button } from "@/shared/ui/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/shadcn/dialog";
import { Input } from "@/shared/ui/shadcn/input";
import { Label } from "@/shared/ui/shadcn/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/shadcn/table";
import { Textarea } from "@/shared/ui/shadcn/textarea";

type Notice = {
  tone: "info" | "error";
  message: string;
};

type CancelDialogState = {
  open: boolean;
  row: MatchingItem | null;
  reason: string;
  error: string | null;
};

const STATUS_FILTER_OPTIONS: Array<{ label: string; value: "ALL" | MatchingStatus }> = [
  { label: "전체 상태", value: "ALL" },
  { label: "매칭중", value: MatchingStatus.READY },
  { label: "배차중", value: MatchingStatus.IN_TRANSIT },
  { label: "배차완료", value: MatchingStatus.COMPLETED },
  { label: "취소", value: MatchingStatus.CANCELLED },
];

const SOURCE_LABELS: Record<MatchingSource, string> = {
  [MatchingSource.ADMIN]: "관리자",
  [MatchingSource.SHIPPER]: "화주",
  [MatchingSource.DRIVER]: "기사",
  [MatchingSource.OPEN_POOL]: "공개 풀",
  [MatchingSource.NOTIFICATION]: "알림 연동",
};

const SOURCE_FILTER_OPTIONS: Array<{ label: string; value: "ALL" | MatchingSource }> = [
  { label: "전체 출처", value: "ALL" },
  { label: "관리자", value: MatchingSource.ADMIN },
  { label: "화주", value: MatchingSource.SHIPPER },
  { label: "기사", value: MatchingSource.DRIVER },
  { label: "공개 풀", value: MatchingSource.OPEN_POOL },
  { label: "알림 연동", value: MatchingSource.NOTIFICATION },
];

function formatDateTime(value: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  return new Date(parsed).toLocaleString("ko-KR", { hour12: false });
}

function toNotice(result: MatchingActionResult, matchLabel: string, reason: string): Notice {
  if (!result.success) {
    return {
      tone: "error",
      message: result.message ?? "취소 처리에 실패했습니다.",
    };
  }

  const reasonText = reason.trim().length > 0 ? ` (사유: ${reason.trim()})` : "";
  if (result.mode === "LOCAL_SESSION") {
    return {
      tone: "info",
      message: `${matchLabel} 취소 요청을 화면에 반영했습니다.${reasonText} 서버 API 연동은 확인이 필요합니다.`,
    };
  }

  return {
    tone: "info",
    message: `${matchLabel} 취소 처리가 완료되었습니다.${reasonText}`,
  };
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="rounded-lg border border-border bg-background">
      <CardContent className="space-y-1 p-4">
        <p className="text-sm text-foreground">{label}</p>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

function useMatchingData() {
  const { enabled: mockModeEnabled } = useMockMode();
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<MatchingStatus | "ALL">("ALL");
  const [sourceFilter, setSourceFilter] = React.useState<MatchingSource | "ALL">("ALL");
  const [page, setPage] = React.useState(1);
  const size = 20;

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<Notice | null>(null);
  const [actioningId, setActioningId] = React.useState<string | null>(null);
  const [data, setData] = React.useState<MatchingResponse>({
    items: [],
    total: 0,
    page: 1,
    size,
    summary: {
      total: 0,
      ready: 0,
      inTransit: 0,
      completed: 0,
      cancelled: 0,
      unassigned: 0,
    },
  });

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchMatchings({
        search: search.trim() ? search.trim() : undefined,
        status: statusFilter === "ALL" ? undefined : statusFilter,
        source: sourceFilter === "ALL" ? undefined : sourceFilter,
        page,
        size,
      });
      setData(response);
    } catch {
      setData((prev) => ({ ...prev, items: [], total: 0 }));
      setError("매칭 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [page, search, size, sourceFilter, statusFilter]);

  React.useEffect(() => {
    void load();
  }, [load, mockModeEnabled]);

  const totalPages = Math.max(1, Math.ceil(data.total / size));

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const runCancel = React.useCallback(
    async (row: MatchingItem, reason: string) => {
      if (!row.canCancel || row.matchId === null) return;
      setActioningId(row.id);
      setNotice(null);
      try {
        const result = await cancelMatching(row.matchId);
        setNotice(toNotice(result, row.id, reason));
      } finally {
        setActioningId(null);
        await load();
      }
    },
    [load],
  );

  return {
    loading,
    error,
    notice,
    setNotice,
    actioningId,
    data,
    searchInput,
    setSearchInput,
    submitSearch,
    statusFilter,
    setStatusFilter,
    sourceFilter,
    setSourceFilter,
    page,
    setPage,
    totalPages,
    load,
    runCancel,
  };
}

function MatchingDetailDialog({
  row,
  open,
  onOpenChange,
  onOpenCancel,
}: {
  row: MatchingItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenCancel: (row: MatchingItem) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-lg border border-border bg-background">
        <DialogHeader>
          <DialogTitle>매칭 상세</DialogTitle>
          <DialogDescription>목록에서 선택한 매칭 건의 상태와 운영 신호를 확인합니다.</DialogDescription>
        </DialogHeader>

        {row ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-muted p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-lg font-semibold text-foreground">{row.id}</div>
                <Badge variant={getMatchingProgressBadgeVariant(row.status)}>
                  {getMatchingProgressLabel(row.status, row.accepted)}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-foreground">출처: {SOURCE_LABELS[row.source]}</p>
            </div>

            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="rounded-lg border border-border bg-background px-3 py-2">견적 ID: {row.quoteId ? `Q-${row.quoteId}` : "-"}</div>
              <div className="rounded-lg border border-border bg-background px-3 py-2">기사 ID: {row.driverId ? `D-${row.driverId}` : "미배정"}</div>
              <div className="rounded-lg border border-border bg-background px-3 py-2">생성: {formatDateTime(row.createdAt)}</div>
              <div className="rounded-lg border border-border bg-background px-3 py-2">갱신: {formatDateTime(row.updatedAt)}</div>
              <div className="rounded-lg border border-border bg-background px-3 py-2">
                운영 신호: {row.signal || "-"}
              </div>
              <div className="rounded-lg border border-border bg-background px-3 py-2">
                연관 알림: {row.relatedNotificationIds.length > 0 ? row.relatedNotificationIds.join(", ") : "-"}
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter className="gap-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            닫기
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => row && onOpenCancel(row)}
            disabled={!row?.canCancel}
          >
            취소 요청 처리
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MatchingCancelDialog({
  state,
  submitting,
  onOpenChange,
  onReasonChange,
  onSubmit,
}: {
  state: CancelDialogState;
  submitting: boolean;
  onOpenChange: (open: boolean) => void;
  onReasonChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={state.open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-lg border border-border bg-background">
        <DialogHeader>
          <DialogTitle>매칭 취소 검토</DialogTitle>
          <DialogDescription>운영 기록을 위해 취소 사유를 입력한 뒤 취소 처리하세요.</DialogDescription>
        </DialogHeader>

        {state.row ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-muted p-3 text-sm text-foreground">
              대상: {state.row.id} / {state.row.quoteId ? `Q-${state.row.quoteId}` : "-"}
            </div>
            <div className="space-y-2">
              <Label htmlFor="matching-cancel-reason" className="text-sm font-semibold text-foreground">
                취소 사유
              </Label>
              <Textarea
                id="matching-cancel-reason"
                value={state.reason}
                onChange={(event) => onReasonChange(event.target.value)}
                placeholder="취소 사유를 5자 이상 입력하세요."
                className="border border-border bg-background text-foreground focus-visible:ring-2 focus-visible:ring-primary"
              />
              {state.error ? <p className="text-sm text-foreground">{state.error}</p> : null}
            </div>
          </div>
        ) : null}

        <DialogFooter className="gap-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={submitting}>
            닫기
          </Button>
          <Button type="button" variant="destructive" onClick={onSubmit} disabled={submitting || !state.row}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            취소 확정
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MatchingManagementView() {
  const { remainingSeconds, isCoolingDown, startCooldown } = useRefreshCooldown(5);
  const {
    loading,
    error,
    notice,
    setNotice,
    actioningId,
    data,
    searchInput,
    setSearchInput,
    submitSearch,
    statusFilter,
    setStatusFilter,
    sourceFilter,
    setSourceFilter,
    page,
    setPage,
    totalPages,
    load,
    runCancel,
  } = useMatchingData();

  const [selectedRow, setSelectedRow] = React.useState<MatchingItem | null>(null);
  const [cancelState, setCancelState] = React.useState<CancelDialogState>({
    open: false,
    row: null,
    reason: "",
    error: null,
  });

  const openCancelDialog = (row: MatchingItem) => {
    setCancelState({
      open: true,
      row,
      reason: "",
      error: null,
    });
  };

  const closeCancelDialog = () => {
    setCancelState({
      open: false,
      row: null,
      reason: "",
      error: null,
    });
  };

  const submitCancel = async () => {
    const row = cancelState.row;
    if (!row) return;
    const reason = cancelState.reason.trim();
    if (reason.length < 5) {
      setCancelState((prev) => ({ ...prev, error: "취소 사유를 5자 이상 입력하세요." }));
      return;
    }
    await runCancel(row, reason);
    closeCancelDialog();
    setSelectedRow(null);
  };

  return (
    <div className="min-h-screen space-y-6 bg-background text-foreground">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">매칭 관리</h1>
          <p className="mt-1 text-sm text-foreground">매칭 목록을 조회하고 상세/취소 요청을 관리합니다.</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            if (!startCooldown()) return;
            setNotice(null);
            if (page !== 1) {
              setPage(1);
              return;
            }
            void load();
          }}
          disabled={loading || isCoolingDown}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {isCoolingDown ? ` ${remainingSeconds}s` : ""}
          새로고침
        </Button>
      </div>

      {notice ? (
        <div className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground">{notice.message}</div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground">{error}</div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <SummaryCard label="총 매칭" value={data.summary.total} />
        <SummaryCard label="매칭중" value={data.summary.unassigned} />
        <SummaryCard
          label="배차중"
          value={data.summary.inTransit + Math.max(0, data.summary.ready - data.summary.unassigned)}
        />
        <SummaryCard label="배차완료" value={data.summary.completed} />
        <SummaryCard label="취소" value={data.summary.cancelled} />
        <SummaryCard label="운행중" value={data.summary.inTransit} />
      </div>

      <Card className="rounded-lg border border-border bg-background">
        <CardHeader>
          <CardTitle className="text-base">검색 및 필터</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <form className="relative" onSubmit={submitSearch}>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground" />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="매칭 ID, 견적 ID, 기사 ID, 신호 텍스트 검색"
              className="border border-border bg-background pl-10 text-foreground focus-visible:ring-2 focus-visible:ring-primary"
            />
          </form>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <select
              value={statusFilter}
              onChange={(event) => {
                setPage(1);
                setStatusFilter(event.target.value as MatchingStatus | "ALL");
              }}
              className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {STATUS_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={sourceFilter}
              onChange={(event) => {
                setPage(1);
                setSourceFilter(event.target.value as MatchingSource | "ALL");
              }}
              className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {SOURCE_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setSearchInput("");
                  setStatusFilter("ALL");
                  setSourceFilter("ALL");
                  setPage(1);
                }}
              >
                초기화
              </Button>
              <Button type="button" onClick={() => void load()}>
                적용
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-lg border border-border bg-background">
        <CardHeader>
          <CardTitle className="text-base">매칭 목록</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto rounded-lg border border-border bg-background">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead>매칭</TableHead>
                  <TableHead>진행 상태</TableHead>
                  <TableHead>배차 정보</TableHead>
                  <TableHead>출처</TableHead>
                  <TableHead>갱신 시각</TableHead>
                  <TableHead className="text-right">조치</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-foreground">
                      로딩 중입니다.
                    </TableCell>
                  </TableRow>
                ) : data.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-foreground">
                      조회 결과가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.items.map((item) => (
                    <TableRow key={item.id} className="cursor-pointer hover:bg-muted" onClick={() => setSelectedRow(item)}>
                      <TableCell>
                        <div className="font-semibold text-foreground">{item.id}</div>
                        <div className="text-xs text-foreground">{item.quoteId ? `Q-${item.quoteId}` : "-"}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getMatchingProgressBadgeVariant(item.status)}>
                          {getMatchingProgressLabel(item.status, item.accepted)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-foreground">{item.driverId ? `D-${item.driverId}` : "미배정"}</div>
                        <div className="text-xs text-foreground">{item.signal}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{SOURCE_LABELS[item.source]}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-foreground">{formatDateTime(item.updatedAt)}</TableCell>
                      <TableCell className="text-right">
                        {item.canCancel ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={(event) => {
                              event.stopPropagation();
                              openCancelDialog(item);
                            }}
                            disabled={actioningId === item.id}
                          >
                            취소 검토
                          </Button>
                        ) : (
                          <span className="text-xs text-foreground">처리 완료</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-foreground">총 {data.total}건</span>
            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((prev) => prev - 1)}>
                이전
              </Button>
              <span className="text-sm text-foreground">
                {page}/{totalPages}
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => prev + 1)}
              >
                다음
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <MatchingDetailDialog
        row={selectedRow}
        open={Boolean(selectedRow)}
        onOpenChange={(open) => {
          if (!open) setSelectedRow(null);
        }}
        onOpenCancel={openCancelDialog}
      />

      <MatchingCancelDialog
        state={cancelState}
        submitting={Boolean(cancelState.row && actioningId === cancelState.row.id)}
        onOpenChange={(open) => {
          if (!open) closeCancelDialog();
        }}
        onReasonChange={(value) => setCancelState((prev) => ({ ...prev, reason: value, error: null }))}
        onSubmit={() => void submitCancel()}
      />
    </div>
  );
}
