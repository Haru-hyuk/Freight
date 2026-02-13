// src/features/sanctions/ui/SanctionsTable.tsx
import * as React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/shadcn/table";
import { Badge } from "@/shared/ui/shadcn/badge";
import { Button } from "@/shared/ui/shadcn/button";

import type { SanctionRow, SanctionType, SanctionStatus } from "../model/types";
import type { UserRole } from "@/features/users/model/types";

function RoleBadge({ role }: { role: UserRole }) {
  return <Badge variant="outline">{role === "SHIPPER" ? "화주" : "차주"}</Badge>;
}

function TypeBadge({ type }: { type: SanctionType }) {
  if (type === "SUSPEND") return <Badge variant="destructive">정지</Badge>;
  if (type === "DRIVE_BLOCK") return <Badge variant="outline">운행중지</Badge>;
  if (type === "FINE") return <Badge variant="secondary">범칙금</Badge>;
  return <Badge variant="outline">경고</Badge>;
}

function StatusBadge({ status }: { status: SanctionStatus }) {
  return status === "APPLIED" ? <Badge variant="secondary">적용</Badge> : <Badge variant="outline">해제</Badge>;
}

type Props = {
  rows: SanctionRow[];
  onOpenDetail?: (row: SanctionRow) => void;
};

export function SanctionsTable({ rows, onOpenDetail }: Props) {
  return (
    <Card className="rounded-lg border border-border bg-background">
      <CardHeader className="space-y-1">
        <CardTitle className="text-lg">제재 내역 로그</CardTitle>
        <p className="text-sm opacity-70">운영 기록(경고/범칙금/정지/운행중지)을 조회</p>
      </CardHeader>

      <CardContent>
        <div className="rounded-lg border border-border bg-background">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted">
                <TableHead>ID</TableHead>
                <TableHead>구분</TableHead>
                <TableHead>대상</TableHead>
                <TableHead>제재</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>일시</TableHead>
                <TableHead className="text-right">관리</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.id}</TableCell>
                  <TableCell>
                    <RoleBadge role={r.targetRole} />
                  </TableCell>
                  <TableCell className="font-medium">{r.targetName}</TableCell>
                  <TableCell>
                    <TypeBadge type={r.type} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="text-sm opacity-70">{r.createdAt}</TableCell>
                  <TableCell className="text-right">
                    <Button type="button" variant="secondary" onClick={() => onOpenDetail?.(r)}>
                      상세
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm opacity-70">
                    제재 로그가 없습니다.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
