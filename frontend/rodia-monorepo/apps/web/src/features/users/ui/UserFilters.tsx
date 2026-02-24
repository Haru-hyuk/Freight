import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Label } from "@/shared/ui/shadcn/label";
import { Input } from "@/shared/ui/shadcn/input";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/shadcn/tabs";
import { Button } from "@/shared/ui/shadcn/button";
import { Badge } from "@/shared/ui/shadcn/badge";

import type { UserFilterValue } from "../model/filters";

type Props = {
  value: UserFilterValue;
  onChange: (next: UserFilterValue) => void;
  onSubmit?: () => void;
  loading?: boolean;
  roleLocked?: boolean;
};

export function UserFilters({ value, onChange, onSubmit, loading, roleLocked }: Props) {
  const roleLabel = value.role === "SHIPPER" ? "화주" : value.role === "DRIVER" ? "차주" : "전체";

  return (
    <Card className="rounded-lg border border-border bg-background">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base font-bold">필터</CardTitle>
        <p className="text-sm text-foreground/70">구분, 상태, 검색어로 사용자 목록을 조회합니다.</p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>구분</Label>

            {roleLocked ? (
              <div className="flex h-10 items-center rounded-lg border border-border bg-muted px-3 text-sm">
                <span className="mr-2 text-foreground/70">고정</span>
                <Badge variant="outline">{roleLabel}</Badge>
              </div>
            ) : (
              <Tabs
                value={value.role}
                onValueChange={(nextRole) => onChange({ ...value, role: nextRole as UserFilterValue["role"] })}
              >
                <TabsList className="w-full border border-border bg-muted">
                  <TabsTrigger value="all" className="w-1/3">
                    전체
                  </TabsTrigger>
                  <TabsTrigger value="SHIPPER" className="w-1/3">
                    화주
                  </TabsTrigger>
                  <TabsTrigger value="DRIVER" className="w-1/3">
                    차주
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </div>

          <div className="space-y-2">
            <Label>상태</Label>
            <Tabs
              value={value.status}
              onValueChange={(nextStatus) => onChange({ ...value, status: nextStatus as UserFilterValue["status"] })}
            >
              <TabsList className="w-full border border-border bg-muted">
                <TabsTrigger value="all" className="w-1/4">
                  전체
                </TabsTrigger>
                <TabsTrigger value="ACTIVE" className="w-1/4">
                  활성
                </TabsTrigger>
                <TabsTrigger value="SUSPENDED" className="w-1/4">
                  정지
                </TabsTrigger>
                <TabsTrigger value="DRIVING_BLOCKED" className="w-1/4">
                  운행중지
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <div className="space-y-2">
          <Label>검색</Label>
          <Input
            value={value.q}
            onChange={(event) => onChange({ ...value, q: event.target.value })}
            placeholder="이름, 회사명, ID 검색" // MODIFIED: 검색 UX 문구 정리
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
