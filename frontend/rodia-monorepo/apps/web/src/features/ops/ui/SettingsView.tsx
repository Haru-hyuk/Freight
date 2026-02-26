import { Bell, Database, KeyRound, MoonStar, Palette, ShieldCheck } from "lucide-react";

import {
  PRIMARY_COLOR_PRESET_OPTIONS,
  useAppearanceSettings,
} from "@/shared/lib/hooks/useAppearanceSettings";
import { Badge } from "@/shared/ui/shadcn/badge";
import { Button } from "@/shared/ui/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Separator } from "@/shared/ui/shadcn/separator";
import { Switch } from "@/shared/ui/shadcn/switch";

const RECOMMENDED_SETTINGS = [
  {
    title: "알림 채널 정책",
    description: "카카오/이메일/문자별 발송 기준, 업무 시간, 긴급 우선순위를 세분화합니다.",
    icon: Bell,
  },
  {
    title: "보안 및 접근 제어",
    description: "관리자 세션 만료 시간, 다중 인증, 접속 허용 정책을 역할별로 관리합니다.",
    icon: ShieldCheck,
  },
  {
    title: "데이터 보존 및 백업",
    description: "정산/매칭/로그의 보관 기간과 백업 주기를 서비스 운영 기준으로 고정합니다.",
    icon: Database,
  },
  {
    title: "외부 연동 키 관리",
    description: "지도, 알림, 분석 도구의 연동 키를 환경별로 분리하고 만료 주기를 관리합니다.",
    icon: KeyRound,
  },
];

export function SettingsView() {
  const { settings, setDarkMode, setPrimaryColorPreset, resetToDefault } = useAppearanceSettings();

  return (
    <div className="min-h-screen space-y-6 bg-background text-foreground">
      <div>
        <h1 className="text-3xl font-semibold">설정</h1>
        <p className="mt-1 text-sm text-foreground/70">
          관리자 콘솔의 화면 모드와 메인 톤을 운영 정책에 맞게 조정합니다.
        </p>
      </div>

      <Card className="rounded-lg border border-border bg-background">
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg">화면 설정</CardTitle>
          <p className="text-sm text-foreground/70">다크 모드와 사이트 메인 색상을 즉시 반영합니다.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <MoonStar className="h-4 w-4" />
                다크 모드
              </div>
              <p className="text-sm text-foreground/70">
                최상위 `.dark` 클래스를 기준으로 라이트/다크 테마를 전환합니다.
              </p>
            </div>
            <Switch checked={settings.darkMode} onCheckedChange={setDarkMode} aria-label="다크 모드 전환" />
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Palette className="h-4 w-4" />
              메인 색상
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {PRIMARY_COLOR_PRESET_OPTIONS.map((option) => {
                const selected = settings.primaryColorPreset === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPrimaryColorPreset(option.value)}
                    className={
                      selected
                        ? "rounded-lg border border-border bg-secondary p-3 text-left"
                        : "rounded-lg border border-border bg-background p-3 text-left hover:bg-muted"
                    }
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">{option.label}</span>
                      {selected ? <Badge variant="secondary">적용 중</Badge> : null}
                    </div>
                    <p className="mt-1 text-sm text-foreground/70">{option.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="button" variant="secondary" onClick={resetToDefault}>
              기본값 복원
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-lg border border-border bg-background">
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg">추천 설정 항목</CardTitle>
          <p className="text-sm text-foreground/70">실서비스 운영 시 우선적으로 포함하면 좋은 설정들입니다.</p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {RECOMMENDED_SETTINGS.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-lg border border-border bg-background p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Icon className="h-4 w-4" />
                  {item.title}
                </div>
                <p className="mt-2 text-sm text-foreground/70">{item.description}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
