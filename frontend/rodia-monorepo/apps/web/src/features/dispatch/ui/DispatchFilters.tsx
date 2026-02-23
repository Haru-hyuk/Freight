import { Button } from "@/shared/ui/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Input } from "@/shared/ui/shadcn/input";
import { Label } from "@/shared/ui/shadcn/label";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/shadcn/tabs";

import type { DispatchFilterValue } from "@/features/dispatch/model/query";

type Props = {
  value: DispatchFilterValue;
  onChange: (next: DispatchFilterValue) => void;
  onSubmit?: () => void;
  loading?: boolean;
};

export function DispatchFilters({ value, onChange, onSubmit, loading }: Props) {
  return (
    <Card className="rounded-lg border border-border bg-background">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base font-semibold text-foreground">배차 필터</CardTitle>
        <p className="text-sm text-foreground">매칭 상태, 배차 상태, 결제 진행, 정산 상태 기준으로 조회합니다.</p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <Label>배차 상태</Label>
            <Tabs
              value={value.dispatchState}
              onValueChange={(dispatchState) => onChange({ ...value, dispatchState: dispatchState as DispatchFilterValue["dispatchState"] })}
            >
              <TabsList className="w-full border border-border bg-muted">
                <TabsTrigger value="all" className="flex-1">
                  전체
                </TabsTrigger>
                <TabsTrigger value="WAITING" className="flex-1">
                  대기
                </TabsTrigger>
                <TabsTrigger value="ASSIGNED" className="flex-1">
                  배정
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="space-y-2">
            <Label>매칭 상태</Label>
            <Tabs value={value.status} onValueChange={(status) => onChange({ ...value, status: status as DispatchFilterValue["status"] })}>
              <TabsList className="w-full border border-border bg-muted">
                <TabsTrigger value="all" className="flex-1">
                  전체
                </TabsTrigger>
                <TabsTrigger value="READY" className="flex-1">
                  준비
                </TabsTrigger>
                <TabsTrigger value="IN_TRANSIT" className="flex-1">
                  운송 중
                </TabsTrigger>
                <TabsTrigger value="COMPLETED" className="flex-1">
                  완료
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="space-y-2">
            <Label>결제 상태</Label>
            <Tabs
              value={value.paymentStatus}
              onValueChange={(paymentStatus) => onChange({ ...value, paymentStatus: paymentStatus as DispatchFilterValue["paymentStatus"] })}
            >
              <TabsList className="w-full border border-border bg-muted">
                <TabsTrigger value="all" className="flex-1">
                  전체
                </TabsTrigger>
                <TabsTrigger value="PENDING" className="flex-1">
                  대기
                </TabsTrigger>
                <TabsTrigger value="COMPLETED" className="flex-1">
                  완료
                </TabsTrigger>
                <TabsTrigger value="FAILED" className="flex-1">
                  실패
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="space-y-2">
            <Label>정산 상태</Label>
            <Tabs
              value={value.settlementStatus}
              onValueChange={(settlementStatus) => onChange({ ...value, settlementStatus: settlementStatus as DispatchFilterValue["settlementStatus"] })}
            >
              <TabsList className="w-full border border-border bg-muted">
                <TabsTrigger value="all" className="flex-1">
                  전체
                </TabsTrigger>
                <TabsTrigger value="PENDING" className="flex-1">
                  대기
                </TabsTrigger>
                <TabsTrigger value="PROCESSING" className="flex-1">
                  처리 중
                </TabsTrigger>
                <TabsTrigger value="COMPLETED" className="flex-1">
                  완료
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
          <div className="space-y-2">
            <Label>검색</Label>
            <Input
              className="border border-border bg-background text-foreground focus-visible:ring-2 focus-visible:ring-primary"
              value={value.q}
              onChange={(event) => onChange({ ...value, q: event.target.value })}
              placeholder="매칭 ID, 견적 ID, 화주, 기사, 주소"
            />
          </div>

          <div className="flex items-end justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onSubmit} disabled={loading}>
              조회
            </Button>
            <Button
              type="button"
              onClick={() =>
                onChange({
                  q: "",
                  status: "all",
                  dispatchState: "all",
                  paymentStatus: "all",
                  settlementStatus: "all",
                })
              }
              disabled={loading}
            >
              초기화
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
