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

const tabListClass = "h-auto w-full gap-1 rounded-lg border border-border bg-muted p-1";
const tabTriggerClass =
  "flex-1 py-2 text-base data-[state=active]:bg-secondary data-[state=active]:text-foreground hover:bg-secondary/80";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function StatusBadge({ status }: { status: QuoteRow["status"] }) {
  if (status === "MATCHED") return <Badge variant="secondary">매칭</Badge>;
  if (status === "CANCELLED") return <Badge variant="destructive">취소</Badge>;
  if (status === "OPEN") return <Badge variant="default">오픈</Badge>;
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
          <CardTitle className="text-xl font-semibold">견적 목록</CardTitle>
          <p className="text-base text-foreground/70">총 {total}건</p>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border bg-muted/40">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted hover:bg-muted">
                  <TableHead className="text-base font-semibold text-foreground">견적 ID</TableHead>
                  <TableHead className="text-base font-semibold text-foreground">화주 / 화물</TableHead>
                  <TableHead className="text-base font-semibold text-foreground">운송 구간</TableHead>
                  <TableHead className="text-base font-semibold text-foreground">운임</TableHead>
                  <TableHead className="text-base font-semibold text-foreground">상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <div className="space-y-2 p-2">
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-base text-foreground/70">
                      조회된 견적이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.quoteId} className="cursor-pointer hover:bg-muted" onClick={() => openDetail(row)}>
                      <TableCell className="text-base">
                        <div className="space-y-1">
                          <div className="font-semibold">{row.quoteId}</div>
                          <div className="text-sm text-foreground/70">{row.createdAt}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-base">
                        <div className="space-y-1">
                          <div className="font-semibold">{row.shipperName}</div>
                          <div className="text-sm text-foreground/70">{row.cargoType}</div>
                          <div className="text-sm text-foreground/70">
                            {row.weightKg.toLocaleString()}kg / {row.volumeCbm}cbm
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-base">
                        <div className="space-y-1">
                          <div>{row.originAddress}</div>
                          <div>{row.destinationAddress}</div>
                          <div className="text-sm text-foreground/70">거리 {row.distanceKm.toFixed(1)}km</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-base">
                        <div className="space-y-1">
                          <div>희망 {formatCurrency(row.desiredPrice)} KRW</div>
                          <div>확정 {formatCurrency(row.finalPrice ?? 0)} KRW</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={row.status} />
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
            <DialogTitle className="text-xl font-semibold">견적 상세</DialogTitle>
          </DialogHeader>

          {selected && form ? (
            <div className="space-y-4 text-base">
              <div className="rounded-lg border border-border bg-muted p-4">
                <div className="font-semibold">{selected.quoteId}</div>
                <div className="text-foreground/80">{selected.shipperName}</div>
              </div>

              {!editing ? (
                <>
                  <div className="rounded-lg border border-border bg-background p-4">
                    <div className="font-semibold">운송 정보</div>
                    <div className="mt-1 text-foreground/80">{selected.originAddress}</div>
                    <div className="text-foreground/80">{selected.destinationAddress}</div>
                    <div className="text-foreground/80">거리: {selected.distanceKm.toFixed(1)}km</div>
                    <div className="text-foreground/80">
                      중량/부피: {selected.weightKg.toLocaleString()}kg / {selected.volumeCbm}cbm
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-background p-4">
                    <div className="font-semibold">작업 방식</div>
                    <div className="mt-1 text-foreground/80">상차: {selected.loadMethod === "SHIPPER" ? "화주" : "기사"}</div>
                    <div className="text-foreground/80">하차: {selected.unloadMethod === "SHIPPER" ? "화주" : "기사"}</div>
                    <div className="text-foreground/80">합짐: {selected.allowCombine ? "허용" : "비허용"}</div>
                    <div className="text-foreground/80">상태: {selected.status}</div>
                  </div>

                  <div className="rounded-lg border border-border bg-background p-4">
                    <div className="font-semibold">마감 및 체크리스트</div>
                    <div className="mt-1 text-foreground/80">마감시각: {selected.deadlineAt ?? "-"}</div>
                    <div className="text-foreground/80">요청사항: {selected.checklistSummary || "-"}</div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={closeDetail} className="text-base">
                      닫기
                    </Button>
                    <Button type="button" onClick={() => setEditing(true)} className="text-base">
                      수정하기
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label className="text-base">상태</Label>
                    <Tabs value={form.status} onValueChange={(v) => setForm({ ...form, status: v as QuoteUpdatePayload["status"] })}>
                      <TabsList className={tabListClass}>
                        <TabsTrigger value="DRAFT" className={tabTriggerClass}>
                          임시
                        </TabsTrigger>
                        <TabsTrigger value="OPEN" className={tabTriggerClass}>
                          오픈
                        </TabsTrigger>
                        <TabsTrigger value="MATCHED" className={tabTriggerClass}>
                          매칭
                        </TabsTrigger>
                        <TabsTrigger value="CANCELLED" className={tabTriggerClass}>
                          취소
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <FormField label="출발지">
                      <Input
                        className="border-border bg-background text-foreground focus-visible:ring-2 focus-visible:ring-primary"
                        value={form.originAddress}
                        onChange={(e) => setForm({ ...form, originAddress: e.target.value })}
                      />
                    </FormField>
                    <FormField label="도착지">
                      <Input
                        className="border-border bg-background text-foreground focus-visible:ring-2 focus-visible:ring-primary"
                        value={form.destinationAddress}
                        onChange={(e) => setForm({ ...form, destinationAddress: e.target.value })}
                      />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                    <FormField label="거리(km)">
                      <Input
                        className="border-border bg-background text-foreground focus-visible:ring-2 focus-visible:ring-primary"
                        type="number"
                        value={form.distanceKm}
                        onChange={(e) => setForm({ ...form, distanceKm: Number(e.target.value) })}
                      />
                    </FormField>
                    <FormField label="중량(kg)">
                      <Input
                        className="border-border bg-background text-foreground focus-visible:ring-2 focus-visible:ring-primary"
                        type="number"
                        value={form.weightKg}
                        onChange={(e) => setForm({ ...form, weightKg: Number(e.target.value) })}
                      />
                    </FormField>
                    <FormField label="부피(cbm)">
                      <Input
                        className="border-border bg-background text-foreground focus-visible:ring-2 focus-visible:ring-primary"
                        type="number"
                        value={form.volumeCbm}
                        onChange={(e) => setForm({ ...form, volumeCbm: Number(e.target.value) })}
                      />
                    </FormField>
                    <FormField label="화물 종류">
                      <Input
                        className="border-border bg-background text-foreground focus-visible:ring-2 focus-visible:ring-primary"
                        value={form.cargoType}
                        onChange={(e) => setForm({ ...form, cargoType: e.target.value })}
                      />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <FormField label="희망 운임">
                      <Input
                        className="border-border bg-background text-foreground focus-visible:ring-2 focus-visible:ring-primary"
                        type="number"
                        value={form.desiredPrice}
                        onChange={(e) => setForm({ ...form, desiredPrice: Number(e.target.value) })}
                      />
                    </FormField>
                    <FormField label="확정 운임">
                      <Input
                        className="border-border bg-background text-foreground focus-visible:ring-2 focus-visible:ring-primary"
                        type="number"
                        value={form.finalPrice ?? 0}
                        onChange={(e) => setForm({ ...form, finalPrice: Number(e.target.value) })}
                      />
                    </FormField>
                    <FormField label="마감시각">
                      <Input
                        className="border-border bg-background text-foreground focus-visible:ring-2 focus-visible:ring-primary"
                        type="datetime-local"
                        value={form.deadlineAt ?? ""}
                        onChange={(e) => setForm({ ...form, deadlineAt: e.target.value })}
                      />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <FormField label="상차 방식">
                      <Tabs value={form.loadMethod} onValueChange={(v) => setForm({ ...form, loadMethod: v as QuoteUpdatePayload["loadMethod"] })}>
                        <TabsList className={tabListClass}>
                          <TabsTrigger value="SHIPPER" className={tabTriggerClass}>
                            화주 상차
                          </TabsTrigger>
                          <TabsTrigger value="DRIVER" className={tabTriggerClass}>
                            기사 상차
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </FormField>
                    <FormField label="하차 방식">
                      <Tabs value={form.unloadMethod} onValueChange={(v) => setForm({ ...form, unloadMethod: v as QuoteUpdatePayload["unloadMethod"] })}>
                        <TabsList className={tabListClass}>
                          <TabsTrigger value="SHIPPER" className={tabTriggerClass}>
                            화주 하차
                          </TabsTrigger>
                          <TabsTrigger value="DRIVER" className={tabTriggerClass}>
                            기사 하차
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </FormField>
                    <div className="space-y-2 rounded-lg border border-border bg-muted p-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-base">합짐 허용</Label>
                        <Switch checked={form.allowCombine} onCheckedChange={(checked) => setForm({ ...form, allowCombine: checked })} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-base">체크리스트/요청사항</Label>
                    <Textarea
                      className="border-border bg-background text-foreground focus-visible:ring-2 focus-visible:ring-primary"
                      value={form.checklistSummary}
                      onChange={(e) => setForm({ ...form, checklistSummary: e.target.value })}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={() => setEditing(false)} disabled={updating} className="text-base">
                      취소
                    </Button>
                    <Button type="button" onClick={() => void save()} disabled={updating} className="text-base">
                      저장
                    </Button>
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

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-base">{label}</Label>
      {children}
    </div>
  );
}
