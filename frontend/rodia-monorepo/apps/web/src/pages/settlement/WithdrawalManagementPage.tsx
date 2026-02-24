import React, { useState } from "react";
import { Card } from "@/shared/ui/shadcn/card";
import { Badge } from "@/shared/ui/shadcn/badge";
import { Button } from "@/shared/ui/shadcn/button";
import { Input } from "@/shared/ui/shadcn/input";
import { PageWrapper } from "@/shared/ui/common/PageWrapper";
import { Wallet, Clock, CheckCircle2, AlertCircle } from "lucide-react";

type Withdrawal = {
  id: string;
  withdrawalNo: string;
  driverId: string;
  driverName: string;
  bankName: string;
  accountNumber: string;
  amount: number;
  status: "PENDING" | "APPROVED" | "PROCESSING" | "COMPLETED" | "FAILED";
  requestedAt: string;
  completedAt?: string;
};

const mockWithdrawals: Withdrawal[] = Array.from({ length: 25 }, (_, i) => ({
  id: `withdraw_${i}`,
  withdrawalNo: `WD${String(i).padStart(8, "0")}`,
  driverId: `drv_${i}`,
  driverName: `기사_${i}`,
  bankName: ["국민은행", "우리은행", "하나은행", "신한은행", "농협"][i % 5],
  accountNumber: `${String(1000000 + i).padStart(10, "0")} (${String(i % 100).padStart(2, "0")}*)`,
  amount: 500000 + Math.random() * 3000000,
  status: ["PENDING", "APPROVED", "PROCESSING", "COMPLETED", "FAILED"][(i * 3) % 5] as any,
  requestedAt: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
  completedAt:
    i % 3 === 0 ? new Date(Date.now() - (i + 1) * 86400000 + 7200000).toISOString() : undefined,
}));

export default function WithdrawalManagementPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Clock className="h-4 w-4 text-warning" />;
      case "APPROVED":
        return <CheckCircle2 className="h-4 w-4 text-info" />;
      case "PROCESSING":
        return <Clock className="h-4 w-4 text-primary" />;
      case "COMPLETED":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "FAILED":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "PENDING":
        return "승인 대기";
      case "APPROVED":
        return "승인됨";
      case "PROCESSING":
        return "처리중";
      case "COMPLETED":
        return "완료";
      case "FAILED":
        return "실패";
      default:
        return status;
    }
  };

  const statusOptions = ["PENDING", "APPROVED", "PROCESSING", "COMPLETED", "FAILED"];
  const pending = mockWithdrawals.filter((w) => w.status === "PENDING").length;
  const processing = mockWithdrawals.filter((w) => w.status === "PROCESSING").length;
  const completed = mockWithdrawals.filter((w) => w.status === "COMPLETED").length;

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">출금 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            운전자 출금 신청 및 승인 관리
          </p>
        </div>

        {/* Summary */}
        <div className="grid gap-4 lg:grid-cols-4">
          <Card className="border border-border p-4">
            <p className="text-xs text-muted-foreground">승인 대기</p>
            <p className="mt-2 text-2xl font-bold text-warning">{pending}</p>
          </Card>
          <Card className="border border-border p-4">
            <p className="text-xs text-muted-foreground">처리중</p>
            <p className="mt-2 text-2xl font-bold text-primary">{processing}</p>
          </Card>
          <Card className="border border-border p-4">
            <p className="text-xs text-muted-foreground">완료</p>
            <p className="mt-2 text-2xl font-bold text-success">{completed}</p>
          </Card>
          <Card className="border border-border p-4">
            <p className="text-xs text-muted-foreground">총 출금액</p>
            <p className="mt-2 text-xl font-bold text-foreground">
              ₩{Math.round(
                mockWithdrawals.reduce((sum, w) => sum + w.amount, 0) / 1000000
              )}M
            </p>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Input
            placeholder="기사명, 계좌번호 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <select
            value={statusFilter || ""}
            onChange={(e) => setStatusFilter(e.target.value || null)}
            className="rounded border border-border bg-background px-2 py-2 text-sm text-foreground"
          >
            <option value="">모든 상태</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {getStatusLabel(status)}
              </option>
            ))}
          </select>
        </div>

        {/* Withdrawal List */}
        <div className="space-y-3">
          {mockWithdrawals.map((withdrawal) => (
            <Card key={withdrawal.id} className="border border-border p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                    <p className="font-semibold text-foreground">{withdrawal.driverName}</p>
                    <Badge variant="secondary">{withdrawal.bankName}</Badge>
                    <Badge
                      variant={
                        withdrawal.status === "PENDING"
                          ? "warning"
                          : withdrawal.status === "COMPLETED"
                            ? "default"
                            : withdrawal.status === "FAILED"
                              ? "destructive"
                              : "secondary"
                      }
                    >
                      {getStatusLabel(withdrawal.status)}
                    </Badge>
                  </div>

                  <div className="mt-2 grid gap-2 text-xs md:grid-cols-2">
                    <div>
                      <p className="text-muted-foreground">계좌번호</p>
                      <p className="font-mono">{withdrawal.accountNumber}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">신청일</p>
                      <p>{new Date(withdrawal.requestedAt).toLocaleDateString("ko-KR")}</p>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="mb-3">
                    <p className="text-xs text-muted-foreground">출금액</p>
                    <p className="text-xl font-bold text-foreground">
                      ₩{Math.round(withdrawal.amount / 10000)}만
                    </p>
                  </div>

                  {withdrawal.status === "PENDING" && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="default">
                        승인
                      </Button>
                      <Button size="sm" variant="outline">
                        거절
                      </Button>
                    </div>
                  )}
                  {withdrawal.status !== "PENDING" && (
                    <div className="flex justify-end">
                      {getStatusIcon(withdrawal.status)}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
