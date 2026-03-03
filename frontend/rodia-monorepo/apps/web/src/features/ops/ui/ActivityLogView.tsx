import * as React from "react";
import { useSyncExternalStore } from "react";

import { fetchRemoteActivityLogs } from "@/features/ops/api/activityApi";
import type { AdminActivityLog } from "@/shared/lib/activity-log";
import { getActivityLogs, subscribeActivityLogs } from "@/shared/lib/activity-log";
import { useMockMode } from "@/shared/lib/hooks/useMockMode";
import { useRefreshCooldown } from "@/shared/lib/hooks/useRefreshCooldown";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/shadcn/alert";
import { Badge } from "@/shared/ui/shadcn/badge";
import { Button } from "@/shared/ui/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/shadcn/table";

const ACTION_LABELS: Record<AdminActivityLog["action"], string> = {
  QUOTE_UPDATED: "\uACAC\uC801 \uC218\uC815",
  QUOTE_NOTIFICATION_SENT: "\uACAC\uC801 \uC54C\uB9BC \uBC1C\uC1A1",
  PRICING_UPDATED: "\uC694\uC728 \uC218\uC815",
  PRICING_NOTIFICATION_SENT: "\uC694\uC728 \uC54C\uB9BC \uBC1C\uC1A1",
  DISPATCH_ASSIGNED: "\uBC30\uCC28 \uC9C0\uC815",
  DRIVER_APPROVAL_REVIEWED: "\uCC28\uC8FC \uC2B9\uC778 \uAC80\uD1A0",
  TRUCK_APPROVAL_REVIEWED: "\uCC28\uB7C9 \uC2B9\uC778 \uAC80\uD1A0",
  SETTLEMENT_REVIEWED: "\uC815\uC0B0 \uAC80\uD1A0",
  ORDER_CANCELLATION_REVIEWED: "\uC8FC\uBB38 \uCDE8\uC18C \uAC80\uD1A0",
  LIVE_ALERT_SENT: "\uC2E4\uC2DC\uAC04 \uC54C\uB9BC \uBC1C\uC1A1",
};

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR", { hour12: false });
}

function mergeLogs(localLogs: AdminActivityLog[], remoteLogs: AdminActivityLog[]): AdminActivityLog[] {
  const merged = [...remoteLogs, ...localLogs];
  const unique = Array.from(new Map(merged.map((row) => [row.id, row])).values());
  return unique.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function ActivityLogView() {
  const localLogs = useSyncExternalStore(subscribeActivityLogs, getActivityLogs, getActivityLogs);
  const { enabled: mockModeEnabled } = useMockMode();
  const { remainingSeconds, isCoolingDown, startCooldown } = useRefreshCooldown(5);
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
      setError("\uD65C\uB3D9 \uB85C\uADF8\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load, mockModeEnabled]);

  const logs = React.useMemo(() => mergeLogs(localLogs, remoteLogs), [localLogs, remoteLogs]);

  return (
    <div className="min-h-screen space-y-6 bg-background text-foreground">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">\uD65C\uB3D9 \uB85C\uADF8</h1>
          <p className="text-base text-foreground opacity-70">
            \uAD00\uB9AC\uC790 \uC870\uCE58 \uB0B4\uC5ED\uACFC \uC11C\uBC84 \uD65C\uB3D9 \uC774\uBCA4\uD2B8\uB97C \uD568\uAED8 \uD655\uC778\uD569\uB2C8\uB2E4.
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
          {loading ? "\uB85C\uB529 \uC911..." : isCoolingDown ? `${remainingSeconds}\uCD08` : "\uC0C8\uB85C\uACE0\uCE68"}
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>\uD65C\uB3D9 \uB85C\uADF8 \uC624\uB958</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="rounded-lg border border-border bg-background">
        <CardHeader>
          <CardTitle>\uCD5C\uADFC \uD65C\uB3D9</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-border bg-background">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead>\uBC1C\uC0DD \uC2DC\uAC01</TableHead>
                  <TableHead>\uC870\uCE58</TableHead>
                  <TableHead>\uB300\uC0C1 ID</TableHead>
                  <TableHead>\uBAA8\uB4DC</TableHead>
                  <TableHead>\uBA54\uC2DC\uC9C0</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-foreground opacity-70">
                      \uD65C\uB3D9 \uB85C\uADF8 \uB85C\uB529 \uC911...
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-foreground opacity-70">
                      \uD65C\uB3D9 \uB85C\uADF8\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{formatDateTime(item.createdAt)}</TableCell>
                      <TableCell>{ACTION_LABELS[item.action] ?? "\uC54C \uC218 \uC5C6\uB294 \uC870\uCE58"}</TableCell>
                      <TableCell>{item.targetId ?? "-"}</TableCell>
                      <TableCell>
                        <Badge variant={item.mode === "MOCK" ? "secondary" : "outline"}>
                          {item.mode === "MOCK" ? "\uBAA9\uC5C5" : "\uC2E4\uC11C\uBE44\uC2A4"}
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
