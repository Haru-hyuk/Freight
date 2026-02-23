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
  title: string;
  description: string;
  presetRole?: UserRole;
};

export function UsersListView({ title, description, presetRole }: Props) {
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
      setRows(res.items);
      setTotal(res.total);
    } catch {
      setRows([]);
      setTotal(0);
      setError("사용자 목록을 불러오지 못했습니다."); // MODIFIED: 오류 문구 정리
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
        <p className="mt-1 text-sm text-foreground/70">{description}</p>
      </div>

      <UserFilters
        value={filters}
        onChange={(next) => {
          if (presetRole) {
            setFilters({ ...next, role: presetRole }); // MODIFIED: role 고정 페이지 방어
            return;
          }
          setFilters(next);
        }}
        onSubmit={load}
        loading={loading}
        roleLocked={Boolean(presetRole)}
      />

      <Separator />

      <Card className="rounded-lg border border-border bg-background">
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg">사용자 목록</CardTitle>
          <p className="text-sm text-foreground/70">총 {total}명</p>
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
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-foreground/70">
                      사용자 데이터가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.id}</TableCell>
                      <TableCell>
                        <UserRoleBadge role={user.role} />
                      </TableCell>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>
                        <UserStatusBadge status={user.status} />
                      </TableCell>
                      <TableCell className="text-sm text-foreground/70">{user.createdAt}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild type="button" variant="secondary">
                          <Link to={`/users/${user.id}`}>상세</Link>
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
