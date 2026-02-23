import React, { useState, useEffect, useCallback } from "react";
import { Card } from "@/shared/ui/shadcn/card";
import { Badge } from "@/shared/ui/shadcn/badge";
import { Button } from "@/shared/ui/shadcn/button";
import { Input } from "@/shared/ui/shadcn/input";
import { PageWrapper } from "@/shared/ui/common/PageWrapper";
import { Skeleton } from "@/shared/ui/shadcn/skeleton";
import { AlertTriangle, AlertCircle, CheckCircle2, Clock, Loader } from "lucide-react";
import {
  fetchDeviations,
  executeDeviationAction,
  DeviationType,
  DeviationSeverity,
  DeviationStatus,
  type Deviation,
  type DeviationFilter,
} from "@/features/ops/api/deviationApi";

const deviationTypes = {
  [DeviationType.LATE_DELIVERY]: "배송 지연",
  [DeviationType.ROUTE_DEVIATION]: "경로 이탈",
  [DeviationType.VEHICLE_CONDITION]: "차량 상태",
  [DeviationType.SAFETY_VIOLATION]: "안전 위반",
  [DeviationType.CUSTOMER_COMPLAINT]: "고객 민원",
};

export default function DeviationManagementPage() {
  const [loading, setLoading] = useState(true);
  const [deviations, setDeviations] = useState<Deviation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState<DeviationSeverity | null>(null);
  const [typeFilter, setTypeFilter] = useState<DeviationType | null>(null);
  const [statusFilter, setStatusFilter] = useState<DeviationStatus | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);

  // 데이터 페칭
  const loadDeviations = useCallback(async () => {
    setLoading(true);
    try {
      const filter: DeviationFilter = {
        search: searchTerm || undefined,
        severity: severityFilter || undefined,
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        page,
        size: 20,
      };

      const response = await fetchDeviations(filter);
      setDeviations(response.items);
      setTotal(response.total);
    } catch (error) {
      console.error("이상징후 로드 실패:", error);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, severityFilter, typeFilter, statusFilter]);

  useEffect(() => {
    loadDeviations();
  }, [loadDeviations]);

  // 액션 처리
  const handleAction = useCallback(
    async (deviationId: string, action: "START_INVESTIGATION" | "RESOLVE" | "DISMISS") => {
      setActioningId(deviationId);
      try {
        const success = await executeDeviationAction({
          caseId: deviationId,
          action,
        });

        if (success) {
          // 데이터 새로고침
          await loadDeviations();
        }
      } catch (error) {
        console.error("액션 실행 실패:", error);
      } finally {
        setActioningId(null);
      }
    },
    [loadDeviations]
  );

  const getSeverityIcon = (severity: DeviationSeverity) => {
    switch (severity) {
      case DeviationSeverity.CRITICAL:
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case DeviationSeverity.SEVERE:
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case DeviationSeverity.MODERATE:
        return <AlertCircle className="h-4 w-4 text-warning" />;
      case DeviationSeverity.MINOR:
        return <AlertCircle className="h-4 w-4 text-info" />;
    }
  };

  const getSeverityLabel = (severity: DeviationSeverity) => {
    switch (severity) {
      case DeviationSeverity.CRITICAL:
        return "극도";
      case DeviationSeverity.SEVERE:
        return "심각";
      case DeviationSeverity.MODERATE:
        return "중간";
      case DeviationSeverity.MINOR:
        return "경미";
    }
  };

  const getSeverityColor = (severity: DeviationSeverity) => {
    switch (severity) {
      case DeviationSeverity.CRITICAL:
      case DeviationSeverity.SEVERE:
        return "destructive";
      case DeviationSeverity.MODERATE:
        return "warning";
      case DeviationSeverity.MINOR:
        return "secondary";
    }
  };

  const getStatusLabel = (status: DeviationStatus) => {
    switch (status) {
      case DeviationStatus.OPEN:
        return "미접수";
      case DeviationStatus.INVESTIGATING:
        return "조사중";
      case DeviationStatus.RESOLVED:
        return "해결됨";
      case DeviationStatus.DISMISSED:
        return "기각됨";
    }
  };

  const critical = deviations.filter(
    (d) => d.severity === DeviationSeverity.CRITICAL || d.severity === DeviationSeverity.SEVERE
  ).length;
  const open = deviations.filter((d) => d.status === DeviationStatus.OPEN).length;
  const investigating = deviations.filter((d) => d.status === DeviationStatus.INVESTIGATING).length;

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">이상 징후</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            배송 중 발생한 이상 징후 및 민원 관리 ({total}건)
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 lg:grid-cols-4">
          <Card className="border border-border p-4">
            <p className="text-xs text-muted-foreground">심각</p>
            <p className="mt-2 text-2xl font-bold text-destructive">{critical}</p>
          </Card>
          <Card className="border border-border p-4">
            <p className="text-xs text-muted-foreground">미접수</p>
            <p className="mt-2 text-2xl font-bold text-warning">{open}</p>
          </Card>
          <Card className="border border-border p-4">
            <p className="text-xs text-muted-foreground">조사중</p>
            <p className="mt-2 text-2xl font-bold text-primary">{investigating}</p>
          </Card>
          <Card className="border border-border p-4">
            <p className="text-xs text-muted-foreground">총 건수</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{total}</p>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="기사명, 주문번호, 사건번호 검색..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="flex-1"
          />
          <select
            value={severityFilter || ""}
            onChange={(e) => {
              setSeverityFilter((e.target.value as DeviationSeverity) || null);
              setPage(1);
            }}
            className="rounded border border-border bg-background px-2 py-2 text-sm text-foreground"
          >
            <option value="">모든 심각도</option>
            <option value={DeviationSeverity.CRITICAL}>극도</option>
            <option value={DeviationSeverity.SEVERE}>심각</option>
            <option value={DeviationSeverity.MODERATE}>중간</option>
            <option value={DeviationSeverity.MINOR}>경미</option>
          </select>
          <select
            value={typeFilter || ""}
            onChange={(e) => {
              setTypeFilter((e.target.value as DeviationType) || null);
              setPage(1);
            }}
            className="rounded border border-border bg-background px-2 py-2 text-sm text-foreground"
          >
            <option value="">모든 유형</option>
            <option value={DeviationType.LATE_DELIVERY}>배송 지연</option>
            <option value={DeviationType.ROUTE_DEVIATION}>경로 이탈</option>
            <option value={DeviationType.VEHICLE_CONDITION}>차량 상태</option>
            <option value={DeviationType.SAFETY_VIOLATION}>안전 위반</option>
            <option value={DeviationType.CUSTOMER_COMPLAINT}>고객 민원</option>
          </select>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-lg" />
            ))}
          </div>
        )}

        {/* Deviations List */}
        {!loading && deviations.length > 0 && (
          <div className="space-y-3">
            {deviations.map((deviation) => (
              <Card key={deviation.id} className="border border-border p-4">
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      {getSeverityIcon(deviation.severity)}
                      <div>
                        <p className="font-semibold text-foreground">{deviation.caseNo}</p>
                        <p className="mt-1 text-sm text-foreground">{deviation.driverName}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge
                        variant={getSeverityColor(deviation.severity) as any}
                        className="capitalize"
                      >
                        {getSeverityLabel(deviation.severity)}
                      </Badge>
                      <Badge
                        variant={
                          deviation.status === DeviationStatus.OPEN
                            ? "warning"
                            : deviation.status === DeviationStatus.INVESTIGATING
                              ? "secondary"
                              : "default"
                        }
                      >
                        {getStatusLabel(deviation.status)}
                      </Badge>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="grid gap-2 text-sm md:grid-cols-3">
                    <div>
                      <p className="text-muted-foreground">유형</p>
                      <p className="font-medium text-foreground">{deviationTypes[deviation.type]}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">주문번호</p>
                      <p className="font-medium text-foreground">{deviation.orderId}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">탐지일시</p>
                      <p className="font-medium text-foreground">
                        {new Date(deviation.detectedAt).toLocaleDateString("ko-KR")}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="rounded-lg bg-muted p-2">
                    <p className="text-xs text-muted-foreground">설명</p>
                    <p className="mt-1 text-sm text-foreground">{deviation.description}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-between">
                    <div className="flex gap-1 text-xs">
                      {deviation.evidence && <Badge variant="outline">📸 증거자료</Badge>}
                    </div>
                    <div className="flex gap-2">
                      {deviation.status === DeviationStatus.OPEN && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleAction(deviation.id, "START_INVESTIGATION")}
                            disabled={actioningId === deviation.id}
                          >
                            {actioningId === deviation.id ? (
                              <Loader className="h-3 w-3 animate-spin mr-1" />
                            ) : null}
                            조사 시작
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAction(deviation.id, "DISMISS")}
                            disabled={actioningId === deviation.id}
                          >
                            기각
                          </Button>
                        </>
                      )}
                      {deviation.status === DeviationStatus.INVESTIGATING && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleAction(deviation.id, "RESOLVE")}
                            disabled={actioningId === deviation.id}
                          >
                            {actioningId === deviation.id ? (
                              <Loader className="h-3 w-3 animate-spin mr-1" />
                            ) : null}
                            해결
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAction(deviation.id, "DISMISS")}
                            disabled={actioningId === deviation.id}
                          >
                            기각
                          </Button>
                        </>
                      )}
                      {(deviation.status === DeviationStatus.RESOLVED ||
                        deviation.status === DeviationStatus.DISMISSED) && (
                        <Button size="sm" variant="ghost">
                          상세정보
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && deviations.length === 0 && (
          <div className="rounded-lg border border-border bg-muted p-12 text-center">
            <AlertCircle className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">검색 결과가 없습니다.</p>
          </div>
        )}

        {/* Pagination */}
        {!loading && total > 20 && (
          <div className="flex items-center justify-between pt-4">
            <p className="text-sm text-muted-foreground">
              {(page - 1) * 20 + 1} - {Math.min(page * 20, total)} / {total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                이전
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page * 20 >= total}
              >
                다음
              </Button>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
