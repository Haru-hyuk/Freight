// src/app/layouts/AdminLayout.tsx
import * as React from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import { Button } from "@/shared/ui/shadcn/button";
import { Separator } from "@/shared/ui/shadcn/separator";

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
      // 실시간 GPS/이상징후 관제
      { label: "배송 실시간 모니터링", to: "/delivery/live", disabled: true },
      // 과거 운행/배송 루트 이력
      { label: "배송 이력", to: "/delivery/history", disabled: true },

      // 견적/배차/매칭(배송 도메인 하위로 묶기)
      { label: "견적 관리", to: "/quotes" },
      { label: "배차 관리", to: "/dispatch", disabled: true },
      { label: "매칭 관리", to: "/matchings" },
    ],
  },
  {
    title: "사용자",
    items: [
      // 전체 사용자 통합 조회 (필터로 화주/차주 나누는 형태 예상)
      { label: "전체 사용자 조회", to: "/users" },

      // 화주/차주 개별 관리 페이지 (추후 테이블/필터/제재 액션 포함)
      { label: "화주 조회", to: "/users/shippers", disabled: true },
      { label: "차주 조회", to: "/users/drivers", disabled: true },

      // 차주(기사) 승인: 서류(PDF/PNG/JPG) 검토 후 승인/반려
      { label: "차주(기사) 승인", to: "/drivers/approvals" },
    ],
  },
  {
    title: "정산/결제",
    items: [
      { label: "정산 승인 관리", to: "/settlement/approvals", disabled: true },
      { label: "정산 내역", to: "/settlement" },
    ],
  },
  {
    title: "운영",
    items: [
      { label: "시스템 설정", to: "/settings" },
      { label: "고객지원", to: "/support", disabled: true },
      { label: "제재 내역 로그", to: "/ops/sanctions", disabled: true },
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

  if (pathname.startsWith("/users/shippers")) return "화주 조회";
  if (pathname.startsWith("/users/drivers")) return "차주 조회";
  if (pathname.startsWith("/users")) return "전체 사용자 조회";

  if (pathname.startsWith("/drivers/approvals")) return "차주(기사) 승인";

  if (pathname.startsWith("/settlement/approvals")) return "정산 승인 관리";
  if (pathname.startsWith("/settlement")) return "정산 내역";

  if (pathname.startsWith("/settings")) return "시스템 설정";
  if (pathname.startsWith("/support")) return "고객지원";
  if (pathname.startsWith("/ops/sanctions")) return "제재 내역 로그";

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
          isActive ? "bg-background border-border" : "bg-muted hover:bg-background",
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

  const handleLogout = () => {
    localStorage.removeItem("rodia_admin_token");
    localStorage.removeItem("rodia_admin_role");
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-64 shrink-0 border-r border-border bg-muted">
          <div className="flex h-16 items-center px-6">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
              <span className="text-sm font-semibold">Rodia Admin</span>
            </div>
          </div>

          <Separator />

          <nav className="px-3 py-4">
            <div className="space-y-4">
              {NAV_GROUPS.map((group) => (
                <section key={group.title} className="space-y-2">
                  <div className="px-2 text-xs font-semibold opacity-70">{group.title}</div>
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

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Header */}
          <header className="flex h-16 items-center justify-between border-b border-border bg-background px-6">
            <div className="text-sm font-medium">
              홈 &gt; <span className="text-foreground">{pageName}</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm font-semibold">최고관리자</div>
                <div className="text-xs opacity-70">Super Admin</div>
              </div>
              <div className="h-10 w-10 rounded-full border border-border bg-muted" />
            </div>
          </header>

          {/* Content */}
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
