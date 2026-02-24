import * as React from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/shadcn/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Button } from "@/shared/ui/shadcn/button";
import { Badge } from "@/shared/ui/shadcn/badge";
import { Skeleton } from "@/shared/ui/shadcn/skeleton";
import type { TruckApprovalRow } from "@/features/trucks/model/types";

type Props = {
  rows: TruckApprovalRow[];
  loading: boolean;
  onOpenReview: (row: TruckApprovalRow) => void;
};

export function TruckApprovalTable({ rows, loading, onOpenReview }: Props) {
  return (
    <Card className="rounded-lg border border-border bg-background">
      <CardHeader>
        <CardTitle className="text-lg">차량 승인 목록</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border bg-background">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted">
                <TableHead>신청일시</TableHead>
                <TableHead>기사</TableHead>
                <TableHead>차량번호</TableHead>
                <TableHead>차종 / 용량</TableHead>
                <TableHead>보험상태</TableHead>
                <TableHead>승인상태</TableHead>
                <TableHead className="text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <div className="space-y-2 p-2">
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-foreground">
                    차량 승인 요청이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.truckId}>
                    <TableCell>{row.requestedAt}</TableCell>
                    <TableCell className="font-medium">{row.driverName}</TableCell>
                    <TableCell>{row.plateNumber}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{row.vehicleType}</div>
                        <div className="text-xs text-muted-foreground">{row.capacity}kg</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {row.insuranceStatus === "VERIFIED" ? (
                        <Badge variant="secondary">인증완료</Badge>
                      ) : (
                        <Badge variant="destructive">미인증</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.approvalStatus === "PENDING" ? (
                        <Badge variant="outline">대기</Badge>
                      ) : row.approvalStatus === "APPROVED" ? (
                        <Badge variant="secondary">승인</Badge>
                      ) : (
                        <Badge variant="destructive">거부</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenReview(row)}
                      >
                        상세보기
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
