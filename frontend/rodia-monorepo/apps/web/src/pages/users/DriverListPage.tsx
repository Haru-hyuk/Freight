import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Driver, DriverFilter, DriverRating, DriverStatus, fetchDrivers } from "@/features/users/api/driverApi";
import { DriverDetailModal } from "@/features/users/ui/DriverDetailModal";
import { useMockMode } from "@/shared/lib/hooks/useMockMode";
import { Badge } from "@/shared/ui/shadcn/badge";
import { Button } from "@/shared/ui/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Input } from "@/shared/ui/shadcn/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/shadcn/table";

const RATING_ORDER: Record<DriverRating, number> = {
  [DriverRating.EXCELLENT]: 0,
  [DriverRating.GOOD]: 1,
  [DriverRating.FAIR]: 2,
  [DriverRating.POOR]: 3,
};

function DriverStatusBadge({ status }: { status: DriverStatus }) {
  if (status === DriverStatus.ACTIVE) return <Badge variant="secondary">활성</Badge>;
  if (status === DriverStatus.PENDING_APPROVAL) return <Badge variant="outline">승인 대기</Badge>;
  if (status === DriverStatus.SUSPENDED) return <Badge variant="destructive">정지</Badge>;
  return <Badge variant="outline">비활성</Badge>;
}

function DriverRatingBadge({ rating }: { rating: DriverRating }) {
  if (rating === DriverRating.EXCELLENT) return <Badge variant="secondary">최우수</Badge>;
  if (rating === DriverRating.GOOD) return <Badge variant="outline">우수</Badge>;
  if (rating === DriverRating.FAIR) return <Badge variant="outline">보통</Badge>;
  return <Badge variant="destructive">주의</Badge>;
}

export default function DriverListPage() {
  const { enabled: mockModeEnabled } = useMockMode();
  const [rows, setRows] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<DriverStatus | "ALL">("ALL");
  const [selectedRating, setSelectedRating] = useState<DriverRating | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    const loadDrivers = async () => {
      try {
        setLoading(true);
        setError(null);
        const filter: DriverFilter = {
          status: selectedStatus === "ALL" ? undefined : selectedStatus,
          rating: selectedRating === "ALL" ? undefined : selectedRating,
        };
        const response = await fetchDrivers(filter);
        setRows(response.items);
      } catch (loadError) {
        setRows([]);
        setError(loadError instanceof Error ? loadError.message : "차주 데이터를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    void loadDrivers();
  }, [selectedStatus, selectedRating, mockModeEnabled]);

  const filteredRows = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    const filtered = rows.filter((driver) => {
      if (!keyword) return true;
      return `${driver.name} ${driver.id} ${driver.phone} ${driver.vehicle.plateNumber}`.toLowerCase().includes(keyword);
    });

    return [...filtered].sort((a, b) => RATING_ORDER[a.rating] - RATING_ORDER[b.rating]);
  }, [rows, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedStatus, selectedRating]);

  return (
    <div className="min-h-screen space-y-6 bg-background text-foreground">
      <div>
        <h1 className="text-3xl font-semibold">차주 관리</h1>
        <p className="mt-1 text-sm text-foreground/70">차주 상태, 차량 정보, 운행 성과를 관리합니다.</p>
      </div>

      <Card className="rounded-lg border border-border bg-background">
        <CardHeader>
          <CardTitle className="text-base">필터</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/60" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="이름, 연락처, 차량번호 검색"
              className="border border-border bg-background pl-10 text-foreground"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <select
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value as DriverStatus | "ALL")}
              className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"
            >
              <option value="ALL">상태 전체</option>
              <option value={DriverStatus.ACTIVE}>활성</option>
              <option value={DriverStatus.PENDING_APPROVAL}>승인 대기</option>
              <option value={DriverStatus.SUSPENDED}>정지</option>
              <option value={DriverStatus.INACTIVE}>비활성</option>
            </select>

            <select
              value={selectedRating}
              onChange={(event) => setSelectedRating(event.target.value as DriverRating | "ALL")}
              className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"
            >
              <option value="ALL">등급 전체</option>
              <option value={DriverRating.EXCELLENT}>최우수</option>
              <option value={DriverRating.GOOD}>우수</option>
              <option value={DriverRating.FAIR}>보통</option>
              <option value={DriverRating.POOR}>주의</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="text-sm text-foreground/70">
        총 {filteredRows.length}명 · {page}/{totalPages} 페이지
      </div>

      <Card className="rounded-lg border border-border bg-background">
        <CardContent className="p-0">
          <div className="overflow-x-auto rounded-lg border border-border bg-background">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead>이름</TableHead>
                  <TableHead>차량</TableHead>
                  <TableHead>등급</TableHead>
                  <TableHead>월 수익</TableHead>
                  <TableHead>완료율</TableHead>
                  <TableHead>위반 건수</TableHead>
                  <TableHead>상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-foreground/70">
                      로딩 중...
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-destructive">
                      {error}
                    </TableCell>
                  </TableRow>
                ) : pagedRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-foreground/70">
                      검색 결과가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedRows.map((driver) => (
                    <TableRow key={driver.id} className="cursor-pointer" onClick={() => setSelectedDriver(driver)}>
                      <TableCell className="font-medium">{driver.name}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div>{driver.vehicle.type}</div>
                          <div className="text-xs text-foreground/70">{driver.vehicle.plateNumber}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DriverRatingBadge rating={driver.rating} />
                      </TableCell>
                      <TableCell>{Math.round(driver.stats.monthlyEarnings).toLocaleString()}원</TableCell>
                      <TableCell>{driver.stats.completionRate.toFixed(1)}%</TableCell>
                      <TableCell>{driver.violations.length}건</TableCell>
                      <TableCell>
                        <DriverStatusBadge status={driver.status} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-center gap-2">
        <Button type="button" variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
          이전
        </Button>
        <span className="text-sm text-foreground/70">
          {page}/{totalPages}
        </span>
        <Button type="button" variant="secondary" size="sm" disabled={page === totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>
          다음
        </Button>
      </div>

      {selectedDriver ? <DriverDetailModal driver={selectedDriver} onClose={() => setSelectedDriver(null)} /> : null}
    </div>
  );
}
