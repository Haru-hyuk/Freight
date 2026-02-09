import * as React from "react";

import { Badge } from "@/shared/ui/shadcn/badge";
import { Button } from "@/shared/ui/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/shadcn/table";

type SettlementRow = {
  doneAt: string;
  driver: string;
  route: string;
  amount: string;
  proof: "확인됨";
  status: "승인 대기" | "지급 완료";
};

const INITIAL: SettlementRow[] = [
  { doneAt: "2024-02-04", driver: "김기사", route: "서울 → 부산 (합짐)", amount: "350,000원", proof: "확인됨", status: "승인 대기" },
  { doneAt: "2024-02-04", driver: "박기사", route: "광주 → 서울", amount: "210,000원", proof: "확인됨", status: "승인 대기" },
];

export default function SettlementPage() {
  const [rows, setRows] = React.useState<SettlementRow[]>(INITIAL);
  const [toast, setToast] = React.useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2500);
  };

  const approveOne = (idx: number) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, status: "지급 완료" } : r)));
    showToast("정산 지급이 승인되었습니다.");
  };

  const approveAll = () => {
    setRows((prev) => prev.map((r) => ({ ...r, status: "지급 완료" })));
    showToast("전체 일괄 승인 완료");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">정산 관리</h2>
          <p className="mt-1 text-sm opacity-70">지급 승인 대기 목록을 처리해줘.</p>
        </div>
        <Button type="button" onClick={approveAll}>
          일괄 승인
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-lg border border-border bg-background">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-70">정산 대기 금액</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">₩ 45.2M</div>
          </CardContent>
        </Card>

        <Card className="rounded-lg border border-border bg-background">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-70">이번 주 지급 완료</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">₩ 120M</div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-lg border border-border bg-background">
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg">지급 승인 대기</CardTitle>
          <p className="text-sm opacity-70">각 행에서 지급 승인할 수 있어.</p>
        </CardHeader>

        <CardContent>
          <div className="rounded-lg border border-border bg-background">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead>완료일</TableHead>
                  <TableHead>기사</TableHead>
                  <TableHead>운행 구간</TableHead>
                  <TableHead>정산 금액</TableHead>
                  <TableHead>이행 확인</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, idx) => (
                  <TableRow key={`${r.driver}-${idx}`}>
                    <TableCell>{r.doneAt}</TableCell>
                    <TableCell className="font-medium">{r.driver}</TableCell>
                    <TableCell>{r.route}</TableCell>
                    <TableCell>{r.amount}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{r.proof}</Badge>
                    </TableCell>
                    <TableCell>
                      {r.status === "승인 대기" ? (
                        <Badge variant="outline">승인 대기</Badge>
                      ) : (
                        <Badge variant="secondary">지급 완료</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.status === "승인 대기" ? (
                        <Button type="button" onClick={() => approveOne(idx)}>
                          지급 승인
                        </Button>
                      ) : (
                        <span className="text-sm opacity-70">완료됨</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {toast ? (
        <div className="fixed bottom-6 right-6 rounded-lg border border-border bg-background px-4 py-3 text-sm shadow">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
