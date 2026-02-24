/**
 * dashboard/model/adminTypes.ts
 * 관리자 대시보드용 통합 데이터 타입
 */

export type UserRole = "SHIPPER" | "DRIVER" | "ADMIN";
export type MatchStatus = "PENDING" | "ACCEPTED" | "IN_TRANSIT" | "COMPLETED" | "CANCELED";
export type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED";
export type SettlementStatus = "PENDING" | "COMPLETED" | "FAILED";
export type DeviationSeverity = "SEVERE" | "MODERATE" | "MINOR";

// --- User Management ---
export interface UserSummary {
  userId: string;
  email: string;
  name: string;
  phone: string;
  role: UserRole;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "PENDING_VERIFICATION";
  createdAt: string;
  lastLoginAt?: string;
  totalMatches?: number;
  rating?: number;
  completionRate?: number;
}

export interface ShipperDetail extends UserSummary {
  companyName: string;
  bizRegNo: string;
  address: string;
  totalOrdersCreated: number;
  totalSpent: number;
  averageOrderValue: number;
  verificationStatus: "VERIFIED" | "PENDING" | "REJECTED";
}

export interface DriverDetail extends UserSummary {
  licenseNo: string;
  licenseExpireDate: string;
  trucksCount: number;
  totalTrips: number;
  totalEarnings: number;
  averageTripEarnings: number;
  verificationStatus: "VERIFIED" | "PENDING" | "REJECTED";
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
}

export interface TruckInfo {
  truckId: string;
  driverId: string;
  model: string;
  licensePlate: string;
  capacity: number;
  tonnage: number;
  type: "SMALL_TRUCK" | "MEDIUM_TRUCK" | "LARGE_TRUCK";
  verificationStatus: "VERIFIED" | "PENDING" | "REJECTED";
  lastInspectionDate: string;
}

// --- Quote & Matching ---
export interface QuoteSummary {
  quoteId: string;
  shipperId: string;
  shipperName: string;
  originAddress: string;
  destinationAddress: string;
  cargoWeight: number;
  cargoVolume: number;
  proposedPrice: number;
  status: "OPEN" | "MATCHED" | "CANCELED" | "EXPIRED";
  allowsCombining: boolean;
  createdAt: string;
  matchCount: number;
}

export interface MatchingDetail {
  matchId: string;
  quoteId: string;
  shipperName: string;
  driverName: string;
  truckType: string;
  originAddress: string;
  destinationAddress: string;
  departureTime: string;
  expectedArrival: string;
  agreedPrice: number;
  status: MatchStatus;
  paymentStatus: PaymentStatus;
  settlementStatus: SettlementStatus;
  distanceKm: number;
  estimatedMinutes: number;
  actualMinutes?: number;
}

// --- Settlement & Payment ---
export interface SettlementRecord {
  settlementId: string;
  driverId: string;
  driverName: string;
  totalMatches: number;
  totalEarnings: number;
  platformFee: number;
  driverPayout: number;
  status: SettlementStatus;
  period: {
    startDate: string;
    endDate: string;
  };
  createdAt: string;
  completedAt?: string;
}

export interface DeviationEvent {
  deviationId: string;
  matchId: string;
  quoteId: string;
  shipperName: string;
  driverName: string;
  severity: DeviationSeverity;
  description: string;
  deviationPercent: number;
  adjustedAmount?: number;
  status: "REPORTED" | "UNDER_REVIEW" | "ADJUSTED" | "RESOLVED";
  reportedAt: string;
  resolvedAt?: string;
}

// --- Dashboard KPI ---
export interface AdminDashboardKPI {
  // User Stats
  totalShippers: number;
  totalDrivers: number;
  newShippersToday: number;
  newDriversToday: number;
  
  // Quote & Matching
  totalQuotesOpen: number;
  totalMatches: number;
  matchCompletionRate: number;
  averageMatchingTime: number;
  
  // Payment & Revenue
  totalRevenue: number;
  totalPlatformFee: number;
  totalSettlementAmount: number;
  deviationCasesOpen: number;
  
  // Performance
  averageShipperRating: number;
  averageDriverRating: number;
  driverCompletionRate: number;
  driverOnTimeRate: number;
}

export interface AdminDashboardData {
  kpi: AdminDashboardKPI;
  recentMatches: MatchingDetail[];
  deviationEvents: DeviationEvent[];
  pendingApprovals: {
    drivers: number;
    trucks: number;
  };
}

// --- Activity Log ---
export interface ActivityLog {
  logId: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  details: Record<string, any>;
  status: "SUCCESS" | "FAILURE";
}

// --- Pricing Management ---
export interface PricingRule {
  ruleId: string;
  from: string;
  to: string;
  basePrice: number;
  perKgPrice: number;
  perKmPrice: number;
  status: "ACTIVE" | "INACTIVE";
  appliedAt: string;
}
