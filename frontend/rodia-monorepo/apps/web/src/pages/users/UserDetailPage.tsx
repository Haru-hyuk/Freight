// src/pages/users/UserDetailPage.tsx
import * as React from "react";
import { NavLink, useParams } from "react-router-dom";

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

export default function UserDetailPage() {
  const { userId } = useParams();
  const id = userId ?? "";

  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<UserDetailResponse | null>(null);

  // 수정: data fetch 로직 정리(불필요한 queueMicrotask 제거). 언마운트 안전 처리만 유지.
  React.useEffect(() => {
    if (!id) return;

    let alive = true;
    setLoading(true);

    fetchUserDetail(id)
      .then((res) => {
        if (!alive) return;
        setData(res);
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
  }, [id]);

  const user = data?.user;

  const [sanctionOpen, setSanctionOpen] = React.useState(false);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="text-sm opacity-70">
          <NavLink to="/users" className="underline underline-offset-4">
            사용자
          </NavLink>{" "}
          <span className="opacity-50">/</span> 상세
        </div>
        <h2 className="text-2xl font-semibold">사용자 상세</h2>
        <p className="text-sm opacity-70">
          {user?.role === "SHIPPER"
            ? "화주(견적/결제/정산 중심)"
            : user?.role === "DRIVER"
              ? "차주(매칭/운행/리스크 중심)"
              : "계정 정보 + 연결 데이터"}
        </p>
      </div>

      <Card className="rounded-lg border border-border bg-background">
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg">기본 정보</CardTitle>
          <p className="text-sm opacity-70">ERD: shippers / drivers</p>
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
                  <div className="text-sm font-semibold">{user.name}</div>
                  <div className="text-sm opacity-70">({user.id})</div>
                </div>

                <div className="flex items-center gap-2">
                  {/* 수정: 제재 등록은 상세 내부 탭에서도 접근 가능하게 */}
                  <Button type="button" variant="secondary" onClick={() => setSanctionOpen(true)}>
                    제재 등록
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-muted p-4">
                  <div className="text-sm font-semibold">이메일</div>
                  <div className="mt-2 text-sm opacity-70">{user.email ?? "-"}</div>
                </div>

                <div className="rounded-lg border border-border bg-muted p-4">
                  <div className="text-sm font-semibold">연락처</div>
                  <div className="mt-2 text-sm opacity-70">{user.phone ?? "-"}</div>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-border bg-muted p-4 text-sm opacity-70">
              사용자 정보를 불러오지 못했어.
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full border border-border bg-muted sm:w-auto">
          <TabsTrigger value="overview" className="w-1/2 sm:w-auto">
            개요
          </TabsTrigger>
          <TabsTrigger value="activity" className="w-1/2 sm:w-auto">
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
          <Card className="rounded-lg border border-border bg-background">
            <CardHeader className="space-y-1">
              <CardTitle className="text-base font-bold">요약</CardTitle>
              <p className="text-sm opacity-70">각 탭의 핵심 수치 요약</p>
            </CardHeader>

            <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-muted p-4">
                <div className="text-sm font-semibold">견적 수</div>
                <div className="mt-2 text-sm opacity-70">{data?.quotes.length ?? 0}건</div>
              </div>
              <div className="rounded-lg border border-border bg-muted p-4">
                <div className="text-sm font-semibold">매칭 수</div>
                <div className="mt-2 text-sm opacity-70">{data?.matches.length ?? 0}건</div>
              </div>
              <div className="rounded-lg border border-border bg-muted p-4">
                <div className="text-sm font-semibold">정산 건수</div>
                <div className="mt-2 text-sm opacity-70">{data?.settlements.length ?? 0}건</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          {user ? (
            <UserActivitySection role={user.role} quotes={data?.quotes} matches={data?.matches} />
          ) : (
            <div className="rounded-lg border border-border bg-muted p-4 text-sm opacity-70">데이터 없음</div>
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
                <CardTitle className="text-base font-bold">제재/조치</CardTitle>
                <p className="text-sm opacity-70">제재 등록 후 운영 로그로 남기기</p>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="text-sm opacity-70">
                  운영 &gt; 제재 내역 로그와 연결해서 “사용자별 필터”로 보여주면 끝
                </div>
                <Button type="button" variant="secondary" onClick={() => setSanctionOpen(true)}>
                  제재 등록
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* 수정: SanctionDialog를 상세 페이지에서 실제로 연결 */}
      {user ? (
        <SanctionDialog
          open={sanctionOpen}
          onOpenChange={setSanctionOpen}
          target={{ id: user.id, role: user.role, name: user.name }}
          onSubmit={(payload) => {
            // 수정: 지금은 UI만, 추후 sanctionsApi POST 연결
            // eslint-disable-next-line no-console
            console.log("submit sanction:", payload);
          }}
        />
      ) : null}
    </div>
  );
}
