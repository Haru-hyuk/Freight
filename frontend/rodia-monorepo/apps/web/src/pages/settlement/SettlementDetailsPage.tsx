import React, { useState } from "react";
import { Card } from "@/shared/ui/shadcn/card";
import { Badge } from "@/shared/ui/shadcn/badge";
import { Button } from "@/shared/ui/shadcn/button";
import { Input } from "@/shared/ui/shadcn/input";
import { PageWrapper } from "@/shared/ui/common/PageWrapper";
import { ArrowDownRight, ArrowUpLeft } from "lucide-react";

type Settlement = {
  id: string;
  settlementNo: string;
  driverId: string;
  driverName: string;
  period: string;
  totalFare: number;
  commission: number;
  bonus: number;
  deduction: number;
  finalAmount: number;
  status: "PENDING" | "APPROVED" | "CANCELED";
  requestedAt: string;
  approvedAt?: string;
};

const mockSettlements: Settlement[] = Array.from({ length: 20 }, (_, i) => ({
  id: `settle_${i}`,
  settlementNo: `ST${String(i).padStart(8, "0")}`,
  driverId: `drv_${i}`,
  driverName: `기사_${i}`,
  period: `${2026}-${String((i % 12) + 1).padStart(2, "0")}`,
  totalFare: 2000000 + Math.random() * 8000000,
  commission: (2000000 + Math.random() * 8000000) * 0.15,
  bonus: Math.random() > 0.7 ? 100000 + Math.random() * 500000 : 0,
  deduction: Math.random() > 0.8 ? 50000 + Math.random() * 300000 : 0,
  finalAmount: 1200000 + Math.random() * 6000000,
  status: ["PENDING", "APPROVED", "CANCELED"][(i * 7) % 3] as any,
  requestedAt: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
  approvedAt: Math.random() > 0.5 ? new Date(Date.now() - (i + 1) * 86400000 + 3600000).toISOString() : undefined,
}));

export default function SettlementDetailsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [period, setPeriod] = useState("2026-02");

  const total = mockSettlements.reduce((sum, s) => sum + s.finalAmount, 0);
  const pending = mockSettlements.filter((s) => s.status === "PENDING").length;
  const approved = mockSettlements.filter((s) => s.status === "APPROVED").length;

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">정산 상세</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            월별 정산 내역 및 상세 분석
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border border-border p-4">
            <p className="text-xs text-muted-foreground">정산 기간</p>
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="mt-2 rounded border border-border bg-background px-2 py-1 text-sm font-semibold text-foreground"
            />
          </Card>
          <Card className="border border-border p-4">
            <p className="text-xs text-muted-foreground">총 정산액</p>
            <p className="mt-2 text-xl font-bold text-foreground">
              ₩{Math.round(total / 1000000)}M
            </p>
          </Card>
          <Card className="border border-border p-4">
            <p className="text-xs text-muted-foreground">승인 대기</p>
            <p className="mt-2 flex items-center gap-1">
              <span className="text-xl font-bold text-warning">{pending}</span>
              <span className="text-xs text-muted-foreground">건</span>
            </p>
          </Card>
          <Card className="border border-border p-4">
            <p className="text-xs text-muted-foreground">승인 완료</p>
            <p className="mt-2 flex items-center gap-1">
              <span className="text-xl font-bold text-success">{approved}</span>
              <span className="text-xs text-muted-foreground">건</span>
            </p>
          </Card>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-2">
          <Input
            placeholder="기사명, 정산번호 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Button variant="outline">필터</Button>
        </div>

        {/* Settlement List */}
        <div className="space-y-3">
          {mockSettlements.map((settlement) => (
            <Card key={settlement.id} className="border border-border p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground">{settlement.driverName}</p>
                    <Badge variant="secondary">{settlement.period}</Badge>
                    <Badge
                      variant={
                        settlement.status === "PENDING"
                          ? "warning"
                          : settlement.status === "APPROVED"
                            ? "default"
                            : "destructive"
                      }
                    >
                      {settlement.status === "PENDING"
                        ? "승인 대기"
                        : settlement.status === "APPROVED"
                          ? "승인됨"
                          : "취소됨"}
                    </Badge>
                  </div>

                  <div className="mt-3 grid gap-2 text-xs md:grid-cols-5">
                    <div className="rounded bg-muted p-2">
                      <p className="text-muted-foreground">배송요금</p>
                      <p className="mt-1 font-semibold text-foreground">
                        ₩{Math.round(settlement.totalFare / 10000)}만
                      </p>
                    </div>
                    <div className="rounded bg-muted p-2">
                      <p className="flex items-center gap-1 text-muted-foreground">
                        <ArrowUpLeft className="h-3 w-3" />
                        수수료
                      </p>
                      <p className="mt-1 font-semibold text-destructive">
                        -₩{Math.round(settlement.commission / 10000)}만
                      </p>
                    </div>
                    <div className="rounded bg-muted p-2">
                      <p className="text-muted-foreground">보너스</p>
                      <p className="mt-1 font-semibold text-success">
                        +₩{Math.round(settlement.bonus / 10000)}만
                      </p>
                    </div>
                    <div className="rounded bg-muted p-2">
                      <p className="text-muted-foreground">감액</p>
                      <p className="mt-1 font-semibold text-destructive">
                        -₩{Math.round(settlement.deduction / 10000)}만
                      </p>
                    </div>
                    <div className="rounded border border-primary/20 bg-primary/5 p-2">
                      <p className="text-muted-foreground">정산액</p>
                      <p className="mt-1 font-bold text-primary">
                        ₩{Math.round(settlement.finalAmount / 10000)}만
                      </p>
                    </div>
                  </div>
                </div>

                {settlement.status === "PENDING" && (
                  <div className="ml-4 flex gap-2">
                    <Button size="sm" variant="default">
                      승인
                    </Button>
                    <Button size="sm" variant="outline">
                      거절
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
