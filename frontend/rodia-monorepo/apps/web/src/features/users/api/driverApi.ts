import { apiClient } from "@/shared/lib/api/client";
import { apiPaths } from "@/shared/lib/api/endpoints";
import { isMockModeEnabled } from "@/shared/lib/mock-mode";

export enum DriverStatus {
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  INACTIVE = "INACTIVE",
  PENDING_APPROVAL = "PENDING_APPROVAL",
}

export enum DriverRating {
  EXCELLENT = "EXCELLENT",
  GOOD = "GOOD",
  FAIR = "FAIR",
  POOR = "POOR",
}

export type VehicleInfo = {
  plateNumber: string;
  type: "TRUCK" | "VAN" | "SEDAN";
  capacity: number;
  insuranceExpiredAt: string;
  registeredAt: string;
};

export type DriverStats = {
  totalMatches: number;
  completedMatches: number;
  averageRating: number;
  totalEarnings: number;
  monthlyEarnings: number;
  acceptanceRate: number;
  completionRate: number;
  onTimeRate: number;
};

export type Driver = {
  id: string;
  name: string;
  licenseNo: string;
  phone: string;
  birthDate: string;
  address: string;
  registeredAt: string;
  status: DriverStatus;
  rating: DriverRating;
  vehicle: VehicleInfo;
  stats: DriverStats;
  violations: Array<{
    date: string;
    type: string;
    severity: string;
  }>;
  certifications: string[];
  bankAccount?: {
    bank: string;
    accountNo: string;
  };
  notes?: string;
};

export type DriverFilter = {
  search?: string;
  status?: DriverStatus;
  rating?: DriverRating;
  page?: number;
  size?: number;
};

export type DriverResponse = {
  items: Driver[];
  total: number;
};

export type DeliveryLog = {
  id: string;
  quoteId: string;
  shipperId: string;
  shipperName: string;
  origin: string;
  destination: string;
  weightKg: number;
  price: number;
  earnedAmount: number;
  status: "READY" | "IN_TRANSIT" | "COMPLETED" | "CANCELLED" | string;
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
  accepted: boolean;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
};

type BackendQuote = {
  quoteId: number | null;
  shipperId: number | null;
  originAddress: string;
  destinationAddress: string;
  distanceKm: number | null;
  weightKg: number | null;
  desiredPrice: number | null;
  finalPrice: number | null;
  createdAt: string | null;
};

type BackendSettlement = {
  settlementId: number | null;
  matchId: number | null;
  driverId: number | null;
  totalFare: number | null;
  driverPayout: number | null;
  settlementStatus: string | null;
  completedAt: string | null;
  createdAt: string | null;
};

type BackendTruck = {
  truckId: number | null;
  driverId: number | null;
  vehicleType: string | null;
  vehicleBodyType: string | null;
  tonnage: number | null;
  maxWeight: number | null;
  maxVolume: number | null;
  name: string | null;
  approved: boolean | null;
  insurance: string | null;
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

type BackendAdminDriverUser = {
  id: string;
  role: string;
  name: string;
  phone: string;
  status: string;
  createdAt: string | null;
};

const MOCK_DELIVERY_STATUSES: ReadonlyArray<DeliveryLog["status"]> = [
  "COMPLETED",
  "COMPLETED",
  "IN_TRANSIT",
  "READY",
  "CANCELLED",
];

const liveStatusOverrides = new Map<string, DriverStatus>();

const ALL_DRIVERS: Driver[] = Array.from({ length: 80 }, (_, index) => {
  const totalMatches = 20 + (index % 30) * 3;
  const completedMatches = Math.max(0, totalMatches - (index % 5));
  const averageRating = Number((3.7 + (index % 12) * 0.1).toFixed(1));
  const acceptanceRate = 70 + (index % 25);
  const completionRate = totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0;
  const onTimeRate = 72 + (index % 24);

  return {
    id: `D-${index + 1001}`,
    name: `Driver-${index + 1}`,
    licenseNo: `LIC-${String(index + 1).padStart(8, "0")}`,
    phone: `010-${String(1000 + (index % 9000)).padStart(4, "0")}-${String(2000 + (index % 7000)).padStart(4, "0")}`,
    birthDate: `198${index % 10}-${String((index % 12) + 1).padStart(2, "0")}-${String((index % 28) + 1).padStart(2, "0")}`,
    address: `Address-${index + 1}`,
    registeredAt: new Date(Date.now() - (index + 3) * 86400000 * 7).toISOString(),
    status: index % 18 === 0 ? DriverStatus.PENDING_APPROVAL : DriverStatus.ACTIVE,
    rating: averageRating >= 4.8 ? DriverRating.EXCELLENT : averageRating >= 4.4 ? DriverRating.GOOD : averageRating >= 4 ? DriverRating.FAIR : DriverRating.POOR,
    vehicle: {
      plateNumber: `PLATE-${1000 + index}`,
      type: index % 3 === 0 ? "TRUCK" : index % 3 === 1 ? "VAN" : "SEDAN",
      capacity: 1500 + (index % 12) * 300,
      insuranceExpiredAt: new Date(Date.now() + (index % 300) * 86400000).toISOString(),
      registeredAt: new Date(Date.now() - (index + 10) * 86400000 * 30).toISOString(),
    },
    stats: {
      totalMatches,
      completedMatches,
      averageRating,
      totalEarnings: 4000000 + index * 180000,
      monthlyEarnings: 1000000 + (index % 20) * 90000,
      acceptanceRate,
      completionRate,
      onTimeRate,
    },
    violations: Array.from({ length: index % 3 }, (_, violationIndex) => ({
      date: new Date(Date.now() - (violationIndex + 1) * 86400000 * 14).toISOString(),
      type: violationIndex % 2 === 0 ? "ROUTE_DEVIATION" : "LATE_DELIVERY",
      severity: violationIndex === 0 ? "HIGH" : "MEDIUM",
    })),
    certifications: index % 2 === 0 ? ["INSURANCE_VERIFIED"] : ["INSURANCE_PENDING"],
    notes: index % 11 === 0 ? "Requires periodic check." : undefined,
  };
});

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function toStringValue(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function toNumberValue(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function toOptionalNumberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
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

function normalizeMatchStatus(value: string): "READY" | "IN_TRANSIT" | "COMPLETED" | "CANCELLED" {
  const status = value.trim().toUpperCase();
  if (status === "IN_TRANSIT" || status === "TRANSIT" || status === "MOVING") return "IN_TRANSIT";
  if (status === "COMPLETED" || status === "DONE" || status === "DELIVERED") return "COMPLETED";
  if (status === "CANCELLED" || status === "CANCELED" || status === "CANCEL") return "CANCELLED";
  return "READY";
}

function normalizeVehicleType(value: string | null): VehicleInfo["type"] {
  const text = (value ?? "").toUpperCase();
  if (text.includes("VAN")) return "VAN";
  if (text.includes("SEDAN") || text.includes("CAR")) return "SEDAN";
  return "TRUCK";
}

function normalizeRating(average: number): DriverRating {
  if (average >= 4.8) return DriverRating.EXCELLENT;
  if (average >= 4.4) return DriverRating.GOOD;
  if (average >= 4.0) return DriverRating.FAIR;
  return DriverRating.POOR;
}

function normalizeAdminDriverStatus(value: string | null | undefined, fallback: DriverStatus): DriverStatus {
  const status = (value ?? "").trim().toUpperCase();
  if (status === "ACTIVE") return DriverStatus.ACTIVE;
  if (status === "SUSPENDED") return DriverStatus.SUSPENDED;
  if (status === "DRIVING_BLOCKED") return DriverStatus.PENDING_APPROVAL;
  return fallback;
}

function normalizeDriverToken(id: string): string {
  return id.trim().toUpperCase().replace(/^D-/, "");
}

function matchesDriverId(rowId: string, targetId: string): boolean {
  const left = normalizeDriverToken(rowId);
  const right = normalizeDriverToken(targetId);
  return left === right;
}

function parseDriverNumber(id: string): number | null {
  const normalized = normalizeDriverToken(id);
  if (!/^\d+$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapBackendMatch(raw: unknown): BackendMatch {
  const row = toRecord(raw);
  return {
    matchId: toOptionalNumberValue(row.matchId ?? row.match_id ?? row.id),
    quoteId: toOptionalNumberValue(row.quoteId ?? row.quote_id),
    driverId: toOptionalNumberValue(row.driverId ?? row.driver_id),
    accepted: Boolean(row.accepted),
    status: toStringValue(row.status, "READY"),
    createdAt: toStringValue(row.createdAt ?? row.created_at, "") || null,
    updatedAt: toStringValue(row.updatedAt ?? row.updated_at, "") || null,
  };
}

function mapBackendQuote(raw: unknown): BackendQuote {
  const row = toRecord(raw);
  return {
    quoteId: toOptionalNumberValue(row.quoteId ?? row.quote_id ?? row.id),
    shipperId: toOptionalNumberValue(row.shipperId ?? row.shipper_id),
    originAddress: toStringValue(row.originAddress ?? row.origin_address, "-"),
    destinationAddress: toStringValue(row.destinationAddress ?? row.destination_address, "-"),
    distanceKm: toOptionalNumberValue(row.distanceKm ?? row.distance_km),
    weightKg: toOptionalNumberValue(row.weightKg ?? row.weight_kg),
    desiredPrice: toOptionalNumberValue(row.desiredPrice ?? row.desired_price),
    finalPrice: toOptionalNumberValue(row.finalPrice ?? row.final_price),
    createdAt: toStringValue(row.createdAt ?? row.created_at, "") || null,
  };
}

function mapBackendSettlement(raw: unknown): BackendSettlement {
  const row = toRecord(raw);
  return {
    settlementId: toOptionalNumberValue(row.settlementId ?? row.settlement_id ?? row.id),
    matchId: toOptionalNumberValue(row.matchId ?? row.match_id),
    driverId: toOptionalNumberValue(row.driverId ?? row.driver_id),
    totalFare: toOptionalNumberValue(row.totalFare ?? row.total_fare),
    driverPayout: toOptionalNumberValue(row.driverPayout ?? row.driver_payout),
    settlementStatus: toStringValue(row.settlementStatus ?? row.settlement_status, "") || null,
    completedAt: toStringValue(row.completedAt ?? row.completed_at, "") || null,
    createdAt: toStringValue(row.createdAt ?? row.created_at, "") || null,
  };
}

function mapBackendTruck(raw: unknown): BackendTruck {
  const row = toRecord(raw);
  return {
    truckId: toOptionalNumberValue(row.truckId ?? row.truck_id ?? row.id),
    driverId: toOptionalNumberValue(row.driverId ?? row.driver_id),
    vehicleType: toStringValue(row.vehicleType ?? row.vehicle_type, "") || null,
    vehicleBodyType: toStringValue(row.vehicleBodyType ?? row.vehicle_body_type, "") || null,
    maxWeight: toOptionalNumberValue(row.maxWeight ?? row.max_weight),
    maxVolume: toOptionalNumberValue(row.maxVolume ?? row.max_volume),
    name: toStringValue(row.name, "") || null,
    approved: typeof row.approved === "boolean" ? row.approved : null,
    insurance: toStringValue(row.insurance, "") || null,
    tonnage: toOptionalNumberValue(row.tonnage),
    createdAt: toStringValue(row.createdAt ?? row.created_at, "") || null,
    updatedAt: toStringValue(row.updatedAt ?? row.updated_at, "") || null,
  };
}

function mapBackendAdminDriverUser(raw: unknown): BackendAdminDriverUser | null {
  const row = toRecord(raw);
  const id = toStringValue(row.id, "").trim();
  if (!id) return null;
  return {
    id,
    role: toStringValue(row.role, "").trim(),
    name: toStringValue(row.name, "").trim(),
    phone: toStringValue(row.phone, "").trim(),
    status: toStringValue(row.status, "").trim(),
    createdAt: toStringValue(row.createdAt ?? row.created_at, "") || null,
  };
}

function isDriverUser(row: BackendAdminDriverUser): boolean {
  const role = row.role.trim().toUpperCase();
  if (role === "DRIVER") return true;
  return row.id.trim().toUpperCase().startsWith("D-");
}

async function fetchMatches(): Promise<BackendMatch[]> {
  try {
    const response = await apiClient.get<unknown>(apiPaths.adminTransportMatches);
    return pickListPayload(response.data).map(mapBackendMatch);
  } catch {
    return [];
  }
}

async function fetchQuotes(): Promise<BackendQuote[]> {
  try {
    const response = await apiClient.get<unknown>(apiPaths.adminTransportQuotes);
    return pickListPayload(response.data).map(mapBackendQuote);
  } catch {
    return [];
  }
}

async function fetchSettlements(): Promise<BackendSettlement[]> {
  try {
    const response = await apiClient.get<unknown>(apiPaths.adminTransportSettlements);
    return pickListPayload(response.data).map(mapBackendSettlement);
  } catch {
    return [];
  }
}

async function fetchTrucks(): Promise<BackendTruck[]> {
  try {
    const response = await apiClient.get<unknown>(apiPaths.adminTrucksPending);
    return pickListPayload(response.data).map(mapBackendTruck);
  } catch {
    return [];
  }
}

async function fetchAdminDriverUsers(): Promise<BackendAdminDriverUser[]> {
  return [];
}

function deriveLiveDrivers(
  matches: BackendMatch[],
  quotes: BackendQuote[],
  settlements: BackendSettlement[],
  trucks: BackendTruck[],
  notifications: BackendNotification[],
  adminDrivers: BackendAdminDriverUser[],
): Driver[] {
  const driverIds = new Set<string>();
  const adminDriverByToken = new Map<string, BackendAdminDriverUser>();

  for (const adminDriver of adminDrivers) {
    adminDriverByToken.set(normalizeDriverToken(adminDriver.id), adminDriver);
    driverIds.add(adminDriver.id.trim().toUpperCase());
  }

  for (const truck of trucks) {
    if (typeof truck.driverId === "number") driverIds.add(`D-${truck.driverId}`);
  }
  for (const match of matches) {
    if (typeof match.driverId === "number") driverIds.add(`D-${match.driverId}`);
  }
  for (const settlement of settlements) {
    if (typeof settlement.driverId === "number") driverIds.add(`D-${settlement.driverId}`);
  }

  const quoteById = new Map<number, BackendQuote>();
  for (const quote of quotes) {
    if (typeof quote.quoteId === "number") quoteById.set(quote.quoteId, quote);
  }

  const settlementsByMatchId = new Map<number, BackendSettlement>();
  for (const settlement of settlements) {
    if (typeof settlement.matchId === "number") settlementsByMatchId.set(settlement.matchId, settlement);
  }

  return Array.from(driverIds)
    .map((driverId) => {
      const driverNumber = parseDriverNumber(driverId);
      const adminDriver = adminDriverByToken.get(normalizeDriverToken(driverId));

      const relevantMatches = matches.filter((match) => {
        if (driverNumber === null) return true;
        return match.driverId === driverNumber;
      });

      const completedMatches = relevantMatches.filter((match) => normalizeMatchStatus(match.status) === "COMPLETED").length;
      const acceptedMatches = relevantMatches.filter((match) => Boolean(match.accepted) || typeof match.driverId === "number").length;
      const totalMatches = relevantMatches.length;
      const completionRate = totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0;
      const acceptanceRate = totalMatches > 0 ? (acceptedMatches / totalMatches) * 100 : 0;

      const relevantSettlements = settlements.filter((settlement) => {
        if (driverNumber !== null && settlement.driverId !== null) return settlement.driverId === driverNumber;
        if (driverNumber !== null && settlement.driverId === null && settlement.matchId !== null) {
          const linkedMatch = relevantMatches.find((match) => match.matchId === settlement.matchId);
          return Boolean(linkedMatch);
        }
        return driverNumber === null;
      });

      const settlementEarnings = relevantSettlements.reduce(
        (sum, settlement) => sum + (settlement.driverPayout ?? Math.round((settlement.totalFare ?? 0) * 0.8)),
        0,
      );

      const quoteEstimatedEarnings = relevantMatches.reduce((sum, match) => {
        if (typeof match.quoteId !== "number") return sum;
        const quote = quoteById.get(match.quoteId);
        const price = quote?.finalPrice ?? quote?.desiredPrice ?? 0;
        return sum + Math.round(price * 0.8);
      }, 0);

      const totalEarnings = settlementEarnings > 0 ? settlementEarnings : quoteEstimatedEarnings;
      const monthlyEarnings = Math.round(totalEarnings / 3);

      const relevantMatchIds = new Set(
        relevantMatches.map((match) => match.matchId).filter((value): value is number => typeof value === "number"),
      );
      const delaySignals = notifications.filter((notification) => {
        if (notification.matchId !== null && relevantMatchIds.size > 0 && !relevantMatchIds.has(notification.matchId)) {
          return false;
        }
        const text = `${notification.type ?? ""} ${notification.message}`.toLowerCase();
        return /(delay|late|deviation|warning|violation|cancel)/.test(text);
      });

      const delayRate = totalMatches > 0 ? delaySignals.length / totalMatches : 0;
      const onTimeRate = Math.max(0, Math.min(100, 100 - delayRate * 100));
      const averageRating = Number(Math.max(0, Math.min(5, 4.1 + completionRate / 200 - delayRate)).toFixed(1));

      const driverTrucks = trucks.filter((truck) => (driverNumber === null ? true : truck.driverId === driverNumber));
      const latestTruck = [...driverTrucks].sort((a, b) => {
        const aTime = Date.parse(a.updatedAt ?? a.createdAt ?? "");
        const bTime = Date.parse(b.updatedAt ?? b.createdAt ?? "");
        const safeA = Number.isFinite(aTime) ? aTime : 0;
        const safeB = Number.isFinite(bTime) ? bTime : 0;
        return safeB - safeA;
      })[0];

      const inferredStatus: DriverStatus =
        latestTruck?.approved === false
          ? DriverStatus.SUSPENDED
          : latestTruck?.approved === null || typeof latestTruck === "undefined"
            ? DriverStatus.PENDING_APPROVAL
            : DriverStatus.ACTIVE;

      const status = liveStatusOverrides.get(driverId) ?? normalizeAdminDriverStatus(adminDriver?.status, inferredStatus);
      const licenseNo = driverNumber !== null ? `LIC-${String(driverNumber).padStart(8, "0")}` : "LIC-ME";

      const violations = delaySignals.slice(0, 5).map((signal) => {
        const text = `${signal.type ?? ""} ${signal.message}`.toLowerCase();
        const severity = /(critical|severe|fatal|suspend)/.test(text) ? "HIGH" : /(warning|delay|late)/.test(text) ? "MEDIUM" : "LOW";
        return {
          date: signal.createdAt ?? new Date().toISOString(),
          type: signal.type ?? "SIGNAL",
          severity,
        };
      });

      return {
        id: driverId,
        name: adminDriver?.name || (driverNumber !== null ? `Driver-${driverNumber}` : driverId),
        licenseNo,
        phone: adminDriver?.phone || "-",
        birthDate: "-",
        address: "-",
        registeredAt:
          adminDriver?.createdAt ?? latestTruck?.createdAt ?? settlements[0]?.createdAt ?? quotes[0]?.createdAt ?? new Date().toISOString(),
        status,
        rating: normalizeRating(averageRating),
        vehicle: {
          plateNumber: latestTruck?.name ?? (driverNumber !== null ? `TRUCK-${driverNumber}` : "-"),
          type: normalizeVehicleType(latestTruck?.vehicleType ?? null),
          capacity: latestTruck?.maxVolume ?? latestTruck?.maxWeight ?? 0,
          insuranceExpiredAt: latestTruck?.updatedAt ?? new Date().toISOString(),
          registeredAt: latestTruck?.createdAt ?? new Date().toISOString(),
        },
        stats: {
          totalMatches,
          completedMatches,
          averageRating,
          totalEarnings,
          monthlyEarnings,
          acceptanceRate,
          completionRate,
          onTimeRate,
        },
        violations,
        certifications: latestTruck?.insurance ? ["INSURANCE_VERIFIED"] : ["INSURANCE_PENDING"],
        notes: latestTruck?.approved === false ? "Vehicle approval is rejected." : undefined,
      } satisfies Driver;
    })
    .sort((a, b) => b.stats.averageRating - a.stats.averageRating);
}

function applyDriverFilters(items: Driver[], filter: DriverFilter): Driver[] {
  const keyword = filter.search?.trim().toLowerCase() ?? "";

  return items.filter((driver) => {
    if (keyword) {
      const text = `${driver.id} ${driver.name} ${driver.phone} ${driver.vehicle.plateNumber}`.toLowerCase();
      if (!text.includes(keyword)) return false;
    }
    if (filter.status && driver.status !== filter.status) return false;
    if (filter.rating && driver.rating !== filter.rating) return false;
    return true;
  });
}

function paginate<T>(items: T[], page: number, size: number): T[] {
  const start = (page - 1) * size;
  return items.slice(start, start + size);
}

async function fetchLiveDrivers(filter: DriverFilter): Promise<DriverResponse> {
  const [matches, quotes, settlements, trucks, adminDrivers] = await Promise.all([
    fetchMatches(),
    fetchQuotes(),
    fetchSettlements(),
    fetchTrucks(),
    fetchAdminDriverUsers(),
  ]);

  const rows = deriveLiveDrivers(matches, quotes, settlements, trucks, [], adminDrivers);
  const filtered = applyDriverFilters(rows, filter);
  const page = filter.page ?? 1;
  const size = filter.size ?? 20;

  return {
    items: paginate(filtered, page, size),
    total: filtered.length,
  };
}

async function fetchLiveDriver(driverId: string): Promise<Driver | null> {
  const response = await fetchLiveDrivers({ page: 1, size: 500 });
  return response.items.find((row) => matchesDriverId(row.id, driverId)) ?? null;
}

function buildMockDeliveries(driverId: string, totalMatches: number): DeliveryLog[] {
  const count = Math.min(totalMatches, 40);

  return Array.from({ length: count }, (_, index) => {
    const status = MOCK_DELIVERY_STATUSES[index % MOCK_DELIVERY_STATUSES.length];
    const scheduledAt = new Date(Date.now() - (index + 1) * 86400000).toISOString();
    const completedAt = status === "COMPLETED" ? new Date(Date.parse(scheduledAt) + 2 * 3600000).toISOString() : undefined;
    const price = 120000 + index * 5500;

    return {
      id: `${driverId}-delivery-${index + 1}`,
      quoteId: `Q-${1000 + index}`,
      shipperId: `S-${200 + (index % 50)}`,
      shipperName: `Shipper-${(index % 50) + 1}`,
      origin: `Origin-${index + 1}`,
      destination: `Destination-${index + 1}`,
      weightKg: 200 + index * 10,
      price,
      earnedAmount: Math.round(price * 0.8),
      status,
      scheduledAt,
      completedAt,
      distance: 20 + (index % 150),
      duration: 35 + (index % 190),
      actualDuration: status === "COMPLETED" ? 30 + (index % 180) : undefined,
      rating: status === "COMPLETED" ? Number((4 + (index % 10) * 0.1).toFixed(1)) : undefined,
      review: status === "COMPLETED" ? "Completed successfully." : undefined,
    };
  });
}

export async function fetchDrivers(filter: DriverFilter = {}): Promise<DriverResponse> {
  if (!isMockModeEnabled()) {
    return fetchLiveDrivers(filter);
  }

  const page = filter.page ?? 1;
  const size = filter.size ?? 20;
  const filtered = applyDriverFilters(ALL_DRIVERS, filter);
  return {
    items: paginate(filtered, page, size),
    total: filtered.length,
  };
}

export async function fetchDriver(driverId: string): Promise<Driver | null> {
  if (!isMockModeEnabled()) {
    return fetchLiveDriver(driverId);
  }
  return ALL_DRIVERS.find((item) => matchesDriverId(item.id, driverId)) ?? null;
}

export async function updateDriverStatus(driverId: string, status: DriverStatus): Promise<boolean> {
  if (!isMockModeEnabled()) {
    const target = await fetchLiveDriver(driverId);
    if (!target) return false;
    liveStatusOverrides.set(target.id, status);
    return true;
  }

  const target = ALL_DRIVERS.find((item) => matchesDriverId(item.id, driverId));
  if (!target) return false;
  target.status = status;
  return true;
}

export async function fetchDriverViolations(driverId: string): Promise<{
  total: number;
  critical: number;
  severe: number;
  minor: number;
  items: Array<{ date: string; type: string; severity: string }>;
} | null> {
  const driver = await fetchDriver(driverId);
  if (!driver) return null;

  const critical = driver.violations.filter((item) => item.severity.toUpperCase() === "HIGH").length;
  const severe = driver.violations.filter((item) => item.severity.toUpperCase() === "MEDIUM").length;
  const minor = driver.violations.filter((item) => item.severity.toUpperCase() === "LOW").length;

  return {
    total: driver.violations.length,
    critical,
    severe,
    minor,
    items: driver.violations,
  };
}

export async function fetchDriverDeliveries(driverId: string): Promise<DeliveryLog[]> {
  if (!isMockModeEnabled()) {
    const [matches, quotes, settlements] = await Promise.all([fetchMatches(), fetchQuotes(), fetchSettlements()]);
    const target = await fetchLiveDriver(driverId);
    if (!target) return [];

    const targetNumber = parseDriverNumber(target.id);
    const quoteById = new Map<number, BackendQuote>();
    for (const quote of quotes) {
      if (typeof quote.quoteId === "number") quoteById.set(quote.quoteId, quote);
    }

    const settlementByMatchId = new Map<number, BackendSettlement>();
    for (const settlement of settlements) {
      if (typeof settlement.matchId === "number") settlementByMatchId.set(settlement.matchId, settlement);
    }

    return matches
      .filter((match) => {
        if (targetNumber === null) return true;
        return match.driverId === targetNumber;
      })
      .map((match) => {
        const quote = typeof match.quoteId === "number" ? quoteById.get(match.quoteId) : undefined;
        const settlement = typeof match.matchId === "number" ? settlementByMatchId.get(match.matchId) : undefined;
        const status = normalizeMatchStatus(match.status);
        const price = settlement?.totalFare ?? quote?.finalPrice ?? quote?.desiredPrice ?? 0;
        const earnedAmount = settlement?.driverPayout ?? Math.round(price * 0.8);

        return {
          id: `delivery-${match.matchId ?? Date.now()}`,
          quoteId: typeof match.quoteId === "number" ? `Q-${match.quoteId}` : "-",
          shipperId: typeof quote?.shipperId === "number" ? `S-${quote.shipperId}` : "-",
          shipperName: typeof quote?.shipperId === "number" ? `Shipper-${quote.shipperId}` : "-",
          origin: quote?.originAddress ?? "-",
          destination: quote?.destinationAddress ?? "-",
          weightKg: quote?.weightKg ?? 0,
          price,
          earnedAmount,
          status,
          scheduledAt: match.createdAt ?? new Date().toISOString(),
          completedAt: status === "COMPLETED" ? settlement?.completedAt ?? match.updatedAt ?? undefined : undefined,
          distance: quote?.distanceKm ?? 0,
          duration: status === "COMPLETED" ? 120 : 0,
          actualDuration: status === "COMPLETED" ? 110 : undefined,
          rating: status === "COMPLETED" ? 4.4 : undefined,
          review: status === "COMPLETED" ? "Completed successfully." : undefined,
        } satisfies DeliveryLog;
      })
      .sort((a, b) => Date.parse(b.scheduledAt) - Date.parse(a.scheduledAt));
  }

  const driver = ALL_DRIVERS.find((item) => matchesDriverId(item.id, driverId));
  if (!driver) return [];
  return buildMockDeliveries(driver.id, driver.stats.totalMatches);
}
