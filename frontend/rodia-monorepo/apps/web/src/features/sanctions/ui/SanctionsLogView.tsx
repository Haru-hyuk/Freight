import * as React from "react";

import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/shadcn/alert";
import { Button } from "@/shared/ui/shadcn/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/shadcn/dialog";
import { Badge } from "@/shared/ui/shadcn/badge";
import { Input } from "@/shared/ui/shadcn/input";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/shadcn/tabs";
import { useMockMode } from "@/shared/lib/hooks/useMockMode";
import { useRefreshCooldown } from "@/shared/lib/hooks/useRefreshCooldown";
import { fetchSanctionRows } from "@/features/sanctions/model/sanctionsApi";
import { SanctionsTable } from "@/features/sanctions/ui/SanctionsTable";
import type { SanctionRow, SanctionStatus, SanctionType } from "@/features/sanctions/model/types";

type RoleFilter = "ALL" | "SHIPPER" | "DRIVER";
type TypeFilter = "ALL" | SanctionType;
type StatusFilter = "ALL" | SanctionStatus;

function typeLabel(type: SanctionType): string {
  if (type === "WARNING") return "경고";
  if (type === "FINE") return "벌점 부과";
  if (type === "SUSPEND") return "계정 정지";
  return "운행 중지";
}

function statusLabel(status: SanctionStatus): string {
  return status === "APPLIED" ? "적용" : "해제";
}

function roleLabel(role: "SHIPPER" | "DRIVER"): string {
  return role === "SHIPPER" ? "화주" : "차주";
}

function formatAmount(amount?: number): string {
  if (typeof amount !== "number") return "-";
  return `${amount.toLocaleString("ko-KR")}원`;
}

function toTimestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function SanctionsLogView() {
  const { enabled: mockModeEnabled } = useMockMode();
  const { remainingSeconds, isCoolingDown, startCooldown } = useRefreshCooldown(5);
  const [rows, setRows] = React.useState<SanctionRow[]>([]);
  const [selected, setSelected] = React.useState<SanctionRow | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<RoleFilter>("ALL");
  const [typeFilter, setTypeFilter] = React.useState<TypeFilter>("ALL");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("ALL");

  const loadRows = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSanctionRows();
      setRows(data);
    } catch {
      setRows([]);
      setError("제재 로그를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadRows();
  }, [loadRows, mockModeEnabled]);

  const stats = React.useMemo(() => {
    const total = rows.length;
    const applied = rows.filter((row) => row.status === "APPLIED").length;
    const released = rows.filter((row) => row.status === "RELEASED").length;
    const fineAmount = rows.reduce((acc, row) => acc + (typeof row.amount === "number" ? row.amount : 0), 0);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const createdToday = rows.filter((row) => toTimestamp(row.createdAt) >= todayStart.getTime()).length;

    return {
      total,
      applied,
      released,
      fineAmount,
      createdToday,
    };
  }, [rows]);

  const filteredRows = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return rows.filter((row) => {
      if (roleFilter !== "ALL" && row.targetRole !== roleFilter) return false;
      if (typeFilter !== "ALL" && row.type !== typeFilter) return false;
      if (statusFilter !== "ALL" && row.status !== statusFilter) return false;
      if (!normalizedQuery) return true;

      const searchable = `${row.id} ${row.targetId} ${row.targetName} ${row.reason}`.toLowerCase();
      return searchable.includes(normalizedQuery);
    });
  }, [query, roleFilter, rows, statusFilter, typeFilter]);

  return (
    <div className="min-h-screen space-y-6 bg-background text-foreground">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">제재 로그</h2>
          <p className="mt-1 text-sm text-foreground/70">제재 이력 조회, 상태 점검, 상세 근거 검토를 한 화면에서 진행합니다.</p>
        </div>

        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            if (!startCooldown()) return;
            setSelected(null);
            void loadRows();
          }}
          disabled={loading || isCoolingDown}
        >
          {loading ? "불러오는 중..." : isCoolingDown ? `${remainingSeconds}s` : "새로고침"}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        <div className="rounded-lg border border-border bg-muted p-4">
          <div className="text-sm text-foreground/70">전체 제재</div>
          <div className="mt-1 text-2xl font-semibold">{stats.total.toLocaleString("ko-KR")}건</div>
        </div>
        <div className="rounded-lg border border-border bg-muted p-4">
          <div className="text-sm text-foreground/70">적용 중</div>
          <div className="mt-1 text-2xl font-semibold">{stats.applied.toLocaleString("ko-KR")}건</div>
        </div>
        <div className="rounded-lg border border-border bg-muted p-4">
          <div className="text-sm text-foreground/70">해제 완료</div>
          <div className="mt-1 text-2xl font-semibold">{stats.released.toLocaleString("ko-KR")}건</div>
        </div>
        <div className="rounded-lg border border-border bg-muted p-4">
          <div className="text-sm text-foreground/70">누적 벌점/금액</div>
          <div className="mt-1 text-2xl font-semibold">{stats.fineAmount.toLocaleString("ko-KR")}원</div>
        </div>
        <div className="rounded-lg border border-border bg-muted p-4">
          <div className="text-sm text-foreground/70">오늘 등록</div>
          <div className="mt-1 text-2xl font-semibold">{stats.createdToday.toLocaleString("ko-KR")}건</div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-background p-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <div className="text-sm font-semibold">검색</div>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ID, 대상 ID, 대상자명, 사유 검색"
              className="border border-border bg-background text-foreground"
            />
          </div>
          <div className="rounded-lg border border-border bg-muted p-3">
            <div className="text-sm text-foreground/70">조회 결과</div>
            <div className="mt-1 text-lg font-semibold">
              {filteredRows.length.toLocaleString("ko-KR")}건 / 전체 {rows.length.toLocaleString("ko-KR")}건
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="space-y-2">
            <div className="text-sm font-semibold">대상 구분</div>
            <Tabs value={roleFilter} onValueChange={(value) => setRoleFilter(value as RoleFilter)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="ALL">전체</TabsTrigger>
                <TabsTrigger value="SHIPPER">화주</TabsTrigger>
                <TabsTrigger value="DRIVER">차주</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-semibold">제재 유형</div>
            <Tabs value={typeFilter} onValueChange={(value) => setTypeFilter(value as TypeFilter)}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="ALL">전체</TabsTrigger>
                <TabsTrigger value="WARNING">경고</TabsTrigger>
                <TabsTrigger value="FINE">벌점</TabsTrigger>
                <TabsTrigger value="SUSPEND">정지</TabsTrigger>
                <TabsTrigger value="DRIVE_BLOCK">운행중지</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-semibold">상태</div>
            <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="ALL">전체</TabsTrigger>
                <TabsTrigger value="APPLIED">적용</TabsTrigger>
                <TabsTrigger value="RELEASED">해제</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>제재 로그 조회 실패</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <SanctionsTable rows={filteredRows} loading={loading} onOpenDetail={setSelected} />

      <Dialog open={Boolean(selected)} onOpenChange={(open) => (open ? null : setSelected(null))}>
        <DialogContent className="rounded-lg border border-border bg-background">
          <DialogHeader>
            <DialogTitle>제재 상세 정보</DialogTitle>
          </DialogHeader>

          {selected ? (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border border-border bg-muted p-3">
                <div className="font-semibold">{selected.targetName}</div>
                <div className="text-foreground/70">{selected.targetId}</div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{roleLabel(selected.targetRole)}</Badge>
                <Badge variant="outline">{typeLabel(selected.type)}</Badge>
                <Badge variant={selected.status === "APPLIED" ? "secondary" : "outline"}>
                  {statusLabel(selected.status)}
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-border bg-background p-3">
                  <div className="font-semibold">등록 시각</div>
                  <div className="mt-1 text-foreground/70">{selected.createdAt}</div>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <div className="font-semibold">해제 시각</div>
                  <div className="mt-1 text-foreground/70">{selected.releasedAt ?? "-"}</div>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <div className="font-semibold">벌점/금액</div>
                  <div className="mt-1 text-foreground/70">{formatAmount(selected.amount)}</div>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <div className="font-semibold">제재 코드</div>
                  <div className="mt-1 text-foreground/70">{selected.id}</div>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-background p-3">
                <div className="font-semibold">제재 사유</div>
                <div className="mt-1 whitespace-pre-wrap text-foreground/70">{selected.reason}</div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
