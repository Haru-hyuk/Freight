import type {
  DispatchDriverOption,
  DispatchForceAssignPayload,
  DispatchQuery,
  DispatchResponse,
  DispatchRow,
} from "@/features/dispatch/model/types";
import { apiClient } from "@/shared/lib/api/client";
import { appendActivityLog } from "@/shared/lib/activity-log";
import { isMockModeEnabled } from "@/shared/lib/mock-mode";

const MOCK_DISPATCH_ROWS: DispatchRow[] = [
  {
    matchId: "M-3201",
    quoteId: "Q-1042",
    shipperName: "Hanul Foods",
    cargoType: "Frozen",
    originAddress: "Incheon Port Logistics Center",
    destinationAddress: "Yongsan Cold Storage Hub",
    requestedAt: "2026-02-19 07:30",
    departAt: "2026-02-19 09:00",
    driverName: "Kim Minsu",
    truckName: "11t Refrigerated",
    matchStatus: "READY",
    accepted: true,
    currentVolumeCbm: 8.5,
    remainingVolumeCbm: 3.5,
    routeDistanceKm: 32,
    totalFare: 460000,
    driverPayout: 355000,
    platformFee: 42000,
    paymentStatus: "PENDING",
    settlementStatus: "PENDING",
    unreadNotificationCount: 1,
    deviationSeverity: "NONE",
  },
  {
    matchId: "M-3202",
    quoteId: "Q-1043",
    shipperName: "Mirae Furniture",
    cargoType: "Pallet",
    originAddress: "Paju Industrial Complex A",
    destinationAddress: "Suwon Regional Warehouse",
    requestedAt: "2026-02-19 06:50",
    driverName: undefined,
    truckName: undefined,
    matchStatus: "READY",
    accepted: false,
    currentVolumeCbm: 0,
    remainingVolumeCbm: 12,
    routeDistanceKm: 58,
    totalFare: 520000,
    driverPayout: 0,
    platformFee: 0,
    paymentStatus: "PENDING",
    settlementStatus: "PENDING",
    unreadNotificationCount: 3,
    deviationSeverity: "NONE",
  },
  {
    matchId: "M-3203",
    quoteId: "Q-1041",
    shipperName: "BluePharm",
    cargoType: "Medical",
    originAddress: "Gimpo Bio Hub",
    destinationAddress: "Daejeon Hospital Supply Center",
    requestedAt: "2026-02-18 21:10",
    departAt: "2026-02-19 01:10",
    arriveAt: "2026-02-19 04:40",
    driverName: "Park Jiho",
    truckName: "5t Box Truck",
    matchStatus: "IN_TRANSIT",
    accepted: true,
    currentVolumeCbm: 10,
    remainingVolumeCbm: 0,
    routeDistanceKm: 148,
    totalFare: 710000,
    driverPayout: 560000,
    platformFee: 68000,
    paymentStatus: "COMPLETED",
    settlementStatus: "PROCESSING",
    unreadNotificationCount: 0,
    deviationSeverity: "MODERATE",
  },
  {
    matchId: "M-3204",
    quoteId: "Q-1036",
    shipperName: "Neo Electronics",
    cargoType: "High Value",
    originAddress: "Pangyo Distribution Campus",
    destinationAddress: "Busan Harbor Transit Yard",
    requestedAt: "2026-02-18 14:20",
    departAt: "2026-02-18 15:00",
    arriveAt: "2026-02-18 21:30",
    driverName: "Lee Hyewon",
    truckName: "8.5t Wing Body",
    matchStatus: "COMPLETED",
    accepted: true,
    currentVolumeCbm: 14.2,
    remainingVolumeCbm: 0,
    routeDistanceKm: 386,
    totalFare: 1380000,
    driverPayout: 1080000,
    platformFee: 120000,
    paymentStatus: "COMPLETED",
    settlementStatus: "COMPLETED",
    unreadNotificationCount: 0,
    deviationSeverity: "NONE",
  },
  {
    matchId: "M-3205",
    quoteId: "Q-1031",
    shipperName: "Green Retail",
    cargoType: "Mixed",
    originAddress: "Seongnam Crossdock",
    destinationAddress: "Gwangju Last Mile Terminal",
    requestedAt: "2026-02-18 10:05",
    departAt: "2026-02-18 11:00",
    driverName: "Choi Daehan",
    truckName: "3.5t Box Truck",
    matchStatus: "CANCELLED",
    accepted: true,
    currentVolumeCbm: 3.4,
    remainingVolumeCbm: 4.8,
    routeDistanceKm: 290,
    totalFare: 640000,
    driverPayout: 0,
    platformFee: 0,
    paymentStatus: "FAILED",
    settlementStatus: "FAILED",
    unreadNotificationCount: 2,
    deviationSeverity: "SEVERE",
  },
  {
    matchId: "M-3206",
    quoteId: "Q-1028",
    shipperName: "Omega Parts",
    cargoType: "Bulk",
    originAddress: "Cheonan Manufacturing Zone",
    destinationAddress: "Iksan Spare Parts Depot",
    requestedAt: "2026-02-17 22:15",
    departAt: "2026-02-18 00:40",
    arriveAt: "2026-02-18 03:10",
    driverName: "Yoon Sejin",
    truckName: "14t Tractor",
    matchStatus: "COMPLETED",
    accepted: true,
    currentVolumeCbm: 18,
    remainingVolumeCbm: 0,
    routeDistanceKm: 122,
    totalFare: 840000,
    driverPayout: 680000,
    platformFee: 76000,
    paymentStatus: "REFUNDED",
    settlementStatus: "PENDING",
    unreadNotificationCount: 1,
    deviationSeverity: "MODERATE",
  },
];

const MOCK_DRIVER_OPTIONS: DispatchDriverOption[] = [
  { driverId: "D-1201", driverName: "김민수", truckName: "11t Refrigerated", maxVolumeCbm: 20, currentVolumeCbm: 8.5 },
  { driverId: "D-1211", driverName: "박현우", truckName: "8.5t Wing Body", maxVolumeCbm: 28, currentVolumeCbm: 9.4 },
  { driverId: "D-1217", driverName: "정수연", truckName: "5t Box Truck", maxVolumeCbm: 14, currentVolumeCbm: 3.2 },
  { driverId: "D-1230", driverName: "최도윤", truckName: "3.5t Box Truck", maxVolumeCbm: 11, currentVolumeCbm: 2.8 },
];

function filterMockDispatchRows(query: DispatchQuery): DispatchResponse {
  const keyword = (query.q ?? "").toLowerCase();

  const filtered = MOCK_DISPATCH_ROWS.filter((row) => {
    const statusMatched = query.status ? row.matchStatus === query.status : true;
    const dispatchStateMatched = query.dispatchState
      ? query.dispatchState === "ASSIGNED"
        ? row.accepted
        : !row.accepted
      : true;
    const paymentStatusMatched = query.paymentStatus ? row.paymentStatus === query.paymentStatus : true;
    const settlementStatusMatched = query.settlementStatus ? row.settlementStatus === query.settlementStatus : true;
    const keywordMatched = keyword
      ? [
          row.matchId,
          row.quoteId,
          row.shipperName,
          row.cargoType,
          row.originAddress,
          row.destinationAddress,
          row.driverName ?? "",
          row.truckName ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(keyword)
      : true;

    return statusMatched && dispatchStateMatched && paymentStatusMatched && settlementStatusMatched && keywordMatched;
  });

  const start = (query.page - 1) * query.size;
  const end = start + query.size;

  return {
    items: filtered.slice(start, end),
    total: filtered.length,
  };
}

export async function fetchDispatchRows(query: DispatchQuery): Promise<DispatchResponse> {
  if (isMockModeEnabled()) return filterMockDispatchRows(query);

  try {
    const response = await apiClient.get<DispatchResponse>("/admin/dispatch", { params: query });
    return response.data;
  } catch {
    return { items: [], total: 0 };
  }
}

export async function fetchAssignableDrivers(matchId: string): Promise<DispatchDriverOption[]> {
  if (isMockModeEnabled()) {
    const target = MOCK_DISPATCH_ROWS.find((row) => row.matchId === matchId);
    if (!target) return [];
    return [...MOCK_DRIVER_OPTIONS];
  }

  try {
    const response = await apiClient.get<DispatchDriverOption[]>(`/admin/dispatch/${matchId}/drivers`);
    return response.data;
  } catch {
    return [];
  }
}

export async function forceAssignDispatchDriver(payload: DispatchForceAssignPayload): Promise<DispatchRow | null> {
  if (isMockModeEnabled()) {
    const row = MOCK_DISPATCH_ROWS.find((item) => item.matchId === payload.matchId);
    const driver = MOCK_DRIVER_OPTIONS.find((item) => item.driverId === payload.driverId);
    if (!row || !driver) return null;

    row.driverName = driver.driverName;
    row.truckName = driver.truckName;
    row.accepted = true;
    appendActivityLog({
      action: "DISPATCH_ASSIGNED",
      targetId: payload.matchId,
      mode: "MOCK",
      message: `매칭 ${payload.matchId}에 강제 배차를 수행했습니다.`,
    });
    return row;
  }

  try {
    const response = await apiClient.post<DispatchRow>(`/admin/dispatch/${payload.matchId}/force-assign`, payload);
    appendActivityLog({
      action: "DISPATCH_ASSIGNED",
      targetId: payload.matchId,
      mode: "REAL",
      message: `매칭 ${payload.matchId}에 강제 배차를 수행했습니다.`,
    });
    return response.data;
  } catch {
    return null;
  }
}
