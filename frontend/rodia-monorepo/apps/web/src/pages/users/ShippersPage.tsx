import { Card, CardHeader, CardTitle, CardContent } from "@/shared/ui/shadcn/card";

export default function ShippersPage() {
  return (
    <div className="space-y-6">
      <Card className="rounded-lg border border-border bg-background">
        <CardHeader>
          <CardTitle>화주 조회</CardTitle>
        </CardHeader>
        <CardContent className="text-sm opacity-70">
          화주 목록 테이블 + 제재 액션(정지/경고/범칙금 예정)
        </CardContent>
      </Card>
    </div>
  );
}
