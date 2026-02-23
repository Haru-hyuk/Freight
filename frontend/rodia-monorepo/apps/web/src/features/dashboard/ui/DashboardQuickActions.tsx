// src/features/dashboard/ui/DashboardQuickActions.tsx
import type { KpiData } from "@/features/dashboard/model/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Button } from "@/shared/ui/shadcn/button";
import { Separator } from "@/shared/ui/shadcn/separator";
import { Skeleton } from "@/shared/ui/shadcn/skeleton";
import { Badge } from "@/shared/ui/shadcn/badge";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";

type Props = {
  loading: boolean;
  kpi: KpiData | null;
  pendingApprovals: {
    drivers: number;
    trucks: number;
  };
};

export function DashboardQuickActions({ loading, kpi, pendingApprovals }: Props) {
  const deviationCount = kpi?.deviationCasesOpen ?? 0;
  const pendingTotal = pendingApprovals.drivers + pendingApprovals.trucks;

  return (
    <Card className="rounded-lg border border-border bg-background">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base font-bold">즉시 처리 항목</CardTitle>
        <p className="text-sm text-muted-foreground">우선 조치 필요한 업무</p>
      </CardHeader>

      <CardContent className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <>
            {/* 신청 대기 - 기사/차량 */}
            <div className="rounded-lg border border-border bg-muted p-4 flex gap-3">
              <Clock className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">신청 대기</p>
                  <Badge className="bg-warning text-foreground">{pendingTotal}건</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  기사 {pendingApprovals.drivers}건 / 차량 {pendingApprovals.trucks}건
                </p>
              </div>
            </div>

            {/* 이상 징후 */}
            <div className="rounded-lg border border-border bg-muted p-4 flex gap-3">
              <AlertCircle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                deviationCount > 0 ? "text-destructive" : "text-muted-foreground"
              }`} />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">이상 징후 관리</p>
                  <Badge className={deviationCount > 0 ? "bg-destructive text-foreground" : "bg-secondary text-foreground"}>
                    {deviationCount}건
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  검토 중인 경로이탈, 시간초과 등
                </p>
              </div>
            </div>

            {/* 미정산 금액 */}
            <div className="rounded-lg border border-border bg-muted p-4 flex gap-3">
              <CheckCircle2 className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">정산 관리</p>
                  <Badge className="bg-secondary text-foreground">확인</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  미정산: {kpi?.totalSettlementAmount ? (kpi.totalSettlementAmount / 1000000).toFixed(1) : 0}백만
                </p>
              </div>
            </div>

            <Separator className="my-2" />

            {/* 액션 버튼들 */}
            <div className="grid grid-cols-1 gap-2">
              <Button variant="default" className="bg-primary text-primary-foreground hover:opacity-90">
                신청 승인 관리
              </Button>
              <Button variant="outline" className="border-border text-foreground hover:bg-muted">
                이상 징후 조사
              </Button>
              <Button variant="outline" className="border-border text-foreground hover:bg-muted">
                정산 처리현황
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
