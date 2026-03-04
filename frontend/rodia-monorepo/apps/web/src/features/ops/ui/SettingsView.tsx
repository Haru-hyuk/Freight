import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Building2,
  CreditCard,
  FileText,
  LogOut,
  MapPinned,
  MoonStar,
  Palette,
  PhoneCall,
  ShieldCheck,
  Truck,
  UserCog,
} from "lucide-react";

import { PRIMARY_COLOR_PRESET_OPTIONS, useAppearanceSettings } from "@/shared/lib/hooks/useAppearanceSettings";
import { Badge } from "@/shared/ui/shadcn/badge";
import { Button } from "@/shared/ui/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Separator } from "@/shared/ui/shadcn/separator";
import { Switch } from "@/shared/ui/shadcn/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/shadcn/tabs";

type SettingBadgeVariant = "default" | "secondary" | "destructive" | "outline";

type SettingsItem = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  statusLabel?: string;
  statusVariant?: SettingBadgeVariant;
  adminHint: string;
};

type SettingsSection = {
  id: string;
  title: string;
  description: string;
  items: SettingsItem[];
};

const SHIPPER_SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: "shipper-business",
    title: "사업자 정보 · 인증",
    description: "화주 마이페이지 설정 탭의 사업자/인증 영역을 운영 관점으로 구성했습니다.",
    items: [
      {
        id: "shipper-business-info",
        title: "사업자 정보",
        description: "상호, 대표자, 사업자번호, 담당자 연락처를 검수하고 갱신 이력을 관리합니다.",
        icon: Building2,
        statusLabel: "필수 검수",
        statusVariant: "secondary",
        adminHint: "화주 관리 상세에서 사업자 정보 변경 요청 검토",
      },
      {
        id: "shipper-verification",
        title: "인증 관리",
        description: "휴대폰, 사업자, 결제수단 인증 상태를 모니터링하고 이상 상태를 확인합니다.",
        icon: ShieldCheck,
        statusLabel: "모니터링",
        statusVariant: "outline",
        adminHint: "인증 실패/만료 사용자 우선 대응",
      },
    ],
  },
  {
    id: "shipper-profile",
    title: "회원 · 주소 · 결제",
    description: "회원정보 수정, 상·하차지 주소, 결제수단, 정산 내역을 한 번에 점검합니다.",
    items: [
      {
        id: "shipper-account",
        title: "회원정보 수정",
        description: "연락처, 이메일, 수신동의 변경 요청의 적정성을 검토합니다.",
        icon: UserCog,
        adminHint: "민감정보 변경은 로그와 함께 이중 확인",
      },
      {
        id: "shipper-address",
        title: "상·하차지 주소 관리",
        description: "기본 주소, 메모, 사용 빈도를 기준으로 주소 데이터 품질을 관리합니다.",
        icon: MapPinned,
        adminHint: "배송 지연 이슈 발생 시 주소 데이터 우선 검증",
      },
      {
        id: "shipper-payment",
        title: "운임 결제수단 관리",
        description: "카드/계좌 등록 상태와 결제 실패 패턴을 점검해 결제 안정성을 높입니다.",
        icon: CreditCard,
        statusLabel: "결제 연동",
        statusVariant: "outline",
        adminHint: "반복 실패 계정은 사전 알림 정책 적용",
      },
      {
        id: "shipper-settlement",
        title: "정산 내역",
        description: "정산 요청, 지급 결과, 세금계산서 연동 상태를 추적합니다.",
        icon: FileText,
        statusLabel: "정산 연결",
        statusVariant: "secondary",
        adminHint: "정산관리 페이지와 이슈 티켓 연동 권장",
      },
    ],
  },
];

const DRIVER_SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: "driver-account",
    title: "내 정보",
    description: "차주 마이페이지 설정 탭의 회원정보 영역을 운영 검수 기준으로 반영했습니다.",
    items: [
      {
        id: "driver-profile",
        title: "회원정보 수정",
        description: "이름, 연락처, 이메일 변경 요청을 검수하고 승인 이력을 관리합니다.",
        icon: UserCog,
        statusLabel: "승인 필요",
        statusVariant: "secondary",
        adminHint: "차주 관리 상세에서 변경 사유와 증빙 확인",
      },
    ],
  },
  {
    id: "driver-truck",
    title: "차량",
    description: "차량 승인 상태와 등록 정보의 정확성을 지속적으로 모니터링합니다.",
    items: [
      {
        id: "driver-truck-approval",
        title: "차량 승인 상태",
        description: "차량 심사중/승인완료 상태를 추적하고 보완 서류 요청을 관리합니다.",
        icon: Truck,
        statusLabel: "승인완료",
        statusVariant: "default",
        adminHint: "차주 승인/차량 승인 화면과 상태 동기화",
      },
    ],
  },
  {
    id: "driver-support",
    title: "고객 지원",
    description: "문의 접수와 약관 확인 요청을 표준 응대 정책으로 처리합니다.",
    items: [
      {
        id: "driver-help",
        title: "1:1 문의 · 고객센터",
        description: "문의 유형별 SLA를 적용하고 미응답 건을 우선 처리합니다.",
        icon: PhoneCall,
        statusLabel: "SLA 관리",
        statusVariant: "outline",
        adminHint: "이상 징후/제재 이력과 함께 상담 기록 확인",
      },
      {
        id: "driver-terms",
        title: "이용약관",
        description: "약관 버전 동의 현황과 변경 공지 이력을 관리합니다.",
        icon: FileText,
        adminHint: "중요 약관 개정 시 재동의 캠페인 진행",
      },
    ],
  },
  {
    id: "driver-auth",
    title: "계정",
    description: "로그아웃 및 세션 보안 정책을 기준으로 계정 상태를 관리합니다.",
    items: [
      {
        id: "driver-logout",
        title: "로그아웃",
        description: "비정상 세션 탐지 시 강제 로그아웃 정책을 적용할 수 있습니다.",
        icon: LogOut,
        statusLabel: "보안",
        statusVariant: "destructive",
        adminHint: "세션 정책은 활동 로그와 함께 점검",
      },
    ],
  },
];

function SettingsSectionCard({ section }: { section: SettingsSection }) {
  return (
    <Card className="rounded-lg border border-border bg-background">
      <CardHeader className="space-y-1">
        <CardTitle className="text-lg">{section.title}</CardTitle>
        <p className="text-sm text-foreground/70">{section.description}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {section.items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.id} className="rounded-lg border border-border bg-muted p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Icon className="h-4 w-4" />
                    {item.title}
                  </div>
                  <p className="text-sm text-foreground/70">{item.description}</p>
                </div>
                {item.statusLabel ? <Badge variant={item.statusVariant ?? "secondary"}>{item.statusLabel}</Badge> : null}
              </div>
              <p className="mt-3 text-xs text-foreground/70">{item.adminHint}</p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function SettingsView() {
  const { settings, setDarkMode, setPrimaryColorPreset, resetToDefault } = useAppearanceSettings();

  return (
    <div className="min-h-screen space-y-6 bg-background text-foreground">
      <div>
        <h1 className="text-3xl font-semibold">설정</h1>
        <p className="mt-1 text-sm text-foreground/70">
          모바일 화주/차주 마이페이지 설정 탭을 기준으로 운영 항목을 통합 관리합니다.
        </p>
      </div>

      <Card className="rounded-lg border border-border bg-muted">
        <CardContent className="flex flex-col gap-2 pt-6 text-sm text-foreground/80 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            설정 구조 기준: `apps/mobile` 화주·차주 마이페이지 설정 탭
          </div>
          <Badge variant="secondary">운영자 점검 모드</Badge>
        </CardContent>
      </Card>

      <Card className="rounded-lg border border-border bg-background">
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg">운영자 화면 설정</CardTitle>
          <p className="text-sm text-foreground/70">다크모드와 메인 색상 프리셋을 즉시 반영합니다.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <MoonStar className="h-4 w-4" />
                다크 모드
              </div>
              <p className="text-sm text-foreground/70">최상위 `.dark` 클래스를 기준으로 라이트/다크 테마를 전환합니다.</p>
            </div>
            <Switch checked={settings.darkMode} onCheckedChange={setDarkMode} aria-label="다크 모드 전환" />
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Palette className="h-4 w-4" />
              메인 색상 프리셋
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
          <CardTitle className="text-lg">서비스 설정 탭 구성</CardTitle>
          <p className="text-sm text-foreground/70">화주/차주 앱 설정 탭 정보를 운영자가 점검할 수 있도록 분리했습니다.</p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="shipper" className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-lg border border-border bg-muted p-1">
              <TabsTrigger value="shipper" className="data-[state=active]:bg-secondary">
                화주 설정
              </TabsTrigger>
              <TabsTrigger value="driver" className="data-[state=active]:bg-secondary">
                차주 설정
              </TabsTrigger>
            </TabsList>

            <TabsContent value="shipper" className="mt-4 space-y-4">
              {SHIPPER_SETTINGS_SECTIONS.map((section) => (
                <SettingsSectionCard key={section.id} section={section} />
              ))}
            </TabsContent>

            <TabsContent value="driver" className="mt-4 space-y-4">
              {DRIVER_SETTINGS_SECTIONS.map((section) => (
                <SettingsSectionCard key={section.id} section={section} />
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
