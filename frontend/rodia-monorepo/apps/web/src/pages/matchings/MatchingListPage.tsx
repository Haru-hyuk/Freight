import { Link } from "react-router-dom";

import { Badge } from "@/shared/ui/shadcn/badge";
import { Button } from "@/shared/ui/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/shadcn/table";

type MatchingRow = {
  id: string;
  status: "진행" | "완료" | "취소";
  title: string;
  updatedAt: string;
};

const DATA: MatchingRow[] = [
  { id: "M-2001", status: "진행", title: "서울 → 부산 / 김기사", updatedAt: "2024-02-05" },
  { id: "M-2002", status: "완료", title: "인천 → 평택 / 박기사", updatedAt: "2024-02-04" },
  { id: "M-2003", status: "취소", title: "파주 → 마포 / 이기사", updatedAt: "2024-02-03" },
];

function StatusBadge({ status }: { status: MatchingRow["status"] }) {
  if (status === "완료") return <Badge variant="secondary">완료</Badge>;
  if (status === "취소") return <Badge variant="destructive">취소</Badge>;
  return <Badge variant="outline">진행</Badge>;
}

export default function MatchingListPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">매칭 목록</h2>
          <p className="mt-1 text-sm opacity-70">계약/운송/정산 흐름의 기준 단위(목업).</p>
        </div>
        <Button type="button" variant="secondary">
          필터
        </Button>
      </div>

      <Card className="rounded-lg border border-border bg-background">
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg">매칭 리스트</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border bg-background">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead>ID</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>요약</TableHead>
                  <TableHead>업데이트</TableHead>
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
                    <TableCell>{r.title}</TableCell>
                    <TableCell>{r.updatedAt}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="secondary">
                        <Link to={`/matchings/${encodeURIComponent(r.id)}`}>보기</Link>
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
