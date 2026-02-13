// src/features/dashboard/ui/DeviationFeed.tsx
// 이상징후 피드
import type { DeviationFeedItem } from "@/features/dashboard/model/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Separator } from "@/shared/ui/shadcn/separator";
import { Skeleton } from "@/shared/ui/shadcn/skeleton";
import { Badge } from "@/shared/ui/shadcn/badge";
import { SeverityPill } from "@/features/dashboard/ui/SeverityPill";

type Props = {
  loading: boolean;
  items: DeviationFeedItem[];
};

export function DeviationFeed({ loading, items }: Props) {
  return (
    <Card className="rounded-lg border border-border bg-background lg:col-span-2">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base font-bold">이상 징후 피드</CardTitle>
        <p className="text-sm opacity-70">deviation_events 기반, match → driver → quote 연결</p>
      </CardHeader>

      <CardContent className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-border bg-muted p-4 text-sm opacity-80">현재 이상 징후 없음</div>
        ) : (
          <div className="space-y-3">
            {items.map((it, idx) => (
              <div key={it.deviationId} className="rounded-lg border border-border bg-background p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <SeverityPill severity={it.severity} />
                    <Badge className="bg-muted text-foreground">{it.deviationPercent.toFixed(1)}%</Badge>
                    <div className="text-sm font-semibold">{it.quoteSummary}</div>
                  </div>

                  <div className="flex items-center gap-2 text-sm opacity-70">
                    <span>{it.driverName}</span>
                    <span className="opacity-50">•</span>
                    <span>{it.createdAt}</span>
                  </div>
                </div>

                <Separator className="my-3" />

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm opacity-80">
                    deviationId: <span className="font-semibold">{it.deviationId}</span> / matchId:{" "}
                    <span className="font-semibold">{it.matchId}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge className={it.adjusted ? "bg-secondary text-foreground" : "bg-destructive text-foreground"}>
                      {it.adjusted ? "조정됨" : "미조정"}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}

            {items.length > 0 ? (
              <div className="rounded-lg border border-border bg-muted p-3 text-sm opacity-80">
                최근 {items.length}건만 표시 (추후 페이지네이션/필터 추가)
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
