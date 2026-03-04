import * as React from "react";
import { useNavigate } from "react-router-dom";
import { fetchCancellationRequestRows, fetchOrderMonitoringSnapshot, reviewCancellationRequest } from "@/features/orders/api/ordersApi";
import type {
  CancellationRequestRow,
  CancellationReviewPayload,
  CancellationStatusFilter,
  OrderMonitoringSnapshot,
  OrderRiskFilter,
} from "@/features/orders/model/types";
import { CancellationApprovalTable } from "@/features/orders/ui/CancellationApprovalTable";
import { CancellationReviewDialog } from "@/features/orders/ui/CancellationReviewDialog";
import { OrdersMonitoringTable } from "@/features/orders/ui/OrdersMonitoringTable";
import { Button } from "@/shared/ui/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Input } from "@/shared/ui/shadcn/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/shadcn/tabs";

type OrdersMonitoringTab = "cancellations" | "monitoring";

type OrdersMonitoringViewProps = {
  initialTab?: OrdersMonitoringTab;
};

const PAGE_SIZE = 20;

const CANCELLATION_STATUS_OPTIONS: Array<{ value: CancellationStatusFilter; label: string }> = [
  { value: "ALL", label: "전체" },
  { value: "PENDING", label: "검토대기" },
  { value: "APPROVED", label: "승인" },
  { value: "REJECTED", label: "반려" },
];

const ORDER_RISK_OPTIONS: Array<{ value: OrderRiskFilter; label: string }> = [
  { value: "ALL", label: "전체" },
  { value: "ACTION_REQUIRED", label: "조치 필요" },
  { value: "WATCH", label: "주의" },
  { value: "NORMAL", label: "정상" },
];

const EMPTY_MONITORING_SNAPSHOT: OrderMonitoringSnapshot = {
  rows: [],
  summary: {
    totalQuotes: 0,
    matchedOrders: 0,
    inTransitOrders: 0,
    cancelledOrders: 0,
    pendingPayments: 0,
    pendingSettlements: 0,
    actionRequired: 0,
  },
};

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="text-sm text-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold text-foreground">{value}</div>
    </div>
  );
}

export function OrdersMonitoringView({ initialTab = "monitoring" }: OrdersMonitoringViewProps) {
  const navigate = useNavigate();
  const [tab, setTab] = React.useState<OrdersMonitoringTab>(initialTab);

  const [cancellationSearchInput, setCancellationSearchInput] = React.useState("");
  const [cancellationSearch, setCancellationSearch] = React.useState("");
  const [cancellationStatus, setCancellationStatus] = React.useState<CancellationStatusFilter>("ALL");
  const [cancellationRows, setCancellationRows] = React.useState<CancellationRequestRow[]>([]);
  const [cancellationTotal, setCancellationTotal] = React.useState(0);
  const [cancellationLoading, setCancellationLoading] = React.useState(false);
  const [selectedCancellation, setSelectedCancellation] = React.useState<CancellationRequestRow | null>(null);
  const [reviewSubmitting, setReviewSubmitting] = React.useState(false);

  const [monitoringSnapshot, setMonitoringSnapshot] = React.useState<OrderMonitoringSnapshot>(EMPTY_MONITORING_SNAPSHOT);
  const [monitoringLoading, setMonitoringLoading] = React.useState(false);
  const [monitoringSearch, setMonitoringSearch] = React.useState("");
  const [riskFilter, setRiskFilter] = React.useState<OrderRiskFilter>("ALL");
  const [notice, setNotice] = React.useState<string | null>(null);

  const loadCancellationRows = React.useCallback(async () => {
    setCancellationLoading(true);
    try {
      const response = await fetchCancellationRequestRows({
        search: cancellationSearch.trim() ? cancellationSearch.trim() : undefined,
        status: cancellationStatus === "ALL" ? undefined : cancellationStatus,
        page: 1,
        size: PAGE_SIZE,
      });
      setCancellationRows(response.items);
      setCancellationTotal(response.total);
    } finally {
      setCancellationLoading(false);
    }
  }, [cancellationSearch, cancellationStatus]);

  const loadMonitoringSnapshot = React.useCallback(async () => {
    setMonitoringLoading(true);
    try {
      const snapshot = await fetchOrderMonitoringSnapshot();
      setMonitoringSnapshot(snapshot);
    } finally {
      setMonitoringLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadCancellationRows();
  }, [loadCancellationRows]);

  React.useEffect(() => {
    void loadMonitoringSnapshot();
  }, [loadMonitoringSnapshot]);

  const filteredMonitoringRows = React.useMemo(() => {
    const keyword = monitoringSearch.trim().toLowerCase();
    return monitoringSnapshot.rows.filter((row) => {
      if (riskFilter !== "ALL" && row.riskState !== riskFilter) return false;
      if (!keyword) return true;

      const haystack = [
        row.quoteId,
        row.matchId,
        row.shipperName,
        row.driverName,
        row.originAddress,
        row.destinationAddress,
        row.cargoName,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [monitoringSearch, monitoringSnapshot.rows, riskFilter]);

  const pendingCount = React.useMemo(
    () => cancellationRows.filter((row) => row.approvalStatus === "PENDING").length,
    [cancellationRows],
  );
  const reviewedCount = React.useMemo(
    () => cancellationRows.filter((row) => row.approvalStatus !== "PENDING").length,
    [cancellationRows],
  );

  const handleSubmitCancellationSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCancellationSearch(cancellationSearchInput);
  };

  const handleReview = async (payload: CancellationReviewPayload) => {
    setReviewSubmitting(true);
    try {
      await reviewCancellationRequest(payload);
      setNotice(`요청 ${payload.requestId} 검토를 완료했습니다.`);
      await loadCancellationRows();
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="space-y-6">
        {notice ? (
          <Card className="rounded-lg border border-border bg-background">
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <p className="text-sm text-foreground">{notice}</p>
              <Button type="button" size="sm" variant="secondary" onClick={() => setNotice(null)}>
                {"닫기"}
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <div className="rounded-lg border border-border bg-background p-5">
          <h2 className="text-2xl font-semibold text-foreground">{"주문 통합 관리"}</h2>
          <p className="mt-2 text-sm text-foreground">
            {
              "취소 요청 승인/반려 처리와 견적·매칭·결제·정산 상태 모니터링을 한 화면에서 진행합니다."
            }
          </p>
        </div>

        <Tabs value={tab} onValueChange={(value) => setTab(value as OrdersMonitoringTab)}>
          <TabsList className="rounded-lg border border-border bg-muted">
            <TabsTrigger value="cancellations">{"취소 요청 검토"}</TabsTrigger>
            <TabsTrigger value="monitoring">{"주문 모니터링"}</TabsTrigger>
          </TabsList>

          <TabsContent value="cancellations" className="space-y-4">
            <Card className="rounded-lg border border-border bg-background">
              <CardHeader className="space-y-1">
                <CardTitle className="text-base font-semibold">{"검색/필터"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <form className="flex flex-col gap-3 md:flex-row" onSubmit={handleSubmitCancellationSearch}>
                  <Input
                    value={cancellationSearchInput}
                    onChange={(event) => setCancellationSearchInput(event.target.value)}
                    placeholder="요청ID, 견적ID, 매칭ID, 화주/기사 검색"
                    className="border border-border bg-background text-foreground focus-visible:ring-2 focus-visible:ring-primary"
                  />
                  <Button type="submit">{"검색"}</Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setCancellationSearchInput("");
                      setCancellationSearch("");
                    }}
                  >
                    {"초기화"}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => void loadCancellationRows()}>
                    {"새로고침"}
                  </Button>
                </form>

                <div className="flex flex-wrap gap-2">
                  {CANCELLATION_STATUS_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      size="sm"
                      variant={cancellationStatus === option.value ? "default" : "secondary"}
                      onClick={() => setCancellationStatus(option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <SummaryCard label="필터 결과" value={String(cancellationTotal)} />
              <SummaryCard label="현재 페이지 검토대기" value={String(pendingCount)} />
              <SummaryCard label="현재 페이지 검토완료" value={String(reviewedCount)} />
            </div>

            <CancellationApprovalTable
              rows={cancellationRows}
              total={cancellationTotal}
              loading={cancellationLoading}
              onOpenReview={setSelectedCancellation}
              onOpenDetail={(row) => navigate(`/orders/cancellations/${encodeURIComponent(row.requestId)}`)}
            />
          </TabsContent>

          <TabsContent value="monitoring" className="space-y-4">
            <Card className="rounded-lg border border-border bg-background">
              <CardHeader className="space-y-1">
                <CardTitle className="text-base font-semibold">{"모니터링 필터"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-3 md:flex-row">
                  <Input
                    value={monitoringSearch}
                    onChange={(event) => setMonitoringSearch(event.target.value)}
                    placeholder="견적ID, 매칭ID, 화주/기사, 운송 구간 검색"
                    className="border border-border bg-background text-foreground focus-visible:ring-2 focus-visible:ring-primary"
                  />
                  <Button type="button" variant="secondary" onClick={() => void loadMonitoringSnapshot()}>
                    {"새로고침"}
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {ORDER_RISK_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      size="sm"
                      variant={riskFilter === option.value ? "default" : "secondary"}
                      onClick={() => setRiskFilter(option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard label="전체 견적" value={String(monitoringSnapshot.summary.totalQuotes)} />
              <SummaryCard label="매칭 완료(누적)" value={String(monitoringSnapshot.summary.matchedOrders)} />
              <SummaryCard label="배차중" value={String(monitoringSnapshot.summary.inTransitOrders)} />
              <SummaryCard label="취소" value={String(monitoringSnapshot.summary.cancelledOrders)} />
              <SummaryCard label="결제 대기" value={String(monitoringSnapshot.summary.pendingPayments)} />
              <SummaryCard label="정산 대기" value={String(monitoringSnapshot.summary.pendingSettlements)} />
              <SummaryCard label="조치 필요" value={String(monitoringSnapshot.summary.actionRequired)} />
              <SummaryCard label="필터 행 수" value={String(filteredMonitoringRows.length)} />
            </div>

            <OrdersMonitoringTable rows={filteredMonitoringRows} loading={monitoringLoading} />
          </TabsContent>
        </Tabs>
      </div>

      <CancellationReviewDialog
        row={selectedCancellation}
        open={Boolean(selectedCancellation)}
        submitting={reviewSubmitting}
        onOpenChange={(open) => {
          if (!open) setSelectedCancellation(null);
        }}
        onReview={handleReview}
      />
    </div>
  );
}


