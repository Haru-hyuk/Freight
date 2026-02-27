import * as React from "react";
import { NavLink } from "react-router-dom";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/shadcn/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Separator } from "@/shared/ui/shadcn/separator";
import { Badge } from "@/shared/ui/shadcn/badge";
import { Button } from "@/shared/ui/shadcn/button";
import { Skeleton } from "@/shared/ui/shadcn/skeleton";

import type { UserDetailResponse } from "@/features/users/model/types";
import { fetchUserDetail } from "@/features/users/api/usersApi";
import { UserStatusBadge } from "@/features/users/ui/UserStatusBadge";
import { UserActivitySection } from "@/features/users/ui/UserActivitySection";
import { UserSettlementSection } from "@/features/users/ui/UserSettlementSection";
import { UserDeviationsSection } from "@/features/users/ui/UserDeviationsSection";

import { SanctionDialog } from "@/features/sanctions/ui/SanctionDialog";

type Props = {
  userId: string;
};

export function UserDetailView({ userId }: Props) {
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<UserDetailResponse | null>(null);
  const [sanctionOpen, setSanctionOpen] = React.useState(false);

  React.useEffect(() => {
    if (!userId) {
      setLoading(false);
      setData(null);
      return;
    }

    let alive = true;
    setLoading(true);

    fetchUserDetail(userId)
      .then((response) => {
        if (!alive) return;
        setData(response);
      })
      .catch(() => {
        if (!alive) return;
        setData(null);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [userId]);

  const user = data?.user;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="text-base text-slate-600">
          <NavLink to="/users" className="underline underline-offset-4">
            사용자
          </NavLink>{" "}
          <span className="text-slate-500">/</span> 상세
        </div>
        <h2 className="text-3xl font-semibold text-slate-900">사용자 상세</h2>
        <p className="text-base text-slate-600">사용자 기본 정보와 운영 지표를 확인합니다.</p>
      </div>

      <Card className="rounded-lg border border-slate-300 bg-white">
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg text-slate-900">기본 정보</CardTitle>
          <p className="text-base text-slate-600">계정 상태 및 연락 정보를 확인합니다.</p>
        </CardHeader>

        <CardContent className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : user ? (
            <>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{user.role === "SHIPPER" ? "화주" : "차주"}</Badge>
                  <UserStatusBadge status={user.status} />
                  <div className="text-base font-semibold text-slate-900">{user.name}</div>
                  <div className="text-base text-slate-600">({user.id})</div>
                </div>

                <Button type="button" variant="secondary" onClick={() => setSanctionOpen(true)}>
                  제재 등록
                </Button>
              </div>

              <Separator />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-300 bg-slate-100 p-4">
                  <div className="text-base font-semibold text-slate-900">이메일</div>
                  <div className="mt-2 text-base text-slate-600">{user.email ?? "-"}</div>
                </div>

                <div className="rounded-lg border border-slate-300 bg-slate-100 p-4">
                  <div className="text-base font-semibold text-slate-900">연락처</div>
                  <div className="mt-2 text-base text-slate-600">{user.phone ?? "-"}</div>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-slate-300 bg-slate-100 p-4 text-base text-slate-600">
              사용자 정보를 불러오지 못했습니다.
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full border border-slate-300 bg-slate-100 sm:w-auto">
          <TabsTrigger value="overview" className="w-1/2 sm:w-auto">
            개요
          </TabsTrigger>
          <TabsTrigger value="orders-matching" className="w-1/2 sm:w-auto">
            오더/매칭
          </TabsTrigger>
          <TabsTrigger value="settlement" className="w-1/2 sm:w-auto">
            정산
          </TabsTrigger>
          <TabsTrigger value="risk" className="w-1/2 sm:w-auto">
            리스크
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <Card className="rounded-lg border border-slate-300 bg-white">
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg font-bold text-slate-900">개요</CardTitle>
              <p className="text-base text-slate-600">핵심 운영 지표 요약</p>
            </CardHeader>

            <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-300 bg-slate-100 p-4">
                <div className="text-base font-semibold text-slate-900">오더 수</div>
                <div className="mt-2 text-base text-slate-600">{data?.quotes.length ?? 0}건</div>
              </div>
              <div className="rounded-lg border border-slate-300 bg-slate-100 p-4">
                <div className="text-sm font-semibold">매칭 수</div>
                <div className="mt-2 text-sm text-foreground/70">{data?.matches.length ?? 0}건</div>
              </div>
              <div className="rounded-lg border border-border bg-muted p-4">
                <div className="text-sm font-semibold">정산 건수</div>
                <div className="mt-2 text-sm text-foreground/70">{data?.settlements.length ?? 0}건</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders-matching" className="mt-4">
          {user ? (
            <UserActivitySection role={user.role} quotes={data?.quotes} matches={data?.matches} />
          ) : (
            <div className="rounded-lg border border-border bg-muted p-4 text-sm text-foreground/70">데이터가 없습니다.</div>
          )}
        </TabsContent>

        <TabsContent value="settlement" className="mt-4">
          <UserSettlementSection rows={data?.settlements} />
        </TabsContent>

        <TabsContent value="risk" className="mt-4">
          <div className="space-y-4">
            <UserDeviationsSection rows={data?.deviations} />

            <Card className="rounded-lg border border-border bg-background">
              <CardHeader className="space-y-1">
                <CardTitle className="text-base font-bold">제재</CardTitle>
                <p className="text-sm text-foreground/70">제재 등록 및 이력 이동</p>
              </CardHeader>

              <CardContent className="flex items-center justify-between gap-3">
                <div className="text-sm text-foreground/70">운영 로그 페이지에서 상세 제재 이력을 확인할 수 있습니다.</div>
                <Button type="button" variant="secondary" onClick={() => setSanctionOpen(true)}>
                  제재 등록
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {user ? (
        <SanctionDialog
          open={sanctionOpen}
          onOpenChange={setSanctionOpen}
          target={{ id: user.id, role: user.role, name: user.name }}
          onSubmit={(payload) => {
            // MODIFIED: API 연동 전 임시 처리
            // eslint-disable-next-line no-console
            console.log("submit sanction:", payload);
          }}
        />
      ) : null}
    </div>
  );
}
