import type { LiveDeliveryDetail } from "@/features/delivery/model/liveTypes";
import { LiveRouteMiniMap } from "@/features/delivery/ui/LiveRouteMiniMap";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/shadcn/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/shadcn/table";

type Props = {
  detail: LiveDeliveryDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function toKmText(value: number): string {
  return `${value.toFixed(2)} km`;
}

function calculateCurrentKm(totalRouteKm: number, routeProgressPercent: number): number {
  return (totalRouteKm * routeProgressPercent) / 100;
}

export function LiveMonitoringViewDialog({ detail, open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-border bg-background p-0">
        <DialogHeader className="border-b border-border bg-background px-6 py-4">
          <DialogTitle className="text-xl font-semibold">배송 경로 보기</DialogTitle>
        </DialogHeader>

        {detail ? (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <LiveRouteMiniMap plannedRoute={detail.plannedRoute} currentRoute={detail.currentRoute} />

              <div className="space-y-2">
                <InfoCard label="화물 종류" value={detail.cargoType} />
                <InfoCard label="화물 중량" value={`${detail.cargoWeightKg.toLocaleString()} kg`} />
                <InfoCard label="차종" value={detail.truckType} />
                <InfoCard label="차량 톤수" value={`${detail.truckWeightTon} ton`} />
                <InfoCard label="차량 적재량" value={`${detail.truckVolumeCbm} cbm`} />
                <InfoCard label="총 경로 길이" value={toKmText(detail.totalRouteKm)} />
                <InfoCard
                  label="현재 위치"
                  value={`${toKmText(calculateCurrentKm(detail.totalRouteKm, detail.routeProgressPercent))} / ${toKmText(detail.totalRouteKm)}`}
                />
              </div>
            </div>

            <div className="rounded-lg border border-border bg-background">
              <div className="border-b border-border bg-muted px-3 py-2 text-base font-semibold">이행 로그</div>
              <div className="max-h-[40vh] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted hover:bg-muted">
                      <TableHead className="text-base font-semibold text-foreground">이벤트</TableHead>
                      <TableHead className="text-base font-semibold text-foreground">시각</TableHead>
                      <TableHead className="text-base font-semibold text-foreground">상세</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.timeline.map((event) => (
                      <TableRow key={event.id} className="hover:bg-secondary/80">
                        <TableCell className="text-base font-medium">{event.label}</TableCell>
                        <TableCell className="text-base">{event.occurredAt}</TableCell>
                        <TableCell className="text-base text-foreground/80">{event.note ?? "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        ) : (
          <div className="m-6 rounded-lg border border-border bg-muted p-4 text-base text-foreground/70">조회 가능한 상세 데이터가 없습니다.</div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted p-3">
      <div className="text-sm text-foreground/70">{label}</div>
      <div className="mt-1 text-base font-medium">{value}</div>
    </div>
  );
}
