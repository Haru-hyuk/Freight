import { Card, CardHeader, CardTitle, CardContent } from "@/shared/ui/shadcn/card";

export default function DriversPage() {
  return (
    <div className="space-y-6">
      <Card className="rounded-lg border border-border bg-background">
        <CardHeader>
          <CardTitle>차주 조회</CardTitle>
        </CardHeader>
        <CardContent className="text-sm opacity-70">
          차주 목록 테이블 + 운행중지/범칙금/경고 액션 예정
        </CardContent>
      </Card>
    </div>
  );
}
