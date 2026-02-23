import * as React from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import { Button } from "@/shared/ui/shadcn/button";
import { Switch } from "@/shared/ui/shadcn/switch";
import { Separator } from "@/shared/ui/shadcn/separator";
import { Badge } from "@/shared/ui/shadcn/badge";
import { useMockMode } from "@/shared/lib/hooks/useMockMode";
import { ADMIN_NAV_GROUPS, getPageName, type NavItem } from "@/app/layouts/AdminSidebarConfig";
import {
  MapPin,
  History,
  FileText,
  Truck,
  Link2,
  Users,
  Briefcase,
  UserCheck,
  CheckCircle,
  TruckIcon,
  CreditCard,
  Receipt,
  BarChart3,
  Wallet,
  Tag,
  AlertCircle,
  Ban,
  Logs,
  Settings,
  LayoutDashboard,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
  "layout-dashboard": <LayoutDashboard className="h-4 w-4" />,
  "map-pin": <MapPin className="h-4 w-4" />,
  history: <History className="h-4 w-4" />,
  "file-text": <FileText className="h-4 w-4" />,
  truck: <Truck className="h-4 w-4" />,
  "link-2": <Link2 className="h-4 w-4" />,
  users: <Users className="h-4 w-4" />,
  briefcase: <Briefcase className="h-4 w-4" />,
  "user-check": <UserCheck className="h-4 w-4" />,
  "check-circle": <CheckCircle className="h-4 w-4" />,
  "truck-check": <TruckIcon className="h-4 w-4" />,
  "credit-card": <CreditCard className="h-4 w-4" />,
  receipt: <Receipt className="h-4 w-4" />,
  "bar-chart-3": <BarChart3 className="h-4 w-4" />,
  wallet: <Wallet className="h-4 w-4" />,
  tag: <Tag className="h-4 w-4" />,
  "alert-circle": <AlertCircle className="h-4 w-4" />,
  ban: <Ban className="h-4 w-4" />,
  log: <Logs className="h-4 w-4" />,
  settings: <Settings className="h-4 w-4" />,
};

type NavItemLinkProps = { item: NavItem; isChild?: boolean };

function NavItemLink({ item, isChild }: NavItemLinkProps) {
  if (item.disabled) {
    return (
      <div
        className={`flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium border border-transparent opacity-50 cursor-not-allowed ${
          isChild ? "ml-4" : ""
        }`}
      >
        <div className="flex items-center gap-2">
          {item.icon && iconMap[item.icon]}
          <span>{item.label}</span>
        </div>
      </div>
    );
  }

  const badgeVariant = item.badge
    ? item.badge.variant === "warning"
      ? "destructive"
      : item.badge.variant === "danger"
        ? "destructive"
        : ("secondary" as const)
    : undefined;

  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        `flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium border border-transparent transition-colors ${
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-foreground hover:bg-muted"
        } ${isChild ? "ml-4" : ""}`
      }
    >
      <div className="flex items-center gap-2">
        {item.icon && iconMap[item.icon]}
        <span>{item.label}</span>
      </div>
      {item.badge && (
        <Badge variant={badgeVariant} className="ml-2 text-xs">
          {item.badge.count}
        </Badge>
      )}
    </NavLink>
  );
}

export default function AdminLayout() {
  const location = useLocation();
  const pageName = React.useMemo(() => getPageName(location.pathname), [location.pathname]);
  const { enabled: mockModeEnabled, setEnabled: setMockModeEnabled } = useMockMode();
  const [expandedGroups, setExpandedGroups] = React.useState<Record<string, boolean>>({
    "배송 관리": true,
    "회원 관리": true,
    "정산 & 결제": false,
    "운영 관리": false,
  });

  const toggleGroup = (groupTitle: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupTitle]: !prev[groupTitle],
    }));
  };

  const handleLogout = () => {
    localStorage.removeItem("rodia_admin_token");
    localStorage.removeItem("rodia_admin_role");
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside className="w-72 shrink-0 border-r border-border bg-background flex flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center px-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-3 w-3 rounded-full bg-primary" />
              <span className="text-base font-bold text-foreground">Rodia Admin</span>
            </div>
          </div>

          <Separator />

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <div className="space-y-1">
              {ADMIN_NAV_GROUPS.map((group, idx) => {
                // 메인 그룹은 별도 처리 (콜랩스 없음)
                if (group.title === "메인") {
                  return (
                    <div key={group.title} className="mb-2">
                      {group.items.map((item) => (
                        <NavItemLink key={item.to} item={item} />
                      ))}
                    </div>
                  );
                }

                const isExpanded = expandedGroups[group.title] ?? false;

                return (
                  <div key={group.title} className="space-y-1">
                    {/* Group Header - Collapsible */}
                    <button
                      onClick={() => toggleGroup(group.title)}
                      className="flex items-center justify-between w-full px-3 py-2 rounded-md text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                    >
                      <span className="uppercase tracking-wide text-xs">{group.title}</span>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>

                    {/* Group Items */}
                    {isExpanded && (
                      <div className="ml-0 space-y-1 pl-2 border-l border-border">
                        {group.items.map((item) => (
                          <NavItemLink key={item.to} item={item} isChild={true} />
                        ))}
                      </div>
                    )}

                    {/* Separator between groups (except last) */}
                    {idx < ADMIN_NAV_GROUPS.length - 1 && (
                      <Separator className="my-2" />
                    )}
                  </div>
                );
              })}
            </div>
          </nav>

          <Separator />

          {/* Logout */}
          <div className="px-3 pb-4 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={handleLogout}
            >
              로그아웃
            </Button>
          </div>
        </aside>

        {/* Main Content */}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 items-center justify-between border-b border-border bg-background px-8">
            <h1 className="text-lg font-bold text-foreground">{pageName}</h1>

            <div className="flex items-center gap-4">
              <div className="rounded-md border border-border bg-muted px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Mock</span>
                  <Switch
                    checked={mockModeEnabled}
                    onCheckedChange={setMockModeEnabled}
                    aria-label="목업 데이터 모드 전환"
                  />
                </div>
              </div>
              <div className="w-px h-6 bg-border" />
              <div className="text-right pr-3">
                <div className="text-sm font-semibold text-foreground">Admin</div>
                <div className="text-xs text-muted-foreground">
                  {mockModeEnabled ? "Mock" : "Live"}
                </div>
              </div>
              <div className="h-10 w-10 rounded-full border border-border bg-muted" />
            </div>
          </header>

          <main className="flex-1 overflow-y-auto bg-background">
            <div className="mx-auto w-full max-w-7xl p-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
