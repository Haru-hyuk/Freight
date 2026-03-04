import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

import { fetchSanctionRows } from "@/features/sanctions/model/sanctionsApi";
import type { SanctionRow, SanctionStatus, SanctionType } from "@/features/sanctions/model/types";
import { useMockMode } from "@/shared/lib/hooks/useMockMode";
import { Badge } from "@/shared/ui/shadcn/badge";
import { Button } from "@/shared/ui/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";

type Props = {
  sanctionId: string;
};

function roleLabel(role: "SHIPPER" | "DRIVER"): string {
  return role === "SHIPPER" ? "화주" : "차주";
}

function typeLabel(type: SanctionType): string {
  if (type === "WARNING") return "경고";
  if (type === "FINE") return "벌점 부과";
  if (type === "SUSPEND") return "계정 정지";
  return "운행 중지";
}

function statusLabel(status: SanctionStatus): string {
  return status === "APPLIED" ? "적용" : "해제";
}

function amountLabel(amount?: number): string {
  if (typeof amount !== "number") return "-";
  return `${amount.toLocaleString("ko-KR")}원`;
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="text-xs text-foreground/70">{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}

export function SanctionDetailView({ sanctionId }: Props) {
  const { enabled: mockModeEnabled } = useMockMode();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [row, setRow] = React.useState<SanctionRow | null>(null);

  const load = React.useCallback(async () => {
    if (!sanctionId) {
      setRow(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const rows = await fetchSanctionRows();
      const target = rows.find((item) => item.id === sanctionId) ?? null;
      if (!target) {
        setRow(null);
        setError("제재 로그 상세를 찾을 수 없습니다.");
      } else {
        setRow(target);
      }
    } catch {
      setRow(null);
      setError("제재 로그 상세를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [sanctionId]);

  React.useEffect(() => {
    void load();
  }, [load, mockModeEnabled]);

  if (!sanctionId) {
    return (
      <div className="min-h-screen rounded-lg border border-border bg-background p-6 text-foreground">
        잘못된 제재 로그 상세 경로입니다.
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-5 bg-background text-foreground">
      <div className="space-y-3">
        <Button asChild type="button" variant="secondary" size="sm">
          <Link to="/ops/sanctions/logs" className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            제재 로그 목록으로 돌아가기
          </Link>
        </Button>

        <div>
          <h1 className="text-2xl font-semibold">제재 로그 상세</h1>
          <p className="text-sm text-foreground/70">대상 정보, 제재 상태, 근거를 상세히 확인합니다.</p>
        </div>
      </div>

      {loading ? (
        <Card className="rounded-lg border border-border bg-background">
          <CardContent className="py-10 text-center text-sm text-foreground/70">로딩 중...</CardContent>
        </Card>
      ) : null}

      {error ? (
        <Card className="rounded-lg border border-border bg-muted">
          <CardContent className="py-4 text-sm">{error}</CardContent>
        </Card>
      ) : null}

      {!loading && !error && !row ? (
        <Card className="rounded-lg border border-border bg-background">
          <CardContent className="py-10 text-center text-sm text-foreground/70">해당 제재 로그를 찾을 수 없습니다.</CardContent>
        </Card>
      ) : null}

      {row ? (
        <>
          <Card className="rounded-lg border border-border bg-background">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">제재 대상</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="rounded-lg border border-border bg-muted p-4">
                <div className="text-lg font-semibold">{row.targetName}</div>
                <div className="mt-1 text-sm text-foreground/70">{row.targetId}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{roleLabel(row.targetRole)}</Badge>
                <Badge variant="outline">{typeLabel(row.type)}</Badge>
                <Badge variant={row.status === "APPLIED" ? "secondary" : "outline"}>{statusLabel(row.status)}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border border-border bg-background">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">상세 정보</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 pt-0 md:grid-cols-2">
              <InfoTile label="제재 코드" value={row.id} />
              <InfoTile label="벌점/금액" value={amountLabel(row.amount)} />
              <InfoTile label="등록 시각" value={row.createdAt} />
              <InfoTile label="해제 시각" value={row.releasedAt ?? "-"} />
            </CardContent>
          </Card>

          <Card className="rounded-lg border border-border bg-background">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">제재 사유</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="rounded-lg border border-border bg-muted p-4 text-sm whitespace-pre-wrap">{row.reason}</div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
