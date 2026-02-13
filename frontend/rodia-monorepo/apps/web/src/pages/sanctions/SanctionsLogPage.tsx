// src/pages/sanctions/SanctionsLogPage.tsx
import * as React from "react";

import { Button } from "@/shared/ui/shadcn/button";
import { SanctionsTable } from "@/features/sanctions/ui/SanctionsTable";
import type { SanctionRow } from "@/features/sanctions/model/types";

const MOCK_ROWS: SanctionRow[] = [
  {
    id: "S-1001",
    targetId: "U-2",
    targetRole: "DRIVER",
    targetName: "김기사",
    type: "WARNING",
    status: "APPLIED",
    createdAt: "2026-02-10 10:30",
    reason: "배송 지연 반복",
  },
  {
    id: "S-1002",
    targetId: "U-1",
    targetRole: "SHIPPER",
    targetName: "A물류",
    type: "FINE",
    status: "APPLIED",
    createdAt: "2026-02-10 11:10",
    reason: "취소 수수료 미납",
    amount: 30000,
  },
];

export default function SanctionsLogPage() {
  const [rows] = React.useState<SanctionRow[]>(MOCK_ROWS);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">제재 내역 로그</h2>
          <p className="mt-1 text-sm opacity-70">운영 기준으로 발생한 제재/조치 기록을 확인해줘.</p>
        </div>

        <Button type="button" variant="secondary">
          필터/검색(추가 예정)
        </Button>
      </div>

      <SanctionsTable
        rows={rows}
        onOpenDetail={(row) => {
          // eslint-disable-next-line no-console
          console.log("open detail:", row);
        }}
      />
    </div>
  );
}
