import { useParams, Link } from "react-router-dom";

import { Button } from "@/shared/ui/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Separator } from "@/shared/ui/shadcn/separator";

export default function QuoteDetailPage() {
  const { quoteId } = useParams<{ quoteId: string }>();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">견적 상세</h2>
          <p className="mt-1 text-sm opacity-70">견적 ID: {quoteId ?? "-"}</p>
        </div>
        <Button asChild variant="secondary">
          <Link to="/quotes">목록으로</Link>
        </Button>
      </div>

      <Card className="rounded-lg border border-border bg-background">
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg">기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium opacity-70">요약</div>
            <div className="text-sm">서울 성동구 → 대전 유성구 / 5톤</div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium opacity-70">상태</div>
            <div className="text-sm">대기</div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium opacity-70">생성일</div>
            <div className="text-sm">2024-02-05</div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-lg border border-border bg-background">
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg">관리</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button type="button">승인</Button>
          <Button type="button" variant="secondary">
            보류
          </Button>
          <Button type="button" variant="destructive">
            삭제
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
