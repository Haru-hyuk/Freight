import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/shadcn/dialog";
import { Button } from "@/shared/ui/shadcn/button";
import { Input } from "@/shared/ui/shadcn/input";
import { Textarea } from "@/shared/ui/shadcn/textarea";
import type { SanctionType } from "../model/types";

type Props = {
  open: boolean;
  onClose: () => void;
  sanctionType: SanctionType;
};

export function SanctionDialog({ open, onClose, sanctionType }: Props) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="rounded-lg border border-border bg-background">
        <DialogHeader>
          <DialogTitle>제재 처리</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Textarea
            placeholder="제재 사유를 입력하세요"
            className="border border-border bg-background text-foreground focus:ring-2 focus:ring-primary"
          />

          {sanctionType === "FINE" && (
            <Input
              placeholder="범칙금 금액"
              type="number"
              className="border border-border bg-background text-foreground focus:ring-2 focus:ring-primary"
            />
          )}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              취소
            </Button>
            <Button className="bg-destructive text-foreground">
              제재 확정
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
