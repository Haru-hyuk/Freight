import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

import { Driver, DeliveryLog, fetchDriver, fetchDriverDeliveries } from "@/features/users/api/driverApi";
import { useMockMode } from "@/shared/lib/hooks/useMockMode";
import { Badge } from "@/shared/ui/shadcn/badge";
import { Button } from "@/shared/ui/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Separator } from "@/shared/ui/shadcn/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/shadcn/tabs";

type Props = {
  driverId: string;
};

const LOG_PAGE_SIZE = 10;

function driverStatusBadge(status: Driver["status"]) {
  if (status === "ACTIVE") return <Badge variant="secondary">활성</Badge>;
  if (status === "SUSPENDED") return <Badge variant="destructive">정지</Badge>;
  if (status === "PENDING_APPROVAL") return <Badge variant="outline">승인 대기</Badge>;
  return <Badge variant="outline">비활성</Badge>;
}

function deliveryStatusBadge(status: DeliveryLog["status"]) {
  const normalized = String(status).toUpperCase();
  if (normalized === "COMPLETED" || status === "완료") return <Badge variant="secondary">완료</Badge>;
  if (normalized === "CANCELLED" || status === "취소") return <Badge variant="destructive">취소</Badge>;
  if (normalized === "IN_TRANSIT" || status === "진행중") return <Badge variant="outline">진행중</Badge>;
  return <Badge variant="outline">대기</Badge>;
}

function vehicleTypeLabel(type: Driver["vehicle"]["type"]): string {
  if (type === "TRUCK") return "트럭";
  if (type === "VAN") return "밴";
  return "세단";
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

export function DriverDetailView({ driverId }: Props) {
  const { enabled: mockModeEnabled } = useMockMode();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [driver, setDriver] = React.useState<Driver | null>(null);
  const [logs, setLogs] = React.useState<DeliveryLog[]>([]);
  const [activeTab, setActiveTab] = React.useState<"profile" | "deliveries">("profile");
  const [logPage, setLogPage] = React.useState(1);

  const load = React.useCallback(async () => {
    if (!driverId) {
      setDriver(null);
      setLogs([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [driverResponse, deliveriesResponse] = await Promise.all([
        fetchDriver(driverId),
        fetchDriverDeliveries(driverId),
      ]);
      if (!driverResponse) {
        setDriver(null);
        setLogs([]);
        setError("차주 정보를 찾을 수 없습니다.");
      } else {
        setDriver(driverResponse);
        setLogs(deliveriesResponse);
      }
    } catch {
      setDriver(null);
      setLogs([]);
      setError("차주 상세 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [driverId]);

  React.useEffect(() => {
    void load();
  }, [load, mockModeEnabled]);

  React.useEffect(() => {
    setLogPage(1);
  }, [logs]);

  const completionRate = React.useMemo(() => {
    if (!driver) return 0;
    if (driver.stats.totalMatches === 0) return 0;
    return (driver.stats.completedMatches / driver.stats.totalMatches) * 100;
  }, [driver]);

  const totalLogPages = Math.max(1, Math.ceil(logs.length / LOG_PAGE_SIZE));
  const pagedLogs = React.useMemo(() => {
    const start = (logPage - 1) * LOG_PAGE_SIZE;
    return logs.slice(start, start + LOG_PAGE_SIZE);
  }, [logs, logPage]);

  if (!driverId) {
    return (
      <div className="min-h-screen rounded-lg border border-border bg-background p-6 text-foreground">
        잘못된 차주 상세 경로입니다.
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-5 bg-background text-foreground">
      <div className="space-y-3">
        <Button asChild type="button" variant="secondary" size="sm">
          <Link to="/users/drivers" className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            차주 목록으로 돌아가기
          </Link>
        </Button>

        <div>
          <h1 className="text-2xl font-semibold">차주 상세</h1>
          <p className="text-sm text-foreground/70">기본 정보, 운행 지표, 배송 기록을 확인합니다.</p>
        </div>
      </div>

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

      {!loading && !error && !driver ? (
        <Card className="rounded-lg border border-border bg-background">
          <CardContent className="py-10 text-center text-sm text-foreground/70">해당 차주를 찾을 수 없습니다.</CardContent>
        </Card>
      ) : null}

      {driver ? (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "profile" | "deliveries")}>
          <TabsList className="grid w-full grid-cols-2 rounded-lg border border-border bg-muted p-1">
            <TabsTrigger value="profile" className="data-[state=active]:bg-secondary">
              기본 정보
            </TabsTrigger>
            <TabsTrigger value="deliveries" className="data-[state=active]:bg-secondary">
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
                  <div className="text-lg font-semibold">{driver.name}</div>
                  {driverStatusBadge(driver.status)}
                </div>
                <Separator />
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <InfoTile label="차주 ID" value={driver.id} />
                  <InfoTile label="면허번호" value={driver.licenseNo} />
                  <InfoTile label="연락처" value={driver.phone} />
                  <InfoTile label="주소" value={driver.address} />
                  <InfoTile label="생년월일" value={driver.birthDate} />
                  <InfoTile label="가입일" value={toDateText(driver.registeredAt)} />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-lg border border-border bg-background">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">차량 정보</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3 pt-0 md:grid-cols-2">
                <InfoTile label="차량번호" value={driver.vehicle.plateNumber} />
                <InfoTile label="차종" value={vehicleTypeLabel(driver.vehicle.type)} />
                <InfoTile label="적재용량" value={`${driver.vehicle.capacity}kg`} />
                <InfoTile label="보험만료일" value={toDateText(driver.vehicle.insuranceExpiredAt)} />
              </CardContent>
            </Card>

            <Card className="rounded-lg border border-border bg-background">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">운행 지표</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3 pt-0 md:grid-cols-2 xl:grid-cols-4">
                <InfoTile label="총 배송" value={`${driver.stats.totalMatches}건`} />
                <InfoTile label="완료 배송" value={`${driver.stats.completedMatches}건`} />
                <InfoTile label="완료율" value={`${completionRate.toFixed(1)}%`} />
                <InfoTile label="수락율" value={`${driver.stats.acceptanceRate.toFixed(1)}%`} />
                <InfoTile label="정시율" value={`${driver.stats.onTimeRate.toFixed(1)}%`} />
                <InfoTile label="총 수익" value={toCurrency(driver.stats.totalEarnings)} />
                <InfoTile label="월 수익" value={toCurrency(driver.stats.monthlyEarnings)} />
                <InfoTile label="위반 건수" value={`${driver.violations.length}건`} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deliveries" className="mt-4 space-y-4">
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
                            {log.quoteId} · {log.shipperName}
                          </div>
                        </div>
                        {deliveryStatusBadge(log.status)}
                      </div>
                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        <InfoTile label="배송일" value={toDateText(log.scheduledAt)} />
                        <InfoTile label="수익" value={toCurrency(log.earnedAmount)} />
                        <InfoTile label="중량" value={`${log.weightKg}kg`} />
                        <InfoTile label="거리" value={`${log.distance}km`} />
                      </div>
                      <div className="mt-2 text-xs text-foreground/70">비고: {log.review ?? "-"}</div>
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
    </div>
  );
}
