// src/features/users/ui/UserActivitySection.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/shadcn/table";
import { Badge } from "@/shared/ui/shadcn/badge";
import type { UserDetailMatch, UserDetailQuote, UserRole } from "../model/types";

type Props = {
  role: UserRole;
  quotes?: UserDetailQuote[];
  matches?: UserDetailMatch[];
};

export function UserActivitySection({ role, quotes = [], matches = [] }: Props) {
  const title = role === "SHIPPER" ? "견적(Quotes)" : "매칭/운행(Matches)";

  return (
    <Card className="rounded-lg border border-border bg-background">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base font-bold">{title}</CardTitle>
        <p className="text-sm opacity-70">ERD: quotes / matches</p>
      </CardHeader>

      <CardContent className="space-y-4">
        {role === "SHIPPER" ? (
          <div className="rounded-lg border border-border bg-background">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead>ID</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>생성일</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-10 text-center text-sm opacity-70">
                      견적 데이터가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  quotes.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell className="font-medium">{q.id}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{q.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm opacity-70">{q.createdAt}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-background">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead>ID</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>생성일</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-10 text-center text-sm opacity-70">
                      매칭 데이터가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  matches.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.id}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{m.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm opacity-70">{m.createdAt}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
