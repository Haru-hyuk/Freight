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

export function LiveMonitoringTable({ rows, loading, onOpenDetail, onOpenView, onSendKakaoAlert }: Props) {
  return (
    <Card className="rounded-lg border border-border bg-background">
      <CardHeader className="space-y-1">
        <CardTitle className="text-lg">실시간 배송 모니터링</CardTitle>
        <p className="text-sm text-foreground">matches, gps_logs, driver_routes 기반 실시간 상태</p>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border bg-background">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted">
                <TableHead>매칭</TableHead>
                <TableHead>화주/차주</TableHead>
                <TableHead>현재 위치</TableHead>
                <TableHead>진행률</TableHead>
                <TableHead>편차</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <div className="space-y-2 p-2">
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-foreground">
                    실시간 모니터링 데이터가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.matchId}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{row.matchId}</div>
                        <div className="text-xs text-foreground">{row.quoteId}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">{row.shipperName}</div>
                        <div className="text-sm text-foreground">{row.driverName}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <div>
                          {row.currentLat}, {row.currentLng}
                        </div>
                        <div className="text-foreground">{row.speedKmh} km/h</div>
                      </div>
                    </TableCell>
                    <TableCell>{row.progressPercent}%</TableCell>
                    <TableCell>{row.deviationDistanceKm} km</TableCell>
                    <TableCell>
                      <StatusBadge status={row.liveStatus} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-2">
                        <Button type="button" variant="secondary" onClick={() => onOpenDetail(row)}>
                          상세
                        </Button>
                        <Button type="button" variant="secondary" onClick={() => onOpenView(row)}>
                          보기
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => onSendKakaoAlert(row)}
                          disabled={row.liveStatus === "NORMAL"}
                        >
                          카카오 알림
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
