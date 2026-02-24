import type { QuoteRow } from "@/features/quotes/model/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Skeleton } from "@/shared/ui/shadcn/skeleton";

type Props = {
  rows: QuoteRow[];
  loading: boolean;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

export function QuoteKpiCards({ rows, loading }: Props) {
  const openCount = rows.filter((row) => row.status === "OPEN").length;
  const matchedCount = rows.filter((row) => row.status === "MATCHED").length;
  const draftCount = rows.filter((row) => row.status === "DRAFT").length;
  const combineCount = rows.filter((row) => row.allowCombine).length;
  const totalRequested = rows.reduce((sum, row) => sum + row.desiredPrice, 0);

  const items = [
    { label: "오픈 견적", value: `${openCount}건` },
    { label: "매칭 완료", value: `${matchedCount}건` },
    { label: "임시 견적", value: `${draftCount}건` },
    { label: "합짐 가능", value: `${combineCount}건` },
    { label: "총 희망 운임", value: `${formatCurrency(totalRequested)} KRW` },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
      {items.map((item) => (
        <Card key={item.label} className="rounded-lg border border-border bg-background">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground">{item.label}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-7 w-24" /> : <p className="text-xl font-semibold text-foreground">{item.value}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
