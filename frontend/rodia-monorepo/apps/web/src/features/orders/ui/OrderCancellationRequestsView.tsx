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
  { value: "ALL", label: "전체" },
  { value: "PENDING", label: "검토대기" },
  { value: "APPROVED", label: "승인" },
  { value: "REJECTED", label: "반려" },
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
  title = "매칭 취소 요청 관리",
  description = "기사가 배정된 주문의 취소 요청을 심사하고 승인/반려를 처리합니다.",
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
      setNotice(`요청 ${payload.requestId} 검토를 완료했습니다.`);
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
                {"닫기"}
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
                placeholder="요청ID, 견적ID, 매칭ID, 화주/기사 이름 검색"
                className="border border-border bg-background text-foreground focus-visible:ring-2 focus-visible:ring-primary"
              />
              <Button type="submit">{"검색"}</Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setSearchInput("");
                  setSearch("");
                }}
              >
                {"초기화"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => void load()}>
                {"새로고침"}
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
          <SummaryCard label="전체 요청" value={total} />
          <SummaryCard label="검토대기" value={pendingCount} />
          <SummaryCard label="화주 요청" value={shipperCount} />
          <SummaryCard label="기사 요청" value={driverCount} />
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

