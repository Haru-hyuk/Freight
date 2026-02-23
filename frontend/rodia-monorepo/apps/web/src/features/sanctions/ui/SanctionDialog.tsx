import * as React from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/shadcn/dialog";
import { Button } from "@/shared/ui/shadcn/button";
import { Input } from "@/shared/ui/shadcn/input";
import { Textarea } from "@/shared/ui/shadcn/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/shadcn/tabs";
import { Separator } from "@/shared/ui/shadcn/separator";
import { Badge } from "@/shared/ui/shadcn/badge";

import type { UserRole } from "@/features/users/model/types";
import type { SanctionType } from "../model/types";

type Target = {
  id: string;
  role: UserRole;
  name: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: Target;
  onSubmit?: (payload: { type: SanctionType; reason: string; amount?: number }) => void;
};

function roleLabel(role: UserRole) {
  return role === "SHIPPER" ? "화주" : "차주";
}

function typeLabel(type: SanctionType) {
  if (type === "WARNING") return "경고";
  if (type === "FINE") return "벌점";
  if (type === "SUSPEND") return "정지";
  return "운행중지";
}

export function SanctionDialog({ open, onOpenChange, target, onSubmit }: Props) {
  const [type, setType] = React.useState<SanctionType>("WARNING");
  const [reason, setReason] = React.useState("");
  const [amount, setAmount] = React.useState<string>("");

  React.useEffect(() => {
    if (!open) return;
    setType("WARNING");
    setReason("");
    setAmount("");
  }, [open]);

  const canSubmit = Boolean(reason.trim()) && (type !== "FINE" || Number(amount) > 0);

  const handleSubmit = () => {
    if (!canSubmit) return;

    onSubmit?.({
      type,
      reason: reason.trim(),
      amount: type === "FINE" ? Number(amount) : undefined,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-lg border border-border bg-background">
        <DialogHeader>
          <DialogTitle>제재 처리</DialogTitle>
        </DialogHeader>

        <Separator />

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{roleLabel(target.role)}</Badge>
              <div className="font-semibold">{target.name}</div>
              <div className="text-foreground/70">({target.id})</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-semibold">제재 유형</div>
            <Tabs value={type} onValueChange={(nextType) => setType(nextType as SanctionType)}>
              <TabsList className="w-full border border-border bg-muted">
                <TabsTrigger value="WARNING" className="flex-1">
                  {typeLabel("WARNING")}
                </TabsTrigger>
                <TabsTrigger value="FINE" className="flex-1">
                  {typeLabel("FINE")}
                </TabsTrigger>
                <TabsTrigger value="SUSPEND" className="flex-1">
                  {typeLabel("SUSPEND")}
                </TabsTrigger>
                <TabsTrigger value="DRIVE_BLOCK" className="flex-1">
                  {typeLabel("DRIVE_BLOCK")}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-semibold">사유</div>
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="제재 사유를 입력하세요"
            />
          </div>

          {type === "FINE" ? (
            <div className="space-y-2">
              <div className="text-sm font-semibold">벌점 금액</div>
              <Input
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="금액 입력"
                type="number"
              />
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
              제재 확정
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
