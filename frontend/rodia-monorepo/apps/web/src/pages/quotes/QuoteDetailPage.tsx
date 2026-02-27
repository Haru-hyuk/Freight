import { Link, useParams } from "react-router-dom";

import { Button } from "@/shared/ui/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Separator } from "@/shared/ui/shadcn/separator";

export default function QuoteDetailPage() {
  const { quoteId } = useParams<{ quoteId: string }>();

  return (
    <div className="space-y-7 rounded-xl bg-muted/40 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">견적 상세</h2>
          <p className="mt-2 text-base text-foreground/70">견적 ID: {quoteId ?? "-"}</p>
        </div>
        <Button asChild variant="secondary" className="text-base">
          <Link to="/quotes">목록으로</Link>
        </Button>
      </div>

      <Card className="rounded-lg border border-border bg-background">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl font-semibold">기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-base">
          <InfoRow label="화물" value="전자부품 / 5톤" />
          <Separator />
          <InfoRow label="상태" value="오픈" />
          <Separator />
          <InfoRow label="생성일" value="2024-02-05" />
        </CardContent>
      </Card>

      <Card className="rounded-lg border border-border bg-background">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl font-semibold">관리</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button type="button" className="text-base">
            승인
          </Button>
          <Button type="button" variant="secondary" className="text-base">
            보류
          </Button>
          <Button type="button" variant="destructive" className="text-base">
            삭제
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="font-medium text-foreground/70">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
