import * as React from "react";

import { fetchQuoteRows, sendAdminQuoteUpdatedPush, updateQuoteByAdmin } from "@/features/quotes/api/quotesApi";
import { toQuoteQuery, type QuoteFilterValue } from "@/features/quotes/model/query";
import type { QuoteRow, QuoteUpdatePayload } from "@/features/quotes/model/types";
import { QuoteFilters } from "@/features/quotes/ui/QuoteFilters";
import { QuoteKpiCards } from "@/features/quotes/ui/QuoteKpiCards";
import { QuoteTable } from "@/features/quotes/ui/QuoteTable";
import { Button } from "@/shared/ui/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Separator } from "@/shared/ui/shadcn/separator";

export function QuoteManagementView() {
  const [filters, setFilters] = React.useState<QuoteFilterValue>({
    q: "",
    status: "all",
    allowCombine: "all",
  });
  const [page] = React.useState(1);
  const [size] = React.useState(20);

  const [rows, setRows] = React.useState<QuoteRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [updating, setUpdating] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const query = toQuoteQuery(filters, page, size);
      const response = await fetchQuoteRows(query);
      setRows(response.items);
      setTotal(response.total);
    } finally {
      setLoading(false);
    }
  }, [filters, page, size]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const updateQuote = async (payload: QuoteUpdatePayload) => {
    setUpdating(true);
    try {
      await updateQuoteByAdmin(payload);
      await sendAdminQuoteUpdatedPush(payload.quoteId);
      setNotice("견적 정보가 수정되었습니다. 앱 사용자에게 '관리자가 견적 정보를 수정했습니다' 알림이 발송됩니다.");
      await load();
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {notice ? (
        <div className="fixed left-1/2 top-4 z-50 w-full max-w-xl -translate-x-1/2 px-4">
          <Card className="rounded-lg border border-border bg-background">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-semibold text-foreground">처리 완료</CardTitle>
              <Button type="button" variant="secondary" size="sm" onClick={() => setNotice(null)}>
                x
              </Button>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-foreground">{notice}</CardContent>
          </Card>
        </div>
      ) : null}

      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">견적 관리</h2>
          <p className="mt-1 text-sm text-foreground">ERD 기준 quotes, quote_checklist_items, checklist_items, matches 데이터 관점으로 운영합니다.</p>
        </div>

        <QuoteKpiCards rows={rows} loading={loading} />

        <QuoteFilters value={filters} onChange={setFilters} onSubmit={load} loading={loading} />

        <Separator />

        <QuoteTable rows={rows} total={total} loading={loading} onUpdate={updateQuote} updating={updating} />
      </div>
    </div>
  );
}
