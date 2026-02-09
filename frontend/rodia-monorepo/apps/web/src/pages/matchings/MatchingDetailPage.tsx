import { useParams, Link } from "react-router-dom";

import { Button } from "@/shared/ui/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Separator } from "@/shared/ui/shadcn/separator";

export default function MatchingDetailPage() {
  const { matchingId } = useParams<{ matchingId: string }>();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">매칭 상세</h2>
          <p className="mt-1 text-sm opacity-70">매칭 ID: {matchingId ?? "-"}</p>
        </div>
        <Button asChild variant="secondary">
          <Link to="/matchings">목록으로</Link>
        </Button>
      </div>

      <Card className="rounded-lg border border-border bg-background">
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg">상태 타임라인(목업)</CardTitle>
          <p className="text-sm opacity-70">대기 → 배차 → 픽업 → 운송중 → 완료</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border border-border bg-muted p-4 text-sm">
            타임라인 UI는 추후 컴포넌트로 분리 예정
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-lg border border-border bg-background">
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg">기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium opacity-70">구간</div>
            <div className="text-sm">서울 → 부산</div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium opacity-70">기사</div>
            <div className="text-sm">김기사</div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium opacity-70">상태</div>
            <div className="text-sm">운송중</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
