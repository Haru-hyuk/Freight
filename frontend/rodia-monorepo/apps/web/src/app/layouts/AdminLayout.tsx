import * as React from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import { Button } from "@/shared/ui/shadcn/button";
import { Separator } from "@/shared/ui/shadcn/separator";

type NavItem = {
  label: string;
  to: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: "대시보드", to: "/dashboard" },
  { label: "기사 승인 관리", to: "/drivers/approvals" },
  { label: "오더 및 관제", to: "/orders/monitoring" },
  { label: "정산 관리", to: "/settlement" },
  { label: "견적", to: "/quotes" },
  { label: "매칭", to: "/matchings" },
  { label: "사용자", to: "/users" },
];

function getPageName(pathname: string): string {
  if (pathname.startsWith("/dashboard")) return "대시보드";
  if (pathname.startsWith("/drivers")) return "기사 승인 관리";
  if (pathname.startsWith("/orders")) return "오더 및 관제";
  if (pathname.startsWith("/settlement")) return "정산 관리";
  if (pathname.startsWith("/quotes")) return "견적";
  if (pathname.startsWith("/matchings")) return "매칭";
  if (pathname.startsWith("/users")) return "사용자";
  return "페이지";
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

          <nav className="px-2 py-3">
            <ul className="space-y-1">
              {NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      [
                        "flex items-center rounded-lg px-3 py-2 text-sm font-medium",
                        "border border-transparent",
                        isActive ? "bg-background border-border" : "hover:bg-background/50",
                      ].join(" ")
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
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
