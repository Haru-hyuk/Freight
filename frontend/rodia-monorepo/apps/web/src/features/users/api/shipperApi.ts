import { apiPaths } from "@/shared/lib/api/endpoints";
import { apiClient } from "@/shared/lib/api/client";
import { isMockModeEnabled } from "@/shared/lib/mock-mode";

export enum ShipperStatus {
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  INACTIVE = "INACTIVE",
}

export enum ShipperGrade {
  PLATINUM = "PLATINUM",
  GOLD = "GOLD",
  SILVER = "SILVER",
  BRONZE = "BRONZE",
}

export type ShipperStats = {
  totalShipments: number;
  completedShipments: number;
  totalSpent: number;
  averageRating: number;
  delayRate: number;
};

export type Shipper = {
  id: string;
  name: string;
  type: "INDIVIDUAL" | "COMPANY";
  businessNo?: string;
  representativeName?: string;
  phone: string;
  email: string;
  address: string;
  registeredAt: string;
  status: ShipperStatus;
  grade: ShipperGrade;
  creditScore: number;
  stats: ShipperStats;
  outstandingAmount: number;
  lastShipmentAt?: string;
  notes?: string;
};

export type ShipperFilter = {
  search?: string;
  type?: "INDIVIDUAL" | "COMPANY";
  status?: ShipperStatus;
  grade?: ShipperGrade;
  page?: number;
  size?: number;
};

export type ShipperResponse = {
  items: Shipper[];
  total: number;
};

export type ShipmentLog = {
  id: string;
  quoteId: string;
  driverId: string;
  driverName: string;
  origin: string;
  destination: string;
  weightKg: number;
  price: number;
  status: "대기" | "진행중" | "완료" | "취소" | string;
  scheduledAt: string;
  completedAt?: string;
  distance: number;
  duration: number;
  actualDuration?: number;
  rating?: number;
  review?: string;
};

type BackendMatch = {
  matchId: number | null;
  quoteId: number | null;
  driverId: number | null;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
};

type BackendQuote = {
  quoteId: number | null;
  originAddress: string;
  destinationAddress: string;
  distanceKm: number | null;
  desiredPrice: number | null;
  finalPrice: number | null;
};

type BackendSettlement = {
  settlementId: number | null;
  matchId: number | null;
  shipperId: number | null;
  totalFare: number | null;
  settlementStatus: string | null;
  completedAt: string | null;
  createdAt: string | null;
};

type BackendNotification = {
  notificationId: number;
  matchId: number | null;
  type: string | null;
  message: string;
  isRead: boolean;
  createdAt: string | null;
};

const MOCK_GRADES = [ShipperGrade.PLATINUM, ShipperGrade.GOLD, ShipperGrade.SILVER, ShipperGrade.BRONZE] as const;
const MOCK_SHIPMENT_STATUS: ReadonlyArray<ShipmentLog["status"]> = ["완료", "완료", "진행중", "대기", "취소"];
const liveStatusOverrides = new Map<string, ShipperStatus>();

const ALL_SHIPPERS: Shipper[] = Array.from({ length: 100 }, (_, index) => {
  const id = `shipper_${index + 1}`;
  const isCompany = index % 3 !== 0;
  const totalShipments = 40 + (index % 25) * 8;
  const completedShipments = Math.max(0, totalShipments - (index % 6));
  const grade = MOCK_GRADES[index % MOCK_GRADES.length];

  return {
    id,
    name: isCompany ? `Shipper Company ${index + 1}` : `Shipper ${index + 1}`,
    type: isCompany ? "COMPANY" : "INDIVIDUAL",
    businessNo: isCompany ? `123-45-${String(index + 10000).padStart(5, "0")}` : undefined,
    representativeName: isCompany ? `Rep ${index + 1}` : undefined,
    phone: `010-${String(1000 + (index % 9000)).padStart(4, "0")}-${String(2000 + (index % 7000)).padStart(4, "0")}`,
    email: `shipper${index + 1}@example.com`,
    address: `Address ${index + 1}`,
    registeredAt: new Date(Date.now() - (index + 1) * 86400000 * 7).toISOString(),
    status: index % 17 === 0 ? ShipperStatus.SUSPENDED : ShipperStatus.ACTIVE,
    grade,
    creditScore: 60 + (index % 40),
    stats: {
      totalShipments,
      completedShipments,
      totalSpent: 1000000 + index * 150000,
      averageRating: Math.min(5, 3.8 + (index % 10) * 0.1),
      delayRate: (index % 8) * 0.01,
    },
    outstandingAmount: index % 7 === 0 ? 200000 + index * 10000 : 0,
    lastShipmentAt: new Date(Date.now() - index * 3600000 * 8).toISOString(),
    notes: index % 11 === 0 ? "Priority customer" : undefined,
  };
});

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function toStringValue(value: unknown, fallback: string = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function toNumberValue(value: unknown, fallback: number = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function toOptionalNumberValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function applyShipperFilters(items: Shipper[], filter: ShipperFilter): Shipper[] {
  const keyword = filter.search?.trim().toLowerCase() ?? "";

  return items.filter((shipper) => {
    if (keyword) {
      const target = `${shipper.name} ${shipper.id} ${shipper.phone}`.toLowerCase();
      if (!target.includes(keyword)) return false;
    }
    if (filter.type && shipper.type !== filter.type) return false;
    if (filter.status && shipper.status !== filter.status) return false;
    if (filter.grade && shipper.grade !== filter.grade) return false;
    return true;
  });
}

function paginate<T>(items: T[], page: number, size: number): T[] {
  const start = (page - 1) * size;
  return items.slice(start, start + size);
}

function pickListPayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const row = toRecord(payload);
  const candidates = [row.items, row.data, row.content, row.list, row.result];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

function toDateText(value: string | null | undefined): string {
  if (!value) return "-";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Date(parsed).toISOString().slice(0, 16).replace("T", " ");
}

function resolveSettlementMePath(basePath: string): string {
  const base = basePath.replace(/\/$/, "");
  return base.endsWith("/me") ? base : `${base}/me`;
}

function mapBackendMatch(raw: unknown): BackendMatch {
  const row = toRecord(raw);
  return {
    matchId: toOptionalNumberValue(row.matchId ?? row.id) ?? null,
    quoteId: toOptionalNumberValue(row.quoteId) ?? null,
    driverId: toOptionalNumberValue(row.driverId) ?? null,
    status: toStringValue(row.status, "READY"),
    createdAt: toStringValue(row.createdAt, "") || null,
    updatedAt: toStringValue(row.updatedAt, "") || null,
  };
}

function mapBackendQuote(raw: unknown): BackendQuote {
  const row = toRecord(raw);
  return {
    quoteId: toOptionalNumberValue(row.quoteId ?? row.id) ?? null,
    originAddress: toStringValue(row.originAddress, "-"),
    destinationAddress: toStringValue(row.destinationAddress, "-"),
    distanceKm: toOptionalNumberValue(row.distanceKm) ?? null,
    desiredPrice: toOptionalNumberValue(row.desiredPrice) ?? null,
    finalPrice: toOptionalNumberValue(row.finalPrice) ?? null,
  };
}

function mapBackendSettlement(raw: unknown): BackendSettlement {
  const row = toRecord(raw);
  return {
    settlementId: toOptionalNumberValue(row.settlementId ?? row.id) ?? null,
    matchId: toOptionalNumberValue(row.matchId) ?? null,
    shipperId: toOptionalNumberValue(row.shipperId) ?? null,
    totalFare: toOptionalNumberValue(row.totalFare) ?? null,
    settlementStatus: toStringValue(row.settlementStatus, "") || null,
    completedAt: toStringValue(row.completedAt, "") || null,
    createdAt: toStringValue(row.createdAt, "") || null,
  };
}

function mapBackendNotification(raw: unknown): BackendNotification | null {
  const row = toRecord(raw);
  const notificationId = toOptionalNumberValue(row.notificationId ?? row.id);
  if (notificationId === undefined) return null;
  return {
    notificationId,
    matchId: toOptionalNumberValue(row.matchId) ?? null,
    type: toStringValue(row.type, "") || null,
    message: toStringValue(row.message, ""),
    isRead: Boolean(row.isRead),
    createdAt: toStringValue(row.createdAt, "") || null,
  };
}

function normalizeMatchStatus(value: string): "READY" | "IN_TRANSIT" | "COMPLETED" | "CANCELLED" {
  const status = value.trim().toUpperCase();
  if (status === "IN_TRANSIT" || status === "TRANSIT" || status === "MOVING") return "IN_TRANSIT";
  if (status === "COMPLETED" || status === "DONE" || status === "DELIVERED") return "COMPLETED";
  if (status === "CANCELLED" || status === "CANCELED" || status === "CANCEL") return "CANCELLED";
  return "READY";
}

function scoreToGrade(totalSpent: number): ShipperGrade {
  if (totalSpent >= 15000000) return ShipperGrade.PLATINUM;
  if (totalSpent >= 8000000) return ShipperGrade.GOLD;
  if (totalSpent >= 3000000) return ShipperGrade.SILVER;
  return ShipperGrade.BRONZE;
}

function normalizeShipperId(id: string): string {
  return id.trim().toUpperCase();
}

function matchesShipperId(rowId: string, targetId: string): boolean {
  const normalizedRow = normalizeShipperId(rowId);
  const normalizedTarget = normalizeShipperId(targetId);
  return (
    normalizedRow === normalizedTarget ||
    normalizedRow === `S-${normalizedTarget}` ||
    normalizedTarget === `S-${normalizedRow}`
  );
}

async function fetchMatches(): Promise<BackendMatch[]> {
  try {
    const response = await apiClient.get<unknown>(apiPaths.shipperMatchesMe);
    return pickListPayload(response.data).map(mapBackendMatch);
  } catch {
    return [];
  }
}

async function fetchQuotes(): Promise<BackendQuote[]> {
  try {
    const response = await apiClient.get<unknown>(apiPaths.shipperQuotes);
    return pickListPayload(response.data).map(mapBackendQuote);
  } catch {
    return [];
  }
}

async function fetchSettlements(): Promise<BackendSettlement[]> {
  try {
    const response = await apiClient.get<unknown>(resolveSettlementMePath(apiPaths.shipperSettlements));
    return pickListPayload(response.data).map(mapBackendSettlement);
  } catch {
    return [];
  }
}

async function fetchNotifications(): Promise<BackendNotification[]> {
  try {
    const response = await apiClient.get<unknown>(apiPaths.notificationsMe);
    return pickListPayload(response.data)
      .map(mapBackendNotification)
      .filter((item): item is BackendNotification => item !== null);
  } catch {
    return [];
  }
}

function deriveLiveShippers(
  matches: BackendMatch[],
  quotes: BackendQuote[],
  settlements: BackendSettlement[],
  notifications: BackendNotification[],
): Shipper[] {
  const shipperIds = new Set<string>();
  for (const settlement of settlements) {
    if (typeof settlement.shipperId === "number") shipperIds.add(`S-${settlement.shipperId}`);
  }
  if (shipperIds.size === 0) shipperIds.add("S-ME");

  const quoteById = new Map<number, BackendQuote>();
  for (const quote of quotes) {
    if (typeof quote.quoteId === "number") quoteById.set(quote.quoteId, quote);
  }

  const settlementByMatchId = new Map<number, BackendSettlement>();
  for (const settlement of settlements) {
    if (typeof settlement.matchId === "number") settlementByMatchId.set(settlement.matchId, settlement);
  }

  const delayMatchIds = new Set<number>();
  for (const notification of notifications) {
    if (typeof notification.matchId !== "number") continue;
    const text = `${notification.type ?? ""} ${notification.message}`.toLowerCase();
    if (/(delay|late|지연)/i.test(text)) delayMatchIds.add(notification.matchId);
  }

  const rows = Array.from(shipperIds).map((shipperId) => {
    const relevantMatches = matches.filter((match) => {
      if (shipperId === "S-ME") return true;
      if (typeof match.matchId !== "number") return false;
      const settlement = settlementByMatchId.get(match.matchId);
      return settlement?.shipperId ? `S-${settlement.shipperId}` === shipperId : false;
    });

    const totalShipments = relevantMatches.length;
    const completedShipments = relevantMatches.filter((match) => normalizeMatchStatus(match.status) === "COMPLETED").length;

    const totalSpentFromSettlements = settlements
      .filter((settlement) => (shipperId === "S-ME" ? true : settlement.shipperId !== null && `S-${settlement.shipperId}` === shipperId))
      .reduce((sum, settlement) => sum + (settlement.totalFare ?? 0), 0);

    const totalSpentFromQuotes = quotes.reduce((sum, quote) => sum + (quote.finalPrice ?? quote.desiredPrice ?? 0), 0);
    const totalSpent = totalSpentFromSettlements > 0 ? totalSpentFromSettlements : totalSpentFromQuotes;
    const delayRate = totalShipments > 0 ? delayMatchIds.size / totalShipments : 0;

    const outstandingAmount = settlements
      .filter((settlement) => (shipperId === "S-ME" ? true : settlement.shipperId !== null && `S-${settlement.shipperId}` === shipperId))
      .filter((settlement) => (settlement.settlementStatus ?? "").toUpperCase() !== "COMPLETED")
      .reduce((sum, settlement) => sum + (settlement.totalFare ?? 0), 0);

    const completionRate = totalShipments > 0 ? completedShipments / totalShipments : 0;
    const creditScore = Math.min(100, Math.max(40, Math.round(55 + completionRate * 35 - delayRate * 20)));

    const latestMatchedAt = relevantMatches
      .map((match) => Date.parse(match.updatedAt ?? match.createdAt ?? ""))
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => b - a)[0];

    const status = liveStatusOverrides.get(shipperId) ?? ShipperStatus.ACTIVE;

    return {
      id: shipperId,
      name: shipperId === "S-ME" ? "화주 계정" : `화주-${shipperId.replace("S-", "")}`,
      type: "COMPANY",
      phone: "-",
      email: "-",
      address: "-",
      registeredAt: settlements[0]?.createdAt ?? quotes[0] ? new Date().toISOString() : new Date().toISOString(),
      status,
      grade: scoreToGrade(totalSpent),
      creditScore,
      stats: {
        totalShipments,
        completedShipments,
        totalSpent,
        averageRating: totalShipments > 0 ? Number((4.2 + completionRate * 0.6).toFixed(1)) : 0,
        delayRate,
      },
      outstandingAmount,
      lastShipmentAt: Number.isFinite(latestMatchedAt) ? new Date(latestMatchedAt).toISOString() : undefined,
      notes: outstandingAmount > 0 ? "미정산 금액 확인 필요" : undefined,
    } satisfies Shipper;
  });

  return rows.sort((a, b) => new Date(b.lastShipmentAt ?? 0).getTime() - new Date(a.lastShipmentAt ?? 0).getTime());
}

async function fetchLiveShippers(filter: ShipperFilter): Promise<ShipperResponse> {
  const [matches, quotes, settlements, notifications] = await Promise.all([
    fetchMatches(),
    fetchQuotes(),
    fetchSettlements(),
    fetchNotifications(),
  ]);

  const rows = deriveLiveShippers(matches, quotes, settlements, notifications);
  const page = filter.page ?? 1;
  const size = filter.size ?? 20;
  const filtered = applyShipperFilters(rows, filter);
  return {
    items: paginate(filtered, page, size),
    total: filtered.length,
  };
}

async function fetchLiveShipper(shipperId: string): Promise<Shipper | null> {
  const rows = await fetchLiveShippers({ page: 1, size: 500 });
  return rows.items.find((row) => matchesShipperId(row.id, shipperId)) ?? null;
}

function buildMockShipmentLogs(shipperId: string, totalShipments: number): ShipmentLog[] {
  const base = Math.min(totalShipments, 50);

  return Array.from({ length: base }, (_, index) => {
    const status = MOCK_SHIPMENT_STATUS[index % MOCK_SHIPMENT_STATUS.length];
    const scheduledAt = new Date(Date.now() - (index + 1) * 86400000).toISOString();
    const completedAt = status === "완료" ? new Date(Date.parse(scheduledAt) + 2 * 3600000).toISOString() : undefined;

    return {
      id: `${shipperId}-shipment-${index + 1}`,
      quoteId: `Q-${1000 + index}`,
      driverId: `driver_${(index % 20) + 1}`,
      driverName: `Driver ${(index % 20) + 1}`,
      origin: `Origin ${index + 1}`,
      destination: `Destination ${index + 1}`,
      weightKg: 200 + index * 15,
      price: 120000 + index * 5000,
      status,
      scheduledAt,
      completedAt,
      distance: 15 + (index % 120),
      duration: 40 + (index % 180),
      actualDuration: status === "완료" ? 35 + (index % 200) : undefined,
      rating: status === "완료" ? 4 + (index % 10) * 0.1 : undefined,
      review: status === "완료" ? "Delivery completed safely." : undefined,
    };
  });
}

export async function fetchShippers(filter: ShipperFilter = {}): Promise<ShipperResponse> {
  if (!isMockModeEnabled()) {
    return fetchLiveShippers(filter);
  }

  const page = filter.page ?? 1;
  const size = filter.size ?? 20;
  const filtered = applyShipperFilters(ALL_SHIPPERS, filter).sort(
    (a, b) => new Date(b.lastShipmentAt ?? 0).getTime() - new Date(a.lastShipmentAt ?? 0).getTime(),
  );
  return {
    items: paginate(filtered, page, size),
    total: filtered.length,
  };
}

export async function fetchShipper(shipperId: string): Promise<Shipper | null> {
  if (!isMockModeEnabled()) {
    return fetchLiveShipper(shipperId);
  }

  return ALL_SHIPPERS.find((row) => row.id === shipperId) ?? null;
}

export async function updateShipperStatus(shipperId: string, status: ShipperStatus): Promise<boolean> {
  if (!isMockModeEnabled()) {
    const target = await fetchLiveShipper(shipperId);
    if (!target) return false;
    liveStatusOverrides.set(target.id, status);
    return true;
  }

  const target = ALL_SHIPPERS.find((row) => row.id === shipperId);
  if (!target) return false;
  target.status = status;
  return true;
}

export async function fetchShipperCreditAnalysis(shipperId: string): Promise<{
  creditScore: number;
  completionRate: number;
  delayRate: number;
  averageRating: number;
  outstandingAmount: number;
  riskLevel: "HIGH" | "MEDIUM" | "LOW";
} | null> {
  const shipper = await fetchShipper(shipperId);
  if (!shipper) return null;

  const completionRate =
    shipper.stats.totalShipments > 0 ? (shipper.stats.completedShipments / shipper.stats.totalShipments) * 100 : 0;
  const creditScore = shipper.creditScore;

  return {
    creditScore,
    completionRate,
    delayRate: shipper.stats.delayRate * 100,
    averageRating: shipper.stats.averageRating,
    outstandingAmount: shipper.outstandingAmount,
    riskLevel: creditScore < 70 ? "HIGH" : creditScore < 85 ? "MEDIUM" : "LOW",
  };
}

function toShipmentStatus(status: string): ShipmentLog["status"] {
  const normalized = normalizeMatchStatus(status);
  if (normalized === "IN_TRANSIT") return "진행중";
  if (normalized === "COMPLETED") return "완료";
  if (normalized === "CANCELLED") return "취소";
  return "대기";
}

export async function fetchShipperShipments(shipperId: string): Promise<ShipmentLog[]> {
  if (!isMockModeEnabled()) {
    const [matches, quotes, settlements] = await Promise.all([fetchMatches(), fetchQuotes(), fetchSettlements()]);
    const quoteById = new Map<number, BackendQuote>();
    for (const quote of quotes) {
      if (typeof quote.quoteId === "number") quoteById.set(quote.quoteId, quote);
    }

    const settlementByMatchId = new Map<number, BackendSettlement>();
    for (const settlement of settlements) {
      if (typeof settlement.matchId === "number") settlementByMatchId.set(settlement.matchId, settlement);
    }

    const target = await fetchLiveShipper(shipperId);
    if (!target) return [];

    return matches
      .filter((match) => typeof match.matchId === "number")
      .map((match) => {
        const quote = typeof match.quoteId === "number" ? quoteById.get(match.quoteId) : undefined;
        const settlement = typeof match.matchId === "number" ? settlementByMatchId.get(match.matchId) : undefined;
        const status = toShipmentStatus(match.status);
        const scheduledAt = toDateText(match.createdAt);
        const completedAt = status === "완료" ? toDateText(settlement?.completedAt ?? match.updatedAt) : undefined;
        const distance = quote?.distanceKm ?? 0;
        const duration = status === "완료" ? 120 : 0;

        return {
          id: `shipment-${match.matchId}`,
          quoteId: typeof match.quoteId === "number" ? `Q-${match.quoteId}` : "-",
          driverId: typeof match.driverId === "number" ? `D-${match.driverId}` : "-",
          driverName: typeof match.driverId === "number" ? `기사-${match.driverId}` : "미배정",
          origin: quote?.originAddress ?? "-",
          destination: quote?.destinationAddress ?? "-",
          weightKg: 0,
          price: settlement?.totalFare ?? quote?.finalPrice ?? quote?.desiredPrice ?? 0,
          status,
          scheduledAt,
          completedAt,
          distance,
          duration,
          actualDuration: status === "완료" ? duration : undefined,
          rating: status === "완료" ? Number((4 + (distance % 10) * 0.05).toFixed(1)) : undefined,
          review: status === "완료" ? "정상 배송 완료" : undefined,
        } satisfies ShipmentLog;
      })
      .sort((a, b) => Date.parse(b.scheduledAt) - Date.parse(a.scheduledAt));
  }

  const shipper = ALL_SHIPPERS.find((row) => row.id === shipperId);
  if (!shipper) return [];
  return buildMockShipmentLogs(shipperId, shipper.stats.totalShipments);
}
