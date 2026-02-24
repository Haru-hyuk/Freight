/**
 * admin/api/adminApi.ts
 * 관리자용 대시보드 및 관리 API (Mock)
 */

import type {
  AdminDashboardData,
  ActivityLog,
  MatchingDetail,
  SettlementRecord,
  ShipperDetail,
  DriverDetail,
  TruckInfo,
  DeviationEvent,
  PricingRule
} from "@/features/admin/model/types";

export const fetchAdminDashboard = async (): Promise<AdminDashboardData> => {
  return {
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
        originAddress: "강남구 삼성동",
        destinationAddress: "송파구 가락동",
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
        originAddress: "부산 동구 범일동",
        destinationAddress: "대구 북구 침산동",
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
      {
        matchId: "M-5232",
        quoteId: "Q-2938",
        shipperName: "Incheon Manufacturing",
        driverName: "Park Sunmi",
        truckType: "1T Cargo",
        originAddress: "인천 남동구",
        destinationAddress: "경기 안양시",
        departureTime: "2026-02-23 14:00",
        expectedArrival: "2026-02-23 15:30",
        agreedPrice: 150000,
        status: "COMPLETED",
        paymentStatus: "COMPLETED",
        settlementStatus: "COMPLETED",
        distanceKm: 35,
        estimatedMinutes: 90,
        actualMinutes: 85,
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
        description: "배송 목적지 변경 없이 다른 지역으로 우회",
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
        description: "예상 시간 초과 (45분)",
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
};

export const fetchShippers = async (page: number = 1, limit: number = 10) => {
  const data: ShipperDetail[] = [
    {
      userId: "S-001",
      email: "contact@seoul-logistics.kr",
      name: "Seoul Logistics",
      phone: "02-1234-5678",
      role: "SHIPPER",
      status: "ACTIVE",
      createdAt: "2024-11-15",
      lastLoginAt: "2026-02-23 08:30",
      totalMatches: 342,
      rating: 4.8,
      completionRate: 98.5,
      companyName: "Seoul Logistics Co., Ltd.",
      bizRegNo: "123-45-67890",
      address: "서울 강남구",
      totalOrdersCreated: 456,
      totalSpent: 125000000,
      averageOrderValue: 274000,
      verificationStatus: "VERIFIED",
    },
  ];
  return { data, total: 1428, page };
};

export const fetchDrivers = async (page: number = 1, limit: number = 10) => {
  const data: DriverDetail[] = [
    {
      userId: "D-001",
      email: "kim.jaewoo@driver.kr",
      name: "Kim Jaewoo",
      phone: "010-1234-5678",
      role: "DRIVER",
      status: "ACTIVE",
      createdAt: "2024-10-20",
      lastLoginAt: "2026-02-23 14:15",
      totalMatches: 245,
      rating: 4.7,
      completionRate: 99.2,
      licenseNo: "12-34567890",
      licenseExpireDate: "2027-08-15",
      trucksCount: 2,
      totalTrips: 456,
      totalEarnings: 45600000,
      averageTripEarnings: 100000,
      verificationStatus: "VERIFIED",
      riskLevel: "LOW",
    },
  ];
  return { data, total: 3562, page };
};

export const fetchTrucks = async (page: number = 1, limit: number = 10) => {
  const data: TruckInfo[] = [
    {
      truckId: "T-001",
      driverId: "D-001",
      model: "Hyundai Mighty 5T",
      licensePlate: "서울01가1234",
      capacity: 5000,
      tonnage: 5,
      type: "MEDIUM_TRUCK",
      verificationStatus: "VERIFIED",
      lastInspectionDate: "2026-01-30",
    },
  ];
  return { data, total: 2850, page };
};

export const fetchSettlements = async (page: number = 1, limit: number = 10) => {
  const data: SettlementRecord[] = [
    {
      settlementId: "SET-2062",
      driverId: "D-001",
      driverName: "Kim Jaewoo",
      totalMatches: 45,
      totalEarnings: 4500000,
      platformFee: 450000,
      driverPayout: 4050000,
      status: "COMPLETED",
      period: { startDate: "2026-02-01", endDate: "2026-02-15" },
      createdAt: "2026-02-16",
      completedAt: "2026-02-17",
    },
  ];
  return { data, total: 567, page };
};

export const fetchActivityLogs = async (page: number = 1, limit: number = 20) => {
  const data: ActivityLog[] = [
    {
      logId: "LOG-8934",
      timestamp: "2026-02-23 14:30",
      userId: "D-001",
      userName: "Kim Jaewoo",
      action: "MATCH_ACCEPTED",
      resource: "Match:M-5234",
      details: { quoteId: "Q-2945", fare: 250000 },
      status: "SUCCESS",
    },
    {
      logId: "LOG-8933",
      timestamp: "2026-02-23 13:45",
      userId: "S-001",
      userName: "Seoul Logistics",
      action: "QUOTE_CREATED",
      resource: "Quote:Q-2945",
      details: { cargoWeight: 2500, route: "강남-송파" },
      status: "SUCCESS",
    },
  ];
  return { data, total: 10234, page };
};

export const fetchPricingRules = async () => {
  const data: PricingRule[] = [
    {
      ruleId: "PR-001",
      from: "Seoul",
      to: "Incheon",
      basePrice: 50000,
      perKgPrice: 10,
      perKmPrice: 1000,
      status: "ACTIVE",
      appliedAt: "2026-01-01",
    },
  ];
  return data;
};
