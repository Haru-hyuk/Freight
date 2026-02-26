import type { DeviationEvent } from "@/features/admin/model/types";
import { SeverityPill } from "@/features/dashboard/ui/SeverityPill";
import { Badge } from "@/shared/ui/shadcn/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Separator } from "@/shared/ui/shadcn/separator";
import { Skeleton } from "@/shared/ui/shadcn/skeleton";

type Props = {
  loading: boolean;
  items: DeviationEvent[];
};

export function DeviationFeed({ loading, items }: Props) {
  return (
    <Card className="border-border/70 bg-gradient-to-br from-background to-muted">
      <CardHeader className="space-y-1">
        <CardTitle className="text-lg font-semibold">이상 징후 피드</CardTitle>
        <p className="text-base text-foreground/70">deviation_events 기준, match / driver / quote 연결</p>
      </CardHeader>

      <CardContent className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-border/60 bg-background/70 p-4 text-base text-foreground/70">최근 이상 징후가 없습니다.</div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const adjusted = item.status === "ADJUSTED" || item.status === "RESOLVED" || typeof item.adjustedAmount === "number";
              return (
                <div key={item.deviationId} className="rounded-xl border border-border/60 bg-background/70 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <SeverityPill severity={item.severity} />
                      <Badge variant="outline">{item.deviationPercent.toFixed(1)}%</Badge>
                      <div className="text-base font-semibold">{item.description}</div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-foreground/70">
                      <span>{item.driverName}</span>
                      <span>/</span>
                      <span>{item.reportedAt}</span>
                    </div>
                  </div>

                  <Separator className="my-3" />

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-foreground/70">
                      deviationId: <span className="font-semibold text-foreground">{item.deviationId}</span> / matchId:{" "}
                      <span className="font-semibold text-foreground">{item.matchId}</span>
                    </div>

                    <Badge variant={adjusted ? "secondary" : "destructive"}>{adjusted ? "조정 완료" : "미조정"}</Badge>
                  </div>
                </div>
              );
            })}

            <div className="rounded-xl border border-border/60 bg-background/70 p-3 text-sm text-foreground/70">최근 {items.length}건 표시 (운영 정책 기준)</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
