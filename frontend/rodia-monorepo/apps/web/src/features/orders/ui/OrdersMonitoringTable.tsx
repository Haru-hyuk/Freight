import type { OrderMonitoringRow } from "@/features/orders/model/types";
import { getMatchingProgressBadgeVariant, getMatchingProgressLabel } from "@/shared/lib/matching-progress";
import { Badge } from "@/shared/ui/shadcn/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Skeleton } from "@/shared/ui/shadcn/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/shadcn/table";

type Props = {
  rows: OrderMonitoringRow[];
  loading: boolean;
};

function quoteStatusLabel(status: OrderMonitoringRow["quoteStatus"]): string {
  if (status === "OPEN") return "\uB9E4\uCE6D\uC911";
  if (status === "MATCHED") return "\uBC30\uCC28\uC911";
  if (status === "IN_TRANSIT") return "\uBC30\uCC28\uC911";
  if (status === "DELIVERED") return "\uBC30\uCC28\uC644\uB8CC";
  if (status === "CANCELLED") return "\uCDE8\uC18C";
  return "\uD655\uC778 \uD544\uC694";
}

function paymentStatusLabel(status: OrderMonitoringRow["paymentStatus"]): string {
  if (status === "PENDING") return "\uB300\uAE30";
  if (status === "COMPLETED") return "\uC644\uB8CC";
  if (status === "FAILED") return "\uC2E4\uD328";
  return "\uD655\uC778 \uD544\uC694";
}

function settlementStatusLabel(status: OrderMonitoringRow["settlementStatus"]): string {
  if (status === "PENDING") return "\uB300\uAE30";
  if (status === "PROCESSING") return "\uCC98\uB9AC\uC911";
  if (status === "COMPLETED") return "\uC644\uB8CC";
  if (status === "FAILED") return "\uC2E4\uD328";
  return "\uD655\uC778 \uD544\uC694";
}

function RiskBadge({ risk }: { risk: OrderMonitoringRow["riskState"] }) {
  if (risk === "ACTION_REQUIRED") return <Badge variant="destructive">{"\uC870\uCE58 \uD544\uC694"}</Badge>;
  if (risk === "WATCH") return <Badge variant="outline">{"\uC8FC\uC758"}</Badge>;
  return <Badge variant="secondary">{"\uC815\uC0C1"}</Badge>;
}

function MatchStatusBadge({ status }: { status: OrderMonitoringRow["matchStatus"] }) {
  return <Badge variant={getMatchingProgressBadgeVariant(status)}>{getMatchingProgressLabel(status)}</Badge>;
}

export function OrdersMonitoringTable({ rows, loading }: Props) {
  return (
    <Card className="rounded-lg border border-border bg-background">
      <CardHeader className="space-y-1">
        <CardTitle className="text-lg font-semibold">{"\uC8FC\uBB38 \uBAA8\uB2C8\uD130\uB9C1"}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="rounded-b-lg border-t border-border bg-muted">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted">
                <TableHead className="text-foreground">{"\uACAC\uC801 / \uB9E4\uCE6D"}</TableHead>
                <TableHead className="text-foreground">{"\uC0C1\uD0DC"}</TableHead>
                <TableHead className="text-foreground">{"\uD654\uC8FC / \uAE30\uC0AC"}</TableHead>
                <TableHead className="text-foreground">{"\uC6B4\uC1A1\uAD6C\uAC04"}</TableHead>
                <TableHead className="text-foreground">{"\uACB0\uC81C / \uC815\uC0B0"}</TableHead>
                <TableHead className="text-right text-foreground">{"\uC6B4\uC784"}</TableHead>
                <TableHead className="text-foreground">{"\uB9AC\uC2A4\uD06C"}</TableHead>
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
                  <TableCell colSpan={7} className="py-10 text-center text-foreground">
                    {"\uC870\uD68C \uACB0\uACFC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4."}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={`${row.quoteId}-${row.matchId}`}>
                    <TableCell className="py-3 text-sm">
                      <div className="font-semibold">{row.quoteId}</div>
                      <div className="opacity-70">{row.matchId}</div>
                      <div className="opacity-70">{row.requestedAt}</div>
                    </TableCell>
                    <TableCell className="py-3 text-sm">
                      <div className="mb-2">{quoteStatusLabel(row.quoteStatus)}</div>
                      <MatchStatusBadge status={row.matchStatus} />
                    </TableCell>
                    <TableCell className="py-3 text-sm">
                      <div className="font-semibold">{row.shipperName}</div>
                      <div className="opacity-70">{row.driverName}</div>
                      <div className="opacity-70">{row.cargoName}</div>
                    </TableCell>
                    <TableCell className="py-3 text-sm">
                      <div>{row.originAddress}</div>
                      <div className="opacity-70">{row.destinationAddress}</div>
                    </TableCell>
                    <TableCell className="py-3 text-sm">
                      <div>{paymentStatusLabel(row.paymentStatus)}</div>
                      <div className="opacity-70">{settlementStatusLabel(row.settlementStatus)}</div>
                    </TableCell>
                    <TableCell className="py-3 text-right text-sm font-semibold">
                      {`${row.totalFare.toLocaleString()}\uC6D0`}
                    </TableCell>
                    <TableCell className="py-3">
                      <RiskBadge risk={row.riskState} />
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
