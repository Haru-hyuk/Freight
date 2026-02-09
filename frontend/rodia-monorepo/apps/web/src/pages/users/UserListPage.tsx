import { Badge } from "@/shared/ui/shadcn/badge";
import { Button } from "@/shared/ui/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/shadcn/table";

type UserRow = {
  id: string;
  type: "화주" | "기사";
  name: string;
  status: "활성" | "정지";
};

const DATA: UserRow[] = [
  { id: "U-1", type: "화주", name: "A물류", status: "활성" },
  { id: "U-2", type: "기사", name: "김기사", status: "활성" },
  { id: "U-3", type: "기사", name: "박기사", status: "정지" },
];

export default function UserListPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">사용자 목록</h2>
          <p className="mt-1 text-sm opacity-70">화주/기사 계정을 관리해줘.</p>
        </div>
        <Button type="button" variant="secondary">
          검색
        </Button>
      </div>

      <Card className="rounded-lg border border-border bg-background">
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg">사용자 리스트</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border bg-background">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead>ID</TableHead>
                  <TableHead>구분</TableHead>
                  <TableHead>이름</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {DATA.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.id}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{u.type}</Badge>
                    </TableCell>
                    <TableCell>{u.name}</TableCell>
                    <TableCell>
                      {u.status === "활성" ? (
                        <Badge variant="secondary">활성</Badge>
                      ) : (
                        <Badge variant="destructive">정지</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button type="button" variant="secondary">
                        상세
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
