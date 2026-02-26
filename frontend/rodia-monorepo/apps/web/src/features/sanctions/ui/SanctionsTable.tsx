import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/shadcn/table";
import { Badge } from "@/shared/ui/shadcn/badge";

import type { SanctionRow, SanctionType, SanctionStatus } from "../model/types";
import type { UserRole } from "@/features/users/model/types";

function RoleBadge({ role }: { role: UserRole }) {
  return <Badge variant="outline">{role === "SHIPPER" ? "화주" : "차주"}</Badge>;
}

function TypeBadge({ type }: { type: SanctionType }) {
  if (type === "SUSPEND") return <Badge variant="destructive">계정 정지</Badge>;
  if (type === "DRIVE_BLOCK") return <Badge variant="outline">운행 중지</Badge>;
  if (type === "FINE") return <Badge variant="secondary">벌점 부과</Badge>;
  return <Badge variant="outline">경고</Badge>;
}

function StatusBadge({ status }: { status: SanctionStatus }) {
  return status === "APPLIED" ? <Badge variant="secondary">적용</Badge> : <Badge variant="outline">해제</Badge>;
}

function formatAmount(amount?: number): string {
  if (typeof amount !== "number") return "-";
  return `${amount.toLocaleString("ko-KR")}원`;
}

function summarizeReason(reason: string): string {
  const normalized = reason.trim();
  if (normalized.length <= 32) return normalized;
  return `${normalized.slice(0, 32)}...`;
}

type Props = {
  rows: SanctionRow[];
  loading?: boolean;
  onOpenDetail?: (row: SanctionRow) => void;
};

export function SanctionsTable({ rows, loading = false, onOpenDetail }: Props) {
  return (
    <Card className="rounded-lg border border-border bg-background">
      <CardHeader className="space-y-1">
        <CardTitle className="text-lg">제재 로그</CardTitle>
        <p className="text-sm text-foreground/70">제재 이력 목록을 클릭해 상세 정보와 근거를 확인할 수 있습니다.</p>
      </CardHeader>

      <CardContent>
        <div className="rounded-lg border border-border bg-background">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted">
                <TableHead>ID</TableHead>
                <TableHead>대상 구분</TableHead>
                <TableHead>대상자</TableHead>
                <TableHead>제재 유형</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>벌점/금액</TableHead>
                <TableHead>사유 요약</TableHead>
                <TableHead>등록일</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading && rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-foreground/70">
                    제재 로그를 불러오는 중입니다.
                  </TableCell>
                </TableRow>
              ) : null}

              {rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={onOpenDetail ? "cursor-pointer hover:bg-muted" : undefined}
                  onClick={() => onOpenDetail?.(row)}
                >
                  <TableCell className="font-medium">{row.id}</TableCell>
                  <TableCell>
                    <RoleBadge role={row.targetRole} />
                  </TableCell>
                  <TableCell className="font-medium">{row.targetName}</TableCell>
                  <TableCell>
                    <TypeBadge type={row.type} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={row.status} />
                  </TableCell>
                  <TableCell className="text-sm text-foreground/70">{formatAmount(row.amount)}</TableCell>
                  <TableCell className="text-sm text-foreground/70">{summarizeReason(row.reason)}</TableCell>
                  <TableCell className="text-sm text-foreground/70">{row.createdAt}</TableCell>
                </TableRow>
              ))}

              {!loading && rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-foreground/70">
                    조건에 맞는 제재 로그가 없습니다.
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
