import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/shadcn/alert";
import { Badge } from "@/shared/ui/shadcn/badge";
import { Button } from "@/shared/ui/shadcn/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/shadcn/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/shadcn/dropdown-menu";
import { Input } from "@/shared/ui/shadcn/input";
import { Label } from "@/shared/ui/shadcn/label";
import { Separator } from "@/shared/ui/shadcn/separator";
import { Skeleton } from "@/shared/ui/shadcn/skeleton";
import { Switch } from "@/shared/ui/shadcn/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/shadcn/tabs";
import { Textarea } from "@/shared/ui/shadcn/textarea";

type RoutePath = "/" | "/ui";

const CORE_VAR_NAMES = [
  "--background",
  "--foreground",
  "--card",
  "--card-foreground",
  "--popover",
  "--popover-foreground",
  "--primary",
  "--primary-foreground",
  "--secondary",
  "--secondary-foreground",
  "--muted",
  "--muted-foreground",
  "--accent",
  "--accent-foreground",
  "--destructive",
  "--destructive-foreground",
  "--border",
  "--input",
  "--ring",
  "--radius",
  "--rd-brand-primary-hsl",
  "--rd-brand-primary-hex",
  "--rd-brand-on-primary-hsl",
  "--rd-brand-on-primary-hex",
  "--rd-radius-card",
] as const;

type CoreCssVarName = (typeof CORE_VAR_NAMES)[number];
type CoreCssVars = Record<CoreCssVarName, string>;
type CssVarItem = { name: string; value: string };
type RouteNavigate = (to: RoutePath) => void;

const SHOWCASE_RD_COLOR_VARS = [
  { label: "Brand Primary", name: "--rd-color-brand-primary" },
  { label: "Brand Secondary", name: "--rd-color-brand-secondary" },
  { label: "Brand Accent", name: "--rd-color-brand-accent" },
  { label: "Surface Alt", name: "--rd-color-bg-surface-alt" },
] as const;

function safeTrim(input: unknown): string {
  return typeof input === "string" ? input.trim() : "";
}

function normalizeRoute(path: string): RoutePath {
  const p = safeTrim(path);
  if (p === "/ui") return "/ui";
  return "/";
}

function resolveRoute(pathname: string, hash: string): RoutePath {
  const byPathname = normalizeRoute(pathname);
  if (byPathname === "/ui") return "/ui";

  const rawHash = safeTrim(hash);
  const hashPath = rawHash.startsWith("#") ? rawHash.slice(1) : rawHash;
  if (!hashPath) return "/";
  const path = hashPath.startsWith("/") ? hashPath : `/${hashPath}`;
  return normalizeRoute(path);
}

function getIsDark(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

function setDark(next: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", next);
}

function readCoreCssVars(): CoreCssVars {
  const empty = CORE_VAR_NAMES.reduce((acc, name) => {
    acc[name] = "";
    return acc;
  }, {} as CoreCssVars);

  if (typeof document === "undefined") return empty;

  const style = getComputedStyle(document.documentElement);
  return CORE_VAR_NAMES.reduce((acc, name) => {
    acc[name] = safeTrim(style.getPropertyValue(name));
    return acc;
  }, {} as CoreCssVars);
}

function readPrefixedCssVars(prefixes: string[]): CssVarItem[] {
  if (typeof document === "undefined") return [];

  const style = getComputedStyle(document.documentElement);
  const out: CssVarItem[] = [];

  for (let i = 0; i < style.length; i += 1) {
    const name = safeTrim(style.item(i));
    if (!name.startsWith("--")) continue;
    if (!prefixes.some((prefix) => name.startsWith(prefix))) continue;
    out.push({ name, value: safeTrim(style.getPropertyValue(name)) });
  }

  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

function toPreviewColor(value: string): string | null {
  const v = safeTrim(value);
  if (!v) return null;
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) return v;
  if (/^\d{1,3}\s+\d{1,3}%\s+\d{1,3}%$/.test(v)) return `hsl(${v})`;
  if (/^(rgb|rgba|hsl|hsla)\(/.test(v)) return v;
  return null;
}

function VarRow({ name, value }: { name: string; value: string }) {
  const preview = toPreviewColor(value);

  return (
    <div className="grid grid-cols-[1fr,auto] items-center gap-2 text-sm">
      <div className="opacity-80">{name}</div>
      <div className="flex items-center justify-end gap-2">
        <div className="font-mono break-all text-right">{value || "(empty)"}</div>
        {preview ? (
          <span
            className="inline-block h-4 w-4 rounded border border-border"
            style={{ backgroundColor: preview }}
            aria-label={`${name} preview`}
          />
        ) : null}
      </div>
    </div>
  );
}

function VarListCard({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: CssVarItem[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-sm opacity-70">(none)</div>
        ) : (
          <div className="max-h-[360px] space-y-2 overflow-auto pr-1">
            {items.map((item) => (
              <VarRow key={item.name} name={item.name} value={item.value} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function findCssVarValue(items: CssVarItem[], name: string): string {
  const found = items.find((item) => item.name === name);
  return found?.value ?? "";
}

function TopNav({ active, onNavigate }: { active: RoutePath; onNavigate: RouteNavigate }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant={active === "/" ? "default" : "outline"} onClick={() => onNavigate("/")}>
        Home
      </Button>
      <Button type="button" variant={active === "/ui" ? "default" : "outline"} onClick={() => onNavigate("/ui")}>
        Shadcn UI Check
      </Button>
    </div>
  );
}

function HomePage({ onNavigate }: { onNavigate: RouteNavigate }) {
  const vars = readCoreCssVars();
  const rdColorVars = readPrefixedCssVars(["--rd-color-"]);
  const rdPaletteVars = readPrefixedCssVars(["--rd-palette-"]);

  const missingCritical = useMemo(() => {
    const required: CoreCssVarName[] = ["--background", "--foreground", "--primary", "--border"];
    return required.filter((k) => !safeTrim(vars[k]));
  }, [vars]);

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="text-xl font-semibold">Rodia Web</div>
          <Badge variant="secondary">tokens + shadcn</Badge>
        </div>
        <TopNav active="/" onNavigate={onNavigate} />
      </div>

      <Separator className="my-6" />

      <div className="grid gap-6">
        {missingCritical.length > 0 ? (
          <Alert>
            <AlertTitle>CSS variables not detected</AlertTitle>
            <AlertDescription className="grid gap-2">
              <div className="text-sm">
                Missing: <span className="font-mono">{missingCritical.join(", ")}</span>
              </div>
              <div className="text-sm opacity-80">
                Check `apps/web/src/shared/styles/index.css` for `@import "@rodia/tokens/dist/index.css";`.
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <AlertTitle>Ready</AlertTitle>
            <AlertDescription className="text-sm opacity-80">
              Extended token vars are now readable from this page.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Quick Snapshot</CardTitle>
            <CardDescription>Core shadcn vars and generated Rodia helper vars</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <VarRow name="--background" value={vars["--background"]} />
            <VarRow name="--foreground" value={vars["--foreground"]} />
            <VarRow name="--primary" value={vars["--primary"]} />
            <VarRow name="--primary-foreground" value={vars["--primary-foreground"]} />
            <VarRow name="--border" value={vars["--border"]} />
            <VarRow name="--rd-brand-primary-hex" value={vars["--rd-brand-primary-hex"]} />
            <VarRow name="--rd-brand-on-primary-hex" value={vars["--rd-brand-on-primary-hex"]} />
            <VarRow name="--rd-radius-card" value={vars["--rd-radius-card"]} />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <VarListCard
            title={`Rodia Theme Colors (${rdColorVars.length})`}
            description="All vars generated from themes.*.colors => --rd-color-*"
            items={rdColorVars}
          />
          <VarListCard
            title={`Rodia Palette Colors (${rdPaletteVars.length})`}
            description="All vars generated from palette => --rd-palette-*"
            items={rdPaletteVars}
          />
        </div>
      </div>
    </div>
  );
}

function ShadcnUiCheckPage({ onNavigate }: { onNavigate: RouteNavigate }) {
  const [isDark, setIsDarkState] = useState<boolean>(() => getIsDark());
  const [marketingOptIn, setMarketingOptIn] = useState<boolean>(true);

  useEffect(() => {
    setDark(isDark);
  }, [isDark]);

  const vars = readCoreCssVars();
  const rdColorVars = readPrefixedCssVars(["--rd-color-"]);
  const rdPaletteVars = readPrefixedCssVars(["--rd-palette-"]);
  const modeLabel = useMemo(() => (isDark ? "dark" : "light"), [isDark]);
  const showcaseColors = useMemo(
    () =>
      SHOWCASE_RD_COLOR_VARS.map((item) => ({
        ...item,
        value: findCssVarValue(rdColorVars, item.name),
      })),
    [rdColorVars]
  );

  const missingForShadcn = useMemo(() => {
    const required: CoreCssVarName[] = [
      "--background",
      "--foreground",
      "--primary",
      "--primary-foreground",
      "--secondary",
      "--secondary-foreground",
      "--muted",
      "--muted-foreground",
      "--accent",
      "--accent-foreground",
      "--destructive",
      "--destructive-foreground",
      "--border",
      "--ring",
      "--radius",
    ];
    return required.filter((k) => !safeTrim(vars[k]));
  }, [vars]);

  const logVars = useCallback(() => {
    // Keep a grouped output so var count and values are visible together in devtools.
    console.log("[core-vars]", vars);
    console.log("[rd-color-vars]", rdColorVars);
    console.log("[rd-palette-vars]", rdPaletteVars);
  }, [vars, rdColorVars, rdPaletteVars]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="text-xl font-semibold">Shadcn UI Full Check</div>
            <Badge variant="secondary">mode: {modeLabel}</Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <TopNav active="/ui" onNavigate={onNavigate} />
            <Button type="button" variant="outline" onClick={() => setIsDarkState((v) => !v)}>
              Toggle .dark
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="secondary">
                  Menu
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-60">
                <DropdownMenuLabel>Quick actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logVars}>Log CSS vars</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsDarkState(false)}>Set light</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsDarkState(true)}>Set dark</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Dialog>
              <DialogTrigger asChild>
                <Button type="button">Open Dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Dialog / Overlay Check</DialogTitle>
                  <DialogDescription>
                    Verify background, border, and text colors in both light and dark mode.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-3">
                  <div className="rounded-lg border border-border bg-background p-3">
                    <div className="text-sm font-medium">bg-background / border-border</div>
                    <div className="text-xs opacity-80">These should switch with mode.</div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={logVars}>
                      Log vars
                    </Button>
                    <Button type="button" onClick={() => setIsDarkState((v) => !v)}>
                      Toggle dark
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Separator className="my-6" />

        {missingForShadcn.length > 0 ? (
          <Alert>
            <AlertTitle>Shadcn variables missing</AlertTitle>
            <AlertDescription className="grid gap-2">
              <div className="text-sm">
                Missing: <span className="font-mono">{missingForShadcn.join(", ")}</span>
              </div>
              <div className="text-sm opacity-80">
                Verify token import and shadcn base var derivation in web styles.
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <AlertTitle>Variables OK</AlertTitle>
            <AlertDescription className="text-sm opacity-80">
              Core vars are present. Extended vars loaded: `--rd-color-*`({rdColorVars.length}), `--rd-palette-*`(
              {rdPaletteVars.length}).
            </AlertDescription>
          </Alert>
        )}

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>1) Token Var Snapshot</CardTitle>
              <CardDescription>Core + helper variables currently applied in browser</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <VarRow name="--background" value={vars["--background"]} />
                <VarRow name="--foreground" value={vars["--foreground"]} />
                <VarRow name="--primary" value={vars["--primary"]} />
                <VarRow name="--primary-foreground" value={vars["--primary-foreground"]} />
                <VarRow name="--border" value={vars["--border"]} />
                <VarRow name="--radius" value={vars["--radius"]} />
                <VarRow name="--rd-brand-primary-hsl" value={vars["--rd-brand-primary-hsl"]} />
                <VarRow name="--rd-brand-on-primary-hsl" value={vars["--rd-brand-on-primary-hsl"]} />
                <VarRow name="--rd-radius-card" value={vars["--rd-radius-card"]} />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-primary/50 p-4">
                  <div className="text-sm font-semibold">bg-primary/50</div>
                  <div className="text-xs opacity-80">alpha check</div>
                </div>
                <div className="rounded-lg bg-rodia-primary/50 p-4">
                  <div className="text-sm font-semibold">bg-rodia-primary/50</div>
                  <div className="text-xs opacity-80">rd helper check</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button">Primary</Button>
                <Button type="button" variant="secondary">
                  Secondary
                </Button>
                <Button type="button" variant="outline">
                  Outline
                </Button>
                <Button type="button" variant="ghost">
                  Ghost
                </Button>
                <Button type="button" variant="destructive">
                  Destructive
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2) Form / Input Check</CardTitle>
              <CardDescription>Input, label, switch, and alert styles across both modes</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" placeholder="you@rodia.app" />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="note">Note</Label>
                <Textarea id="note" placeholder="Tokens + shadcn + Vite check" />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <div className="text-sm font-medium">Marketing Opt-in</div>
                  <div className="text-xs opacity-80">Switch on/off visual check</div>
                </div>
                <Switch checked={marketingOptIn} onCheckedChange={(v) => setMarketingOptIn(!!v)} />
              </div>

              <Alert>
                <AlertTitle>Alert</AlertTitle>
                <AlertDescription>Border/background/foreground should adapt with mode.</AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>3) Rodia Token Converted UI</CardTitle>
              <CardDescription>
                Extended `--rd-color-*` values rendered as token chips and shadcn component surfaces.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                {showcaseColors.map((item) => {
                  const preview = toPreviewColor(item.value);

                  return (
                    <div key={item.name} className="rounded-lg border border-border bg-card p-3">
                      <div className="text-xs opacity-70">{item.name}</div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="text-sm font-medium">{item.label}</div>
                        <span
                          className="inline-block h-6 w-6 rounded-md border border-border"
                          style={preview ? { backgroundColor: preview } : undefined}
                          aria-label={`${item.name} color preview`}
                        />
                      </div>
                      <div className="mt-2 break-all font-mono text-xs">{item.value || "(empty)"}</div>
                    </div>
                  );
                })}
              </div>

              <div className="grid gap-3 rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap gap-2">
                  <Button type="button">Request Quote</Button>
                  <Button type="button" variant="secondary">
                    Check Matches
                  </Button>
                  <Button type="button" variant="outline">
                    View Details
                  </Button>
                  <Button type="button" variant="ghost">
                    Later
                  </Button>
                </div>

                <div className="rounded-lg border border-border bg-secondary p-3 text-secondary-foreground">
                  <div className="text-sm font-medium">bg-secondary mapped from Rodia surface token</div>
                  <div className="text-xs opacity-80">shadcn secondary/card are driven by Rodia token mapping.</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6">
          <Tabs defaultValue="tabs" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="tabs">Tabs</TabsTrigger>
              <TabsTrigger value="loading">Skeleton</TabsTrigger>
              <TabsTrigger value="overlay">Overlay</TabsTrigger>
            </TabsList>

            <TabsContent value="tabs" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Tabs Check</CardTitle>
                  <CardDescription>Hover and active states should feel consistent with tokens.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-2">
                  <Badge>Badge</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="outline">Outline</Badge>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="loading" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Skeleton Check</CardTitle>
                  <CardDescription>Skeleton surface and contrast should remain readable in dark mode.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="grid gap-2">
                      <Skeleton className="h-4 w-56" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                  </div>
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="overlay" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Overlay Components Check</CardTitle>
                  <CardDescription>Dropdown and dialog surface tokens should switch correctly.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="outline">
                        Open Dropdown
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={logVars}>Log vars</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setIsDarkState((v) => !v)}>Toggle dark</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button type="button" variant="secondary">
                        Open Dialog
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Second Dialog</DialogTitle>
                        <DialogDescription>Check tokens here as well.</DialogDescription>
                      </DialogHeader>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={logVars}>
                          Log vars
                        </Button>
                        <Button type="button" onClick={() => setIsDarkState((v) => !v)}>
                          Toggle dark
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <VarListCard
            title={`Rodia Theme Colors (${rdColorVars.length})`}
            description="All generated --rd-color-* vars"
            items={rdColorVars}
          />
          <VarListCard
            title={`Rodia Palette Colors (${rdPaletteVars.length})`}
            description="All generated --rd-palette-* vars"
            items={rdPaletteVars}
          />
        </div>

        <div className="mt-6 flex justify-end">
          <Button type="button" variant="outline" onClick={logVars}>
            Console: Log CSS vars
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function UiPlaygroundPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const route = useMemo(() => resolveRoute(location.pathname, location.hash), [location.pathname, location.hash]);
  const onNavigate = useCallback<RouteNavigate>(
    (to) => {
      navigate(to);
    },
    [navigate]
  );

  if (route === "/ui") return <ShadcnUiCheckPage onNavigate={onNavigate} />;
  return <HomePage onNavigate={onNavigate} />;
}
