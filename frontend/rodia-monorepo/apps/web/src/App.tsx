// apps/web/src/App.tsx
import { useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription as DialogDesc,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator as DropdownSep,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type CssVarsSnapshot = {
  background: string;
  foreground: string;
  primary: string;
  primaryForeground: string;
  border: string;
  radius: string;
};

function getIsDark(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

function setDark(next: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", next);
}

function readCssVars(): CssVarsSnapshot {
  if (typeof document === "undefined") {
    return {
      background: "",
      foreground: "",
      primary: "",
      primaryForeground: "",
      border: "",
      radius: ""
    };
  }

  const s = getComputedStyle(document.documentElement);
  const pick = (name: string) => s.getPropertyValue(name).trim();

  return {
    background: pick("--background"),
    foreground: pick("--foreground"),
    primary: pick("--primary"),
    primaryForeground: pick("--primary-foreground"),
    border: pick("--border"),
    radius: pick("--radius")
  };
}

export default function App() {
  const [isDark, setIsDarkState] = useState<boolean>(() => getIsDark());
  const [marketingOptIn, setMarketingOptIn] = useState<boolean>(true);

  const vars = readCssVars();

  useEffect(() => {
    setDark(isDark);
  }, [isDark]);

  const modeLabel = useMemo(() => (isDark ? "dark" : "light"), [isDark]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="text-xl font-semibold">Rodia Tokens → shadcn(Web) 컴포넌트 갤러리</div>
            <Badge variant="secondary">mode: {modeLabel}</Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setIsDarkState((v) => !v)}>
              Toggle .dark
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary">Menu</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>Quick actions</DropdownMenuLabel>
                <DropdownSep />
                <DropdownMenuItem
                  onClick={() => {
                    console.log("[css-vars]", readCssVars());
                  }}
                >
                  Log CSS vars
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsDarkState(false)}>Set light</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsDarkState(true)}>Set dark</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Dialog>
              <DialogTrigger asChild>
                <Button>Open Dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Dialog / Overlay 확인</DialogTitle>
                  <DialogDesc>
                    배경/테두리/텍스트가 tokens 기반 변수로 렌더링되는지 확인합니다.
                  </DialogDesc>
                </DialogHeader>

                <div className="grid gap-3">
                  <div className="rounded-lg border border-border bg-background p-3">
                    <div className="text-sm font-medium">bg-background / border-border</div>
                    <div className="text-xs opacity-80">여기 색이 토큰과 일치해야 합니다.</div>
                  </div>
                  <Button variant="secondary" onClick={() => console.log("[css-vars]", readCssVars())}>
                    Log vars
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>1) Token Var Snapshot</CardTitle>
              <CardDescription>브라우저에서 실제 적용 중인 CSS 변수를 보여줍니다.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="opacity-80">--background</div>
                <div className="font-mono">{vars.background || "(empty)"}</div>

                <div className="opacity-80">--foreground</div>
                <div className="font-mono">{vars.foreground || "(empty)"}</div>

                <div className="opacity-80">--primary</div>
                <div className="font-mono">{vars.primary || "(empty)"}</div>

                <div className="opacity-80">--primary-foreground</div>
                <div className="font-mono">{vars.primaryForeground || "(empty)"}</div>

                <div className="opacity-80">--border</div>
                <div className="font-mono">{vars.border || "(empty)"}</div>

                <div className="opacity-80">--radius</div>
                <div className="font-mono">{vars.radius || "(empty)"}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-primary/50 p-4">
                  <div className="text-sm font-semibold">bg-primary/50</div>
                  <div className="text-xs opacity-80">alpha 유틸 확인</div>
                </div>
                <div className="rounded-lg bg-rodia-primary/50 p-4">
                  <div className="text-sm font-semibold">bg-rodia-primary/50</div>
                  <div className="text-xs opacity-80">raw helper 확인</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button>Primary (default)</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2) Form / Input 최소 세트</CardTitle>
              <CardDescription>
                Input/Label/Textarea/Switch까지 있으면 포트폴리오에서 충분히 “앱” 느낌이 납니다.
              </CardDescription>
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
                  <div className="text-xs opacity-80">Switch 토글/포커스 링 확인</div>
                </div>
                <Switch checked={marketingOptIn} onCheckedChange={(v) => setMarketingOptIn(!!v)} />
              </div>

              <Alert>
                <AlertTitle>Alert</AlertTitle>
                <AlertDescription>border/background/foreground가 테마 전환에 맞게 바뀌면 정상입니다.</AlertDescription>
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
                  <CardDescription>선택/비선택 색, hover/active 상태가 토큰 기반인지 확인하세요.</CardDescription>
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
                  <CardDescription>밝기 차이가 다크/라이트에서 자연스러우면 OK.</CardDescription>
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
                  <CardDescription>Dropdown/Menu/Dialog 배경/테두리가 tokens로 일관되면 OK.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">Open Dropdown</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => console.log("[css-vars]", readCssVars())}>
                        Log vars
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setIsDarkState((v) => !v)}>Toggle dark</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="secondary">Open Dialog</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Second Dialog</DialogTitle>
                        <DialogDesc>여기서도 배경/글자색이 자연스러우면 정상입니다.</DialogDesc>
                      </DialogHeader>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => console.log("[css-vars]", readCssVars())}>
                          Log vars
                        </Button>
                        <Button onClick={() => setIsDarkState((v) => !v)}>Toggle dark</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

/*
요약(3줄)
1) eslint 경고 원인(setState-in-effect)을 제거: CSS 변수 스냅샷은 상태가 아니라 useMemo 파생값으로 처리했습니다.
2) 다크 토글은 DOM(.dark) 반영만 effect에서 수행하고, 변수 확인은 memo/console로 처리해 렌더 폭주 위험을 제거했습니다.
3) 포트폴리오용 최소 컴포넌트(폼/오버레이/로딩)를 한 화면에서 테마 전환으로 점검할 수 있습니다.
*/