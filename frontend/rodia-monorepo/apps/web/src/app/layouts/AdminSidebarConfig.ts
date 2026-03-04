export type NavItem = {
  label: string;
  to: string;
  disabled?: boolean;
  icon?: string;
  badge?: {
    count: number;
    variant: "danger" | "warning" | "info";
  };
};

export type NavGroup = {
  title: string;
  description?: string;
  items: NavItem[];
};

export const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    title: "메인",
    description: "운영 현황 요약",
    items: [
      {
        label: "운영 대시보드",
        to: "/dashboard",
        icon: "layout-dashboard",
      },
    ],
  },
  {
    title: "운송 관리",
    description: "견적, 배차, 매칭, 배송",
    items: [
      {
        label: "배송 실시간 모니터링",
        to: "/delivery/live",
        icon: "map-pin",
      },
      {
        label: "배송 이력",
        to: "/delivery/history",
        icon: "history",
      },
      {
        label: "견적 관리",
        to: "/quotes",
        icon: "file-text",
      },
      {
        label: "배차 관리",
        to: "/dispatch",
        icon: "truck",
      },
      {
        label: "매칭 관리",
        to: "/matchings",
        icon: "link-2",
      },
    ],
  },
  {
    title: "회원 관리",
    description: "전체 회원, 화주, 차주",
    items: [
      {
        label: "전체 회원",
        to: "/users",
        icon: "users",
      },
      {
        label: "화주 관리",
        to: "/users/shippers",
        icon: "briefcase",
      },
      {
        label: "차주 관리",
        to: "/users/drivers",
        icon: "user-check",
      },
      {
        label: "차주 승인",
        to: "/drivers/approvals",
        icon: "check-circle",
      },
      {
        label: "차량 승인",
        to: "/trucks/approvals",
        icon: "truck-check",
        badge: { count: 12, variant: "warning" },
      },
    ],
  },
  {
    title: "정산 관리",
    description: "정산 승인, 출금 요청, 정산 이력",
    items: [
      {
        label: "정산 관리",
        to: "/settlement",
        icon: "wallet",
        badge: { count: 8, variant: "info" },
      },
    ],
  },
  {
    title: "운영 관리",
    description: "요율, 이상징후, 제재, 로그",
    items: [
      {
        label: "배송 요율표",
        to: "/ops/pricing",
        icon: "tag",
      },
      {
        label: "이상 징후",
        to: "/ops/deviations",
        icon: "alert-circle",
        badge: { count: 7, variant: "danger" },
      },
      {
        label: "매칭 취소 요청",
        to: "/ops/matching-anomalies",
        icon: "alert-circle",
      },
      {
        label: "제재 로그",
        to: "/ops/sanctions/logs",
        icon: "ban",
      },
      {
        label: "활동 로그",
        to: "/ops/activity-logs",
        icon: "log",
      },
      {
        label: "설정",
        to: "/settings",
        icon: "settings",
      },
    ],
  },
];

export function getPageName(pathname: string): string {
  for (const group of ADMIN_NAV_GROUPS) {
    for (const item of group.items) {
      if (pathname.startsWith(item.to)) {
        return item.label;
      }
    }
  }

  return "운영";
}

