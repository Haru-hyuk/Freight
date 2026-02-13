// src/features/users/ui/UserSettlementSection.tsx
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
        <CardTitle className="text-base font-bold">정산(Settlements)</CardTitle>
        <p className="text-sm opacity-70">ERD: settlements / payments</p>
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
                  <TableCell colSpan={4} className="py-10 text-center text-sm opacity-70">
                    정산 데이터가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.id}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{s.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm opacity-70">{typeof s.totalFare === "number" ? s.totalFare : "-"}</TableCell>
                    <TableCell className="text-sm opacity-70">{s.createdAt}</TableCell>
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
