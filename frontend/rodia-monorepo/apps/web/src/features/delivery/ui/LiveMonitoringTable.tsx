import { Badge } from "@/shared/ui/shadcn/badge";
import { Button } from "@/shared/ui/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Skeleton } from "@/shared/ui/shadcn/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/shadcn/table";
import type { LiveDeliveryRow } from "@/features/delivery/model/liveTypes";

type Props = {
  rows: LiveDeliveryRow[];
  loading: boolean;
  onOpenDetail: (row: LiveDeliveryRow) => void;
  onOpenView: (row: LiveDeliveryRow) => void;
  onSendKakaoAlert: (row: LiveDeliveryRow) => void;
};

function StatusBadge({ status }: { status: LiveDeliveryRow["liveStatus"] }) {
  if (status === "NORMAL") return <Badge variant="secondary">정상</Badge>;
  if (status === "DELAYED") return <Badge variant="outline">지연</Badge>;
  return <Badge variant="destructive">이탈</Badge>;
}

function toRoundedKmText(value: number): string {
  return (Math.round(value * 100) / 100).toFixed(2);
}

export function LiveMonitoringTable({ rows, loading, onOpenDetail, onOpenView, onSendKakaoAlert }: Props) {
  return (
    <Card className="rounded-lg border border-border bg-background">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl font-semibold">실시간 배송 목록</CardTitle>
        <p className="text-base text-foreground/70">matches, gps_logs, driver_routes 기준 조회</p>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border bg-muted/40">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted hover:bg-muted">
                <TableHead className="text-base font-semibold text-foreground">매칭</TableHead>
                <TableHead className="text-base font-semibold text-foreground">화주 / 기사</TableHead>
                <TableHead className="text-base font-semibold text-foreground">현재 위치</TableHead>
                <TableHead className="text-base font-semibold text-foreground">진행률</TableHead>
                <TableHead className="text-base font-semibold text-foreground">상태</TableHead>
                <TableHead className="text-right text-base font-semibold text-foreground">동작</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <div className="space-y-2 p-2">
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-base text-foreground/70">
                    실시간 배송 데이터가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.matchId} className="cursor-pointer hover:bg-muted" onClick={() => onOpenDetail(row)}>
                    <TableCell className="text-base">
                      <div className="space-y-1">
                        <div className="font-semibold">{row.matchId}</div>
                        <div className="text-sm text-foreground/70">{row.quoteId}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-base">
                      <div className="space-y-1">
                        <div className="font-medium">{row.shipperName}</div>
                        <div className="text-foreground/70">{row.driverName}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-base">
                      <div className="space-y-1">
                        <div>{toRoundedKmText(row.currentLat)}km / {toRoundedKmText(row.currentLng)} km</div>
                        <div className="text-sm text-foreground/70">{row.speedKmh} km/h</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-base">{row.progressPercent}%</TableCell>
                    <TableCell>
                      <StatusBadge status={row.liveStatus} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={(event) => {
                            event.stopPropagation();
                            onOpenView(row);
                          }}
                          className="text-base"
                        >
                          경로 보기
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={(event) => {
                            event.stopPropagation();
                            onSendKakaoAlert(row);
                          }}
                          disabled={row.liveStatus === "NORMAL"}
                          className="text-base"
                        >
                          알림 발송
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
