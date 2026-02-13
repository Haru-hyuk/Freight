// src/features/users/ui/UserActions.tsx
import { Button } from "@/shared/ui/shadcn/button";

type Props = {
  onDetail: () => void;
  onSanction: () => void;
};

export function UserActions({ onDetail, onSanction }: Props) {
  return (
    <div className="inline-flex gap-2">
      <Button type="button" variant="secondary" onClick={onDetail}>
        상세
      </Button>
      <Button type="button" variant="secondary" onClick={onSanction}>
        제재
      </Button>
    </div>
  );
}
