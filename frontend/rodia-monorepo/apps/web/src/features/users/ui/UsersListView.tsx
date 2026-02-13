// src/features/users/ui/UsersListView.tsx
import * as React from "react";
import { Link } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/shadcn/table";
import { Button } from "@/shared/ui/shadcn/button";
import { Separator } from "@/shared/ui/shadcn/separator";
import { Skeleton } from "@/shared/ui/shadcn/skeleton";

import { fetchUsers } from "@/features/users/api/usersApi";
import type { UserListItem, UserRole } from "@/features/users/model/types";
import { UserRoleBadge, UserStatusBadge } from "@/features/users/ui/UserBadges";
import { UserFilters } from "@/features/users/ui/UserFilters";
import { toUserListQuery, type UserFilterValue } from "@/features/users/model/filters";

type Props = {
  // 추가: 페이지에서 타이틀/설명만 바꿔 끼우게 props로 받음
  title: string;
  description: string;

  // 추가: 화주/차주 조회는 역할을 고정하는 프리셋 지원
  presetRole?: UserRole;
};

export function UsersListView({ title, description, presetRole }: Props) {
  // 수정: presetRole이 있으면 role을 고정, 없으면 전체(all)
  const [filters, setFilters] = React.useState<UserFilterValue>({
    q: "",
    role: presetRole ?? "all",
    status: "all",
  });

  const [page] = React.useState(1);
  const [size] = React.useState(20);

  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<UserListItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const query = toUserListQuery(filters, page, size);
      const res = await fetchUsers(query);

      let items = res.items;

      // 참고: status가 API query에 아직 없다면 클라 필터로 임시 처리 가능
      // (백엔드 확정되면 fetchUsers query에 status 포함시키면 됨)
      if (filters.status !== "all") {
        items = items.filter((x) => x.status === filters.status);
      }

      setRows(items);
      setTotal(res.total);
    } catch {
      setRows([]);
      setTotal(0);
      setError("사용자 목록을 불러오지 못했어.");
    } finally {
      setLoading(false);
    }
  }, [filters, page, size]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">{title}</h2>
        <p className="mt-1 text-sm opacity-70">{description}</p>
      </div>

      {/* 수정: presetRole이 있으면 role 선택 UI를 잠그거나 숨김 */}
      <UserFilters
        value={filters}
        onChange={(next) => {
          // 수정: presetRole이 있으면 role 변경을 막음(프리셋 유지)
          if (presetRole) {
            setFilters({ ...next, role: presetRole });
            return;
          }
          setFilters(next);
        }}
        onSubmit={load}
        loading={loading}
        roleLocked={Boolean(presetRole)} // 추가
      />

      <Separator />

      <Card className="rounded-lg border border-border bg-background">
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg">사용자 리스트</CardTitle>
          <p className="text-sm opacity-70">총 {total}명</p>
        </CardHeader>

        <CardContent className="space-y-3">
          {error ? <div className="rounded-lg border border-border bg-muted p-4 text-sm">{error}</div> : null}

          <div className="rounded-lg border border-border bg-background">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead>ID</TableHead>
                  <TableHead>구분</TableHead>
                  <TableHead>이름</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>가입일</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <div className="space-y-2 p-2">
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm opacity-70">
                      사용자 데이터가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.id}</TableCell>
                      <TableCell>
                        <UserRoleBadge role={u.role} />
                      </TableCell>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell>
                        <UserStatusBadge status={u.status} />
                      </TableCell>
                      <TableCell className="text-sm opacity-70">{u.createdAt}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild type="button" variant="secondary">
                          <Link to={`/users/${u.id}`}>상세</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
