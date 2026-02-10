import { Card, CardHeader, CardTitle, CardContent } from "@/shared/ui/shadcn/card";

export default function SanctionsLogPage() {
  return (
    <div className="space-y-6">
      <Card className="rounded-lg border border-border bg-background">
        <CardHeader>
          <CardTitle>제재 내역 로그</CardTitle>
        </CardHeader>
        <CardContent className="text-sm opacity-70">
          정지 / 운행중지 / 경고 / 범칙금 이력 로그
        </CardContent>
      </Card>
    </div>
  );
}
