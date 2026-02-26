import type { MatchingDetail } from "@/features/admin/model/types";
import { formatKRW } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/shadcn/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Separator } from "@/shared/ui/shadcn/separator";
import { Skeleton } from "@/shared/ui/shadcn/skeleton";

type Props = {
  loading: boolean;
  matches: MatchingDetail[];
};

const statusLabelMap: Record<string, string> = {
  PENDING: "대기",
  ACCEPTED: "수락",
  IN_TRANSIT: "진행중",
  COMPLETED: "완료",
  CANCELED: "취소",
};

function toStatusVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  if (status === "COMPLETED") return "secondary";
  if (status === "CANCELED") return "destructive";
  if (status === "PENDING") return "outline";
  return "default";
}

export function MatchingsOverview({ loading, matches }: Props) {
  if (loading) {
    return (
      <Card className="border-border/70 bg-gradient-to-br from-background to-muted lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">최근 배차</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (matches.length === 0) {
    return (
      <Card className="border-border/70 bg-gradient-to-br from-background to-muted lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">최근 배차</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-base text-foreground/70">최근 매칭 이력이 없습니다.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/70 bg-gradient-to-br from-background to-muted lg:col-span-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">최근 배차 (배송)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {matches.map((match, idx) => (
          <div key={match.matchId} className="rounded-xl border border-border/60 bg-background/70 p-3">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-base font-semibold">{match.shipperName}</p>
                  <p className="text-sm text-foreground/70">
                    {match.originAddress}
                    {" -> "}
                    {match.destinationAddress}
                  </p>
                </div>
                <Badge variant={toStatusVariant(match.status)}>{statusLabelMap[match.status] || match.status}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-foreground/70">기사: </span>
                  <span className="font-medium">{match.driverName}</span>
                </div>
                <div className="text-right">
                  <span className="font-semibold">{formatKRW(match.agreedPrice)}</span>
                </div>
              </div>

              <div className="flex gap-4 text-sm text-foreground/70">
                <span>{match.distanceKm}km</span>
                <span>예상 {match.estimatedMinutes}분</span>
                {match.actualMinutes ? <span>실제 {match.actualMinutes}분</span> : null}
              </div>
            </div>

            {idx < matches.length - 1 ? <Separator className="mt-3" /> : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
