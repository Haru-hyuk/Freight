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
    title: "\uBA54\uC778",
    description: "\uC6B4\uC601 \uD604\uD669 \uC694\uC57D",
    items: [
      {
        label: "\uC6B4\uC601 \uB300\uC2DC\uBCF4\uB4DC",
        to: "/dashboard",
        icon: "layout-dashboard",
      },
    ],
  },
  {
    title: "\uC6B4\uC1A1 \uAD00\uB9AC",
    description: "\uACAC\uC801, \uBC30\uCC28, \uB9E4\uCE6D, \uBC30\uC1A1",
    items: [
      {
        label: "\uBC30\uC1A1 \uC2E4\uC2DC\uAC04 \uBAA8\uB2C8\uD130\uB9C1",
        to: "/delivery/live",
        icon: "map-pin",
      },
      {
        label: "\uBC30\uC1A1 \uC774\uB825",
        to: "/delivery/history",
        icon: "history",
      },
      {
        label: "\uACAC\uC801 \uAD00\uB9AC",
        to: "/quotes",
        icon: "file-text",
      },
      {
        label: "\uBC30\uCC28 \uAD00\uB9AC",
        to: "/dispatch",
        icon: "truck",
      },
      {
        label: "\uB9E4\uCE6D \uAD00\uB9AC",
        to: "/matchings",
        icon: "link-2",
      },
    ],
  },
  {
    title: "\uD68C\uC6D0 \uAD00\uB9AC",
    description: "\uC804\uCCB4 \uD68C\uC6D0, \uD654\uC8FC, \uCC28\uC8FC",
    items: [
      {
        label: "\uC804\uCCB4 \uD68C\uC6D0",
        to: "/users",
        icon: "users",
      },
      {
        label: "\uD654\uC8FC \uAD00\uB9AC",
        to: "/users/shippers",
        icon: "briefcase",
      },
      {
        label: "\uCC28\uC8FC \uAD00\uB9AC",
        to: "/users/drivers",
        icon: "user-check",
      },
      {
        label: "\uCC28\uC8FC \uC2B9\uC778",
        to: "/drivers/approvals",
        icon: "check-circle",
      },
      {
        label: "\uCC28\uB7C9 \uC2B9\uC778",
        to: "/trucks/approvals",
        icon: "truck-check",
        badge: { count: 12, variant: "warning" },
      },
    ],
  },
  {
    title: "\uC815\uC0B0 \uAD00\uB9AC",
    description: "\uC815\uC0B0 \uC2B9\uC778, \uCD9C\uAE08 \uC694\uCCAD, \uC815\uC0B0 \uC774\uB825",
    items: [
      {
        label: "\uC815\uC0B0 \uAD00\uB9AC",
        to: "/settlement",
        icon: "wallet",
        badge: { count: 8, variant: "info" },
      },
    ],
  },
  {
    title: "\uC6B4\uC601 \uAD00\uB9AC",
    description: "\uC694\uC728, \uC774\uC0C1\uC9D5\uD6C4, \uC81C\uC7AC, \uB85C\uADF8",
    items: [
      {
        label: "\uBC30\uC1A1 \uC694\uC728\uD45C",
        to: "/ops/pricing",
        icon: "tag",
      },
      {
        label: "\uC774\uC0C1 \uC9D5\uD6C4",
        to: "/ops/deviations",
        icon: "alert-circle",
        badge: { count: 7, variant: "danger" },
      },
      {
        label: "\uB9E4\uCE6D \uCDE8\uC18C \uC694\uCCAD",
        to: "/ops/matching-anomalies",
        icon: "alert-circle",
      },
      {
        label: "\uC81C\uC7AC \uB85C\uADF8",
        to: "/ops/sanctions/logs",
        icon: "ban",
      },
      {
        label: "\uD65C\uB3D9 \uB85C\uADF8",
        to: "/ops/activity-logs",
        icon: "log",
      },
      {
        label: "\uC124\uC815",
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

  return "\uC6B4\uC601";
}
