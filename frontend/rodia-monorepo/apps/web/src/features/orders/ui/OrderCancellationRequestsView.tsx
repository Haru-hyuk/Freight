import * as React from "react";
import { useNavigate } from "react-router-dom";

import { fetchCancellationRequestRows, reviewCancellationRequest } from "@/features/orders/api/ordersApi";
import type {
  CancellationRequestRow,
  CancellationReviewPayload,
  CancellationStatusFilter,
} from "@/features/orders/model/types";
import { CancellationApprovalTable } from "@/features/orders/ui/CancellationApprovalTable";
import { CancellationReviewDialog } from "@/features/orders/ui/CancellationReviewDialog";
import { Button } from "@/shared/ui/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Input } from "@/shared/ui/shadcn/input";

const STATUS_OPTIONS: Array<{ value: CancellationStatusFilter; label: string }> = [
  { value: "ALL", label: "\uC804\uCCB4" },
  { value: "PENDING", label: "\uAC80\uD1A0\uB300\uAE30" },
  { value: "APPROVED", label: "\uC2B9\uC778" },
  { value: "REJECTED", label: "\uBC18\uB824" },
];

type Props = {
  title?: string;
  description?: string;
  detailBasePath?: "/orders/cancellations" | "/ops/matching-anomalies";
};

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="text-sm text-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold text-foreground">{value}</div>
    </div>
  );
}

export function OrderCancellationRequestsView({
  title = "\uB9E4\uCE6D \uCDE8\uC18C \uC694\uCCAD \uAD00\uB9AC",
  description = "\uAE30\uC0AC\uAC00 \uBC30\uC815\uB41C \uC8FC\uBB38\uC758 \uCDE8\uC18C \uC694\uCCAD\uC744 \uC2EC\uC0AC\uD558\uACE0 \uC2B9\uC778/\uBC18\uB824\uB97C \uCC98\uB9AC\uD569\uB2C8\uB2E4.",
  detailBasePath = "/orders/cancellations",
}: Props) {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<CancellationStatusFilter>("ALL");
  const [rows, setRows] = React.useState<CancellationRequestRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [selected, setSelected] = React.useState<CancellationRequestRow | null>(null);
  const [reviewSubmitting, setReviewSubmitting] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchCancellationRequestRows({
        search: search.trim() ? search.trim() : undefined,
        status: status === "ALL" ? undefined : status,
        page: 1,
        size: 30,
      });
      setRows(response.items);
      setTotal(response.total);
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const pendingCount = React.useMemo(() => rows.filter((row) => row.approvalStatus === "PENDING").length, [rows]);
  const shipperCount = React.useMemo(() => rows.filter((row) => row.requestedByRole === "SHIPPER").length, [rows]);
  const driverCount = React.useMemo(() => rows.filter((row) => row.requestedByRole === "DRIVER").length, [rows]);

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearch(searchInput);
  };

  const handleReview = async (payload: CancellationReviewPayload) => {
    setReviewSubmitting(true);
    try {
      await reviewCancellationRequest(payload);
      setNotice(`\uC694\uCCAD ${payload.requestId} \uAC80\uD1A0\uB97C \uC644\uB8CC\uD588\uC2B5\uB2C8\uB2E4.`);
      await load();
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleOpenDetail = (row: CancellationRequestRow) => {
    navigate(`${detailBasePath}/${encodeURIComponent(row.requestId)}`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="space-y-4">
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

        <Card className="rounded-lg border border-border bg-background">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-foreground">{description}</p>
            <form className="flex flex-col gap-3 md:flex-row" onSubmit={handleSearchSubmit}>
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="\uC694\uCCADID, \uACAC\uC801ID, \uB9E4\uCE6DID, \uD654\uC8FC/\uAE30\uC0AC \uC774\uB984 \uAC80\uC0C9"
                className="border border-border bg-background text-foreground focus-visible:ring-2 focus-visible:ring-primary"
              />
              <Button type="submit">{"\uAC80\uC0C9"}</Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setSearchInput("");
                  setSearch("");
                }}
              >
                {"\uCD08\uAE30\uD654"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => void load()}>
                {"\uC0C8\uB85C\uACE0\uCE68"}
              </Button>
            </form>

            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  size="sm"
                  variant={status === option.value ? "default" : "secondary"}
                  onClick={() => setStatus(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <SummaryCard label="\uC804\uCCB4 \uC694\uCCAD" value={total} />
          <SummaryCard label="\uAC80\uD1A0\uB300\uAE30" value={pendingCount} />
          <SummaryCard label="\uD654\uC8FC \uC694\uCCAD" value={shipperCount} />
          <SummaryCard label="\uAE30\uC0AC \uC694\uCCAD" value={driverCount} />
        </div>

        <CancellationApprovalTable
          rows={rows}
          total={total}
          loading={loading}
          onOpenReview={setSelected}
          onOpenDetail={handleOpenDetail}
        />

        <CancellationReviewDialog
          row={selected}
          open={Boolean(selected)}
          submitting={reviewSubmitting}
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onReview={handleReview}
        />
      </div>
    </div>
  );
}
