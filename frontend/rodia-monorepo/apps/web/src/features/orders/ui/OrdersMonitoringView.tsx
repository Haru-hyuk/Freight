import * as React from "react";

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
  { value: "ALL", label: "\uC804\uCCB4" },
  { value: "PENDING", label: "\uAC80\uD1A0\uB300\uAE30" },
  { value: "APPROVED", label: "\uC2B9\uC778" },
  { value: "REJECTED", label: "\uBC18\uB824" },
];

const ORDER_RISK_OPTIONS: Array<{ value: OrderRiskFilter; label: string }> = [
  { value: "ALL", label: "\uC804\uCCB4" },
  { value: "ACTION_REQUIRED", label: "\uC870\uCE58 \uD544\uC694" },
  { value: "WATCH", label: "\uC8FC\uC758" },
  { value: "NORMAL", label: "\uC815\uC0C1" },
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
      setNotice(`\uC694\uCCAD ${payload.requestId} \uAC80\uD1A0\uB97C \uC644\uB8CC\uD588\uC2B5\uB2C8\uB2E4.`);
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
                {"\uB2EB\uAE30"}
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <div className="rounded-lg border border-border bg-background p-5">
          <h2 className="text-2xl font-semibold text-foreground">{"\uC8FC\uBB38 \uD1B5\uD569 \uAD00\uB9AC"}</h2>
          <p className="mt-2 text-sm text-foreground">
            {
              "\uCDE8\uC18C \uC694\uCCAD \uC2B9\uC778/\uBC18\uB824 \uCC98\uB9AC\uC640 \uACAC\uC801\u00B7\uB9E4\uCE6D\u00B7\uACB0\uC81C\u00B7\uC815\uC0B0 \uC0C1\uD0DC \uBAA8\uB2C8\uD130\uB9C1\uC744 \uD55C \uD654\uBA74\uC5D0\uC11C \uC9C4\uD589\uD569\uB2C8\uB2E4."
            }
          </p>
        </div>

        <Tabs value={tab} onValueChange={(value) => setTab(value as OrdersMonitoringTab)}>
          <TabsList className="rounded-lg border border-border bg-muted">
            <TabsTrigger value="cancellations">{"\uCDE8\uC18C \uC694\uCCAD \uAC80\uD1A0"}</TabsTrigger>
            <TabsTrigger value="monitoring">{"\uC8FC\uBB38 \uBAA8\uB2C8\uD130\uB9C1"}</TabsTrigger>
          </TabsList>

          <TabsContent value="cancellations" className="space-y-4">
            <Card className="rounded-lg border border-border bg-background">
              <CardHeader className="space-y-1">
                <CardTitle className="text-base font-semibold">{"\uAC80\uC0C9/\uD544\uD130"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <form className="flex flex-col gap-3 md:flex-row" onSubmit={handleSubmitCancellationSearch}>
                  <Input
                    value={cancellationSearchInput}
                    onChange={(event) => setCancellationSearchInput(event.target.value)}
                    placeholder="\uC694\uCCADID, \uACAC\uC801ID, \uB9E4\uCE6DID, \uD654\uC8FC/\uAE30\uC0AC \uAC80\uC0C9"
                    className="border border-border bg-background text-foreground focus-visible:ring-2 focus-visible:ring-primary"
                  />
                  <Button type="submit">{"\uAC80\uC0C9"}</Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setCancellationSearchInput("");
                      setCancellationSearch("");
                    }}
                  >
                    {"\uCD08\uAE30\uD654"}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => void loadCancellationRows()}>
                    {"\uC0C8\uB85C\uACE0\uCE68"}
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
              <SummaryCard label="\uD544\uD130 \uACB0\uACFC" value={String(cancellationTotal)} />
              <SummaryCard label="\uD604\uC7AC \uD398\uC774\uC9C0 \uAC80\uD1A0\uB300\uAE30" value={String(pendingCount)} />
              <SummaryCard label="\uD604\uC7AC \uD398\uC774\uC9C0 \uAC80\uD1A0\uC644\uB8CC" value={String(reviewedCount)} />
            </div>

            <CancellationApprovalTable
              rows={cancellationRows}
              total={cancellationTotal}
              loading={cancellationLoading}
              onOpenReview={setSelectedCancellation}
            />
          </TabsContent>

          <TabsContent value="monitoring" className="space-y-4">
            <Card className="rounded-lg border border-border bg-background">
              <CardHeader className="space-y-1">
                <CardTitle className="text-base font-semibold">{"\uBAA8\uB2C8\uD130\uB9C1 \uD544\uD130"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-3 md:flex-row">
                  <Input
                    value={monitoringSearch}
                    onChange={(event) => setMonitoringSearch(event.target.value)}
                    placeholder="\uACAC\uC801ID, \uB9E4\uCE6DID, \uD654\uC8FC/\uAE30\uC0AC, \uC6B4\uC1A1 \uAD6C\uAC04 \uAC80\uC0C9"
                    className="border border-border bg-background text-foreground focus-visible:ring-2 focus-visible:ring-primary"
                  />
                  <Button type="button" variant="secondary" onClick={() => void loadMonitoringSnapshot()}>
                    {"\uC0C8\uB85C\uACE0\uCE68"}
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
              <SummaryCard label="\uC804\uCCB4 \uACAC\uC801" value={String(monitoringSnapshot.summary.totalQuotes)} />
              <SummaryCard label="\uB9E4\uCE6D \uC644\uB8CC(\uB204\uC801)" value={String(monitoringSnapshot.summary.matchedOrders)} />
              <SummaryCard label="\uBC30\uCC28\uC911" value={String(monitoringSnapshot.summary.inTransitOrders)} />
              <SummaryCard label="\uCDE8\uC18C" value={String(monitoringSnapshot.summary.cancelledOrders)} />
              <SummaryCard label="\uACB0\uC81C \uB300\uAE30" value={String(monitoringSnapshot.summary.pendingPayments)} />
              <SummaryCard label="\uC815\uC0B0 \uB300\uAE30" value={String(monitoringSnapshot.summary.pendingSettlements)} />
              <SummaryCard label="\uC870\uCE58 \uD544\uC694" value={String(monitoringSnapshot.summary.actionRequired)} />
              <SummaryCard label="\uD544\uD130 \uD589 \uC218" value={String(filteredMonitoringRows.length)} />
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
