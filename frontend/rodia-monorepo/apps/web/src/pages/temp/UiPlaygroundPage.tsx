import { useCallback, useEffect, useMemo, useState } from "react";

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
  DialogTrigger
} from "@/shared/ui/shadcn/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/shared/ui/shadcn/dropdown-menu";
import { Input } from "@/shared/ui/shadcn/input";
import { Label } from "@/shared/ui/shadcn/label";
import { Separator } from "@/shared/ui/shadcn/separator";
import { Skeleton } from "@/shared/ui/shadcn/skeleton";
import { Switch } from "@/shared/ui/shadcn/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/shadcn/tabs";
import { Textarea } from "@/shared/ui/shadcn/textarea";

// --- Types & Utilities (테스트 페이지 전용) ---
type RoutePath = "/" | "/ui";
type CssVarName =
  | "--background"
  | "--foreground"
  | "--card"
  | "--card-foreground"
  | "--popover"
  | "--popover-foreground"
  | "--primary"
  | "--primary-foreground"
  | "--secondary"
  | "--secondary-foreground"
  | "--muted"
  | "--muted-foreground"
  | "--accent"
  | "--accent-foreground"
  | "--destructive"
  | "--destructive-foreground"
  | "--border"
  | "--input"
  | "--ring"
  | "--radius"
  | "--rd-brand-primary-hsl"
  | "--rd-brand-primary-hex"
  | "--rd-radius-card";

type CssVarsSnapshot = Record<CssVarName, string>;

function safeTrim(input: unknown): string {
  return typeof input === "string" ? input.trim() : "";
}

function getHashPath(): string {
  if (typeof window === "undefined") return "/";
  const raw = safeTrim(window.location?.hash ?? "");
  const hash = raw.startsWith("#") ? raw.slice(1) : raw;
  const path = hash.startsWith("/") ? hash : "/";
  return path || "/";
}

function normalizeRoute(path: string): RoutePath {
  const p = safeTrim(path);
  if (p === "/ui") return "/ui";
  return "/";
}

function useHashRoute(): RoutePath {
  const [route, setRoute] = useState<RoutePath>(() => normalizeRoute(getHashPath()));

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onChange = () => setRoute(normalizeRoute(getHashPath()));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  return route;
}

function navigate(to: RoutePath) {
  if (typeof window === "undefined") return;
  window.location.hash = to;
}

function getIsDark(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

function setDark(next: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", next);
}

function readCssVars(): CssVarsSnapshot {
  const empty: CssVarsSnapshot = {
    "--background": "",
    "--foreground": "",
    "--card": "",
    "--card-foreground": "",
    "--popover": "",
    "--popover-foreground": "",
    "--primary": "",
    "--primary-foreground": "",
    "--secondary": "",
    "--secondary-foreground": "",
    "--muted": "",
    "--muted-foreground": "",
    "--accent": "",
    "--accent-foreground": "",
    "--destructive": "",
    "--destructive-foreground": "",
    "--border": "",
    "--input": "",
    "--ring": "",
    "--radius": "",
    "--rd-brand-primary-hsl": "",
    "--rd-brand-primary-hex": "",
    "--rd-radius-card": ""
  };

  if (typeof document === "undefined") return empty;

  const s = getComputedStyle(document.documentElement);
  const pick = (name: CssVarName) => safeTrim(s.getPropertyValue(name));
  return {
    "--background": pick("--background"),
    "--foreground": pick("--foreground"),
    "--card": pick("--card"),
    "--card-foreground": pick("--card-foreground"),
    "--popover": pick("--popover"),
    "--popover-foreground": pick("--popover-foreground"),
    "--primary": pick("--primary"),
    "--primary-foreground": pick("--primary-foreground"),
    "--secondary": pick("--secondary"),
    "--secondary-foreground": pick("--secondary-foreground"),
    "--muted": pick("--muted"),
    "--muted-foreground": pick("--muted-foreground"),
    "--accent": pick("--accent"),
    "--accent-foreground": pick("--accent-foreground"),
    "--destructive": pick("--destructive"),
    "--destructive-foreground": pick("--destructive-foreground"),
    "--border": pick("--border"),
    "--input": pick("--input"),
    "--ring": pick("--ring"),
    "--radius": pick("--radius"),
    "--rd-brand-primary-hsl": pick("--rd-brand-primary-hsl"),
    "--rd-brand-primary-hex": pick("--rd-brand-primary-hex"),
    "--rd-radius-card": pick("--rd-radius-card")
  };
}

// --- Internal Components ---

function VarRow({ name, value }: { name: string; value: string }) {
  return (
    <div className="grid grid-cols-2 gap-2 text-sm">
      <div className="opacity-80">{name}</div>
      <div className="font-mono break-all">{value || "(empty)"}</div>
    </div>
  );
}

function TopNav({ active }: { active: RoutePath }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant={active === "/" ? "default" : "outline"}
        onClick={() => navigate("/")}
      >
        Home
      </Button>
      <Button
        type="button"
        variant={active === "/ui" ? "default" : "outline"}
        onClick={() => navigate("/ui")}
      >
        Shadcn UI Check
      </Button>
    </div>
  );
}

function HomePage() {
  const vars = readCssVars();
  const missingCritical = useMemo(() => {
    const required: CssVarName[] = ["--background", "--foreground", "--primary", "--border"];
    return required.filter((k) => !safeTrim(vars[k]));
  }, [vars]);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="text-xl font-semibold">Rodia Web</div>
          <Badge variant="secondary">tokens + shadcn</Badge>
        </div>
        <TopNav active="/" />
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
                apps/web/src/shared/styles/index.css 에서 <span className="font-mono">@import "@rodia/tokens/dist/index.css";</span>{" "}
                가 먼저 적용되는지 확인하세요.
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <AlertTitle>Ready</AlertTitle>
            <AlertDescription className="text-sm opacity-80">
              Shadcn UI Check 페이지에서 컴포넌트/다크모드/오버레이를 한 번에 검증하세요.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Quick snapshot</CardTitle>
            <CardDescription>현재 적용 중인 주요 CSS 변수를 빠르게 확인합니다.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <VarRow name="--background" value={vars["--background"]} />
            <VarRow name="--foreground" value={vars["--foreground"]} />
            <VarRow name="--primary" value={vars["--primary"]} />
            <VarRow name="--primary-foreground" value={vars["--primary-foreground"]} />
            <VarRow name="--border" value={vars["--border"]} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ShadcnUiCheckPage() {
  const [isDark, setIsDarkState] = useState<boolean>(() => getIsDark());
  const [marketingOptIn, setMarketingOptIn] = useState<boolean>(true);

  useEffect(() => {
    setDark(isDark);
  }, [isDark]);

  const vars = readCssVars();
  const modeLabel = useMemo(() => (isDark ? "dark" : "light"), [isDark]);

  const missingForShadcn = useMemo(() => {
    const required: CssVarName[] = [
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
      "--radius"
    ];
    return required.filter((k) => !safeTrim(vars[k]));
  }, [vars]);

  const hasAlphaSupportHint = useMemo(() => {
    return "bg-primary/50 과 bg-primary 가 동일하게 보이면 tailwind.config.cjs 에 <alpha-value> 적용이 빠진 것입니다.";
  }, []);

  const logVars = useCallback(() => {
    console.log("[css-vars]", vars);
  }, [vars]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="text-xl font-semibold">Shadcn UI 전체 점검</div>
            <Badge variant="secondary">mode: {modeLabel}</Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <TopNav active="/ui" />
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
                  <DialogTitle>Dialog / Overlay 확인</DialogTitle>
                  <DialogDescription>배경/테두리/텍스트가 tokens 기반으로 자연스럽게 보이면 정상입니다.</DialogDescription>
                </DialogHeader>

                <div className="grid gap-3">
                  <div className="rounded-lg border border-border bg-background p-3">
                    <div className="text-sm font-medium">bg-background / border-border</div>
                    <div className="text-xs opacity-80">레이어 위에서도 색이 일관해야 합니다.</div>
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
                shadcn 기본 index.css 블록이 tokens import 를 덮어쓰거나, tokens 쪽에서 필요한 var(예:
                <span className="font-mono"> --primary-foreground</span>)가 생성되지 않았을 수 있습니다.
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <AlertTitle>Variables OK</AlertTitle>
            <AlertDescription className="text-sm opacity-80">{hasAlphaSupportHint}</AlertDescription>
          </Alert>
        )}

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>1) Token Var Snapshot</CardTitle>
              <CardDescription>브라우저에서 실제 적용 중인 CSS 변수를 보여줍니다.</CardDescription>
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
                <VarRow name="--rd-radius-card" value={vars["--rd-radius-card"]} />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-primary/50 p-4">
                  <div className="text-sm font-semibold">bg-primary/50</div>
                  <div className="text-xs opacity-80">opacity 유틸 확인</div>
                </div>
                <div className="rounded-lg bg-rodia-primary/50 p-4">
                  <div className="text-sm font-semibold">bg-rodia-primary/50</div>
                  <div className="text-xs opacity-80">raw helper 확인</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button">Primary (default)</Button>
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
              <CardTitle>2) Form / Input 테스트</CardTitle>
              <CardDescription>Label/Input/Textarea/Switch 가 tokens 기반으로 자연스럽게 보이면 OK.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" placeholder="you@rodia.app" />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="note">Note</Label>
                <Textarea id="note" placeholder="Tokens + shadcn + Vite 연결 테스트..." />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <div className="text-sm font-medium">Marketing Opt-in</div>
                  <div className="text-xs opacity-80">Switch on/off 시각 확인</div>
                </div>
                <Switch checked={marketingOptIn} onCheckedChange={(v) => setMarketingOptIn(!!v)} />
              </div>

              <Alert>
                <AlertTitle>Alert</AlertTitle>
                <AlertDescription>border/background/foreground가 모드 전환에 맞게 바뀌면 정상입니다.</AlertDescription>
              </Alert>
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
                  <CardTitle>Tabs UI 확인</CardTitle>
                  <CardDescription>hover/active 상태가 tokens 기반으로 자연스러우면 OK.</CardDescription>
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
                  <CardTitle>Skeleton 확인</CardTitle>
                  <CardDescription>밝기/대비가 테마 전환에 따라 자연스러우면 OK.</CardDescription>
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
                  <CardTitle>Overlay 컴포넌트 확인</CardTitle>
                  <CardDescription>Dropdown/Menu/Dialog 배경/테두리/텍스트가 일관되면 OK.</CardDescription>
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
                        <DialogDescription>여기서도 배경/글자색이 자연스러우면 정상입니다.</DialogDescription>
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

        <div className="mt-6 flex justify-end">
          <Button type="button" variant="outline" onClick={logVars}>
            Console: Log CSS vars
          </Button>
        </div>
      </div>
    </div>
  );
}

// ⭐ 메인 컴포넌트: 라우팅 로직을 내장하여 App.tsx를 깔끔하게 유지
export default function UiPlaygroundPage() {
  const route = useHashRoute();

  if (route === "/ui") return <ShadcnUiCheckPage />;
  return <HomePage />;
}