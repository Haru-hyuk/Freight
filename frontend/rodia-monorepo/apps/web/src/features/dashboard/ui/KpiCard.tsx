import { Badge } from "@/shared/ui/shadcn/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Skeleton } from "@/shared/ui/shadcn/skeleton";

type KpiMeta = {
  label: string;
  source: string;
};

type Tone = "primary" | "accent" | "secondary" | "muted";

type Props = {
  loading: boolean;
  title: string;
  value: string;
  meta?: KpiMeta;
  tone?: Tone;
};

const tonePanelClass: Record<Tone, string> = {
  primary: "bg-gradient-to-br from-primary/20 to-background",
  accent: "bg-gradient-to-br from-accent/25 to-background",
  secondary: "bg-gradient-to-br from-secondary to-background",
  muted: "bg-gradient-to-br from-muted to-background",
};

const toneOrbClass: Record<Tone, string> = {
  primary: "bg-primary/20",
  accent: "bg-accent/25",
  secondary: "bg-secondary/90",
  muted: "bg-muted",
};

export function KpiCard({ loading, title, value, meta, tone = "muted" }: Props) {
  const showSource = import.meta.env.DEV && localStorage.getItem("rodia_debug") === "1";

  return (
    <Card className={`relative overflow-hidden border-border/70 ${tonePanelClass[tone]}`}>
      <span className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full ${toneOrbClass[tone]}`} />

      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-foreground/70">{title}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-2">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-9 w-2/3" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : (
          <>
            <div className="text-3xl font-semibold tracking-tight">{value}</div>
            {meta?.label ? <p className="text-sm text-foreground/70">{meta.label}</p> : null}
            {showSource && meta?.source ? (
              <div className="pt-1">
                <Badge variant="outline">SOURCE: {meta.source}</Badge>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
