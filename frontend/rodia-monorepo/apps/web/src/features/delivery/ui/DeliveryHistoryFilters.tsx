import { Button } from "@/shared/ui/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Input } from "@/shared/ui/shadcn/input";
import { Label } from "@/shared/ui/shadcn/label";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/shadcn/tabs";

import type { DeliveryHistoryFilterValue } from "@/features/delivery/model/query";

type Props = {
  value: DeliveryHistoryFilterValue;
  onChange: (next: DeliveryHistoryFilterValue) => void;
  onSubmit?: () => void;
  loading?: boolean;
};

const tabListClass = "h-auto w-full gap-1 rounded-lg border border-border bg-muted p-1";
const tabTriggerClass =
  "flex-1 py-2 text-base data-[state=active]:bg-secondary data-[state=active]:text-foreground hover:bg-secondary/80";

export function DeliveryHistoryFilters({ value, onChange, onSubmit, loading }: Props) {
  return (
    <Card className="rounded-lg border border-border bg-background">
      <CardHeader className="space-y-1">
        <CardTitle className="text-lg font-semibold">배송 필터</CardTitle>
        <p className="text-base text-foreground/70">매칭 상태와 키워드로 배송 이력을 검색합니다.</p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-base">배송 상태</Label>
          <Tabs value={value.status} onValueChange={(status) => onChange({ ...value, status: status as DeliveryHistoryFilterValue["status"] })}>
            <TabsList className={tabListClass}>
              <TabsTrigger value="all" className={tabTriggerClass}>
                전체
              </TabsTrigger>
              <TabsTrigger value="READY" className={tabTriggerClass}>
                대기
              </TabsTrigger>
              <TabsTrigger value="IN_TRANSIT" className={tabTriggerClass}>
                진행 중
              </TabsTrigger>
              <TabsTrigger value="COMPLETED" className={tabTriggerClass}>
                완료
              </TabsTrigger>
              <TabsTrigger value="CANCELLED" className={tabTriggerClass}>
                취소
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="space-y-2">
          <Label className="text-base">검색</Label>
          <Input
            className="border-border bg-background text-foreground focus-visible:ring-2 focus-visible:ring-primary"
            value={value.q}
            onChange={(event) => onChange({ ...value, q: event.target.value })}
            placeholder="매칭 ID, 견적 ID, 화주명, 기사명"
          />
        </div>

        <div className="flex justify-end">
          <Button type="button" variant="secondary" onClick={onSubmit} disabled={loading} className="text-base">
            조회
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
