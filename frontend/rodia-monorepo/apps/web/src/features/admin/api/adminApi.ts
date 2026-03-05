import type {
  AdminDashboardData,
  DeviationEvent,
  DeviationSeverity,
  MatchStatus,
  MatchingDetail,
} from "@/features/admin/model/types";
import { apiCapabilities, apiPaths } from "@/shared/lib/api/endpoints";
import { apiClient } from "@/shared/lib/api/client";
import { isMockModeEnabled } from "@/shared/lib/mock-mode";

type BackendAnnouncement = {
  announcementId: number;
  adminId: number;
  title: string;
  content: string;
  isPinned: boolean;
  publishedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type BackendNotification = {
  notificationId: number;
  matchId: number | null;
  type: string | null;
  message: string;
  isRead: boolean;
  createdAt: string | null;
};

type BackendMatch = {
  matchId: number;
  quoteId: number;
  driverId: number | null;
  accepted: boolean;
  status: string;
  acceptedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

const MOCK_DASHBOARD_DATA: AdminDashboardData = {
  kpi: {
    totalShippers: 1428,
    totalDrivers: 3562,
    newShippersToday: 12,
    newDriversToday: 34,
    totalQuotesOpen: 156,
    totalMatches: 8934,
    matchCompletionRate: 94.2,
    averageMatchingTime: 23,
    totalRevenue: 2840000000,
    totalPlatformFee: 284000000,
    totalSettlementAmount: 1892000000,
    deviationCasesOpen: 7,
    averageShipperRating: 4.6,
    averageDriverRating: 4.4,
    driverCompletionRate: 97.3,
    driverOnTimeRate: 92.1,
  },
  recentMatches: [
    {
      matchId: "M-5234",
      quoteId: "Q-2945",
      shipperName: "Seoul Logistics",
      driverName: "Kim Jaewoo",
      truckType: "5T Wing",
      originAddress: "Seoul Gangnam",
      destinationAddress: "Seoul Songpa",
      departureTime: "2026-02-23 09:30",
      expectedArrival: "2026-02-23 11:00",
      agreedPrice: 250000,
      status: "IN_TRANSIT",
      paymentStatus: "COMPLETED",
      settlementStatus: "PENDING",
      distanceKm: 18,
      estimatedMinutes: 45,
    },
    {
      matchId: "M-5233",
      quoteId: "Q-2941",
      shipperName: "Busan Trading",
      driverName: "Lee Hokyung",
      truckType: "10T Flatbed",
      originAddress: "Busan",
      destinationAddress: "Daegu",
      departureTime: "2026-02-23 08:00",
      expectedArrival: "2026-02-23 13:30",
      agreedPrice: 580000,
      status: "COMPLETED",
      paymentStatus: "COMPLETED",
      settlementStatus: "PENDING",
      distanceKm: 280,
      estimatedMinutes: 330,
      actualMinutes: 325,
    },
  ],
  deviationEvents: [
    {
      deviationId: "DEV-1042",
      matchId: "M-5228",
      quoteId: "Q-2920",
      shipperName: "Daegu Electronics",
      driverName: "Choi Minseok",
      severity: "SEVERE",
      description: "Route deviation detected",
      deviationPercent: 28.5,
      status: "UNDER_REVIEW",
      reportedAt: "2026-02-23 10:45",
    },
    {
      deviationId: "DEV-1041",
      matchId: "M-5226",
      quoteId: "Q-2915",
      shipperName: "Seoul Express",
      driverName: "Jung Hyejin",
      severity: "MODERATE",
      description: "ETA delayed by 45 minutes",
      deviationPercent: 12.3,
      adjustedAmount: -30000,
      status: "ADJUSTED",
      reportedAt: "2026-02-22 16:20",
      resolvedAt: "2026-02-23 09:00",
    },
  ],
  pendingApprovals: {
    drivers: 8,
    trucks: 12,
  },
};

function cloneMockDashboard(): AdminDashboardData {
  return JSON.parse(JSON.stringify(MOCK_DASHBOARD_DATA)) as AdminDashboardData;
}

function toDateText(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 16).replace("T", " ");
}

function normalizeMatchStatus(status: string): MatchStatus {
  if (status === "ACCEPTED") return "ACCEPTED";
  if (status === "IN_TRANSIT") return "IN_TRANSIT";
  if (status === "COMPLETED") return "COMPLETED";
  if (status === "CANCELED" || status === "CANCELLED") return "CANCELED";
  return "PENDING";
}

function signalSeverity(input: string): DeviationSeverity {
  if (/(critical|severe|violation|failed|error)/i.test(input)) return "SEVERE";
  if (/(delay|late|warning|review|pending)/i.test(input)) return "MODERATE";
  return "MINOR";
}

function buildDeviationFromNotifications(notifications: BackendNotification[]): DeviationEvent[] {
  return notifications
    .filter((row) => /(deviation|violation|delay|late|cancel|failed|warning)/i.test(`${row.type ?? ""} ${row.message}`))
    .map((row) => {
      const sourceText = `${row.type ?? ""} ${row.message}`;
      const severity = signalSeverity(sourceText);
      return {
        deviationId: `NTF-${row.notificationId}`,
        matchId: row.matchId ? `M-${row.matchId}` : "-",
        quoteId: "-",
        shipperName: "-",
        driverName: "-",
        severity,
        description: row.message || row.type || "Notification signal",
        deviationPercent: severity === "SEVERE" ? 25 : severity === "MODERATE" ? 12 : 5,
        status: row.isRead ? "RESOLVED" : "REPORTED",
        reportedAt: toDateText(row.createdAt),
        resolvedAt: row.isRead ? toDateText(row.createdAt) : undefined,
      };
    });
}

function buildDeviationFromAnnouncements(announcements: BackendAnnouncement[]): DeviationEvent[] {
  return announcements
    .filter((row) => /(deviation|violation|suspension|penalty|sanction|warning)/i.test(`${row.title} ${row.content}`))
    .map((row) => {
      const sourceText = `${row.title} ${row.content}`;
      const severity = signalSeverity(sourceText);
      return {
        deviationId: `ANN-${row.announcementId}`,
        matchId: "-",
        quoteId: "-",
        shipperName: "-",
        driverName: "-",
        severity,
        description: row.title,
        deviationPercent: severity === "SEVERE" ? 20 : severity === "MODERATE" ? 10 : 4,
        status: "UNDER_REVIEW",
        reportedAt: toDateText(row.publishedAt ?? row.createdAt),
      };
    });
}

function mapRecentMatches(matches: BackendMatch[]): MatchingDetail[] {
  return matches.slice(0, 8).map((row) => ({
    matchId: `M-${row.matchId}`,
    quoteId: `Q-${row.quoteId}`,
    shipperName: `SHIPPER-${row.quoteId}`,
    driverName: row.driverId ? `DRIVER-${row.driverId}` : "UNASSIGNED",
    truckType: "-",
    originAddress: "-",
    destinationAddress: "-",
    departureTime: toDateText(row.acceptedAt ?? row.createdAt),
    expectedArrival: "-",
    agreedPrice: 0,
    status: normalizeMatchStatus(row.status),
    paymentStatus: "PENDING",
    settlementStatus: "PENDING",
    distanceKm: 0,
    estimatedMinutes: 0,
    actualMinutes: undefined,
  }));
}

function averageMatchingMinutes(matches: BackendMatch[]): number {
  const values = matches
    .map((row) => {
      if (!row.createdAt || !row.acceptedAt) return null;
      const createdAt = new Date(row.createdAt).getTime();
      const acceptedAt = new Date(row.acceptedAt).getTime();
      if (Number.isNaN(createdAt) || Number.isNaN(acceptedAt) || acceptedAt < createdAt) return null;
      return Math.round((acceptedAt - createdAt) / 60000);
    })
    .filter((value): value is number => typeof value === "number");

  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

async function fetchAnnouncements(): Promise<BackendAnnouncement[]> {
  if (!apiCapabilities.useDerivedAdminData) {
    try {
      const response = await apiClient.get<BackendAnnouncement[]>(apiPaths.adminAnnouncements);
      if (Array.isArray(response.data)) return response.data;
    } catch {
      // fall back to public announcements
    }
  }

  try {
    const response = await apiClient.get<BackendAnnouncement[]>(apiPaths.publicAnnouncements);
    if (Array.isArray(response.data)) return response.data;
  } catch {
    // no-op
  }

  return [];
}

async function fetchNotifications(): Promise<BackendNotification[]> {
  try {
    const response = await apiClient.get<BackendNotification[]>(apiPaths.notificationsMe);
    return Array.isArray(response.data) ? response.data : [];
  } catch {
    return [];
  }
}

async function fetchDriverMatches(): Promise<BackendMatch[]> {
  try {
    const response = await apiClient.get<BackendMatch[]>(apiPaths.driverMatches);
    return Array.isArray(response.data) ? response.data : [];
  } catch {
    return [];
  }
}

function emptyDashboardData(): AdminDashboardData {
  return {
    kpi: {
      totalShippers: 0,
      totalDrivers: 0,
      newShippersToday: 0,
      newDriversToday: 0,
      totalQuotesOpen: 0,
      totalMatches: 0,
      matchCompletionRate: 0,
      averageMatchingTime: 0,
      totalRevenue: 0,
      totalPlatformFee: 0,
      totalSettlementAmount: 0,
      deviationCasesOpen: 0,
      averageShipperRating: 0,
      averageDriverRating: 0,
      driverCompletionRate: 0,
      driverOnTimeRate: 0,
    },
    recentMatches: [],
    deviationEvents: [],
    pendingApprovals: {
      drivers: 0,
      trucks: 0,
    },
  };
}

export const fetchAdminDashboard = async (): Promise<AdminDashboardData> => {
  if (isMockModeEnabled()) {
    return cloneMockDashboard();
  }

  const [announcements, notifications, matches] = await Promise.all([
    fetchAnnouncements(),
    fetchNotifications(),
    fetchDriverMatches(),
  ]);

  if (announcements.length === 0 && notifications.length === 0 && matches.length === 0) {
    return emptyDashboardData();
  }

  const completedMatches = matches.filter((row) => normalizeMatchStatus(row.status) === "COMPLETED").length;
  const totalMatches = matches.length;
  const totalDrivers = new Set(matches.map((row) => row.driverId).filter((value): value is number => typeof value === "number")).size;
  const deviationEvents = [...buildDeviationFromNotifications(notifications), ...buildDeviationFromAnnouncements(announcements)]
    .sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime())
    .slice(0, 12);
  const pendingDriverApprovals = notifications.filter(
    (row) => !row.isRead && /(approval).*driver|driver.*(approval)/i.test(`${row.type ?? ""} ${row.message}`),
  ).length;
  const pendingTruckApprovals = notifications.filter(
    (row) => !row.isRead && /(approval).*truck|truck.*(approval)/i.test(`${row.type ?? ""} ${row.message}`),
  ).length;

  return {
    kpi: {
      totalShippers: 0,
      totalDrivers,
      newShippersToday: 0,
      newDriversToday: 0,
      totalQuotesOpen: notifications.filter((row) => /(quote|open)/i.test(`${row.type ?? ""} ${row.message}`)).length,
      totalMatches,
      matchCompletionRate: totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0,
      averageMatchingTime: averageMatchingMinutes(matches),
      totalRevenue: 0,
      totalPlatformFee: 0,
      totalSettlementAmount: 0,
      deviationCasesOpen: deviationEvents.filter((row) => row.status === "REPORTED" || row.status === "UNDER_REVIEW").length,
      averageShipperRating: 0,
      averageDriverRating: 0,
      driverCompletionRate: totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0,
      driverOnTimeRate: 0,
    },
    recentMatches: mapRecentMatches(matches),
    deviationEvents,
    pendingApprovals: {
      drivers: pendingDriverApprovals,
      trucks: pendingTruckApprovals,
    },
  };
};
