import * as React from "react";

import { Button } from "@/shared/ui/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/shadcn/table";
import { Badge } from "@/shared/ui/shadcn/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/shadcn/dialog";
import { Separator } from "@/shared/ui/shadcn/separator";

type DriverRequest = {
  id: string;
  requestedAt: string;
};

type DriverRow = {
  id: string;
  requestedAt: string;
  name: string;
  vehicle: string;
  licenseStatus: "검증됨" | "재요청";
  approvalStatus: "승인 대기" | "보류" | "승인 완료";
  phone: string;
};

const INITIAL_ROWS: DriverRow[] = [
  {
    id: "1",
    requestedAt: "2024-02-05",
    name: "박신입",
    vehicle: "1톤 카고 (82가 1234)",
    licenseStatus: "검증됨",
    approvalStatus: "승인 대기",
    phone: "010-1234-5678",
  },
  {
    id: "2",
    requestedAt: "2024-02-04",
    name: "정베테랑",
    vehicle: "5톤 윙바디 (99바 9999)",
    licenseStatus: "재요청",
    approvalStatus: "보류",
    phone: "010-9876-5432",
  },
];

function LicenseBadge({ status }: { status: DriverRow["licenseStatus"] }) {
  if (status === "검증됨") return <Badge variant="secondary">검증됨</Badge>;
  return <Badge variant="destructive">재요청</Badge>;
}

function ApprovalBadge({ status }: { status: DriverRow["approvalStatus"] }) {
  if (status === "승인 대기") return <Badge variant="outline">승인 대기</Badge>;
  if (status === "승인 완료") return <Badge variant="secondary">승인 완료</Badge>;
  return <Badge variant="destructive">보류</Badge>;
}

export default function DriverApprovalPage() {
  const [rows, setRows] = React.useState<DriverRow[]>(INITIAL_ROWS);
  const [selected, setSelected] = React.useState<DriverRow | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2500);
  };

  const approve = (id: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, approvalStatus: "승인 완료" } : r))
    );
    showToast("기사 승인이 완료되었습니다.");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">기사 승인 관리</h2>
        <p className="mt-1 text-sm opacity-70">가입 요청 서류를 확인하고 승인/보류 처리해줘.</p>
      </div>

      <Card className="rounded-lg border border-border bg-background">
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg">가입 요청 목록 (2건)</CardTitle>
          <p className="text-sm opacity-70">상세 검토 후 승인 처리할 수 있어.</p>
        </CardHeader>

        <CardContent>
          <div className="rounded-lg border border-border bg-background">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead>신청일</TableHead>
                  <TableHead>이름</TableHead>
                  <TableHead>차량 정보</TableHead>
                  <TableHead>자격증 상태</TableHead>
                  <TableHead>승인 상태</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.requestedAt}</TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{r.vehicle}</TableCell>
                    <TableCell>
                      <LicenseBadge status={r.licenseStatus} />
                    </TableCell>
                    <TableCell>
                      <ApprovalBadge status={r.approvalStatus} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-2">
                        <Button type="button" variant="secondary" onClick={() => setSelected(r)}>
                          상세 검토
                        </Button>
                        <Button
                          type="button"
                          onClick={() => approve(r.id)}
                          disabled={r.approvalStatus !== "승인 대기"}
                        >
                          즉시 승인
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => (open ? null : setSelected(null))}>
        <DialogContent className="rounded-lg border border-border bg-background">
          <DialogHeader>
            <DialogTitle>기사 상세 정보</DialogTitle>
          </DialogHeader>

          {selected ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-background p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium opacity-70">이름</div>
                    <div className="text-sm font-semibold">{selected.name}</div>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium opacity-70">차량 정보</div>
                    <div className="text-sm">{selected.vehicle}</div>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium opacity-70">연락처</div>
                    <div className="text-sm">{selected.phone}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-semibold">제출 서류 (운송 자격증)</div>
                <div className="flex h-44 items-center justify-center rounded-lg border border-border bg-muted text-sm opacity-70">
                  자격증 이미지 미리보기(목업)
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="secondary" onClick={() => setSelected(null)}>
              닫기
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (selected) approve(selected.id);
                setSelected(null);
              }}
              disabled={!selected || selected.approvalStatus !== "승인 대기"}
            >
              승인 처리
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {toast ? (
        <div className="fixed bottom-6 right-6 rounded-lg border border-border bg-background px-4 py-3 text-sm shadow">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
