import { Badge } from "@/shared/ui/shadcn/badge";
import { Button } from "@/shared/ui/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/shadcn/table";

type MonitoringRow = {
  id: string;
  type: "합짐" | "단건";
  from: string;
  to: string;
  driver: string;
  status: "주행중" | "정차";
};

const DATA: MonitoringRow[] = [
  { id: "#1023", type: "합짐", from: "인천항", to: "원주 센터", driver: "김철수", status: "주행중" },
  { id: "#1024", type: "단건", from: "평택항", to: "천안 공장", driver: "이영희", status: "정차" },
];

export default function OrdersMonitoringPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">오더 및 관제</h2>
          <p className="mt-1 text-sm opacity-70">실시간 운행 상태를 요약해서 보여줘.</p>
        </div>
        <Button type="button" variant="secondary">
          새로고침
        </Button>
      </div>

      <Card className="rounded-lg border border-border bg-background">
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg">전국 화물 관제 시스템</CardTitle>
          <p className="text-sm opacity-70">지도는 추후 실제 지도 SDK로 교체 예정(현재 목업).</p>
        </CardHeader>
        <CardContent>
          <div className="flex h-80 items-center justify-center rounded-lg border border-border bg-muted">
            <div className="rounded-lg border border-border bg-background px-4 py-3 text-center text-sm">
              <div className="font-semibold">실시간 42대 운행 중</div>
              <div className="mt-1 opacity-70">지도 영역(목업)</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-lg border border-border bg-background">
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg">운행 리스트</CardTitle>
          <p className="text-sm opacity-70">오더별 현재 상태를 확인해줘.</p>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border bg-background">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead>ID</TableHead>
                  <TableHead>구분</TableHead>
                  <TableHead>출발지</TableHead>
                  <TableHead>도착지</TableHead>
                  <TableHead>기사</TableHead>
                  <TableHead>현재 상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {DATA.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.id}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{r.type}</Badge>
                    </TableCell>
                    <TableCell>{r.from}</TableCell>
                    <TableCell>{r.to}</TableCell>
                    <TableCell>{r.driver}</TableCell>
                    <TableCell>
                      {r.status === "주행중" ? (
                        <Badge variant="secondary">고속도로 주행중</Badge>
                      ) : (
                        <Badge variant="destructive">30분 이상 정차</Badge>
                      )}
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
