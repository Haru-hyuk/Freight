import * as React from "react";

import { fetchRemoteActivityLogs } from "@/features/ops/api/activityApi";
import { getActivityLogs, subscribeActivityLogs } from "@/shared/lib/activity-log";
import type { AdminActivityLog } from "@/shared/lib/activity-log";
import { useMockMode } from "@/shared/lib/hooks/useMockMode";
import { useRefreshCooldown } from "@/shared/lib/hooks/useRefreshCooldown";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/shadcn/alert";
import { Badge } from "@/shared/ui/shadcn/badge";
import { Button } from "@/shared/ui/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/shadcn/table";

const ACTION_LABELS: Record<AdminActivityLog["action"], string> = {
  QUOTE_UPDATED: "견적 수정",
  QUOTE_NOTIFICATION_SENT: "견적 알림 발송",
  PRICING_UPDATED: "요율 수정",
  PRICING_NOTIFICATION_SENT: "요율 알림 발송",
  SANCTION_CREATED: "제재 생성",
  DEVIATION_ACTIONED: "이상징후 조치",
  DISPATCH_ASSIGNED: "배차 지정",
  DRIVER_APPROVAL_REVIEWED: "차주 승인 검토",
  TRUCK_APPROVAL_REVIEWED: "차량 승인 검토",
  SETTLEMENT_REVIEWED: "정산 검토",
  ORDER_CANCELLATION_REVIEWED: "주문 취소 검토",
  LIVE_ALERT_SENT: "실시간 알림 발송",
  MATCHING_CANCELLED: "매칭 취소 처리",
  ADMIN_LOGOUT: "로그아웃",
};

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR", { hour12: false });
}

function mergeLogs(localLogs: AdminActivityLog[], remoteLogs: AdminActivityLog[]): AdminActivityLog[] {
  const map = new Map<string, AdminActivityLog>();

  for (const item of [...remoteLogs, ...localLogs]) {
    const current = map.get(item.id);
    if (!current) {
      map.set(item.id, item);
      continue;
    }
    if (new Date(item.createdAt).getTime() >= new Date(current.createdAt).getTime()) {
      map.set(item.id, item);
    }
  }

  return Array.from(map.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function ActivityLogView() {
  const { enabled: mockModeEnabled } = useMockMode();
  const { remainingSeconds, isCoolingDown, startCooldown } = useRefreshCooldown(5);
  const [localLogs, setLocalLogs] = React.useState<AdminActivityLog[]>(() => getActivityLogs());
  const [remoteLogs, setRemoteLogs] = React.useState<AdminActivityLog[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchRemoteActivityLogs();
      setRemoteLogs(rows);
    } catch {
      setRemoteLogs([]);
      setError("활동 로그를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    setLocalLogs(getActivityLogs());
    const unsubscribe = subscribeActivityLogs(() => {
      setLocalLogs(getActivityLogs());
    });
    return unsubscribe;
  }, []);

  React.useEffect(() => {
    void load();
  }, [load, mockModeEnabled]);

  const visibleLocalLogs = React.useMemo(
    () => (mockModeEnabled ? localLogs : localLogs.filter((row) => row.mode === "REAL")),
    [localLogs, mockModeEnabled],
  );
  const logs = React.useMemo(() => mergeLogs(visibleLocalLogs, remoteLogs), [visibleLocalLogs, remoteLogs]);

  return (
    <div className="min-h-screen space-y-6 bg-background text-foreground">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">활동 로그</h1>
          <p className="text-base text-foreground opacity-70">
            관리자 조치 이력과 서버 활동 이벤트를 한곳에서 확인합니다.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            if (!startCooldown()) return;
            void load();
          }}
          disabled={loading || isCoolingDown}
        >
          {loading ? "로딩 중..." : isCoolingDown ? `${remainingSeconds}초` : "새로고침"}
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>활동 로그 오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="rounded-lg border border-border bg-background">
        <CardHeader>
          <CardTitle>최근 활동</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-border bg-background">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead>발생 시각</TableHead>
                  <TableHead>조치</TableHead>
                  <TableHead>대상 ID</TableHead>
                  <TableHead>모드</TableHead>
                  <TableHead>메시지</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-foreground opacity-70">
                      활동 로그 로딩 중...
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-foreground opacity-70">
                      활동 로그가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{formatDateTime(item.createdAt)}</TableCell>
                      <TableCell>{ACTION_LABELS[item.action] ?? "알 수 없는 조치"}</TableCell>
                      <TableCell>{item.targetId ?? "-"}</TableCell>
                      <TableCell>
                        <Badge variant={item.mode === "MOCK" ? "secondary" : "outline"}>
                          {item.mode === "MOCK" ? "목업" : "실서버"}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.message}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
