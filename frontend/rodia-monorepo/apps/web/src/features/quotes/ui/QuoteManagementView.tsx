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
      setNotice("견적 정보가 수정되었습니다. 앱 사용자에게 수정 알림이 발송됩니다.");
      await load();
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-7 rounded-xl bg-muted/40 p-4 sm:p-6">
      {notice ? (
        <Card className="rounded-lg border border-border bg-background">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-semibold">처리 완료</CardTitle>
            <Button type="button" variant="secondary" size="sm" onClick={() => setNotice(null)}>
              닫기
            </Button>
          </CardHeader>
          <CardContent className="pt-0 text-base text-foreground/80">{notice}</CardContent>
        </Card>
      ) : null}

      <div>
        <h2 className="text-3xl font-semibold tracking-tight">견적 관리</h2>
        <p className="mt-2 text-base text-foreground/70">
          quotes, quote_checklist_items, checklist_items, matches 데이터를 기준으로 운영합니다.
        </p>
      </div>

      <QuoteKpiCards rows={rows} loading={loading} />
      <QuoteFilters value={filters} onChange={setFilters} onSubmit={load} loading={loading} />

      <Separator />

      <QuoteTable rows={rows} total={total} loading={loading} onUpdate={updateQuote} updating={updating} />
    </div>
  );
}
