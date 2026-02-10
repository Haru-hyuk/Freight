import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/shadcn/table";
import { Button } from "@/shared/ui/shadcn/button";

import type { DriverApprovalRow } from "../model/types";
import { LicenseBadge, ApprovalBadge } from "./badges";
import { DriverApprovalDialog } from "./DriverApprovalDialog";

const MOCK_ROWS: DriverApprovalRow[] = [
  {
    id: "1",
    requestedAt: "2024-02-05",
    name: "박신입",
    vehicle: "1톤 카고 (82가 1234)",
    licenseStatus: "검증됨",
    approvalStatus: "승인 대기",
    phone: "010-1234-5678",
  },
];

export function DriverApprovalTable() {
  const [rows, setRows] = React.useState(MOCK_ROWS);
  const [selected, setSelected] = React.useState<DriverApprovalRow | null>(null);

  const approve = (id: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, approvalStatus: "승인 완료" } : r))
    );
    setSelected(null);
  };

  return (
    <>
      <Card className="rounded-lg border border-border bg-background">
        <CardHeader>
          <CardTitle>가입 요청 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted">
                <TableHead>신청일</TableHead>
                <TableHead>이름</TableHead>
                <TableHead>차량</TableHead>
                <TableHead>자격증</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="text-right">관리</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.requestedAt}</TableCell>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.vehicle}</TableCell>
                  <TableCell><LicenseBadge status={r.licenseStatus} /></TableCell>
                  <TableCell><ApprovalBadge status={r.approvalStatus} /></TableCell>
                  <TableCell className="text-right">
                    <Button variant="secondary" onClick={() => setSelected(r)}>
                      상세 검토
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DriverApprovalDialog driver={selected} onClose={() => setSelected(null)} onApprove={approve} />
    </>
  );
}
