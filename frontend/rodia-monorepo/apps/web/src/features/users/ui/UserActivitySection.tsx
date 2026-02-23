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
  const title = "오더/매칭"; // MODIFIED: 탭 요구사항 명칭 반영

  return (
    <Card className="rounded-lg border border-border bg-background">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base font-bold">{title}</CardTitle>
        <p className="text-sm text-foreground/70">오더 및 매칭 이력</p>
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
                    <TableCell colSpan={3} className="py-10 text-center text-sm text-foreground/70">
                      오더 데이터가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  quotes.map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell className="font-medium">{quote.id}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{quote.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-foreground/70">{quote.createdAt}</TableCell>
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
                    <TableCell colSpan={3} className="py-10 text-center text-sm text-foreground/70">
                      매칭 데이터가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  matches.map((match) => (
                    <TableRow key={match.id}>
                      <TableCell className="font-medium">{match.id}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{match.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-foreground/70">{match.createdAt}</TableCell>
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
