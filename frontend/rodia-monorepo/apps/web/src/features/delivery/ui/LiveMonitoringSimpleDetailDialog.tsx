import type { LiveDeliveryRow } from "@/features/delivery/model/liveTypes";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/shadcn/dialog";

type Props = {
  row: LiveDeliveryRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function LiveMonitoringSimpleDetailDialog({ row, open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-lg border border-border bg-background">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">실시간 배송 상세</DialogTitle>
        </DialogHeader>
        {row ? (
          <div className="space-y-3">
            <InfoRow label="매칭 ID" value={row.matchId} />
            <InfoRow label="견적 ID" value={row.quoteId} />
            <InfoRow label="기사" value={`${row.driverName} (${row.driverId})`} />
            <InfoRow label="화주" value={row.shipperName} />
            <InfoRow label="출발지" value={row.originAddress} />
            <InfoRow label="도착지" value={row.destinationAddress} />
            <InfoRow label="GPS 갱신" value={row.routeUpdatedAt} />
            <InfoRow label="현재 좌표" value={`${row.currentLat}, ${row.currentLng}`} />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted p-3">
      <div className="text-sm text-foreground/70">{label}</div>
      <div className="mt-1 text-base font-medium">{value}</div>
    </div>
  );
}
