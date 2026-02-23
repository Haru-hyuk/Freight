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
import SettlementApprovalPage from "@/pages/settlement/SettlementApprovalPage";
import SettlementHistoryPage from "@/pages/settlement/SettlementHistoryPage";
import QuoteListPage from "@/pages/quotes/QuoteListPage";
import QuoteDetailPage from "@/pages/quotes/QuoteDetailPage";
import MatchingListPage from "@/pages/matchings/MatchingListPage";
import MatchingDetailPage from "@/pages/matchings/MatchingDetailPage";
import OrdersMonitoringPage from "@/pages/orders/OrdersMonitoringPage";

import UserListPage from "@/pages/users/UserListPage";
import ShipperListPage from "@/pages/users/ShipperListPage";
import DriverListPage from "@/pages/users/DriverListPage";
import UserDetailPage from "@/pages/users/UserDetailPage";

import SanctionsLogPage from "@/pages/sanctions/SanctionsLogPage";
import PricingManagementPage from "@/pages/ops/PricingManagementPage";
import ActivityLogPage from "@/pages/ops/ActivityLogPage";
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

              { path: "/drivers/approvals", element: <DriverApprovalPage /> },
              { path: "/settlement/approvals", element: <SettlementApprovalPage /> },
              { path: "/settlement/history", element: <SettlementHistoryPage /> },
              { path: "/settlement", element: <Navigate to="/settlement/history" replace /> },

              { path: "/quotes", element: <QuoteListPage /> },
              { path: "/quotes/:quoteId", element: <QuoteDetailPage /> },
              { path: "/matchings", element: <MatchingListPage /> },
              { path: "/matchings/:matchingId", element: <MatchingDetailPage /> },

              { path: "/users", element: <UserListPage /> },
              { path: "/users/shippers", element: <ShipperListPage /> },
              { path: "/users/drivers", element: <DriverListPage /> },
              { path: "/users/:userId", element: <UserDetailPage /> },

              { path: "/ops/pricing", element: <PricingManagementPage /> },
              { path: "/ops/sanctions/logs", element: <SanctionsLogPage /> },
              { path: "/ops/activity-logs", element: <ActivityLogPage /> },
            ],
          },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
