// src/features/users/ui/UserTable.tsx
import * as React from "react";

import type { UserListItem, UserRole, UserStatus } from "@/features/users/model/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/shadcn/table";
import { Badge } from "@/shared/ui/shadcn/badge";
import { Button } from "@/shared/ui/shadcn/button";
import { Skeleton } from "@/shared/ui/shadcn/skeleton";
import { Separator } from "@/shared/ui/shadcn/separator";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/shadcn/dialog";

type Props = {
  loading: boolean;
  items: UserListItem[];
  total: number;

  onOpenDetail: (userId: string) => void;

  // 제재/조치(일단 UI만)
  onSuspend: (userId: string) => void;
  onBlockDriving: (userId: string) => void;
  onWarn: (userId: string) => void;
  onFine: (userId: string) => void;
};

function RoleBadge({ role }: { role: UserRole }) {
  if (role === "SHIPPER") return <Badge className="bg-secondary text-foreground">화주</Badge>;
  return <Badge className="bg-muted text-foreground">차주</Badge>;
}

function StatusBadge({ status }: { status: UserStatus }) {
  if (status === "ACTIVE") return <Badge className="bg-secondary text-foreground">정상</Badge>;
  if (status === "SUSPENDED") return <Badge className="bg-destructive text-foreground">정지</Badge>;
  return <Badge className="bg-accent text-foreground">운행중지</Badge>;
}

type SanctionDialogState = {
  open: boolean;
  user: UserListItem | null;
};

export function UserTable({
  loading,
  items,
  total,
  onOpenDetail,
  onSuspend,
  onBlockDriving,
  onWarn,
  onFine,
}: Props) {
  const [sanction, setSanction] = React.useState<SanctionDialogState>({ open: false, user: null });

  const openSanction = (user: UserListItem) => setSanction({ open: true, user });
  const closeSanction = () => setSanction({ open: false, user: null });

  return (
    <Card className="rounded-lg border border-border bg-background">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base font-bold">사용자 목록</CardTitle>
        <p className="text-sm opacity-70">총 {total}명</p>
      </CardHeader>

      <CardContent className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-border bg-muted p-4 text-sm opacity-80">조회 결과 없음</div>
        ) : (
          <div className="rounded-lg border border-border bg-background">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead>구분</TableHead>
                  <TableHead>이름</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>연락처</TableHead>
                  <TableHead>가입일</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {items.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <RoleBadge role={u.role} />
                    </TableCell>

                    <TableCell className="space-y-1">
                      <div className="text-sm font-semibold">{u.name}</div>
                      {u.email ? <div className="text-xs opacity-70">{u.email}</div> : null}
                      <div className="flex items-center gap-2 text-xs opacity-70">
                        {typeof u.quotesCount === "number" ? <span>견적 {u.quotesCount}</span> : null}
                        {typeof u.matchesCount === "number" ? <span>매칭 {u.matchesCount}</span> : null}
                      </div>
                    </TableCell>

                    <TableCell>
                      <StatusBadge status={u.status} />
                    </TableCell>

                    <TableCell className="text-sm">{u.phone ?? "-"}</TableCell>
                    <TableCell className="text-sm">{u.createdAt}</TableCell>

                    <TableCell className="text-right">
                      <div className="inline-flex gap-2">
                        <Button type="button" variant="secondary" onClick={() => onOpenDetail(u.id)}>
                          상세
                        </Button>
                        <Button type="button" variant="secondary" onClick={() => openSanction(u)}>
                          제재
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={sanction.open} onOpenChange={(open) => (open ? null : closeSanction())}>
        <DialogContent className="rounded-lg border border-border bg-background">
          <DialogHeader>
            <DialogTitle>제재/조치</DialogTitle>
          </DialogHeader>

          {sanction.user ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">{sanction.user.name}</div>
                  <RoleBadge role={sanction.user.role} />
                </div>
                <div className="mt-2 flex items-center gap-2 text-sm opacity-80">
                  <span>상태</span>
                  <StatusBadge status={sanction.user.status} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-semibold">조치 선택</div>
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    type="button"
                    className="bg-destructive text-foreground"
                    onClick={() => {
                      onSuspend(sanction.user!.id);
                      closeSanction();
                    }}
                  >
                    계정 정지
                  </Button>

                  <Button
                    type="button"
                    className="bg-accent text-foreground"
                    onClick={() => {
                      onBlockDriving(sanction.user!.id);
                      closeSanction();
                    }}
                  >
                    운행 중지
                  </Button>

                  <Button
                    type="button"
                    className="bg-secondary text-foreground"
                    onClick={() => {
                      onWarn(sanction.user!.id);
                      closeSanction();
                    }}
                  >
                    경고
                  </Button>

                  <Button
                    type="button"
                    className="bg-secondary text-foreground"
                    onClick={() => {
                      onFine(sanction.user!.id);
                      closeSanction();
                    }}
                  >
                    범칙금 부과
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="text-xs opacity-70">
                지금은 UI만. 추후 API 연결 시 “조치 사유/기간/담당자” 입력 + 로그(제재 내역) 테이블 붙이면 완성.
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={closeSanction}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
