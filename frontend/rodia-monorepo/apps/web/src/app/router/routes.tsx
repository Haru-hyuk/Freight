import { createBrowserRouter, Navigate } from "react-router-dom";

import App from "@/app/App";
import AdminLayout from "@/app/layouts/AdminLayout";
import AuthLayout from "@/app/layouts/AuthLayout";
import PrivateRoute from "@/app/router/PrivateRoute";

import LoginPage from "@/pages/auth/LoginPage";
import DashboardPage from "@/pages/dashboard/DashboardPage";
import DeliveryLiveMonitoringPage from "@/pages/delivery/DeliveryLiveMonitoringPage";
import DeliveryHistoryPage from "@/pages/delivery/DeliveryHistoryPage";
import DispatchManagementPage from "@/pages/dispatch/DispatchManagementPage";
import DriverApprovalPage from "@/pages/drivers/DriverApprovalPage";
import TruckApprovalPage from "@/pages/drivers/TruckApprovalPage";
import SettlementPage from "@/pages/settlement/SettlementPage";
import SettlementApprovalPage from "@/pages/settlement/SettlementApprovalPage";
import SettlementDetailsPage from "@/pages/settlement/SettlementDetailsPage";
import SettlementHistoryPage from "@/pages/settlement/SettlementHistoryPage";
import WithdrawalManagementPage from "@/pages/settlement/WithdrawalManagementPage";
import QuoteListPage from "@/pages/quotes/QuoteListPage";
import QuoteDetailPage from "@/pages/quotes/QuoteDetailPage";
import MatchingListPage from "@/pages/matchings/MatchingListPage";
import MatchingDetailPage from "@/pages/matchings/MatchingDetailPage";
import OrdersMonitoringPage from "@/pages/orders/OrdersMonitoringPage";
import OrderCancellationRequestsPage from "@/pages/orders/OrderCancellationRequestsPage";
import OrderCancellationRequestDetailPage from "@/pages/orders/OrderCancellationRequestDetailPage";

import UserListPage from "@/pages/users/UserListPage";
import ShipperListPage from "@/pages/users/ShipperListPage";
import DriverListPage from "@/pages/users/DriverListPage";
import UserDetailPage from "@/pages/users/UserDetailPage";

import SanctionsLogPage from "@/pages/sanctions/SanctionsLogPage";
import PricingManagementPage from "@/pages/ops/PricingManagementPage";
import DeviationManagementPage from "@/pages/ops/DeviationManagementPage";
import MatchingAnomalyManagementPage from "@/pages/ops/MatchingAnomalyManagementPage";
import ActivityLogPage from "@/pages/ops/ActivityLogPage";
import SettingsPage from "@/pages/ops/SettingsPage";
import NotFoundPage from "@/pages/not-found/NotFoundPage";

export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: "/login", element: <LoginPage /> },
          { path: "/", element: <Navigate to="/dashboard" replace /> },
        ],
      },
      {
        element: <PrivateRoute />,
        children: [
          {
            element: <AdminLayout />,
            children: [
              { path: "/dashboard", element: <DashboardPage /> },

              { path: "/delivery/live", element: <DeliveryLiveMonitoringPage /> },
              { path: "/delivery/history", element: <DeliveryHistoryPage /> },
              { path: "/dispatch", element: <DispatchManagementPage /> },
              { path: "/orders/monitoring", element: <OrdersMonitoringPage /> },
              { path: "/orders/cancellations", element: <OrderCancellationRequestsPage /> },
              { path: "/orders/cancellations/:requestId", element: <OrderCancellationRequestDetailPage /> },

              { path: "/drivers/approvals", element: <DriverApprovalPage /> },
              { path: "/trucks/approvals", element: <TruckApprovalPage /> },

              { path: "/settlement", element: <SettlementPage /> },
              { path: "/settlement/approvals", element: <SettlementApprovalPage /> },
              { path: "/settlement/history", element: <SettlementHistoryPage /> },
              { path: "/withdrawals", element: <WithdrawalManagementPage /> },
              { path: "/settlement/:settlementId", element: <SettlementDetailsPage /> },
              { path: "/settlement/details", element: <Navigate to="/settlement" replace /> },

              { path: "/quotes", element: <QuoteListPage /> },
              { path: "/quotes/:quoteId", element: <QuoteDetailPage /> },
              { path: "/matchings", element: <MatchingListPage /> },
              { path: "/matchings/:matchingId", element: <MatchingDetailPage /> },

              { path: "/users", element: <UserListPage /> },
              { path: "/users/shippers", element: <ShipperListPage /> },
              { path: "/users/drivers", element: <DriverListPage /> },
              { path: "/users/:userId", element: <UserDetailPage /> },

              { path: "/ops/pricing", element: <PricingManagementPage /> },
              { path: "/ops/deviations", element: <DeviationManagementPage /> },
              { path: "/ops/matching-anomalies", element: <MatchingAnomalyManagementPage /> },
              { path: "/ops/matching-anomalies/:requestId", element: <OrderCancellationRequestDetailPage /> },
              { path: "/ops/sanctions/logs", element: <SanctionsLogPage /> },
              { path: "/ops/activity-logs", element: <ActivityLogPage /> },
              { path: "/settings", element: <SettingsPage /> },
            ],
          },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
