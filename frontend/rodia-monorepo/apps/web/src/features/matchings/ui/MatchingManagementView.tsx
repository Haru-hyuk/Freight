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
import { Badge } from "@/shared/ui/shadcn/badge";
import { Button } from "@/shared/ui/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Input } from "@/shared/ui/shadcn/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/shadcn/table";

type Notice = {
  tone: "info" | "error";
  message: string;
};

const STATUS_LABELS: Record<MatchingStatus, string> = {
  [MatchingStatus.READY]: "대기",
  [MatchingStatus.IN_TRANSIT]: "운송 중",
  [MatchingStatus.COMPLETED]: "완료",
  [MatchingStatus.CANCELLED]: "취소",
};

const SOURCE_LABELS: Record<MatchingSource, string> = {
  [MatchingSource.ADMIN]: "관리 집계",
  [MatchingSource.SHIPPER]: "화주 매칭",
  [MatchingSource.DRIVER]: "차주 매칭",
  [MatchingSource.OPEN_POOL]: "오픈 풀",
  [MatchingSource.NOTIFICATION]: "알림 신호",
};

function formatDateTime(value: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  return new Date(parsed).toLocaleString("ko-KR", { hour12: false });
}

function getStatusBadgeVariant(status: MatchingStatus): "default" | "secondary" | "destructive" | "outline" {
  if (status === MatchingStatus.CANCELLED) return "destructive";
  if (status === MatchingStatus.READY) return "secondary";
  if (status === MatchingStatus.COMPLETED) return "default";
  return "outline";
}

function getActionMessage(result: MatchingActionResult): Notice {
  if (!result.success) {
    return {
      tone: "error",
      message: result.message ?? "매칭 상태 변경에 실패했습니다.",
    };
  }

  if (result.mode === "LOCAL_SESSION") {
    return {
      tone: "info",
      message: result.message ?? "서버 반영 경로가 없어 현재 세션 화면에만 반영했습니다.",
    };
  }

  return {
    tone: "info",
    message: "매칭 취소 요청을 처리했습니다.",
  };
}

function useMatchingData() {
  const { enabled: mockModeEnabled } = useMockMode();

  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState<MatchingStatus | "ALL">("ALL");
  const [source, setSource] = React.useState<MatchingSource | "ALL">("ALL");
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
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchMatchings({
        search: query.trim() || undefined,
        status: status === "ALL" ? undefined : status,
        source: source === "ALL" ? undefined : source,
        page,
        size,
      });
      setData(response);
    } catch {
      setData((prev) => ({ ...prev, items: [], total: 0 }));
      setError("매칭 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [page, query, size, source, status]);

  React.useEffect(() => {
    void load();
  }, [load, mockModeEnabled]);

  React.useEffect(() => {
    if (data.items.length === 0) {
      setSelectedId(null);
      return;
    }

    if (!selectedId || !data.items.some((item) => item.id === selectedId)) {
      setSelectedId(data.items[0].id);
    }
  }, [data.items, selectedId]);

  const selected = React.useMemo(
    () => data.items.find((item) => item.id === selectedId) ?? null,
    [data.items, selectedId],
  );

  const totalPages = Math.max(1, Math.ceil(data.total / size));

  const runCancel = React.useCallback(
    async (item: MatchingItem) => {
      if (!item.canCancel || item.matchId === null) return;

      setActioningId(item.id);
      setNotice(null);

      try {
        const result = await cancelMatching(item.matchId);
        setNotice(getActionMessage(result));
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
    query,
    setQuery,
    status,
    setStatus,
    source,
    setSource,
    page,
    setPage,
    size,
    totalPages,
    selected,
    selectedId,
    setSelectedId,
    load,
    runCancel,
  };
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-background px-3 py-2 text-sm">
      <span className="text-foreground/70">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
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
    query,
    setQuery,
    status,
    setStatus,
    source,
    setSource,
    page,
    setPage,
    totalPages,
    selected,
    selectedId,
    setSelectedId,
    load,
    runCancel,
  } = useMatchingData();

  return (
    <div className="min-h-screen space-y-6 bg-background text-foreground">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">매칭 관리</h1>
          <p className="mt-1 text-sm text-foreground/70">
            화주/차주 앱에서 생성된 매칭을 통합 조회하고 상태를 검토합니다.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            if (!startCooldown()) return;
            setNotice(null);
            setSelectedId(null);
            if (page !== 1) {
              setPage(1);
              return;
            }
            void load();
          }}
          disabled={loading || isCoolingDown}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {isCoolingDown ? ` ${remainingSeconds}s` : null}
          새로고침
        </Button>
      </div>

      {notice ? (
        <div
          className={
            notice.tone === "error"
              ? "rounded-lg border border-border bg-muted px-3 py-2 text-sm"
              : "rounded-lg border border-border bg-muted px-3 py-2 text-sm"
          }
        >
          {notice.message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-border bg-muted px-3 py-2 text-sm">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Card className="rounded-lg border border-border bg-background">
          <CardContent className="space-y-1 p-4">
            <p className="text-sm text-foreground/70">총 매칭</p>
            <p className="text-2xl font-semibold">{data.summary.total}</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg border border-border bg-background">
          <CardContent className="space-y-1 p-4">
            <p className="text-sm text-foreground/70">대기</p>
            <p className="text-2xl font-semibold">{data.summary.ready}</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg border border-border bg-background">
          <CardContent className="space-y-1 p-4">
            <p className="text-sm text-foreground/70">운송 중</p>
            <p className="text-2xl font-semibold">{data.summary.inTransit}</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg border border-border bg-background">
          <CardContent className="space-y-1 p-4">
            <p className="text-sm text-foreground/70">완료</p>
            <p className="text-2xl font-semibold">{data.summary.completed}</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg border border-border bg-background">
          <CardContent className="space-y-1 p-4">
            <p className="text-sm text-foreground/70">취소</p>
            <p className="text-2xl font-semibold">{data.summary.cancelled}</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg border border-border bg-background">
          <CardContent className="space-y-1 p-4">
            <p className="text-sm text-foreground/70">미배정</p>
            <p className="text-2xl font-semibold">{data.summary.unassigned}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-lg border border-border bg-background">
        <CardHeader>
          <CardTitle className="text-base">검색 및 필터</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/60" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="매칭 ID, 견적 ID, 기사 ID, 이벤트 키워드"
              className="border border-border bg-background pl-10 text-foreground focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as MatchingStatus | "ALL");
                setPage(1);
              }}
              className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ALL">상태 전체</option>
              <option value={MatchingStatus.READY}>대기</option>
              <option value={MatchingStatus.IN_TRANSIT}>운송 중</option>
              <option value={MatchingStatus.COMPLETED}>완료</option>
              <option value={MatchingStatus.CANCELLED}>취소</option>
            </select>
            <select
              value={source}
              onChange={(event) => {
                setSource(event.target.value as MatchingSource | "ALL");
                setPage(1);
              }}
              className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ALL">출처 전체</option>
              <option value={MatchingSource.ADMIN}>관리 집계</option>
              <option value={MatchingSource.SHIPPER}>화주 매칭</option>
              <option value={MatchingSource.DRIVER}>차주 매칭</option>
              <option value={MatchingSource.OPEN_POOL}>오픈 풀</option>
              <option value={MatchingSource.NOTIFICATION}>알림 신호</option>
            </select>
            <div className="flex justify-end">
              <Button type="button" variant="secondary" onClick={() => void load()} disabled={loading}>
                적용
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
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
                    <TableHead>상태</TableHead>
                    <TableHead>연관 정보</TableHead>
                    <TableHead>출처</TableHead>
                    <TableHead>갱신 시각</TableHead>
                    <TableHead className="text-right">조치</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-foreground/70">
                        로딩 중...
                      </TableCell>
                    </TableRow>
                  ) : data.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-foreground/70">
                        조회 결과가 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.items.map((item) => (
                      <TableRow
                        key={item.id}
                        className={item.id === selectedId ? "cursor-pointer bg-muted" : "cursor-pointer hover:bg-muted"}
                        onClick={() => setSelectedId(item.id)}
                      >
                        <TableCell>
                          <div className="font-semibold">{item.id}</div>
                          <div className="text-xs text-foreground/70">Q-{item.quoteId ?? "-"}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(item.status)}>
                            {STATUS_LABELS[item.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">기사: {item.driverId !== null ? `D-${item.driverId}` : "미배정"}</div>
                          <div className="text-xs text-foreground/70">{item.signal}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{SOURCE_LABELS[item.source]}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{formatDateTime(item.updatedAt)}</TableCell>
                        <TableCell className="text-right">
                          {item.canCancel ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={(event) => {
                                event.stopPropagation();
                                void runCancel(item);
                              }}
                              disabled={actioningId === item.id}
                            >
                              {actioningId === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                              취소
                            </Button>
                          ) : (
                            <span className="text-xs text-foreground/70">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-foreground/70">
                총 {data.total}건
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  이전
                </Button>
                <span className="text-sm text-foreground/70">
                  {page}/{totalPages}
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                >
                  다음
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg border border-border bg-background">
          <CardHeader>
            <CardTitle className="text-base">매칭 상세</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selected ? (
              <>
                <div className="rounded-lg border border-border bg-muted p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-base font-semibold">{selected.id}</div>
                    <Badge variant={getStatusBadgeVariant(selected.status)}>
                      {STATUS_LABELS[selected.status]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-foreground/70">{SOURCE_LABELS[selected.source]}</p>
                </div>

                <InfoRow label="견적 ID" value={selected.quoteId !== null ? `Q-${selected.quoteId}` : "-"} />
                <InfoRow label="기사 ID" value={selected.driverId !== null ? `D-${selected.driverId}` : "미배정"} />
                <InfoRow label="생성 시각" value={formatDateTime(selected.createdAt)} />
                <InfoRow label="수락 시각" value={selected.acceptedAt ? formatDateTime(selected.acceptedAt) : "-"} />
                <InfoRow label="최종 갱신" value={formatDateTime(selected.updatedAt)} />
                <InfoRow
                  label="알림 연결"
                  value={
                    selected.relatedNotificationIds.length > 0
                      ? selected.relatedNotificationIds.map((id) => `#${id}`).join(", ")
                      : "없음"
                  }
                />

                <div className="rounded-lg border border-border bg-background p-3">
                  <div className="text-sm font-semibold">운영 메모</div>
                  <p className="mt-1 text-sm text-foreground/70">{selected.signal}</p>
                </div>

                {selected.syncMode === "LOCAL_SESSION" ? (
                  <div className="rounded-lg border border-border bg-muted px-3 py-2 text-xs text-foreground/70">
                    현재 상태는 세션 반영 결과이며 서버 반영 여부를 추가 확인해야 합니다.
                  </div>
                ) : null}

                <div className="flex gap-2">
                  {selected.canCancel ? (
                    <Button
                      type="button"
                      variant="destructive"
                      className="flex-1"
                      onClick={() => void runCancel(selected)}
                      disabled={actioningId === selected.id}
                    >
                      {actioningId === selected.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      취소 요청
                    </Button>
                  ) : (
                    <Button type="button" variant="secondary" className="flex-1" disabled>
                      처리 완료
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-border bg-muted p-6 text-center text-sm text-foreground/70">
                목록에서 매칭 건을 선택하면 상세 정보가 표시됩니다.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
