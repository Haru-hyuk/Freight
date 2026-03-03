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
  if (role === "SHIPPER") return "\uD654\uC8FC";
  if (role === "DRIVER") return "\uAE30\uC0AC";
  return "\uD655\uC778 \uD544\uC694";
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
      setError("\uBC18\uB824 \uC2DC \uAC80\uD1A0 \uBA54\uBAA8\uB97C 5\uC790 \uC774\uC0C1 \uC785\uB825\uD574 \uC8FC\uC138\uC694.");
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
          <DialogTitle>{"\uCDE8\uC18C \uC694\uCCAD \uAC80\uD1A0"}</DialogTitle>
          <DialogDescription>
            {
              "\uB9E4\uCE6D\uC774 \uAC78\uB9B0 \uC8FC\uBB38 \uCDE8\uC18C \uC694\uCCAD\uC785\uB2C8\uB2E4. \uC694\uCCAD \uC815\uBCF4\uC640 \uC0AC\uC720\uB97C \uD655\uC778\uD55C \uB4A4 \uC2B9\uC778 \uB610\uB294 \uBC18\uB824\uD574 \uC8FC\uC138\uC694."
            }
          </DialogDescription>
        </DialogHeader>

        {row ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted p-4">
              <div className="space-y-2">
                <DetailRow label="\uC694\uCCAD ID" value={row.requestId} />
                <Separator />
                <DetailRow label="\uACAC\uC801/\uB9E4\uCE6D" value={`${row.quoteId} / ${row.matchId}`} />
                <Separator />
                <DetailRow label="\uC694\uCCAD\uC790" value={`${roleLabel(row.requestedByRole)} / ${row.requestedByName}`} />
                <Separator />
                <DetailRow label="\uD654\uC8FC/\uAE30\uC0AC" value={`${row.shipperName} / ${row.driverName}`} />
                <Separator />
                <DetailRow label="\uD654\uBB3C" value={row.cargoName} />
                <Separator />
                <DetailRow label="\uC6B4\uC1A1\uAD6C\uAC04" value={`${row.originAddress} \u2192 ${row.destinationAddress}`} />
              </div>
              <div className="mt-4 rounded-lg border border-border bg-background p-3 text-sm text-foreground">
                <div className="mb-1 font-semibold">{"\uCDE8\uC18C \uC0AC\uC720"}</div>
                <div>{row.cancelReason}</div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cancellation-review-memo" className="text-sm font-semibold text-foreground">
                {"\uAC80\uD1A0 \uBA54\uBAA8"}
              </Label>
              <Textarea
                id="cancellation-review-memo"
                value={memo}
                onChange={(event) => setMemo(event.target.value)}
                placeholder="\uAC80\uD1A0 \uADFC\uAC70\uB97C \uC785\uB825\uD558\uC138\uC694."
                className="border border-border bg-background text-foreground focus-visible:ring-2 focus-visible:ring-primary"
              />
              {error ? <p className="text-sm text-foreground">{error}</p> : null}
            </div>
          </div>
        ) : null}

        <DialogFooter className="gap-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={submitting}>
            {"\uB2EB\uAE30"}
          </Button>
          <Button type="button" onClick={() => void handleSubmit("APPROVE")} disabled={submitting || !row}>
            {"\uC2B9\uC778"}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void handleSubmit("REJECT")}
            disabled={submitting || !row}
          >
            {"\uBC18\uB824"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
