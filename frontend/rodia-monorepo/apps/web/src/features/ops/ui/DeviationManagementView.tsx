import * as React from "react";
import { AlertCircle, Loader2, RefreshCw, Search } from "lucide-react";

import {
  DeviationSeverity,
  DeviationSource,
  DeviationStatus,
  DeviationType,
  executeDeviationAction,
  fetchDeviations,
  type Deviation,
  type DeviationActionResult,
  type DeviationResponse,
} from "@/features/ops/api/deviationApi";
import { useMockMode } from "@/shared/lib/hooks/useMockMode";
import { useRefreshCooldown } from "@/shared/lib/hooks/useRefreshCooldown";
import { Badge } from "@/shared/ui/shadcn/badge";
import { Button } from "@/shared/ui/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Input } from "@/shared/ui/shadcn/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/shadcn/table";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/shadcn/tabs";

type Notice = {
  tone: "info" | "error";
  message: string;
};

const TYPE_LABELS: Record<DeviationType, string> = {
  [DeviationType.LATE_DELIVERY]: "배송 지연",
  [DeviationType.ROUTE_DEVIATION]: "경로 이탈",
  [DeviationType.VEHICLE_CONDITION]: "차량 이상",
  [DeviationType.SAFETY_VIOLATION]: "안전 위반",
  [DeviationType.CUSTOMER_COMPLAINT]: "고객 민원",
};

const SEVERITY_LABELS: Record<DeviationSeverity, string> = {
  [DeviationSeverity.CRITICAL]: "위험",
  [DeviationSeverity.SEVERE]: "심각",
  [DeviationSeverity.MODERATE]: "주의",
  [DeviationSeverity.MINOR]: "경미",
};

const STATUS_LABELS: Record<DeviationStatus, string> = {
  [DeviationStatus.OPEN]: "미처리",
  [DeviationStatus.INVESTIGATING]: "조사 중",
  [DeviationStatus.RESOLVED]: "해결",
  [DeviationStatus.DISMISSED]: "기각",
};

const SOURCE_LABELS: Record<DeviationSource, string> = {
  [DeviationSource.ADMIN]: "관리 집계",
  [DeviationSource.MATCH]: "매칭 신호",
  [DeviationSource.NOTIFICATION]: "알림 신호",
  [DeviationSource.ANNOUNCEMENT]: "공지 신호",
};

function formatDateTime(value: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  return new Date(parsed).toLocaleString("ko-KR", { hour12: false });
}

function getSeverityVariant(
  severity: DeviationSeverity,
): "default" | "secondary" | "destructive" | "outline" {
  if (severity === DeviationSeverity.CRITICAL || severity === DeviationSeverity.SEVERE) return "destructive";
  if (severity === DeviationSeverity.MODERATE) return "secondary";
  return "outline";
}

function getStatusVariant(
  status: DeviationStatus,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === DeviationStatus.OPEN) return "destructive";
  if (status === DeviationStatus.INVESTIGATING) return "secondary";
  if (status === DeviationStatus.RESOLVED) return "default";
  return "outline";
}

function getActionNotice(result: DeviationActionResult): Notice {
  if (!result.success) {
    return {
      tone: "error",
      message: result.message ?? "조치 처리에 실패했습니다.",
    };
  }

  if (result.mode === "LOCAL_SESSION") {
    return {
      tone: "info",
      message: result.message ?? "서버 조치 API가 없어 현재 세션 화면에만 반영했습니다.",
    };
  }

  return {
    tone: "info",
    message: "상태 조치를 반영했습니다.",
  };
}

function ProcessRow({ label, active }: { label: string; active: boolean }) {
  return (
    <div
      className={
        active
          ? "rounded-lg border border-border bg-secondary px-3 py-2 text-sm font-medium"
          : "rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground/70"
      }
    >
      {label}
    </div>
  );
}

function useDeviationData() {
  const { enabled: mockModeEnabled } = useMockMode();

  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState<DeviationStatus | "ALL">("ALL");
  const [severity, setSeverity] = React.useState<DeviationSeverity | "ALL">("ALL");
  const [type, setType] = React.useState<DeviationType | "ALL">("ALL");
  const [source, setSource] = React.useState<DeviationSource | "ALL">("ALL");
  const [overdueOnly, setOverdueOnly] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const size = 15;

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<Notice | null>(null);
  const [actioningId, setActioningId] = React.useState<string | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [data, setData] = React.useState<DeviationResponse>({
    items: [],
    total: 0,
    page: 1,
    size,
    summary: {
      critical: 0,
      open: 0,
      investigating: 0,
      overdue: 0,
      resolvedRate: 0,
      bySource: {
        [DeviationSource.ADMIN]: 0,
        [DeviationSource.MATCH]: 0,
        [DeviationSource.NOTIFICATION]: 0,
        [DeviationSource.ANNOUNCEMENT]: 0,
      },
    },
  });

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchDeviations({
        search: query.trim() || undefined,
        status: status === "ALL" ? undefined : status,
        severity: severity === "ALL" ? undefined : severity,
        type: type === "ALL" ? undefined : type,
        source: source === "ALL" ? undefined : source,
        overdueOnly,
        page,
        size,
      });
      setData(response);
    } catch {
      setData((prev) => ({ ...prev, items: [], total: 0 }));
      setError("이상 징후 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [overdueOnly, page, query, severity, size, source, status, type]);

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

  const runAction = React.useCallback(
    async (row: Deviation, action: "START_INVESTIGATION" | "RESOLVE" | "DISMISS") => {
      setActioningId(row.id);
      setNotice(null);

      try {
        const result = await executeDeviationAction({ caseId: row.id, action });
        setNotice(getActionNotice(result));
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
    severity,
    setSeverity,
    type,
    setType,
    source,
    setSource,
    overdueOnly,
    setOverdueOnly,
    page,
    setPage,
    totalPages,
    selected,
    selectedId,
    setSelectedId,
    load,
    runAction,
  };
}

function ActionButtons({
  row,
  actioningId,
  runAction,
}: {
  row: Deviation;
  actioningId: string | null;
  runAction: (row: Deviation, action: "START_INVESTIGATION" | "RESOLVE" | "DISMISS") => Promise<void>;
}) {
  const busy = actioningId === row.id;

  if (row.status === DeviationStatus.OPEN) {
    return (
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="default"
          onClick={() => void runAction(row, "START_INVESTIGATION")}
          disabled={busy}
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          조사 시작
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => void runAction(row, "DISMISS")}
          disabled={busy}
        >
          기각
        </Button>
      </div>
    );
  }

  if (row.status === DeviationStatus.INVESTIGATING) {
    return (
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="default"
          onClick={() => void runAction(row, "RESOLVE")}
          disabled={busy}
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          해결
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => void runAction(row, "DISMISS")}
          disabled={busy}
        >
          기각
        </Button>
      </div>
    );
  }

  return (
    <span className="text-xs text-foreground/70">
      처리 완료
    </span>
  );
}

export function DeviationManagementView() {
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
    severity,
    setSeverity,
    type,
    setType,
    source,
    setSource,
    overdueOnly,
    setOverdueOnly,
    page,
    setPage,
    totalPages,
    selected,
    selectedId,
    setSelectedId,
    load,
    runAction,
  } = useDeviationData();

  return (
    <div className="min-h-screen space-y-6 bg-background text-foreground">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">이상 징후 관리</h1>
          <p className="mt-1 text-sm text-foreground/70">
            매칭/알림/공지 데이터를 기준으로 탐지, 조사, 해결 흐름을 운영합니다.
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
            <p className="text-sm text-foreground/70">총 건수</p>
            <p className="text-2xl font-semibold">{data.total}</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg border border-border bg-background">
          <CardContent className="space-y-1 p-4">
            <p className="text-sm text-foreground/70">심각/위험</p>
            <p className="text-2xl font-semibold">{data.summary.critical}</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg border border-border bg-background">
          <CardContent className="space-y-1 p-4">
            <p className="text-sm text-foreground/70">미처리</p>
            <p className="text-2xl font-semibold">{data.summary.open}</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg border border-border bg-background">
          <CardContent className="space-y-1 p-4">
            <p className="text-sm text-foreground/70">조사 중</p>
            <p className="text-2xl font-semibold">{data.summary.investigating}</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg border border-border bg-background">
          <CardContent className="space-y-1 p-4">
            <p className="text-sm text-foreground/70">24시간 초과</p>
            <p className="text-2xl font-semibold">{data.summary.overdue}</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg border border-border bg-background">
          <CardContent className="space-y-1 p-4">
            <p className="text-sm text-foreground/70">해결률</p>
            <p className="text-2xl font-semibold">{data.summary.resolvedRate}%</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-lg border border-border bg-background">
        <CardHeader>
          <CardTitle className="text-base">표준 처리 단계</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs
            value={status}
            onValueChange={(value) => {
              setStatus(value as DeviationStatus | "ALL");
              setPage(1);
            }}
          >
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="ALL">전체</TabsTrigger>
              <TabsTrigger value={DeviationStatus.OPEN}>탐지/미처리</TabsTrigger>
              <TabsTrigger value={DeviationStatus.INVESTIGATING}>조사 진행</TabsTrigger>
              <TabsTrigger value={DeviationStatus.RESOLVED}>해결 완료</TabsTrigger>
              <TabsTrigger value={DeviationStatus.DISMISSED}>기각 종료</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="mt-3 grid gap-2 md:grid-cols-4">
            <ProcessRow label="1. 신호 탐지" active={status === "ALL" || status === DeviationStatus.OPEN} />
            <ProcessRow label="2. 케이스 분류" active={status === "ALL" || status === DeviationStatus.OPEN} />
            <ProcessRow
              label="3. 운영 조사"
              active={status === "ALL" || status === DeviationStatus.INVESTIGATING}
            />
            <ProcessRow
              label="4. 해결/기각"
              active={status === "ALL" || status === DeviationStatus.RESOLVED || status === DeviationStatus.DISMISSED}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-lg border border-border bg-background">
        <CardHeader>
          <CardTitle className="text-base">검색 및 세부 필터</CardTitle>
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
              placeholder="사건번호, 매칭 ID, 기사명, 설명 검색"
              className="border border-border bg-background pl-10 text-foreground focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <select
              value={severity}
              onChange={(event) => {
                setSeverity(event.target.value as DeviationSeverity | "ALL");
                setPage(1);
              }}
              className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ALL">심각도 전체</option>
              <option value={DeviationSeverity.CRITICAL}>위험</option>
              <option value={DeviationSeverity.SEVERE}>심각</option>
              <option value={DeviationSeverity.MODERATE}>주의</option>
              <option value={DeviationSeverity.MINOR}>경미</option>
            </select>
            <select
              value={type}
              onChange={(event) => {
                setType(event.target.value as DeviationType | "ALL");
                setPage(1);
              }}
              className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ALL">유형 전체</option>
              <option value={DeviationType.LATE_DELIVERY}>배송 지연</option>
              <option value={DeviationType.ROUTE_DEVIATION}>경로 이탈</option>
              <option value={DeviationType.VEHICLE_CONDITION}>차량 이상</option>
              <option value={DeviationType.SAFETY_VIOLATION}>안전 위반</option>
              <option value={DeviationType.CUSTOMER_COMPLAINT}>고객 민원</option>
            </select>
            <select
              value={source}
              onChange={(event) => {
                setSource(event.target.value as DeviationSource | "ALL");
                setPage(1);
              }}
              className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ALL">출처 전체</option>
              <option value={DeviationSource.MATCH}>매칭 신호</option>
              <option value={DeviationSource.NOTIFICATION}>알림 신호</option>
              <option value={DeviationSource.ANNOUNCEMENT}>공지 신호</option>
              <option value={DeviationSource.ADMIN}>관리 집계</option>
            </select>
            <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={overdueOnly}
                  onChange={(event) => {
                    setOverdueOnly(event.target.checked);
                    setPage(1);
                  }}
                  className="h-4 w-4 rounded border border-border bg-background text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
                24시간 초과만
              </label>
              <Button type="button" variant="secondary" size="sm" onClick={() => void load()} disabled={loading}>
                적용
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)]">
        <Card className="rounded-lg border border-border bg-background">
          <CardHeader>
            <CardTitle className="text-base">이상 징후 목록</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto rounded-lg border border-border bg-background">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted">
                    <TableHead>사건</TableHead>
                    <TableHead>유형/심각도</TableHead>
                    <TableHead>출처/연관</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>감지/초과</TableHead>
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
                    data.items.map((row) => (
                      <TableRow
                        key={row.id}
                        className={row.id === selectedId ? "cursor-pointer bg-muted" : "cursor-pointer hover:bg-muted"}
                        onClick={() => setSelectedId(row.id)}
                      >
                        <TableCell>
                          <div className="font-semibold">{row.caseNo}</div>
                          <div className="text-xs text-foreground/70">{row.processOwner}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{TYPE_LABELS[row.type]}</div>
                          <div className="mt-1">
                            <Badge variant={getSeverityVariant(row.severity)}>
                              {SEVERITY_LABELS[row.severity]}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{SOURCE_LABELS[row.source]}</div>
                          <div className="text-xs text-foreground/70">
                            {row.orderId}
                            {row.quoteId ? ` / ${row.quoteId}` : ""}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(row.status)}>
                            {STATUS_LABELS[row.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{formatDateTime(row.detectedAt)}</div>
                          <div className="text-xs text-foreground/70">{row.overdueHours}시간 경과</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <ActionButtons row={row} actioningId={actioningId} runAction={runAction} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-foreground/70">총 {data.total}건</span>
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
            <CardTitle className="text-base">사건 상세</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selected ? (
              <>
                <div className="rounded-lg border border-border bg-muted p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-base font-semibold">{selected.caseNo}</div>
                    <Badge variant={getSeverityVariant(selected.severity)}>
                      {SEVERITY_LABELS[selected.severity]}
                    </Badge>
                    <Badge variant={getStatusVariant(selected.status)}>
                      {STATUS_LABELS[selected.status]}
                    </Badge>
                    <Badge variant="outline">{SOURCE_LABELS[selected.source]}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-foreground/70">{selected.sourceRef}</p>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                    <span className="text-foreground/70">매칭/주문</span>
                    <div className="font-medium">{selected.orderId}</div>
                  </div>
                  <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                    <span className="text-foreground/70">기사</span>
                    <div className="font-medium">{selected.driverName}</div>
                  </div>
                  <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                    <span className="text-foreground/70">감지 시각</span>
                    <div className="font-medium">{formatDateTime(selected.detectedAt)}</div>
                  </div>
                  <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                    <span className="text-foreground/70">경과 시간</span>
                    <div className="font-medium">{selected.overdueHours}시간</div>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-background p-3">
                  <div className="text-sm font-semibold">설명</div>
                  <p className="mt-1 text-sm text-foreground/80">{selected.description}</p>
                </div>

                <div className="rounded-lg border border-border bg-background p-3">
                  <div className="text-sm font-semibold">권장 조치</div>
                  <p className="mt-1 text-sm text-foreground/80">{selected.recommendedAction}</p>
                </div>

                <div className="rounded-lg border border-border bg-background p-3">
                  <div className="mb-2 text-sm font-semibold">처리 흐름</div>
                  <div className="grid gap-2">
                    <ProcessRow label="탐지 등록" active />
                    <ProcessRow
                      label="조사 단계"
                      active={
                        selected.status === DeviationStatus.INVESTIGATING ||
                        selected.status === DeviationStatus.RESOLVED ||
                        selected.status === DeviationStatus.DISMISSED
                      }
                    />
                    <ProcessRow label="해결 완료" active={selected.status === DeviationStatus.RESOLVED} />
                    <ProcessRow label="기각 종료" active={selected.status === DeviationStatus.DISMISSED} />
                  </div>
                </div>

                {selected.syncMode === "LOCAL_SESSION" ? (
                  <div className="rounded-lg border border-border bg-muted px-3 py-2 text-xs text-foreground/70">
                    현재 상태는 세션 반영 결과이며 서버 반영 여부를 별도 확인해야 합니다.
                  </div>
                ) : null}

                <ActionButtons row={selected} actioningId={actioningId} runAction={runAction} />
              </>
            ) : (
              <div className="rounded-lg border border-border bg-muted p-6 text-center text-sm text-foreground/70">
                <AlertCircle className="mx-auto mb-2 h-5 w-5" />
                목록에서 사건을 선택하면 상세 정보와 조치 버튼이 표시됩니다.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
