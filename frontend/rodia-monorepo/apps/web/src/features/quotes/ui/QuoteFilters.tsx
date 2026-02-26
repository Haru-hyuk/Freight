import { Button } from "@/shared/ui/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Input } from "@/shared/ui/shadcn/input";
import { Label } from "@/shared/ui/shadcn/label";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/shadcn/tabs";

import type { QuoteFilterValue } from "@/features/quotes/model/query";

type Props = {
  value: QuoteFilterValue;
  onChange: (next: QuoteFilterValue) => void;
  onSubmit?: () => void;
  loading?: boolean;
};

const tabListClass = "h-auto w-full gap-1 rounded-lg border border-border bg-muted p-1";
const tabTriggerClass =
  "flex-1 py-2 text-base data-[state=active]:bg-secondary data-[state=active]:text-foreground hover:bg-secondary/80";

export function QuoteFilters({ value, onChange, onSubmit, loading }: Props) {
  return (
    <Card className="rounded-lg border border-border bg-background">
      <CardHeader className="space-y-1">
        <CardTitle className="text-lg font-semibold">견적 필터</CardTitle>
        <p className="text-base text-foreground/70">상태/합짐 여부와 키워드로 견적을 조회합니다.</p>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-base">견적 상태</Label>
            <Tabs value={value.status} onValueChange={(status) => onChange({ ...value, status: status as QuoteFilterValue["status"] })}>
              <TabsList className={tabListClass}>
                <TabsTrigger value="all" className={tabTriggerClass}>
                  전체
                </TabsTrigger>
                <TabsTrigger value="DRAFT" className={tabTriggerClass}>
                  임시
                </TabsTrigger>
                <TabsTrigger value="OPEN" className={tabTriggerClass}>
                  오픈
                </TabsTrigger>
                <TabsTrigger value="MATCHED" className={tabTriggerClass}>
                  매칭
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="space-y-2">
            <Label className="text-base">합짐 허용</Label>
            <Tabs value={value.allowCombine} onValueChange={(allowCombine) => onChange({ ...value, allowCombine: allowCombine as QuoteFilterValue["allowCombine"] })}>
              <TabsList className={tabListClass}>
                <TabsTrigger value="all" className={tabTriggerClass}>
                  전체
                </TabsTrigger>
                <TabsTrigger value="yes" className={tabTriggerClass}>
                  허용
                </TabsTrigger>
                <TabsTrigger value="no" className={tabTriggerClass}>
                  비허용
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
          <div className="space-y-2">
            <Label className="text-base">검색</Label>
            <Input
              className="border-border bg-background text-foreground focus-visible:ring-2 focus-visible:ring-primary"
              value={value.q}
              onChange={(event) => onChange({ ...value, q: event.target.value })}
              placeholder="견적 ID, 화주, 출발지, 도착지, 화물 종류"
            />
          </div>

          <div className="flex items-end justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onSubmit} disabled={loading} className="text-base">
              조회
            </Button>
            <Button
              type="button"
              onClick={() => onChange({ q: "", status: "all", allowCombine: "all" })}
              disabled={loading}
              className="text-base"
            >
              초기화
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
