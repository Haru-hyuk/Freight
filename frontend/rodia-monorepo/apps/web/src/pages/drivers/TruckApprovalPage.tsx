import React, { useState } from "react";
import { Card } from "@/shared/ui/shadcn/card";
import { Badge } from "@/shared/ui/shadcn/badge";
import { Button } from "@/shared/ui/shadcn/button";
import { Input } from "@/shared/ui/shadcn/input";
import { PageWrapper } from "@/shared/ui/common/PageWrapper";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";

type TruckApproval = {
  id: string;
  driverId: string;
  driverName: string;
  vehicleNo: string;
  vehicleType: string;
  cargoCapacity: number;
  requestedAt: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
};

const mockTruckApprovals: TruckApproval[] = Array.from({ length: 15 }, (_, i) => ({
  id: `truck_${i}`,
  driverId: `drv_${i}`,
  driverName: `기사_${i}`,
  vehicleNo: `${["서울", "경기", "인천"][i % 3]} ${String(i).padStart(2, "0")}가 ${String(1000 + i).padStart(4, "0")}`,
  vehicleType: ["탑차", "침대차", "윙바디", "냉동차"][i % 4],
  cargoCapacity: 2000 + Math.random() * 3000,
  requestedAt: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
  status: ["PENDING", "APPROVED", "REJECTED"][(i * 7) % 3] as any,
}));

export default function TruckApprovalPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [approvals, setApprovals] = useState(mockTruckApprovals);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "warning";
      case "APPROVED":
        return "default";
      case "REJECTED":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "PENDING":
        return "승인 대기";
      case "APPROVED":
        return "승인됨";
      case "REJECTED":
        return "거절됨";
      default:
        return status;
    }
  };

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">차량 승인</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            신규 차량 등록 요청 및 승인 관리
          </p>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="기사명, 차량번호 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Button variant="outline">필터</Button>
        </div>

        <div className="space-y-3">
          {mockTruckApprovals.map((approval) => (
            <Card key={approval.id} className="border border-border p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground">{approval.driverName}</p>
                    <Badge variant="secondary" className="text-xs">
                      {approval.vehicleType}
                    </Badge>
                    <Badge variant={getStatusColor(approval.status) as any}>
                      {getStatusLabel(approval.status)}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">차량번호: {approval.vehicleNo}</p>
                  <p className="text-xs text-muted-foreground">
                    적재용량: {Math.round(approval.cargoCapacity)}kg
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    신청일: {new Date(approval.requestedAt).toLocaleDateString("ko-KR")}
                  </p>
                </div>

                {approval.status === "PENDING" && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="default">
                      승인
                    </Button>
                    <Button size="sm" variant="outline">
                      거절
                    </Button>
                  </div>
                )}
                {approval.status === "APPROVED" && (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                )}
                {approval.status === "REJECTED" && (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
