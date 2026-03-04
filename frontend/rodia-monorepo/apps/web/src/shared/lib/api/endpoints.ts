type ApiPathEnv = {
  VITE_API_AUTH_ADMIN_LOGIN_PATH?: string;
  VITE_API_AUTH_LOGOUT_PATH?: string;
  VITE_API_ADMIN_ANNOUNCEMENTS_PATH?: string;
  VITE_API_PUBLIC_ANNOUNCEMENTS_PATH?: string;
  VITE_API_NOTIFICATIONS_ME_PATH?: string;
  VITE_API_DRIVER_MATCHES_PATH?: string;
  VITE_API_SHIPPER_MATCHES_ME_PATH?: string;
  VITE_API_SHIPPER_QUOTES_PATH?: string;
  VITE_API_DRIVER_TRUCKS_PATH?: string;
  VITE_API_ADMIN_SHIPPERS_PATH?: string;
  VITE_API_ADMIN_DRIVERS_PATH?: string;
  VITE_API_ADMIN_USERS_PATH?: string;
  VITE_API_ADMIN_DEVIATIONS_PATH?: string;
  VITE_API_ADMIN_SANCTIONS_LOGS_PATH?: string;
  VITE_API_ADMIN_ACTIVITY_LOGS_PATH?: string;
  VITE_API_ADMIN_TRUCKS_PENDING_PATH?: string;
  VITE_API_ADMIN_TRUCK_APPROVAL_PATH?: string;
  VITE_API_ADMIN_SETTLEMENT_APPROVALS_PATH?: string;
  VITE_API_ADMIN_SETTLEMENT_HISTORY_PATH?: string;
  VITE_API_ADMIN_SETTLEMENT_REVIEW_PATH?: string;
  VITE_API_SHIPPER_SETTLEMENTS_PATH?: string;
  VITE_API_DRIVER_SETTLEMENTS_PATH?: string;
  VITE_API_SHIPPER_SETTLEMENT_CONFIRM_PATH?: string;
  VITE_API_ADMIN_TRANSPORT_QUOTES_PATH?: string;
  VITE_API_ADMIN_TRANSPORT_MATCHES_PATH?: string;
  VITE_API_ADMIN_TRANSPORT_PAYMENTS_PATH?: string;
  VITE_API_ADMIN_TRANSPORT_SETTLEMENTS_PATH?: string;
  VITE_API_ADMIN_ORDER_CANCELLATION_REQUESTS_PATH?: string;
  VITE_API_ADMIN_ORDER_CANCELLATION_REVIEW_PATH?: string;
};

function resolvePath(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  const next = value.trim();
  return next.length > 0 ? next : fallback;
}

function resolveTemplate(template: string, fallback: string, params: Record<string, string>): string {
  let resolved = template;
  for (const [key, value] of Object.entries(params)) {
    resolved = resolved.replace(`:${key}`, encodeURIComponent(value));
  }
  if (!resolved.includes(":")) return resolved;

  let fallbackResolved = fallback;
  for (const [key, value] of Object.entries(params)) {
    fallbackResolved = fallbackResolved.replace(`:${key}`, encodeURIComponent(value));
  }
  return fallbackResolved;
}

const env = import.meta.env as ApiPathEnv;

const adminSettlementReviewTemplate = resolvePath(
  env.VITE_API_ADMIN_SETTLEMENT_REVIEW_PATH,
  "/api/admin/settlements/:settlementId/review",
);
const adminTruckApprovalTemplate = resolvePath(
  env.VITE_API_ADMIN_TRUCK_APPROVAL_PATH,
  "/api/admin/trucks/:truckId/approval",
);
const shipperSettlementConfirmTemplate = resolvePath(
  env.VITE_API_SHIPPER_SETTLEMENT_CONFIRM_PATH,
  "/api/shipper/settlements/:matchId/confirm",
);
const adminOrderCancellationReviewTemplate = resolvePath(
  env.VITE_API_ADMIN_ORDER_CANCELLATION_REVIEW_PATH,
  "/api/admin/orders/cancellations/:requestId/review",
);

export const apiPaths = {
  authAdminLogin: resolvePath(env.VITE_API_AUTH_ADMIN_LOGIN_PATH, "/api/auth/admin/login"),
  authLogout: resolvePath(env.VITE_API_AUTH_LOGOUT_PATH, "/api/auth/logout"),

  adminAnnouncements: resolvePath(env.VITE_API_ADMIN_ANNOUNCEMENTS_PATH, "/api/admin/announcements"),
  publicAnnouncements: resolvePath(env.VITE_API_PUBLIC_ANNOUNCEMENTS_PATH, "/api/announcements"),
  notificationsMe: resolvePath(env.VITE_API_NOTIFICATIONS_ME_PATH, "/api/notifications/me"),

  driverMatches: resolvePath(env.VITE_API_DRIVER_MATCHES_PATH, "/api/driver/matches"),
  shipperMatchesMe: resolvePath(env.VITE_API_SHIPPER_MATCHES_ME_PATH, "/api/shipper/matches/me"),
  shipperQuotes: resolvePath(env.VITE_API_SHIPPER_QUOTES_PATH, "/api/shipper/quotes"),
  driverTrucks: resolvePath(env.VITE_API_DRIVER_TRUCKS_PATH, "/api/driver/trucks"),

  adminShippers: resolvePath(env.VITE_API_ADMIN_SHIPPERS_PATH, "/api/admin/users/shippers"),
  adminDrivers: resolvePath(env.VITE_API_ADMIN_DRIVERS_PATH, "/api/admin/users/drivers"),
  adminUsers: resolvePath(env.VITE_API_ADMIN_USERS_PATH, "/api/admin/users"),
  adminDeviations: resolvePath(env.VITE_API_ADMIN_DEVIATIONS_PATH, "/api/admin/ops/deviations"),
  adminSanctionsLogs: resolvePath(env.VITE_API_ADMIN_SANCTIONS_LOGS_PATH, "/api/admin/ops/sanctions/logs"),
  adminActivityLogs: resolvePath(env.VITE_API_ADMIN_ACTIVITY_LOGS_PATH, "/api/admin/ops/activity-logs"),
  adminTrucksPending: resolvePath(env.VITE_API_ADMIN_TRUCKS_PENDING_PATH, "/api/admin/trucks/pending"),
  adminTruckApproval: (truckId: string) =>
    resolveTemplate(
      adminTruckApprovalTemplate,
      "/api/admin/trucks/:truckId/approval",
      { truckId },
    ),

  adminSettlementApprovals: resolvePath(env.VITE_API_ADMIN_SETTLEMENT_APPROVALS_PATH, "/api/admin/settlements/approvals"),
  adminSettlementHistory: resolvePath(env.VITE_API_ADMIN_SETTLEMENT_HISTORY_PATH, "/api/admin/settlements/approval-history"),
  adminSettlementReview: (settlementId: string) =>
    resolveTemplate(
      adminSettlementReviewTemplate,
      "/api/admin/settlements/:settlementId/review",
      { settlementId },
    ),

  shipperSettlements: resolvePath(env.VITE_API_SHIPPER_SETTLEMENTS_PATH, "/api/shipper/settlements"),
  driverSettlements: resolvePath(env.VITE_API_DRIVER_SETTLEMENTS_PATH, "/api/driver/settlements"),
  shipperSettlementConfirm: (matchId: string) =>
    resolveTemplate(
      shipperSettlementConfirmTemplate,
      "/api/shipper/settlements/:matchId/confirm",
      { matchId },
    ),
  adminTransportQuotes: resolvePath(env.VITE_API_ADMIN_TRANSPORT_QUOTES_PATH, "/api/admin/quotes"),
  adminTransportMatches: resolvePath(env.VITE_API_ADMIN_TRANSPORT_MATCHES_PATH, "/api/admin/matches"),
  adminTransportPayments: resolvePath(env.VITE_API_ADMIN_TRANSPORT_PAYMENTS_PATH, "/api/admin/payments"),
  adminTransportSettlements: resolvePath(env.VITE_API_ADMIN_TRANSPORT_SETTLEMENTS_PATH, "/api/admin/settlements"),
  adminOrderCancellationRequests: resolvePath(
    env.VITE_API_ADMIN_ORDER_CANCELLATION_REQUESTS_PATH,
    "/api/admin/orders/cancellations",
  ),
  adminOrderCancellationReview: (requestId: string) =>
    resolveTemplate(
      adminOrderCancellationReviewTemplate,
      "/api/admin/orders/cancellations/:requestId/review",
      { requestId },
    ),
} as const;
