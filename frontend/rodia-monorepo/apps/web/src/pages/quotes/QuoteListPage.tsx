import { Link } from "react-router-dom";

import { Badge } from "@/shared/ui/shadcn/badge";
import { Button } from "@/shared/ui/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/shadcn/table";

type QuoteRow = {
  id: string;
  status: "대기" | "진행" | "완료";
  summary: string;
  createdAt: string;
};

const DATA: QuoteRow[] = [
  { id: "Q-1001", status: "대기", summary: "서울 성동구 → 대전 유성구 / 5톤", createdAt: "2024-02-05" },
  { id: "Q-1002", status: "진행", summary: "인천항 → 평택 / 11톤", createdAt: "2024-02-04" },
  { id: "Q-1003", status: "완료", summary: "파주 → 마포 / 1톤", createdAt: "2024-02-03" },
];

function StatusBadge({ status }: { status: QuoteRow["status"] }) {
  if (status === "완료") return <Badge variant="secondary">완료</Badge>;
  if (status === "진행") return <Badge variant="outline">진행</Badge>;
  return <Badge variant="outline">대기</Badge>;
}

export default function QuoteListPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">견적 목록</h2>
          <p className="mt-1 text-sm opacity-70">견적 요청 리스트(목업 데이터).</p>
        </div>
        <Button type="button">새 견적 등록</Button>
      </div>

      <Card className="rounded-lg border border-border bg-background">
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg">견적 리스트</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="rounded-lg border border-border bg-background">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead>ID</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>요약</TableHead>
                  <TableHead>생성일</TableHead>
                  <TableHead className="text-right">상세</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {DATA.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.id}</TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell>{r.summary}</TableCell>
                    <TableCell>{r.createdAt}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="secondary">
                        <Link to={`/quotes/${encodeURIComponent(r.id)}`}>보기</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
