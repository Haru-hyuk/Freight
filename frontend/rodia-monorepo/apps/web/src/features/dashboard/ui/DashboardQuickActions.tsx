import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

import type { KpiData } from "@/features/dashboard/model/types";
import { Badge } from "@/shared/ui/shadcn/badge";
import { Button } from "@/shared/ui/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Separator } from "@/shared/ui/shadcn/separator";
import { Skeleton } from "@/shared/ui/shadcn/skeleton";

type Props = {
  loading: boolean;
  kpi: KpiData | null;
  pendingApprovals: {
    drivers: number;
    trucks: number;
  };
};

export function DashboardQuickActions({ loading, kpi, pendingApprovals }: Props) {
  const navigate = useNavigate();
  const deviationCount = kpi?.deviationCasesOpen ?? 0;
  const pendingTotal = pendingApprovals.drivers + pendingApprovals.trucks;
  const approvalRoute =
    pendingApprovals.trucks >= pendingApprovals.drivers ? "/trucks/approvals" : "/drivers/approvals";

  return (
    <Card className="border-border/70 bg-gradient-to-br from-background to-muted lg:min-h-[24rem]">
      <CardHeader className="space-y-1">
        <CardTitle className="text-lg font-semibold">즉시 조치 필요 항목</CardTitle>
        <p className="text-base text-foreground/70">운영 우선순위 상태 요약</p>
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
            <div className="flex gap-3 rounded-xl border border-border/60 bg-background/75 p-4">
              <Clock className="mt-0.5 h-5 w-5 text-primary" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-base font-semibold">승인 대기</p>
                  <Badge variant={pendingTotal > 0 ? "default" : "outline"}>{pendingTotal}건</Badge>
                </div>
                <p className="mt-1 text-sm text-foreground/70">
                  기사 {pendingApprovals.drivers}건 / 차량 {pendingApprovals.trucks}건
                </p>
              </div>
            </div>

            <div className="flex gap-3 rounded-xl border border-border/60 bg-background/75 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 text-accent" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-base font-semibold">이상 징후</p>
                  <Badge variant={deviationCount > 0 ? "destructive" : "secondary"}>{deviationCount}건</Badge>
                </div>
                <p className="mt-1 text-sm text-foreground/70">배송 지연/이탈 모니터링 대상</p>
              </div>
            </div>

            <div className="flex gap-3 rounded-xl border border-border/60 bg-background/75 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-base font-semibold">정산 진행</p>
                  <Badge variant="secondary">확인</Badge>
                </div>
                <p className="mt-1 text-sm text-foreground/70">
                  미정산 {(kpi?.totalSettlementAmount ? kpi.totalSettlementAmount / 1000000 : 0).toFixed(1)}백만
                </p>
              </div>
            </div>

            <Separator className="my-2" />

            <div className="grid grid-cols-1 gap-2">
              <Button variant="default" className="text-base" onClick={() => navigate(approvalRoute)}>
                승인 대기 상세 보기
              </Button>
              <Button variant="secondary" className="text-base" onClick={() => navigate("/ops/deviations")}>
                이상 징후 검토
              </Button>
              <Button variant="outline" className="text-base" onClick={() => navigate("/settlement/history")}>
                정산 이력 이동
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
