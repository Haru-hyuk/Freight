import * as React from "react";

import { fetchLiveDeliveryDetail, fetchLiveDeliveryRows, sendKakaoLiveAlert } from "@/features/delivery/api/liveMonitoringApi";
import type { LiveDeliveryDetail, LiveDeliveryRow } from "@/features/delivery/model/liveTypes";
import { LiveMonitoringSimpleDetailDialog } from "@/features/delivery/ui/LiveMonitoringSimpleDetailDialog";
import { LiveMonitoringTable } from "@/features/delivery/ui/LiveMonitoringTable";
import { LiveMonitoringViewDialog } from "@/features/delivery/ui/LiveMonitoringViewDialog";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/shadcn/alert";
import { Button } from "@/shared/ui/shadcn/button";

export function LiveMonitoringView() {
  const [rows, setRows] = React.useState<LiveDeliveryRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [selectedRow, setSelectedRow] = React.useState<LiveDeliveryRow | null>(null);
  const [selectedDetail, setSelectedDetail] = React.useState<LiveDeliveryDetail | null>(null);
  const [viewOpen, setViewOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchLiveDeliveryRows();
      setRows(response);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">배송 실시간 모니터링</h2>
          <p className="mt-1 text-sm text-foreground">
            Kakao 알림 연동을 전제로 실시간 GPS/편차를 확인하고 즉시 알림을 보냅니다.
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={() => void load()}>
          새로고침
        </Button>
      </div>

      {notice ? (
        <Alert className="border border-border bg-muted">
          <AlertTitle>알림 처리</AlertTitle>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      ) : null}

      <LiveMonitoringTable
        rows={rows}
        loading={loading}
        onOpenDetail={setSelectedRow}
        onOpenView={(row) => {
          void fetchLiveDeliveryDetail(row.matchId).then((detail) => {
            setSelectedDetail(detail);
            setViewOpen(true);
          });
        }}
        onSendKakaoAlert={(row) => {
          void sendKakaoLiveAlert({
            matchId: row.matchId,
            templateCode: row.liveStatus === "DEVIATED" ? "DEVIATION_NOTICE" : "DELAY_NOTICE",
          });
          setNotice(`${row.matchId} 건에 카카오 알림 전송 요청을 처리했습니다.`);
        }}
      />

      <LiveMonitoringSimpleDetailDialog row={selectedRow} open={Boolean(selectedRow)} onOpenChange={(open) => (open ? null : setSelectedRow(null))} />

      <LiveMonitoringViewDialog detail={selectedDetail} open={viewOpen} onOpenChange={setViewOpen} />
    </div>
  );
}
