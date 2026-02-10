// src/features/dashboard/ui/KpiCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Skeleton } from "@/shared/ui/shadcn/skeleton";
import { Badge } from "@/shared/ui/shadcn/badge";

type KpiMeta = {
  /**
   * 실서비스 화면에 보여줄 “사람말” 설명
   */
  label: string;
  /**
   * 디버그용 “출처(테이블/조건/집계 기준)”
   * - 실서비스 화면에는 노출하지 않음
   * - 디버그할 때만 확인하도록 코드에만 보관
   */
  source: string;
};

type Props = {
  loading: boolean;
  title: string;
  value: string;
  meta?: KpiMeta;
};

export function KpiCard({ loading, title, value, meta }: Props) {
  // 디버그 모드(개발자만): localStorage 키로 토글 가능
  // 사용법: DevTools 콘솔에서 localStorage.setItem("rodia_debug", "1")
  const showSource = import.meta.env.DEV && localStorage.getItem("rodia_debug") === "1";

  return (
    <Card className="rounded-lg border border-border bg-background">
      <CardHeader className="space-y-1">
        <CardTitle className="text-sm font-semibold opacity-80">{title}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-2">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>

            {meta?.label ? <p className="text-sm opacity-70">{meta.label}</p> : null}

            {/* 디버그 전용: 테이블/조건 출처 표시 (실서비스에서는 안 보임) */}
            {showSource && meta?.source ? (
              <div className="pt-1">
                <Badge className="bg-muted text-foreground">SOURCE: {meta.source}</Badge>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
