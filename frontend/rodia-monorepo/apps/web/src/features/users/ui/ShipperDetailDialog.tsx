import * as React from "react";

import { fetchShipper, fetchShipperShipments, Shipper, ShipmentLog } from "@/features/users/api/shipperApi";
import { useMockMode } from "@/shared/lib/hooks/useMockMode";
import { Badge } from "@/shared/ui/shadcn/badge";
import { Button } from "@/shared/ui/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/shadcn/dialog";
import { Separator } from "@/shared/ui/shadcn/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/shadcn/tabs";

type Props = {
  shipperId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const LOG_PAGE_SIZE = 10;

function statusBadge(status: Shipper["status"]) {
  if (status === "ACTIVE") return <Badge variant="secondary">활성</Badge>;
  if (status === "SUSPENDED") return <Badge variant="destructive">정지</Badge>;
  return <Badge variant="outline">비활성</Badge>;
}

function shipmentStatusBadge(status: ShipmentLog["status"]) {
  if (status === "완료" || String(status).toUpperCase() === "COMPLETED") return <Badge variant="secondary">완료</Badge>;
  if (status === "취소" || String(status).toUpperCase() === "CANCELLED") return <Badge variant="destructive">취소</Badge>;
  if (status === "진행중" || String(status).toUpperCase() === "IN_TRANSIT") return <Badge variant="outline">진행중</Badge>;
  return <Badge variant="outline">대기</Badge>;
}

function toDateText(value: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  return new Date(parsed).toLocaleDateString("ko-KR");
}

function toCurrency(value: number): string {
  return `${Math.round(value).toLocaleString()}원`;
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="text-xs text-foreground/70">{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}

export function ShipperDetailDialog({ shipperId, open, onOpenChange }: Props) {
  const { enabled: mockModeEnabled } = useMockMode();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [shipper, setShipper] = React.useState<Shipper | null>(null);
  const [logs, setLogs] = React.useState<ShipmentLog[]>([]);
  const [activeTab, setActiveTab] = React.useState<"profile" | "shipments">("profile");
  const [logPage, setLogPage] = React.useState(1);

  const load = React.useCallback(async () => {
    if (!open || !shipperId) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [shipperResponse, logsResponse] = await Promise.all([
        fetchShipper(shipperId),
        fetchShipperShipments(shipperId),
      ]);
      if (!shipperResponse) {
        setShipper(null);
        setLogs([]);
        setError("화주 정보를 찾을 수 없습니다.");
      } else {
        setShipper(shipperResponse);
        setLogs(logsResponse);
      }
    } catch {
      setShipper(null);
      setLogs([]);
      setError("화주 상세 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [open, shipperId]);

  React.useEffect(() => {
    void load();
  }, [load, mockModeEnabled]);

  React.useEffect(() => {
    if (!open) {
      setActiveTab("profile");
      setLogPage(1);
    }
  }, [open]);

  const completionRate = React.useMemo(() => {
    if (!shipper) return 0;
    if (shipper.stats.totalShipments === 0) return 0;
    return (shipper.stats.completedShipments / shipper.stats.totalShipments) * 100;
  }, [shipper]);

  const totalLogPages = Math.max(1, Math.ceil(logs.length / LOG_PAGE_SIZE));
  const pagedLogs = React.useMemo(() => {
    const start = (logPage - 1) * LOG_PAGE_SIZE;
    return logs.slice(start, start + LOG_PAGE_SIZE);
  }, [logs, logPage]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-lg border border-border bg-background">
        <DialogHeader>
          <DialogTitle className="text-xl">화주 상세</DialogTitle>
        </DialogHeader>

        {loading ? (
          <Card className="rounded-lg border border-border bg-background">
            <CardContent className="py-10 text-center text-sm text-foreground/70">로딩 중...</CardContent>
          </Card>
        ) : null}

        {error ? (
          <Card className="rounded-lg border border-border bg-muted">
            <CardContent className="py-4 text-sm">{error}</CardContent>
          </Card>
        ) : null}

        {!loading && !error && !shipper ? (
          <Card className="rounded-lg border border-border bg-background">
            <CardContent className="py-10 text-center text-sm text-foreground/70">해당 화주를 찾을 수 없습니다.</CardContent>
          </Card>
        ) : null}

        {shipper ? (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "profile" | "shipments")}>
            <TabsList className="grid w-full grid-cols-2 rounded-lg border border-border bg-muted p-1">
              <TabsTrigger value="profile" className="data-[state=active]:bg-secondary">
                기본 정보
              </TabsTrigger>
              <TabsTrigger value="shipments" className="data-[state=active]:bg-secondary">
                배송 기록
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="mt-4 space-y-4">
              <Card className="rounded-lg border border-border bg-background">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">계정 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-lg font-semibold">{shipper.name}</div>
                    <Badge variant="outline">{shipper.type === "INDIVIDUAL" ? "개인" : "법인"}</Badge>
                    {statusBadge(shipper.status)}
                  </div>
                  <Separator />
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <InfoTile label="화주 ID" value={shipper.id} />
                    <InfoTile label="연락처" value={shipper.phone} />
                    <InfoTile label="이메일" value={shipper.email} />
                    <InfoTile label="가입일" value={toDateText(shipper.registeredAt)} />
                    <InfoTile label="주소" value={shipper.address} />
                    <InfoTile label="사업자등록번호" value={shipper.businessNo ?? "-"} />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-lg border border-border bg-background">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">운영 지표</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-3 pt-0 md:grid-cols-2 xl:grid-cols-4">
                  <InfoTile label="총 배송" value={`${shipper.stats.totalShipments}건`} />
                  <InfoTile label="완료 배송" value={`${shipper.stats.completedShipments}건`} />
                  <InfoTile label="완료율" value={`${completionRate.toFixed(1)}%`} />
                  <InfoTile label="총 거래액" value={toCurrency(shipper.stats.totalSpent)} />
                  <InfoTile label="미정산액" value={toCurrency(shipper.outstandingAmount)} />
                  <InfoTile label="최근 배송일" value={shipper.lastShipmentAt ? toDateText(shipper.lastShipmentAt) : "-"} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="shipments" className="mt-4 space-y-4">
              <Card className="rounded-lg border border-border bg-background">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">배송 기록</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {pagedLogs.length === 0 ? (
                    <div className="rounded-lg border border-border bg-muted p-6 text-center text-sm text-foreground/70">
                      배송 기록이 없습니다.
                    </div>
                  ) : (
                    pagedLogs.map((log) => (
                      <div key={log.id} className="rounded-lg border border-border bg-background p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold">
                              {log.origin} → {log.destination}
                            </div>
                            <div className="mt-1 text-xs text-foreground/70">
                              {log.quoteId} · {log.driverName}
                            </div>
                          </div>
                          {shipmentStatusBadge(log.status)}
                        </div>
                        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                          <InfoTile label="배송일" value={toDateText(log.scheduledAt)} />
                          <InfoTile label="운임" value={toCurrency(log.price)} />
                          <InfoTile label="중량" value={`${log.weightKg}kg`} />
                          <InfoTile label="거리" value={`${log.distance}km`} />
                        </div>
                        <div className="mt-2 text-xs text-foreground/70">취소 사유/리뷰: {log.review ?? "-"}</div>
                      </div>
                    ))
                  )}

                  <div className="flex items-center justify-center gap-2 pt-1">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={logPage === 1}
                      onClick={() => setLogPage((prev) => Math.max(1, prev - 1))}
                    >
                      이전
                    </Button>
                    <span className="text-sm text-foreground/70">
                      {logPage}/{totalLogPages}
                    </span>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={logPage === totalLogPages}
                      onClick={() => setLogPage((prev) => Math.min(totalLogPages, prev + 1))}
                    >
                      다음
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
