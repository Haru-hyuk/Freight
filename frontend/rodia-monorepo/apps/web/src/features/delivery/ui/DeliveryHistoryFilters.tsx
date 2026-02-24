import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Input } from "@/shared/ui/shadcn/input";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/shadcn/tabs";
import { Button } from "@/shared/ui/shadcn/button";
import { Label } from "@/shared/ui/shadcn/label";

import type { DeliveryHistoryFilterValue } from "@/features/delivery/model/query";

type Props = {
  value: DeliveryHistoryFilterValue;
  onChange: (next: DeliveryHistoryFilterValue) => void;
  onSubmit?: () => void;
  loading?: boolean;
};

export function DeliveryHistoryFilters({ value, onChange, onSubmit, loading }: Props) {
  return (
    <Card className="rounded-lg border border-border bg-background">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base font-bold">필터</CardTitle>
        <p className="text-sm text-foreground">매칭 상태와 검색어로 배송 이력을 조회합니다.</p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>배송 상태</Label>
          <Tabs value={value.status} onValueChange={(status) => onChange({ ...value, status: status as DeliveryHistoryFilterValue["status"] })}>
            <TabsList className="w-full border border-border bg-muted">
              <TabsTrigger value="all" className="flex-1">
                전체
              </TabsTrigger>
              <TabsTrigger value="READY" className="flex-1">
                대기
              </TabsTrigger>
              <TabsTrigger value="IN_TRANSIT" className="flex-1">
                운행중
              </TabsTrigger>
              <TabsTrigger value="COMPLETED" className="flex-1">
                완료
              </TabsTrigger>
              <TabsTrigger value="CANCELLED" className="flex-1">
                취소
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="space-y-2">
          <Label>검색</Label>
          <Input
            value={value.q}
            onChange={(event) => onChange({ ...value, q: event.target.value })}
            placeholder="매칭 ID, 견적 ID, 화주명, 차주명, 주소"
          />
        </div>

        <div className="flex justify-end">
          <Button type="button" variant="secondary" onClick={onSubmit} disabled={loading}>
            적용
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
