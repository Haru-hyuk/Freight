// src/features/dashboard/ui/MatchingsOverview.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Skeleton } from "@/shared/ui/shadcn/skeleton";
import { Badge } from "@/shared/ui/shadcn/badge";
import { Separator } from "@/shared/ui/shadcn/separator";
import type { MatchingDetail } from "@/features/admin/model/types";
import { formatKRW } from "@/shared/lib/utils";

type Props = {
  loading: boolean;
  matches: MatchingDetail[];
};

const statusLabelMap: Record<string, string> = {
  PENDING: "대기중",
  ACCEPTED: "수락됨",
  IN_TRANSIT: "진행중",
  COMPLETED: "완료",
  CANCELED: "취소됨",
};

const statusColorMap: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  ACCEPTED: "bg-blue-100 text-blue-800",
  IN_TRANSIT: "bg-purple-100 text-purple-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELED: "bg-gray-100 text-gray-800",
};

export function MatchingsOverview({ loading, matches }: Props) {
  if (loading) {
    return (
      <Card className="rounded-lg border border-border lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base font-bold">최근 매칭</CardTitle>
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
      <Card className="rounded-lg border border-border lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base font-bold">최근 매칭</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">최근 매칭 이력이 없습니다.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-lg border border-border lg:col-span-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold">최근 배차 (배송)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {matches.map((match, idx) => (
          <div key={match.matchId}>
            <div className="space-y-2">
              <div className="flex gap-2 items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-sm">{match.shipperName}</p>
                  <p className="text-xs text-muted-foreground">
                    {match.originAddress} → {match.destinationAddress}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={`flex-shrink-0 ${statusColorMap[match.status] || "bg-gray-100 text-gray-800"}`}
                >
                  {statusLabelMap[match.status] || match.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">기사: </span>
                  <span className="font-medium">{match.driverName}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-primary">{formatKRW(match.agreedPrice)}</span>
                </div>
              </div>

              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>{match.distanceKm}km</span>
                <span>예상 {match.estimatedMinutes}분</span>
                {match.actualMinutes && <span>실제 {match.actualMinutes}분</span>}
              </div>
            </div>
            {idx < matches.length - 1 && <Separator className="mt-3" />}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
