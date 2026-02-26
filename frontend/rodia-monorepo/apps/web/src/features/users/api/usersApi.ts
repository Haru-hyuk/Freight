import type {
  UserDetailResponse,
  UserListItem,
  UserListQuery,
  UserListResponse,
  UserRole,
  UserStatus,
} from "../model/types";
import {
  fetchShipper,
  fetchShipperShipments,
  fetchShippers,
  ShipperStatus,
  type ShipmentLog,
} from "./shipperApi";
import {
  DriverStatus,
  fetchDriver,
  fetchDriverDeliveries,
  fetchDrivers,
  type DeliveryLog,
} from "./driverApi";

function toDateText(value: string | null | undefined): string {
  if (!value) return "-";
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  return new Date(parsed).toISOString().slice(0, 16).replace("T", " ");
}

function mapShipperStatus(status: ShipperStatus): UserStatus {
  if (status === ShipperStatus.ACTIVE) return "ACTIVE";
  return "SUSPENDED";
}

function mapDriverStatus(status: DriverStatus): UserStatus {
  if (status === DriverStatus.ACTIVE) return "ACTIVE";
  if (status === DriverStatus.PENDING_APPROVAL) return "DRIVING_BLOCKED";
  return "SUSPENDED";
}

async function listAllUsers(): Promise<UserListItem[]> {
  const [shipperRows, driverRows] = await Promise.all([
    fetchShippers({ page: 1, size: 500 }),
    fetchDrivers({ page: 1, size: 500 }),
  ]);

  const shippers: UserListItem[] = shipperRows.items.map((shipper) => ({
    id: shipper.id,
    role: "SHIPPER",
    name: shipper.name,
    email: shipper.email,
    phone: shipper.phone,
    status: mapShipperStatus(shipper.status),
    createdAt: toDateText(shipper.registeredAt),
    quotesCount: shipper.stats.totalShipments,
    matchesCount: shipper.stats.completedShipments,
  }));

  const drivers: UserListItem[] = driverRows.items.map((driver) => ({
    id: driver.id,
    role: "DRIVER",
    name: driver.name,
    email: undefined,
    phone: driver.phone,
    status: mapDriverStatus(driver.status),
    createdAt: toDateText(driver.registeredAt),
    quotesCount: 0,
    matchesCount: driver.stats.totalMatches,
  }));

  return [...shippers, ...drivers].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function applyUserFilters(items: UserListItem[], query: UserListQuery): UserListItem[] {
  const keyword = query.q?.trim().toLowerCase() ?? "";

  return items.filter((item) => {
    if (query.role && item.role !== query.role) return false;
    if (query.status && item.status !== query.status) return false;
    if (!keyword) return true;

    const text = `${item.id} ${item.name} ${item.email ?? ""} ${item.phone ?? ""}`.toLowerCase();
    return text.includes(keyword);
  });
}

function paginate<T>(items: T[], page: number, size: number): T[] {
  const start = (page - 1) * size;
  return items.slice(start, start + size);
}

function mapShipmentToQuote(shipment: ShipmentLog): { id: string; status: string; createdAt: string } {
  return {
    id: shipment.quoteId,
    status: shipment.status,
    createdAt: toDateText(shipment.scheduledAt),
  };
}

function mapShipmentToMatch(shipment: ShipmentLog): { id: string; status: string; createdAt: string } {
  return {
    id: shipment.id,
    status: shipment.status,
    createdAt: toDateText(shipment.scheduledAt),
  };
}

function mapShipmentToSettlement(shipment: ShipmentLog): { id: string; status: string; totalFare?: number; createdAt: string } {
  return {
    id: `S-${shipment.id}`,
    status: shipment.status === "COMPLETED" ? "COMPLETED" : "PROCESSING",
    totalFare: shipment.price,
    createdAt: toDateText(shipment.completedAt ?? shipment.scheduledAt),
  };
}

function mapShipmentToDeviation(shipment: ShipmentLog): { id: string; severity: string; status: string; createdAt: string }[] {
  const text = `${shipment.status} ${shipment.review ?? ""}`.toUpperCase();
  if (!(text.includes("CANCEL") || text.includes("DELAY") || text.includes("LATE"))) return [];

  return [
    {
      id: `DV-${shipment.id}`,
      severity: text.includes("CANCEL") ? "SEVERE" : "MODERATE",
      status: "OPEN",
      createdAt: toDateText(shipment.completedAt ?? shipment.scheduledAt),
    },
  ];
}

function mapDeliveryToMatch(delivery: DeliveryLog): { id: string; status: string; createdAt: string } {
  return {
    id: delivery.id,
    status: delivery.status,
    createdAt: toDateText(delivery.scheduledAt),
  };
}

function mapDeliveryToSettlement(delivery: DeliveryLog): { id: string; status: string; totalFare?: number; createdAt: string } {
  return {
    id: `S-${delivery.id}`,
    status: delivery.status === "COMPLETED" ? "COMPLETED" : "PROCESSING",
    totalFare: delivery.earnedAmount,
    createdAt: toDateText(delivery.completedAt ?? delivery.scheduledAt),
  };
}

function mapDeliveryToDeviation(delivery: DeliveryLog): { id: string; severity: string; status: string; createdAt: string }[] {
  const text = `${delivery.status} ${delivery.review ?? ""}`.toUpperCase();
  if (!(text.includes("CANCEL") || text.includes("DELAY") || text.includes("LATE"))) return [];

  return [
    {
      id: `DV-${delivery.id}`,
      severity: text.includes("CANCEL") ? "SEVERE" : "MODERATE",
      status: "OPEN",
      createdAt: toDateText(delivery.completedAt ?? delivery.scheduledAt),
    },
  ];
}

function inferRoleFromUserId(userId: string): UserRole | null {
  const normalized = userId.trim().toUpperCase();
  if (normalized.startsWith("D-") || normalized.startsWith("DRIVER_")) return "DRIVER";
  if (normalized.startsWith("S-") || normalized.startsWith("SHIPPER_")) return "SHIPPER";
  return null;
}

export async function fetchUsers(query: UserListQuery): Promise<UserListResponse> {
  const page = query.page ?? 1;
  const size = query.size ?? 20;
  const allUsers = await listAllUsers();
  const filtered = applyUserFilters(allUsers, query);

  return {
    items: paginate(filtered, page, size),
    total: filtered.length,
  };
}

export async function fetchUserDetail(userId: string): Promise<UserDetailResponse> {
  const inferredRole = inferRoleFromUserId(userId);

  if (inferredRole !== "DRIVER") {
    const shipper = await fetchShipper(userId);
    if (shipper) {
      const shipments = await fetchShipperShipments(shipper.id);

      return {
        user: {
          id: shipper.id,
          role: "SHIPPER",
          name: shipper.name,
          email: shipper.email,
          phone: shipper.phone,
          status: mapShipperStatus(shipper.status),
          createdAt: toDateText(shipper.registeredAt),
        },
        quotes: shipments.map(mapShipmentToQuote),
        matches: shipments.map(mapShipmentToMatch),
        settlements: shipments.map(mapShipmentToSettlement),
        deviations: shipments.flatMap(mapShipmentToDeviation),
      };
    }
  }

  if (inferredRole !== "SHIPPER") {
    const driver = await fetchDriver(userId);
    if (driver) {
      const deliveries = await fetchDriverDeliveries(driver.id);

      return {
        user: {
          id: driver.id,
          role: "DRIVER",
          name: driver.name,
          email: undefined,
          phone: driver.phone,
          status: mapDriverStatus(driver.status),
          createdAt: toDateText(driver.registeredAt),
        },
        quotes: [],
        matches: deliveries.map(mapDeliveryToMatch),
        settlements: deliveries.map(mapDeliveryToSettlement),
        deviations: deliveries.flatMap(mapDeliveryToDeviation),
      };
    }
  }

  throw new Error("USER_NOT_FOUND");
}
