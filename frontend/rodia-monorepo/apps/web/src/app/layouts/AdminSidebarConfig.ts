// src/app/layouts/AdminSidebarConfig.tsx
/**
 * 관리자 웹 사이드바 구성
 * 화물 운송 플랫폼 관리 기능 중심
 */

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
    description: "핵심 대시보드 및 현황",
    items: [
      {
        label: "통합 대시보드",
        to: "/dashboard",
        icon: "layout-dashboard",
      },
    ],
  },

  {
    title: "배송 관리",
    description: "배송, 배차, 견적, 매칭 관리",
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
    description: "화주, 기사, 차량 승인",
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
        label: "기사 관리",
        to: "/users/drivers",
        icon: "user-check",
      },
      {
        label: "기사 승인",
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
    title: "정산 & 결제",
    description: "결제, 정산, 출금 관리",
    items: [
      {
        label: "정산 승인",
        to: "/settlement/approvals",
        icon: "credit-card",
        badge: { count: 8, variant: "info" },
      },
      {
        label: "정산 이력",
        to: "/settlement/history",
        icon: "receipt",
      },
      {
        label: "정산 상세",
        to: "/settlement/details",
        icon: "bar-chart-3",
      },
      {
        label: "출금 관리",
        to: "/withdrawals",
        icon: "wallet",
      },
    ],
  },

  {
    title: "운영 관리",
    description: "요금, 제재, 로그, 설정",
    items: [
      {
        label: "배송 요금표",
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
        label: "제재 관리",
        to: "/ops/sanctions/logs",
        icon: "ban",
      },
      {
        label: "활동 로그",
        to: "/ops/activity-logs",
        icon: "log",
      },
      {
        label: "시스템 설정",
        to: "/settings",
        icon: "settings",
        disabled: true,
      },
    ],
  },
];

// 페이지명 매핑
export function getPageName(pathname: string): string {
  for (const group of ADMIN_NAV_GROUPS) {
    for (const item of group.items) {
      if (pathname.startsWith(item.to)) {
        return item.label;
      }
    }
  }
  return "페이지";
}
