import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";

import { fetchShippers, Shipper, ShipperFilter, ShipperGrade, ShipperStatus } from "@/features/users/api/shipperApi";
import { ShipperDetailModal } from "@/features/users/ui/ShipperDetailModal";
import { useMockMode } from "@/shared/lib/hooks/useMockMode";
import { Badge } from "@/shared/ui/shadcn/badge";
import { Button } from "@/shared/ui/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Input } from "@/shared/ui/shadcn/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/shadcn/table";

const GRADE_ORDER: Record<ShipperGrade, number> = {
  [ShipperGrade.PLATINUM]: 0,
  [ShipperGrade.GOLD]: 1,
  [ShipperGrade.SILVER]: 2,
  [ShipperGrade.BRONZE]: 3,
};

function ShipperStatusBadge({ status }: { status: ShipperStatus }) {
  if (status === ShipperStatus.ACTIVE) return <Badge variant="secondary">활성</Badge>;
  if (status === ShipperStatus.SUSPENDED) return <Badge variant="destructive">정지</Badge>;
  return <Badge variant="outline">비활성</Badge>;
}

function GradeBadge({ grade }: { grade: ShipperGrade }) {
  return <Badge variant="outline">{grade}</Badge>;
}

function CreditBadge({ score }: { score: number }) {
  if (score >= 85) return <Badge variant="secondary">{score}점</Badge>;
  if (score >= 70) return <Badge variant="outline">{score}점</Badge>;
  return <Badge variant="destructive">{score}점</Badge>;
}

export default function ShipperListPage() {
  const { enabled: mockModeEnabled } = useMockMode();
  const [rows, setRows] = useState<Shipper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedShipper, setSelectedShipper] = useState<Shipper | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<ShipperStatus | "ALL">("ALL");
  const [selectedGrade, setSelectedGrade] = useState<ShipperGrade | "ALL">("ALL");
  const [selectedType, setSelectedType] = useState<"ALL" | "INDIVIDUAL" | "COMPANY">("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    const loadShippers = async () => {
      try {
        setLoading(true);
        setError(null);
        const filter: ShipperFilter = {
          status: selectedStatus === "ALL" ? undefined : selectedStatus,
          grade: selectedGrade === "ALL" ? undefined : selectedGrade,
          type: selectedType === "ALL" ? undefined : selectedType,
        };
        const response = await fetchShippers(filter);
        setRows(response.items);
      } catch (loadError) {
        setRows([]);
        setError(loadError instanceof Error ? loadError.message : "화주 데이터를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    void loadShippers();
  }, [selectedStatus, selectedGrade, selectedType, mockModeEnabled]);

  const filteredRows = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    const filtered = rows.filter((shipper) => {
      if (!keyword) return true;
      return `${shipper.name} ${shipper.id} ${shipper.phone}`.toLowerCase().includes(keyword);
    });

    return [...filtered].sort((a, b) => GRADE_ORDER[a.grade] - GRADE_ORDER[b.grade]);
  }, [rows, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedStatus, selectedGrade, selectedType]);

  return (
    <div className="min-h-screen space-y-6 bg-background text-foreground">
      <div>
        <h1 className="text-3xl font-semibold">화주 관리</h1>
        <p className="mt-1 text-sm text-foreground/70">화주 계정, 거래 상태, 정산 리스크를 관리합니다.</p>
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
              placeholder="이름, 연락처, ID 검색"
              className="border border-border bg-background pl-10 text-foreground"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <select
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value as ShipperStatus | "ALL")}
              className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"
            >
              <option value="ALL">상태 전체</option>
              <option value={ShipperStatus.ACTIVE}>활성</option>
              <option value={ShipperStatus.SUSPENDED}>정지</option>
              <option value={ShipperStatus.INACTIVE}>비활성</option>
            </select>

            <select
              value={selectedGrade}
              onChange={(event) => setSelectedGrade(event.target.value as ShipperGrade | "ALL")}
              className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"
            >
              <option value="ALL">등급 전체</option>
              <option value={ShipperGrade.PLATINUM}>PLATINUM</option>
              <option value={ShipperGrade.GOLD}>GOLD</option>
              <option value={ShipperGrade.SILVER}>SILVER</option>
              <option value={ShipperGrade.BRONZE}>BRONZE</option>
            </select>

            <select
              value={selectedType}
              onChange={(event) => setSelectedType(event.target.value as "ALL" | "INDIVIDUAL" | "COMPANY")}
              className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"
            >
              <option value="ALL">유형 전체</option>
              <option value="INDIVIDUAL">개인</option>
              <option value="COMPANY">법인</option>
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
                  <TableHead>유형</TableHead>
                  <TableHead>등급</TableHead>
                  <TableHead>신용 점수</TableHead>
                  <TableHead>총 거래액</TableHead>
                  <TableHead>평점</TableHead>
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
                  pagedRows.map((shipper) => (
                    <TableRow key={shipper.id} className="cursor-pointer" onClick={() => setSelectedShipper(shipper)}>
                      <TableCell className="font-medium">{shipper.name}</TableCell>
                      <TableCell>{shipper.type === "INDIVIDUAL" ? "개인" : "법인"}</TableCell>
                      <TableCell>
                        <GradeBadge grade={shipper.grade} />
                      </TableCell>
                      <TableCell>
                        <CreditBadge score={shipper.creditScore} />
                      </TableCell>
                      <TableCell>{Math.round(shipper.stats.totalSpent).toLocaleString()}원</TableCell>
                      <TableCell>{shipper.stats.averageRating.toFixed(1)}</TableCell>
                      <TableCell>
                        <ShipperStatusBadge status={shipper.status} />
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

      {selectedShipper ? <ShipperDetailModal shipper={selectedShipper} onClose={() => setSelectedShipper(null)} /> : null}
    </div>
  );
}
