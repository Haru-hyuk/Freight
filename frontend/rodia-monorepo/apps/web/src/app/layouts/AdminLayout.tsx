import * as React from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import { Button } from "@/shared/ui/shadcn/button";
import { Switch } from "@/shared/ui/shadcn/switch";
import { Separator } from "@/shared/ui/shadcn/separator";
import { useMockMode } from "@/shared/lib/hooks/useMockMode";

type NavItem = {
  label: string;
  to: string;
  disabled?: boolean;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    title: "메인",
    items: [{ label: "대시보드", to: "/dashboard" }],
  },
  {
    title: "배송",
    items: [
      { label: "배송 실시간 모니터링", to: "/delivery/live" },
      { label: "배송 이력", to: "/delivery/history" },
      { label: "견적 관리", to: "/quotes" },
      { label: "배차 관리", to: "/dispatch" },
      { label: "매칭 관리", to: "/matchings" },
    ],
  },
  {
    title: "회원",
    items: [
      { label: "전체 회원 조회", to: "/users" },
      { label: "화주 조회", to: "/users/shippers" },
      { label: "차주 조회", to: "/users/drivers" },
      { label: "차주 승인", to: "/drivers/approvals" },
    ],
  },
  {
    title: "정산/결제",
    items: [
      { label: "정산 승인 관리", to: "/settlement/approvals" },
      { label: "정산 승인 이력", to: "/settlement/history" },
    ],
  },
  {
    title: "운영",
    items: [
      { label: "금액 관리", to: "/ops/pricing" },
      { label: "제재 이력 로그", to: "/ops/sanctions/logs" },
      { label: "활동 로그", to: "/ops/activity-logs" },
      { label: "시스템 설정", to: "/settings", disabled: true },
      { label: "고객 지원", to: "/support", disabled: true },
    ],
  },
];

function getPageName(pathname: string): string {
  if (pathname.startsWith("/dashboard")) return "대시보드";
  if (pathname.startsWith("/delivery/live")) return "배송 실시간 모니터링";
  if (pathname.startsWith("/delivery/history")) return "배송 이력";
  if (pathname.startsWith("/quotes")) return "견적 관리";
  if (pathname.startsWith("/dispatch")) return "배차 관리";
  if (pathname.startsWith("/matchings")) return "매칭 관리";
  if (pathname.startsWith("/users/") && pathname.split("/").length >= 3) return "회원 상세";
  if (pathname.startsWith("/users/shippers")) return "화주 조회";
  if (pathname.startsWith("/users/drivers")) return "차주 조회";
  if (pathname.startsWith("/users")) return "전체 회원 조회";
  if (pathname.startsWith("/drivers/approvals")) return "차주 승인";
  if (pathname.startsWith("/settlement/approvals")) return "정산 승인 관리";
  if (pathname.startsWith("/settlement/history")) return "정산 승인 이력";
  if (pathname.startsWith("/ops/pricing")) return "금액 관리";
  if (pathname.startsWith("/ops/sanctions/logs")) return "제재 이력 로그";
  if (pathname.startsWith("/ops/activity-logs")) return "활동 로그";
  return "페이지";
}

function NavItemLink({ item }: { item: NavItem }) {
  if (item.disabled) {
    return (
      <div
        className={[
          "flex items-center rounded-lg px-3 py-2 text-sm font-medium",
          "border border-border bg-muted",
          "opacity-60",
          "cursor-not-allowed",
        ].join(" ")}
      >
        {item.label}
      </div>
    );
  }

  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        [
          "flex items-center rounded-lg px-3 py-2 text-sm font-medium",
          "border border-transparent",
          isActive ? "bg-background border-border text-foreground" : "bg-muted hover:bg-background text-foreground",
        ].join(" ")
      }
    >
      {item.label}
    </NavLink>
  );
}

export default function AdminLayout() {
  const location = useLocation();
  const pageName = React.useMemo(() => getPageName(location.pathname), [location.pathname]);
  const { enabled: mockModeEnabled, setEnabled: setMockModeEnabled } = useMockMode();

  const handleLogout = () => {
    localStorage.removeItem("rodia_admin_token");
    localStorage.removeItem("rodia_admin_role");
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside className="w-64 shrink-0 border-r border-border bg-muted">
          <div className="flex h-16 items-center px-6">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
              <span className="text-sm font-semibold text-foreground">Rodia Admin</span>
            </div>
          </div>

          <Separator />

          <nav className="px-3 py-4">
            <div className="space-y-4">
              {NAV_GROUPS.map((group) => (
                <section key={group.title} className="space-y-2">
                  <div className="px-2 text-xs font-semibold text-foreground">{group.title}</div>
                  <ul className="space-y-1">
                    {group.items.map((item) => (
                      <li key={item.to}>
                        <NavItemLink item={item} />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </nav>

          <div className="mt-auto px-4 pb-4">
            <Separator className="my-4" />
            <Button type="button" variant="secondary" className="w-full" onClick={handleLogout}>
              로그아웃
            </Button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 items-center justify-between border-b border-border bg-background px-6">
            <div className="text-sm font-medium text-foreground">
              운영 &gt; <span className="text-foreground">{pageName}</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-lg border border-border bg-background px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground">목업 데이터</span>
                  <Switch checked={mockModeEnabled} onCheckedChange={setMockModeEnabled} aria-label="목업 데이터 모드 전환" />
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-foreground">최고관리자</div>
                <div className="text-xs text-foreground">{mockModeEnabled ? "Mock Mode" : "Real Mode"}</div>
              </div>
              <div className="h-10 w-10 rounded-full border border-border bg-muted" />
            </div>
          </header>

          <main className="flex-1 overflow-y-auto bg-background">
            <div className="mx-auto w-full max-w-6xl p-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
