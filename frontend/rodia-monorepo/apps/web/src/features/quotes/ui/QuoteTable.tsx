import * as React from "react";

import type { QuoteRow, QuoteUpdatePayload } from "@/features/quotes/model/types";
import { Badge } from "@/shared/ui/shadcn/badge";
import { Button } from "@/shared/ui/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/shadcn/dialog";
import { Input } from "@/shared/ui/shadcn/input";
import { Label } from "@/shared/ui/shadcn/label";
import { Skeleton } from "@/shared/ui/shadcn/skeleton";
import { Switch } from "@/shared/ui/shadcn/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/shadcn/table";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/shadcn/tabs";
import { Textarea } from "@/shared/ui/shadcn/textarea";

type Props = {
  rows: QuoteRow[];
  total: number;
  loading: boolean;
  onUpdate: (payload: QuoteUpdatePayload) => Promise<void>;
  updating?: boolean;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function StatusBadge({ status }: { status: QuoteRow["status"] }) {
  if (status === "MATCHED") return <Badge variant="secondary">매칭</Badge>;
  if (status === "CANCELLED") return <Badge variant="destructive">취소</Badge>;
  if (status === "OPEN") return <Badge variant="outline">오픈</Badge>;
  return <Badge variant="outline">임시</Badge>;
}

function toEditPayload(row: QuoteRow): QuoteUpdatePayload {
  return {
    quoteId: row.quoteId,
    status: row.status,
    cargoType: row.cargoType,
    desiredPrice: row.desiredPrice,
    finalPrice: row.finalPrice,
    distanceKm: row.distanceKm,
    weightKg: row.weightKg,
    volumeCbm: row.volumeCbm,
    originAddress: row.originAddress,
    destinationAddress: row.destinationAddress,
    allowCombine: row.allowCombine,
    loadMethod: row.loadMethod,
    unloadMethod: row.unloadMethod,
    deadlineAt: row.deadlineAt,
    checklistSummary: row.checklistSummary,
  };
}

export function QuoteTable({ rows, total, loading, onUpdate, updating }: Props) {
  const [selected, setSelected] = React.useState<QuoteRow | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [form, setForm] = React.useState<QuoteUpdatePayload | null>(null);

  const openDetail = (row: QuoteRow) => {
    setSelected(row);
    setForm(toEditPayload(row));
    setEditing(false);
  };

  const closeDetail = () => {
    setSelected(null);
    setForm(null);
    setEditing(false);
  };

  const save = async () => {
    if (!form) return;
    await onUpdate(form);
    closeDetail();
  };

  return (
    <>
      <Card className="rounded-lg border border-border bg-background">
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg text-foreground">견적 목록</CardTitle>
          <p className="text-sm text-foreground">총 {total}건</p>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border bg-background">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead>견적 ID</TableHead>
                  <TableHead>화주 / 화물</TableHead>
                  <TableHead>운송 구간</TableHead>
                  <TableHead>운임</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="text-right">동작</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <div className="space-y-2 p-2">
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-foreground">
                      조회된 견적이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.quoteId}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium text-foreground">{row.quoteId}</div>
                          <div className="text-xs text-foreground">{row.createdAt}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-foreground">{row.shipperName}</div>
                          <div className="text-xs text-foreground">{row.cargoType}</div>
                          <div className="text-xs text-foreground">{row.weightKg.toLocaleString()}kg / {row.volumeCbm}cbm</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm text-foreground">{row.originAddress}</div>
                          <div className="text-sm text-foreground">{row.destinationAddress}</div>
                          <div className="text-xs text-foreground">거리 {row.distanceKm.toFixed(1)}km</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm text-foreground">
                          <div>희망 {formatCurrency(row.desiredPrice)} KRW</div>
                          <div>확정 {formatCurrency(row.finalPrice ?? 0)} KRW</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={row.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button type="button" variant="secondary" onClick={() => openDetail(row)}>
                          상세
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

      <Dialog open={Boolean(selected)} onOpenChange={(open) => (open ? null : closeDetail())}>
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-lg border border-border bg-background">
          <DialogHeader>
            <DialogTitle>견적 상세</DialogTitle>
          </DialogHeader>

          {selected && form ? (
            <div className="space-y-4 text-sm text-foreground">
              <div className="rounded-lg border border-border bg-muted p-3">
                <div className="font-medium">{selected.quoteId}</div>
                <div>{selected.shipperName}</div>
              </div>

              {!editing ? (
                <>
                  <div className="rounded-lg border border-border bg-background p-3">
                    <div className="font-medium">운송 정보</div>
                    <div className="mt-1">{selected.originAddress}</div>
                    <div>{selected.destinationAddress}</div>
                    <div>거리: {selected.distanceKm.toFixed(1)}km</div>
                    <div>중량/부피: {selected.weightKg.toLocaleString()}kg / {selected.volumeCbm}cbm</div>
                  </div>

                  <div className="rounded-lg border border-border bg-background p-3">
                    <div className="font-medium">작업 방식</div>
                    <div className="mt-1">상차: {selected.loadMethod === "SHIPPER" ? "화주" : "기사"}</div>
                    <div>하차: {selected.unloadMethod === "SHIPPER" ? "화주" : "기사"}</div>
                    <div>합짐: {selected.allowCombine ? "허용" : "비허용"}</div>
                    <div>상태: {selected.status}</div>
                  </div>

                  <div className="rounded-lg border border-border bg-background p-3">
                    <div className="font-medium">마감 및 체크리스트</div>
                    <div className="mt-1">마감시각: {selected.deadlineAt ?? "-"}</div>
                    <div>요청사항: {selected.checklistSummary || "-"}</div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={closeDetail}>닫기</Button>
                    <Button type="button" onClick={() => setEditing(true)}>수정하기</Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>상태</Label>
                    <Tabs value={form.status} onValueChange={(v) => setForm({ ...form, status: v as QuoteUpdatePayload["status"] })}>
                      <TabsList className="w-full border border-border bg-muted">
                        <TabsTrigger value="DRAFT" className="flex-1">임시</TabsTrigger>
                        <TabsTrigger value="OPEN" className="flex-1">오픈</TabsTrigger>
                        <TabsTrigger value="MATCHED" className="flex-1">매칭</TabsTrigger>
                        <TabsTrigger value="CANCELLED" className="flex-1">취소</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div className="space-y-2">
                      <Label>출발지</Label>
                      <Input value={form.originAddress} onChange={(e) => setForm({ ...form, originAddress: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>도착지</Label>
                      <Input value={form.destinationAddress} onChange={(e) => setForm({ ...form, destinationAddress: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                    <div className="space-y-2">
                      <Label>거리(km)</Label>
                      <Input type="number" value={form.distanceKm} onChange={(e) => setForm({ ...form, distanceKm: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-2">
                      <Label>중량(kg)</Label>
                      <Input type="number" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-2">
                      <Label>부피(cbm)</Label>
                      <Input type="number" value={form.volumeCbm} onChange={(e) => setForm({ ...form, volumeCbm: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-2">
                      <Label>화물 종류</Label>
                      <Input value={form.cargoType} onChange={(e) => setForm({ ...form, cargoType: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div className="space-y-2">
                      <Label>희망 운임</Label>
                      <Input type="number" value={form.desiredPrice} onChange={(e) => setForm({ ...form, desiredPrice: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-2">
                      <Label>확정 운임</Label>
                      <Input type="number" value={form.finalPrice ?? 0} onChange={(e) => setForm({ ...form, finalPrice: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-2">
                      <Label>마감시각</Label>
                      <Input type="datetime-local" value={form.deadlineAt ?? ""} onChange={(e) => setForm({ ...form, deadlineAt: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div className="space-y-2">
                      <Label>상차 방식</Label>
                      <Tabs value={form.loadMethod} onValueChange={(v) => setForm({ ...form, loadMethod: v as QuoteUpdatePayload["loadMethod"] })}>
                        <TabsList className="w-full border border-border bg-muted">
                          <TabsTrigger value="SHIPPER" className="flex-1">화주 상차</TabsTrigger>
                          <TabsTrigger value="DRIVER" className="flex-1">기사 상차</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                    <div className="space-y-2">
                      <Label>하차 방식</Label>
                      <Tabs value={form.unloadMethod} onValueChange={(v) => setForm({ ...form, unloadMethod: v as QuoteUpdatePayload["unloadMethod"] })}>
                        <TabsList className="w-full border border-border bg-muted">
                          <TabsTrigger value="SHIPPER" className="flex-1">화주 하차</TabsTrigger>
                          <TabsTrigger value="DRIVER" className="flex-1">기사 하차</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                    <div className="space-y-2 rounded-lg border border-border bg-muted p-3">
                      <div className="flex items-center justify-between">
                        <Label>합짐 허용</Label>
                        <Switch checked={form.allowCombine} onCheckedChange={(checked) => setForm({ ...form, allowCombine: checked })} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>체크리스트/요청사항</Label>
                    <Textarea
                      className="border border-border bg-background text-foreground focus-visible:ring-2 focus-visible:ring-primary"
                      value={form.checklistSummary}
                      onChange={(e) => setForm({ ...form, checklistSummary: e.target.value })}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={() => setEditing(false)} disabled={updating}>취소</Button>
                    <Button type="button" onClick={() => void save()} disabled={updating}>저장</Button>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
