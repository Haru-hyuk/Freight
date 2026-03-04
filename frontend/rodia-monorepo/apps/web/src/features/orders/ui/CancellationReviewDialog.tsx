import * as React from "react";

import type { CancellationReviewAction, CancellationRequestRow } from "@/features/orders/model/types";
import { Button } from "@/shared/ui/shadcn/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/shadcn/dialog";
import { Label } from "@/shared/ui/shadcn/label";
import { Separator } from "@/shared/ui/shadcn/separator";
import { Textarea } from "@/shared/ui/shadcn/textarea";

type Props = {
  row: CancellationRequestRow | null;
  open: boolean;
  submitting: boolean;
  onOpenChange: (open: boolean) => void;
  onReview: (payload: { requestId: string; action: CancellationReviewAction; reviewMemo?: string }) => Promise<void>;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-foreground">{label}</span>
      <span className="text-foreground opacity-80">{value}</span>
    </div>
  );
}

function roleLabel(role: CancellationRequestRow["requestedByRole"]): string {
  if (role === "SHIPPER") return "화주";
  if (role === "DRIVER") return "기사";
  return "확인 필요";
}

export function CancellationReviewDialog({ row, open, submitting, onOpenChange, onReview }: Props) {
  const [memo, setMemo] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setMemo("");
      setError(null);
    }
  }, [open]);

  const handleSubmit = async (action: CancellationReviewAction) => {
    if (!row) return;
    const trimmed = memo.trim();
    if (action === "REJECT" && trimmed.length < 5) {
      setError("반려 시 검토 메모를 5자 이상 입력해 주세요.");
      return;
    }
    setError(null);
    await onReview({
      requestId: row.requestId,
      action,
      reviewMemo: trimmed.length > 0 ? trimmed : undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-lg border border-border bg-background">
        <DialogHeader>
          <DialogTitle>{"취소 요청 검토"}</DialogTitle>
          <DialogDescription>
            {
              "매칭이 걸린 주문 취소 요청입니다. 요청 정보와 사유를 확인한 뒤 승인 또는 반려해 주세요."
            }
          </DialogDescription>
        </DialogHeader>

        {row ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted p-4">
              <div className="space-y-2">
                <DetailRow label="요청 ID" value={row.requestId} />
                <Separator />
                <DetailRow label="견적/매칭" value={`${row.quoteId} / ${row.matchId}`} />
                <Separator />
                <DetailRow label="요청자" value={`${roleLabel(row.requestedByRole)} / ${row.requestedByName}`} />
                <Separator />
                <DetailRow label="화주/기사" value={`${row.shipperName} / ${row.driverName}`} />
                <Separator />
                <DetailRow label="화물" value={row.cargoName} />
                <Separator />
                <DetailRow label="운송구간" value={`${row.originAddress} → ${row.destinationAddress}`} />
              </div>
              <div className="mt-4 rounded-lg border border-border bg-background p-3 text-sm text-foreground">
                <div className="mb-1 font-semibold">{"취소 사유"}</div>
                <div>{row.cancelReason}</div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cancellation-review-memo" className="text-sm font-semibold text-foreground">
                {"검토 메모"}
              </Label>
              <Textarea
                id="cancellation-review-memo"
                value={memo}
                onChange={(event) => setMemo(event.target.value)}
                placeholder="검토 근거를 입력하세요."
                className="border border-border bg-background text-foreground focus-visible:ring-2 focus-visible:ring-primary"
              />
              {error ? <p className="text-sm text-foreground">{error}</p> : null}
            </div>
          </div>
        ) : null}

        <DialogFooter className="gap-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={submitting}>
            {"닫기"}
          </Button>
          <Button type="button" onClick={() => void handleSubmit("APPROVE")} disabled={submitting || !row}>
            {"승인"}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void handleSubmit("REJECT")}
            disabled={submitting || !row}
          >
            {"반려"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

