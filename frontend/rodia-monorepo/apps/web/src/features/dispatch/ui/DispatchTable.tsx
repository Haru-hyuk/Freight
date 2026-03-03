import * as React from "react";

import { fetchAssignableDrivers, forceAssignDispatchDriver } from "@/features/dispatch/api/dispatchApi";
import type { DispatchDriverOption, DispatchRow } from "@/features/dispatch/model/types";
import { Badge } from "@/shared/ui/shadcn/badge";
import { Button } from "@/shared/ui/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/shadcn/dialog";
import { getMatchingProgressBadgeVariant, getMatchingProgressLabel } from "@/shared/lib/matching-progress";
import { Skeleton } from "@/shared/ui/shadcn/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/shadcn/table";

type Props = {
  rows: DispatchRow[];
  total: number;
  loading: boolean;
  onRefresh?: () => Promise<void> | void;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function MatchStatusBadge({ status }: { status: DispatchRow["matchStatus"] }) {
  return <Badge variant={getMatchingProgressBadgeVariant(status)}>{getMatchingProgressLabel(status)}</Badge>;
}

function PaymentStatusBadge({ status }: { status: DispatchRow["paymentStatus"] }) {
  if (status === "COMPLETED") return <Badge variant="secondary">결제 완료</Badge>;
  if (status === "FAILED") return <Badge variant="destructive">결제 실패</Badge>;
  if (status === "REFUNDED") return <Badge variant="outline">환불</Badge>;
  return <Badge variant="outline">결제 대기</Badge>;
}

function SettlementStatusBadge({ status }: { status: DispatchRow["settlementStatus"] }) {
  if (status === "COMPLETED") return <Badge variant="secondary">정산 완료</Badge>;
  if (status === "FAILED") return <Badge variant="destructive">정산 실패</Badge>;
  if (status === "PROCESSING") return <Badge variant="outline">정산 처리 중</Badge>;
  return <Badge variant="outline">정산 대기</Badge>;
}

function DeviationBadge({ severity }: { severity: DispatchRow["deviationSeverity"] }) {
  if (severity === "SEVERE") return <Badge variant="destructive">심각</Badge>;
  if (severity === "MODERATE") return <Badge variant="outline">주의</Badge>;
  return <Badge variant="secondary">정상</Badge>;
}

export function DispatchTable({ rows, total, loading, onRefresh }: Props) {
  const [selected, setSelected] = React.useState<DispatchRow | null>(null);
  const [assignableDrivers, setAssignableDrivers] = React.useState<DispatchDriverOption[]>([]);
  const [loadingDrivers, setLoadingDrivers] = React.useState(false);
  const [assigningDriverId, setAssigningDriverId] = React.useState<string | null>(null);
  const [assignNotice, setAssignNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!selected || selected.driverName) {
      setAssignableDrivers([]);
      return;
    }

    let mounted = true;
    setLoadingDrivers(true);

    void fetchAssignableDrivers(selected.matchId)
      .then((drivers) => {
        if (mounted) setAssignableDrivers(drivers);
      })
      .finally(() => {
        if (mounted) setLoadingDrivers(false);
      });

    return () => {
      mounted = false;
    };
  }, [selected]);

  const handleAssign = async (driver: DispatchDriverOption) => {
    if (!selected) return;
    setAssigningDriverId(driver.driverId);
    try {
      const updated = await forceAssignDispatchDriver({ matchId: selected.matchId, driverId: driver.driverId });
      if (updated) {
        setSelected(updated);
        setAssignNotice(`${driver.driverName} 기사로 지정되었습니다.`);
        await onRefresh?.();
      }
    } finally {
      setAssigningDriverId(null);
    }
  };

  return (
    <>
      <Card className="rounded-lg border border-border bg-background">
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg text-foreground">배차 목록</CardTitle>
          <p className="text-sm text-foreground">총 {total}건</p>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border bg-background">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead>매칭 / 견적</TableHead>
                  <TableHead>화주 / 화물</TableHead>
                  <TableHead>경로</TableHead>
                  <TableHead>기사</TableHead>
                  <TableHead>운영 상태</TableHead>
                  <TableHead>정산 정보</TableHead>
                  <TableHead>리스크 / 알림</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <div className="space-y-2 p-2">
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-foreground">
                      조회된 배차 건이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.matchId} className="cursor-pointer hover:bg-muted" onClick={() => setSelected(row)}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium text-foreground">{row.matchId}</div>
                          <div className="text-xs text-foreground">{row.quoteId}</div>
                          <div className="text-xs text-foreground">요청 {row.requestedAt}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-foreground">{row.shipperName}</div>
                          <div className="text-xs text-foreground">{row.cargoType}</div>
                          <div className="text-xs text-foreground">사용 {row.currentVolumeCbm} cbm</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm text-foreground">{row.originAddress}</div>
                          <div className="text-sm text-foreground">{row.destinationAddress}</div>
                          <div className="text-xs text-foreground">거리 {row.routeDistanceKm} km</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {row.driverName ? <Badge variant="secondary">{row.driverName}</Badge> : <Badge variant="outline">미배정</Badge>}
                          <div className="text-xs text-foreground">{row.truckName ?? "차량 대기"}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <MatchStatusBadge status={row.matchStatus} />
                          <SettlementStatusBadge status={row.settlementStatus} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm text-foreground">
                          <div>총 운임 {formatCurrency(row.totalFare)} KRW</div>
                          <div>기사 정산 {formatCurrency(row.driverPayout)} KRW</div>
                          <PaymentStatusBadge status={row.paymentStatus} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <DeviationBadge severity={row.deviationSeverity} />
                          <div className="text-xs text-foreground">미확인 알림 {row.unreadNotificationCount}건</div>
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

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
            setAssignNotice(null);
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-lg border border-border bg-background">
          <DialogHeader>
            <DialogTitle>배차 상세</DialogTitle>
          </DialogHeader>

          {selected ? (
            <div className="space-y-3 text-sm text-foreground">
              <div className="rounded-lg border border-border bg-muted p-3">
                <div className="font-medium">{selected.matchId}</div>
                <div>{selected.quoteId}</div>
              </div>

              <div className="rounded-lg border border-border bg-background p-3">
                <div className="font-medium">경로 및 일정</div>
                <div className="mt-1">{selected.originAddress}</div>
                <div>{selected.destinationAddress}</div>
                <div className="mt-1">요청: {selected.requestedAt}</div>
                <div>출발: {selected.departAt ?? "-"}</div>
                <div>도착: {selected.arriveAt ?? "-"}</div>
              </div>

              <div className="rounded-lg border border-border bg-background p-3">
                <div className="font-medium">기사 및 적재</div>
                <div className="mt-1">기사: {selected.driverName ?? "미배정"}</div>
                <div>차량: {selected.truckName ?? "대기"}</div>
                <div>
                  적재: 사용 {selected.currentVolumeCbm} cbm / 잔여 {selected.remainingVolumeCbm} cbm
                </div>
              </div>

              {!selected.driverName ? (
                <div className="rounded-lg border border-border bg-background p-3">
                  <div className="font-medium">기사 선택 지정</div>
                  <p className="mt-1 text-xs text-foreground">미배정 배차 건에 대해 전체 기사 리스트에서 관리자가 선택 지정할 수 있습니다.</p>

                  {assignNotice ? (
                    <div className="mt-2 rounded-lg border border-border bg-muted p-2 text-xs text-foreground">{assignNotice}</div>
                  ) : null}

                  {loadingDrivers ? (
                    <div className="mt-3 space-y-2">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : assignableDrivers.length === 0 ? (
                    <div className="mt-3 rounded-lg border border-border bg-muted p-3 text-xs text-foreground">표시할 기사가 없습니다.</div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {assignableDrivers.map((driver) => (
                        <div key={driver.driverId} className="flex items-center justify-between rounded-lg border border-border bg-muted p-2">
                          <div>
                            <div className="font-medium text-foreground">{driver.driverName}</div>
                            <div className="text-xs text-foreground">
                              {driver.truckName} / 여유 {Math.max(driver.maxVolumeCbm - driver.currentVolumeCbm, 0).toFixed(1)} cbm
                            </div>
                          </div>
                          <Button type="button" onClick={() => void handleAssign(driver)} disabled={assigningDriverId === driver.driverId}>
                            지정
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              <div className="rounded-lg border border-border bg-background p-3">
                <div className="font-medium">정산 및 알림</div>
                <div className="mt-1">총 운임: {formatCurrency(selected.totalFare)} KRW</div>
                <div>기사 정산: {formatCurrency(selected.driverPayout)} KRW</div>
                <div>플랫폼 수수료: {formatCurrency(selected.platformFee)} KRW</div>
                <div>미확인 알림: {selected.unreadNotificationCount}건</div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setSelected(null)}>
                  닫기
                </Button>
                <Button type="button">기사 알림 전송</Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
