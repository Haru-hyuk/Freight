import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/shadcn/table";
import { Badge } from "@/shared/ui/shadcn/badge";
import type { UserDetailSettlement } from "../model/types";

type Props = {
  rows?: UserDetailSettlement[];
};

export function UserSettlementSection({ rows = [] }: Props) {
  return (
    <Card className="rounded-lg border border-border bg-background">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base font-bold">정산</CardTitle>
        <p className="text-sm text-foreground/70">정산 이력 조회</p>
      </CardHeader>

      <CardContent>
        <div className="rounded-lg border border-border bg-background">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted">
                <TableHead>ID</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>금액</TableHead>
                <TableHead>생성일</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-sm text-foreground/70">
                    정산 데이터가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.id}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{row.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-foreground/70">
                      {typeof row.totalFare === "number" ? row.totalFare.toLocaleString() : "-"}
                    </TableCell>
                    <TableCell className="text-sm text-foreground/70">{row.createdAt}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
