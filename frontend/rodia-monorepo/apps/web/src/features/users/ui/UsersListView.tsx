import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";

import { fetchUsers } from "@/features/users/api/usersApi";
import type { UserListItem, UserRole, UserStatus } from "@/features/users/model/types";
import { UserRoleBadge, UserStatusBadge } from "@/features/users/ui/UserBadges";
import { useMockMode } from "@/shared/lib/hooks/useMockMode";
import { Badge } from "@/shared/ui/shadcn/badge";
import { Button } from "@/shared/ui/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Input } from "@/shared/ui/shadcn/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/shadcn/table";

type Props = {
  title: string;
  description: string;
  presetRole?: UserRole;
};

type RoleFilter = "all" | UserRole;
type StatusFilter = "all" | UserStatus;

export function UsersListView({ title, description, presetRole }: Props) {
  const navigate = useNavigate();
  const { enabled: mockModeEnabled } = useMockMode();

  const [q, setQ] = React.useState("");
  const [role, setRole] = React.useState<RoleFilter>(presetRole ?? "all");
  const [status, setStatus] = React.useState<StatusFilter>("all");
  const [page, setPage] = React.useState(1);
  const size = 20;

  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<UserListItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const queryRole = presetRole ?? (role === "all" ? undefined : role);
      const queryStatus = status === "all" ? undefined : status;
      const response = await fetchUsers({
        q: q.trim() || undefined,
        role: queryRole,
        status: queryStatus,
        page,
        size,
      });
      setRows(response.items);
      setTotal(response.total);
    } catch {
      setRows([]);
      setTotal(0);
      setError("회원 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [presetRole, role, status, q, page, size]);

  React.useEffect(() => {
    void load();
  }, [load, mockModeEnabled]);

  const totalPages = Math.max(1, Math.ceil(total / size));

  return (
    <div className="min-h-screen space-y-6 bg-background text-foreground">
      <div>
        <h1 className="text-3xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-foreground/70">{description}</p>
      </div>

      <Card className="rounded-lg border border-border bg-background">
        <CardHeader>
          <CardTitle className="text-base">필터</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/60" />
            <Input value={q} onChange={(event) => setQ(event.target.value)} placeholder="이름, 이메일, 연락처, ID 검색" className="border border-border bg-background pl-10 text-foreground" />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <select
              value={presetRole ?? role}
              onChange={(event) => setRole(event.target.value as RoleFilter)}
              disabled={Boolean(presetRole)}
              className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground disabled:opacity-70"
            >
              <option value="all">구분 전체</option>
              <option value="SHIPPER">화주</option>
              <option value="DRIVER">차주</option>
            </select>

            <select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)} className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground">
              <option value="all">상태 전체</option>
              <option value="ACTIVE">활성</option>
              <option value="SUSPENDED">정지</option>
              <option value="DRIVING_BLOCKED">운행 중지</option>
            </select>
          </div>

          <div className="flex justify-end">
            <Button type="button" variant="secondary" onClick={() => void load()} disabled={loading}>
              적용
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-sm text-foreground/70">
        <span>총 {total}명</span>
        {presetRole ? <Badge variant="outline">{presetRole === "SHIPPER" ? "화주 고정" : "차주 고정"}</Badge> : null}
      </div>

      <Card className="rounded-lg border border-border bg-background">
        <CardContent className="p-0">
          <div className="overflow-x-auto rounded-lg border border-border bg-background">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead>ID</TableHead>
                  <TableHead>구분</TableHead>
                  <TableHead>이름</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>가입일</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-foreground/70">
                      로딩 중...
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-destructive">
                      {error}
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-foreground/70">
                      검색 결과가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((user) => (
                    <TableRow key={user.id} className="cursor-pointer hover:bg-muted" onClick={() => navigate(`/users/${user.id}`)}>
                      <TableCell className="font-medium">{user.id}</TableCell>
                      <TableCell>
                        <UserRoleBadge role={user.role} />
                      </TableCell>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>
                        <UserStatusBadge status={user.status} />
                      </TableCell>
                      <TableCell>{user.createdAt}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-center gap-2">
        <Button type="button" variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
          이전
        </Button>
        <span className="text-sm text-foreground/70">
          {page}/{totalPages}
        </span>
        <Button type="button" variant="secondary" size="sm" disabled={page === totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>
          다음
        </Button>
      </div>
    </div>
  );
}
