import { useSyncExternalStore } from "react";

import type { AdminActivityLog } from "@/shared/lib/activity-log";
import { getActivityLogs, subscribeActivityLogs } from "@/shared/lib/activity-log";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Badge } from "@/shared/ui/shadcn/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/shadcn/table";

const ACTION_LABELS: Record<AdminActivityLog["action"], string> = {
  QUOTE_UPDATED: "견적 수정",
  QUOTE_NOTIFICATION_SENT: "견적 알림 발송",
  PRICING_UPDATED: "금액 기준 수정",
  PRICING_NOTIFICATION_SENT: "금액 알림 발송",
  DISPATCH_ASSIGNED: "배차 강제 지정",
  DRIVER_APPROVAL_REVIEWED: "차주 승인 심사",
  SETTLEMENT_REVIEWED: "정산 승인 심사",
  LIVE_ALERT_SENT: "실시간 카카오 알림",
};

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR", { hour12: false });
}

export function ActivityLogView() {
  const logs = useSyncExternalStore(subscribeActivityLogs, getActivityLogs, getActivityLogs);

  return (
    <div className="space-y-6 min-h-screen bg-background text-foreground">
      <div>
        <h1 className="text-2xl font-semibold">활동 로그</h1>
        <p className="text-sm text-foreground">관리자 작업과 알림 발송 이력을 시간 순으로 확인합니다.</p>
      </div>

      <Card className="rounded-lg border border-border bg-background">
        <CardHeader>
          <CardTitle>최근 활동</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border bg-background overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead>시간</TableHead>
                  <TableHead>작업</TableHead>
                  <TableHead>대상 ID</TableHead>
                  <TableHead>모드</TableHead>
                  <TableHead>내용</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-foreground">
                      기록된 활동 로그가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{formatDateTime(item.createdAt)}</TableCell>
                      <TableCell>{ACTION_LABELS[item.action]}</TableCell>
                      <TableCell>{item.targetId ?? "-"}</TableCell>
                      <TableCell>
                        <Badge variant={item.mode === "MOCK" ? "secondary" : "outline"}>{item.mode}</Badge>
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
