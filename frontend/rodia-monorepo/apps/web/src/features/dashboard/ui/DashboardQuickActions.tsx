// src/features/dashboard/ui/DashboardQuickActions.tsx
import type { DeviationFeedItem, KpiData } from "@/features/dashboard/model/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Button } from "@/shared/ui/shadcn/button";
import { Separator } from "@/shared/ui/shadcn/separator";
import { Skeleton } from "@/shared/ui/shadcn/skeleton";
import { Badge } from "@/shared/ui/shadcn/badge";

type Props = {
  loading: boolean;
  kpi: KpiData | null;
  items: DeviationFeedItem[];
};

export function DashboardQuickActions({ loading, kpi, items }: Props) {
  const severeCount = items.filter((x) => x.severity === "SEVERE" && !x.adjusted).length;
  const unsettled = kpi?.unsettledAmount ?? 0;

  return (
    <Card className="rounded-lg border border-border bg-background">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base font-bold">운영 액션</CardTitle>
        <p className="text-sm opacity-70">바로 처리해야 하는 일만 추려서</p>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-border bg-muted p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">미조정 SEVERE</div>
                <Badge className={severeCount > 0 ? "bg-destructive text-foreground" : "bg-secondary text-foreground"}>
                  {severeCount}건
                </Badge>
              </div>
              <div className="mt-2 text-sm opacity-70">경로 이탈/이상 이벤트 중 우선순위 최상</div>
            </div>

            <div className="rounded-lg border border-border bg-muted p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">미정산 금액</div>
                <Badge className={unsettled > 0 ? "bg-accent text-foreground" : "bg-secondary text-foreground"}>
                  {unsettled > 0 ? "확인 필요" : "정상"}
                </Badge>
              </div>
              <div className="mt-2 text-sm opacity-70">settlements.status != COMPLETED</div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 gap-2">
              <Button className="bg-primary text-foreground">이상 징후 상세 보기</Button>
              <Button className="bg-secondary text-foreground">정산 대기 목록 열기</Button>
              <Button className="bg-destructive text-foreground">긴급 조치 플로우 실행</Button>
            </div>

            <div className="text-xs opacity-60">
              지금은 목업 버튼. 추후 라우팅(`/orders`, `/settlement`) 연결하면 끝.
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
