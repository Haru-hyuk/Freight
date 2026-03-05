import * as React from "react";

import {
  fetchAdditionalPricingRows,
  fetchVehiclePricingRows,
  sendPricingUpdatedPush,
  updateAdditionalPricing,
  updateVehiclePricing,
} from "@/features/pricing/api/pricingApi";
import type {
  AdditionalPricingRow,
  AdditionalPricingScope,
  AdditionalPricingUpdatePayload,
  VehiclePricingRow,
  VehiclePricingUpdatePayload,
} from "@/features/pricing/model/types";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/shadcn/alert";
import { Badge } from "@/shared/ui/shadcn/badge";
import { Button } from "@/shared/ui/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/shadcn/dialog";
import { Input } from "@/shared/ui/shadcn/input";
import { Label } from "@/shared/ui/shadcn/label";
import { Switch } from "@/shared/ui/shadcn/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/shadcn/table";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function toVehicleForm(row: VehiclePricingRow): VehiclePricingUpdatePayload {
  return {
    vehiclePricingId: row.vehiclePricingId,
    baseFare: row.baseFare,
    additionalFare: row.additionalFare,
    surchargeRate: row.surchargeRate,
    active: row.active,
  };
}

function toAdditionalForm(row: AdditionalPricingRow): AdditionalPricingUpdatePayload {
  return {
    additionalPricingId: row.additionalPricingId,
    additionalFare: row.additionalFare,
    rateDelta: row.rateDelta,
    active: row.active,
  };
}

function scopeLabel(scope: AdditionalPricingScope) {
  if (scope === "VEHICLE_OPTION") return "차량 옵션";
  if (scope === "TRANSPORT_OPTION") return "운송 옵션";
  if (scope === "LOAD_UNLOAD_TOOL") return "상·하차 도구";
  return "조합 규칙";
}

function formatRateDelta(rateDelta: number) {
  const percent = (rateDelta * 100).toFixed(1);
  return rateDelta > 0 ? `+${percent}%` : `${percent}%`;
}

export function PricingManagementView() {
  const [vehicleRows, setVehicleRows] = React.useState<VehiclePricingRow[]>([]);
  const [additionalRows, setAdditionalRows] = React.useState<AdditionalPricingRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const [selectedTonnage, setSelectedTonnage] = React.useState<string>("");
  const [selectedBodyType, setSelectedBodyType] = React.useState<string>("");
  const [selectedVehicleId, setSelectedVehicleId] = React.useState<string>("");
  const [vehicleForm, setVehicleForm] = React.useState<VehiclePricingUpdatePayload | null>(null);

  const [selectedAdditional, setSelectedAdditional] = React.useState<AdditionalPricingRow | null>(null);
  const [additionalForm, setAdditionalForm] = React.useState<AdditionalPricingUpdatePayload | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [vehicles, additionals] = await Promise.all([fetchVehiclePricingRows(), fetchAdditionalPricingRows()]);
      setVehicleRows(vehicles);
      setAdditionalRows(additionals);

      if (!selectedVehicleId && vehicles.length > 0) {
        const first = vehicles[0];
        setSelectedVehicleId(first.vehiclePricingId);
        setSelectedTonnage(first.tonnageLabel);
        setSelectedBodyType(first.bodyType);
        setVehicleForm(toVehicleForm(first));
      } else if (selectedVehicleId) {
        const selected = vehicles.find((row) => row.vehiclePricingId === selectedVehicleId);
        if (selected) {
          setSelectedTonnage(selected.tonnageLabel);
          setSelectedBodyType(selected.bodyType);
          setVehicleForm(toVehicleForm(selected));
        }
      }
    } finally {
      setLoading(false);
    }
  }, [selectedVehicleId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const tonnageOptions = React.useMemo(() => Array.from(new Set(vehicleRows.map((row) => row.tonnageLabel))), [vehicleRows]);

  const bodyTypeOptions = React.useMemo(
    () => Array.from(new Set(vehicleRows.filter((row) => row.tonnageLabel === selectedTonnage).map((row) => row.bodyType))),
    [vehicleRows, selectedTonnage],
  );

  const currentVehicle = React.useMemo(
    () => vehicleRows.find((row) => row.tonnageLabel === selectedTonnage && row.bodyType === selectedBodyType) ?? null,
    [vehicleRows, selectedTonnage, selectedBodyType],
  );

  React.useEffect(() => {
    if (!currentVehicle) return;
    setSelectedVehicleId(currentVehicle.vehiclePricingId);
    setVehicleForm(toVehicleForm(currentVehicle));
  }, [currentVehicle]);

  const saveVehicle = async () => {
    if (!vehicleForm) return;
    setSaving(true);
    try {
      await updateVehiclePricing(vehicleForm);
      await sendPricingUpdatedPush(vehicleForm.vehiclePricingId);
      setNotice("차량 기본 요율을 저장했습니다.");
      await load();
    } finally {
      setSaving(false);
    }
  };

  const saveAdditional = async () => {
    if (!additionalForm) return;
    setSaving(true);
    try {
      await updateAdditionalPricing(additionalForm);
      await sendPricingUpdatedPush(additionalForm.additionalPricingId);
      setNotice("추가 요인 옵션을 저장했습니다.");
      await load();
      setSelectedAdditional(null);
      setAdditionalForm(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-semibold text-foreground">요율 관리</h2>
          <p className="mt-1 text-base text-foreground/70">차량 기본 요율과 추가 요인 옵션을 운영 기준으로 조정합니다.</p>
        </div>

        {notice ? (
          <Alert className="border border-border bg-muted">
            <AlertTitle>저장 완료</AlertTitle>
            <AlertDescription>{notice}</AlertDescription>
          </Alert>
        ) : null}

        <Card className="rounded-lg border border-border bg-background">
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg text-foreground">차량 기본 요율</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="space-y-2">
                <Label>톤수</Label>
                <select
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                  value={selectedTonnage}
                  onChange={(e) => {
                    const tonnage = e.target.value;
                    setSelectedTonnage(tonnage);
                    const firstBody = vehicleRows.find((row) => row.tonnageLabel === tonnage)?.bodyType ?? "";
                    setSelectedBodyType(firstBody);
                  }}
                >
                  {tonnageOptions.map((tonnage) => (
                    <option key={tonnage} value={tonnage}>
                      {tonnage}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>차량 종류</Label>
                <select
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                  value={selectedBodyType}
                  onChange={(e) => setSelectedBodyType(e.target.value)}
                >
                  {bodyTypeOptions.map((body) => (
                    <option key={body} value={body}>
                      {body}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-lg border border-border bg-muted p-3">
                <div className="text-xs text-foreground/70">현재 기본 요율</div>
                <div className="mt-1 text-base font-semibold text-foreground">
                  {currentVehicle ? `${formatCurrency(currentVehicle.baseFare)} KRW` : "-"}
                </div>
              </div>
            </div>

            {vehicleForm && currentVehicle ? (
              <div className="space-y-4 rounded-lg border border-border bg-background p-3">
                <div className="text-sm text-foreground/70">
                  선택 조합: {currentVehicle.tonnageLabel} / {currentVehicle.bodyType}
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label>기본 요율</Label>
                    <Input
                      type="number"
                      value={vehicleForm.baseFare}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, baseFare: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>추가 요금</Label>
                    <Input
                      type="number"
                      value={vehicleForm.additionalFare}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, additionalFare: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>가변 비율 (0~1)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={vehicleForm.surchargeRate}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, surchargeRate: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-muted p-3">
                  <div className="flex items-center justify-between">
                    <Label>활성</Label>
                    <Switch
                      checked={vehicleForm.active}
                      onCheckedChange={(checked) => setVehicleForm({ ...vehicleForm, active: checked })}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="button" onClick={() => void saveVehicle()} disabled={saving || loading}>
                    저장
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="rounded-lg border border-border bg-background">
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg text-foreground">추가 요인 옵션 목록</CardTitle>
            <p className="text-sm text-foreground/70">비율 값은 소수로 입력합니다. 예: -0.07 = -7%</p>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border bg-background">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted">
                    <TableHead>구분</TableHead>
                    <TableHead>옵션</TableHead>
                    <TableHead>추가 요금</TableHead>
                    <TableHead>비율 변동</TableHead>
                    <TableHead>활성</TableHead>
                    <TableHead className="text-right">수정</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-sm text-foreground/70">
                        불러오는 중...
                      </TableCell>
                    </TableRow>
                  ) : additionalRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-sm text-foreground/70">
                        등록된 추가 요인 옵션이 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    additionalRows.map((row) => (
                      <TableRow key={row.additionalPricingId}>
                        <TableCell className="font-medium">{scopeLabel(row.scope)}</TableCell>
                        <TableCell>{row.optionName}</TableCell>
                        <TableCell>{formatCurrency(row.additionalFare)} KRW</TableCell>
                        <TableCell>{formatRateDelta(row.rateDelta)}</TableCell>
                        <TableCell>
                          {row.active ? <Badge variant="secondary">활성</Badge> : <Badge variant="outline">비활성</Badge>}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                              setSelectedAdditional(row);
                              setAdditionalForm(toAdditionalForm(row));
                            }}
                          >
                            수정
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
      </div>

      <Dialog
        open={Boolean(selectedAdditional)}
        onOpenChange={(open) => {
          if (open) return;
          setSelectedAdditional(null);
          setAdditionalForm(null);
        }}
      >
        <DialogContent className="rounded-lg border border-border bg-background">
          <DialogHeader>
            <DialogTitle>추가 요인 옵션 수정</DialogTitle>
          </DialogHeader>
          {selectedAdditional && additionalForm ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted p-3 text-sm text-foreground/70">
                {scopeLabel(selectedAdditional.scope)} / {selectedAdditional.optionName}
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <Label>추가 요금</Label>
                  <Input
                    type="number"
                    value={additionalForm.additionalFare}
                    onChange={(e) => setAdditionalForm({ ...additionalForm, additionalFare: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>비율 변동 (-1~1)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={additionalForm.rateDelta}
                    onChange={(e) => setAdditionalForm({ ...additionalForm, rateDelta: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="rounded-lg border border-border bg-muted p-3">
                <div className="flex items-center justify-between">
                  <Label>활성</Label>
                  <Switch
                    checked={additionalForm.active}
                    onCheckedChange={(checked) => setAdditionalForm({ ...additionalForm, active: checked })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setSelectedAdditional(null);
                    setAdditionalForm(null);
                  }}
                  disabled={saving}
                >
                  취소
                </Button>
                <Button type="button" onClick={() => void saveAdditional()} disabled={saving}>
                  저장
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
