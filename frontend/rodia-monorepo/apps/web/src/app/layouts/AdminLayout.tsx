import * as React from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import { ADMIN_NAV_GROUPS, getPageName, type NavItem } from "@/app/layouts/AdminSidebarConfig";
import { fetchDeviationStats } from "@/features/ops/api/deviationApi";
import { fetchSettlementApprovals } from "@/features/settlements/api/settlementsApi";
import { fetchTruckApprovals } from "@/features/trucks/api/truckApprovalsApi";
import { apiPaths } from "@/shared/lib/api/endpoints";
import { apiClient } from "@/shared/lib/api/client";
import { clearSession } from "@/shared/lib/auth/session";
import { appendActivityLog } from "@/shared/lib/activity-log";
import { useMockMode } from "@/shared/lib/hooks/useMockMode";
import { Badge } from "@/shared/ui/shadcn/badge";
import { Button } from "@/shared/ui/shadcn/button";
import { Separator } from "@/shared/ui/shadcn/separator";
import { Switch } from "@/shared/ui/shadcn/switch";
import {
  AlertCircle,
  Ban,
  BarChart3,
  Briefcase,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  CreditCard,
  FileText,
  History,
  LayoutDashboard,
  Link2,
  Logs,
  MapPin,
  Receipt,
  Settings,
  Tag,
  Truck,
  TruckIcon,
  UserCheck,
  Users,
  Wallet,
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

type NavItemLinkProps = {
  item: NavItem;
  isChild?: boolean;
  badgeCount?: number;
};

type SidebarBadgePath = "/trucks/approvals" | "/settlement" | "/ops/deviations";
type SidebarBadgeCounts = Partial<Record<SidebarBadgePath, number>>;

const OPERATIONS_GROUP_TITLE = "운영 관리";

function NavItemLink({ item, isChild = false, badgeCount }: NavItemLinkProps) {
  if (item.disabled) {
    return (
      <div className={`flex cursor-not-allowed items-center justify-between rounded-lg border border-transparent px-3 py-2 text-sm font-medium opacity-50 ${isChild ? "ml-4" : ""}`}>
        <div className="flex items-center gap-2">
          {item.icon ? iconMap[item.icon] : null}
          <span>{item.label}</span>
        </div>
      </div>
    );
  }

  const badgeVariant = item.badge
    ? item.badge.variant === "warning" || item.badge.variant === "danger"
      ? "destructive"
      : ("secondary" as const)
    : undefined;
  const visibleBadgeCount = typeof badgeCount === "number" ? badgeCount : 0;

  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        `flex items-center justify-between rounded-lg border border-transparent px-3 py-2 text-sm font-semibold transition-colors ${
          isActive ? "bg-primary text-primary-foreground shadow-sm" : "text-background/75 hover:bg-background/10 hover:text-background"
        } ${isChild ? "ml-4" : ""}`
      }
    >
      <div className="flex items-center gap-2">
        {item.icon ? iconMap[item.icon] : null}
        <span>{item.label}</span>
      </div>
      {item.badge && visibleBadgeCount > 0 ? (
        <Badge variant={badgeVariant} className="ml-2 text-xs">
          {visibleBadgeCount}
        </Badge>
      ) : null}
    </NavLink>
  );
}

export default function AdminLayout() {
  const location = useLocation();
  const pageName = React.useMemo(() => getPageName(location.pathname), [location.pathname]);
  const { enabled: mockModeEnabled, setEnabled: setMockModeEnabled } = useMockMode();
  const [badgeCounts, setBadgeCounts] = React.useState<SidebarBadgeCounts>({});

  const loadBadgeCounts = React.useCallback(async () => {
    const [truckRows, pendingSettlements, deviationStats] = await Promise.all([
      fetchTruckApprovals().catch(() => []),
      fetchSettlementApprovals().catch(() => []),
      fetchDeviationStats().catch(() => null),
    ]);

    const pendingTruckCount = truckRows.filter((row) => row.approvalStatus === "PENDING").length;
    const pendingDeviationCount = (deviationStats?.open ?? 0) + (deviationStats?.investigating ?? 0);

    setBadgeCounts({
      "/trucks/approvals": pendingTruckCount,
      "/settlement": pendingSettlements.length,
      "/ops/deviations": pendingDeviationCount,
    });
  }, []);

  React.useEffect(() => {
    void loadBadgeCounts();
  }, [loadBadgeCounts, location.pathname, mockModeEnabled]);

  const [expandedGroups, setExpandedGroups] = React.useState<Record<string, boolean>>(() => {
    const initialState: Record<string, boolean> = {};

    for (let index = 1; index < ADMIN_NAV_GROUPS.length; index += 1) {
      const group = ADMIN_NAV_GROUPS[index];
      if (!group) continue;
      initialState[group.title] = group.title !== OPERATIONS_GROUP_TITLE;
    }

    return initialState;
  });

  const toggleGroup = (groupTitle: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupTitle]: !prev[groupTitle],
    }));
  };

  const handleLogout = () => {
    appendActivityLog({
      action: "ADMIN_LOGOUT",
      mode: "REAL",
      message: "관리자 로그아웃",
    });
    void apiClient.post(apiPaths.authLogout).catch(() => undefined);
    clearSession();
    localStorage.removeItem("rodia_admin_token");
    localStorage.removeItem("rodia_admin_role");
    window.location.href = "/login";
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 -top-44 h-[26rem] bg-gradient-to-br from-primary/70 via-accent/60 to-background/50" />
        <div className="absolute -right-44 top-20 h-[32rem] w-[52rem] rotate-[-8deg] rounded-[3rem] border border-border/50 bg-background/70 backdrop-blur-sm" />
        <div className="absolute -left-28 top-[22rem] h-[24rem] w-[44rem] rotate-[7deg] rounded-[2.5rem] border border-border/50 bg-secondary/60" />
      </div>

      <div className="relative flex min-h-screen">
        <aside className="z-20 flex w-72 shrink-0 flex-col border-r border-border/50 bg-foreground/95 text-background backdrop-blur">
          <div className="flex h-16 items-center px-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-3 w-3 rounded-full bg-primary" />
              <span className="text-base font-bold">Rodia 관리자</span>
            </div>
          </div>

          <Separator className="bg-background/15" />

          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <div className="space-y-1">
              {ADMIN_NAV_GROUPS.map((group, idx) => {
                if (idx === 0) {
                  return (
                    <div key={group.title} className="mb-2">
                      {group.items.map((item) => (
                        <NavItemLink key={item.to} item={item} badgeCount={badgeCounts[item.to as SidebarBadgePath]} />
                      ))}
                    </div>
                  );
                }

                const isExpanded = expandedGroups[group.title] ?? false;

                return (
                  <div key={group.title} className="space-y-1">
                    <button
                      onClick={() => toggleGroup(group.title)}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide text-background/70 transition-colors hover:bg-background/10 hover:text-background"
                    >
                      <span>{group.title}</span>
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-background/55" /> : <ChevronRight className="h-4 w-4 text-background/55" />}
                    </button>

                    {isExpanded ? (
                      <div className="space-y-1 border-l border-background/15 pl-2">
                        {group.items.map((item) => (
                          <NavItemLink
                            key={item.to}
                            item={item}
                            isChild={true}
                            badgeCount={badgeCounts[item.to as SidebarBadgePath]}
                          />
                        ))}
                      </div>
                    ) : null}

                    {idx < ADMIN_NAV_GROUPS.length - 1 ? <Separator className="my-2 bg-background/10" /> : null}
                  </div>
                );
              })}
            </div>
          </nav>

          <Separator className="bg-background/15" />

          <div className="px-3 pb-4 pt-2">
            <Button type="button" className="w-full text-base" onClick={handleLogout}>
              로그아웃
            </Button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="mx-6 mt-5 flex h-16 items-center justify-between rounded-2xl border border-border/60 bg-background/85 px-6 backdrop-blur">
            <h1 className="text-lg font-semibold tracking-tight">{pageName}</h1>

            <div className="flex items-center gap-4">
              <div className="rounded-lg border border-border bg-muted/70 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground/70">목업</span>
                  <Switch
                    checked={mockModeEnabled}
                    onCheckedChange={setMockModeEnabled}
                    aria-label="목업 모드 전환"
                  />
                </div>
              </div>
              <div className="h-6 w-px bg-border" />
              <div className="pr-2 text-right">
                <div className="text-sm font-semibold">관리자</div>
                <div className="text-xs text-foreground/70">
                  {mockModeEnabled ? "목업" : "실서비스"}
                </div>
              </div>
              <div className="h-10 w-10 rounded-full border border-border bg-secondary" />
            </div>
          </header>

          <main className="flex-1 overflow-y-auto px-6 pb-8 pt-5">
            <div className="mx-auto w-full max-w-[1440px]">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
