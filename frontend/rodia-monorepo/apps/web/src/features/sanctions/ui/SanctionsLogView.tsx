import * as React from "react";

import { Button } from "@/shared/ui/shadcn/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/shadcn/dialog";
import { Badge } from "@/shared/ui/shadcn/badge";

import { SanctionsTable } from "@/features/sanctions/ui/SanctionsTable";
import type { SanctionRow } from "@/features/sanctions/model/types";

const MOCK_ROWS: SanctionRow[] = [
  {
    id: "S-1001",
    targetId: "U-2",
    targetRole: "DRIVER",
    targetName: "김차주",
    type: "WARNING",
    status: "APPLIED",
    createdAt: "2026-02-10 10:30",
    reason: "반복 지연 운행",
  },
  {
    id: "S-1002",
    targetId: "U-1",
    targetRole: "SHIPPER",
    targetName: "한화주",
    type: "FINE",
    status: "APPLIED",
    createdAt: "2026-02-10 11:10",
    reason: "반복 취소 요청",
    amount: 30000,
  },
];

export function SanctionsLogView() {
  const [rows] = React.useState<SanctionRow[]>(MOCK_ROWS);
  const [selected, setSelected] = React.useState<SanctionRow | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">제재 로그</h2>
          <p className="mt-1 text-sm text-foreground/70">운영 제재 내역을 조회하고 상세 내용을 확인합니다.</p>
        </div>

        <Button type="button" variant="secondary">
          내보내기
        </Button>
      </div>

      <SanctionsTable rows={rows} onOpenDetail={setSelected} />

      <Dialog open={Boolean(selected)} onOpenChange={(open) => (open ? null : setSelected(null))}>
        <DialogContent className="rounded-lg border border-border bg-background">
          <DialogHeader>
            <DialogTitle>제재 상세</DialogTitle>
          </DialogHeader>

          {selected ? (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border border-border bg-muted p-3">
                <div className="font-semibold">{selected.targetName}</div>
                <div className="text-foreground/70">{selected.targetId}</div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{selected.targetRole === "SHIPPER" ? "화주" : "차주"}</Badge>
                <Badge variant="outline">{selected.type}</Badge>
                <Badge variant={selected.status === "APPLIED" ? "secondary" : "outline"}>{selected.status}</Badge>
              </div>

              <div className="rounded-lg border border-border bg-background p-3">
                <div className="font-semibold">사유</div>
                <div className="mt-1 text-foreground/70">{selected.reason}</div>
              </div>

              {typeof selected.amount === "number" ? (
                <div className="rounded-lg border border-border bg-background p-3">
                  <div className="font-semibold">금액</div>
                  <div className="mt-1 text-foreground/70">{selected.amount.toLocaleString()}</div>
                </div>
              ) : null}

              <div className="text-foreground/70">등록일: {selected.createdAt}</div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
