// src/app/router/routes.tsx
import { createBrowserRouter, Navigate } from "react-router-dom";

import App from "@/app/App";
import AdminLayout from "@/app/layouts/AdminLayout";
import AuthLayout from "@/app/layouts/AuthLayout";
import PrivateRoute from "@/app/router/PrivateRoute";

import LoginPage from "@/pages/auth/LoginPage";
import DashboardPage from "@/pages/dashboard/DashboardPage";
import DriverApprovalPage from "@/pages/drivers/DriverApprovalPage";
import OrdersMonitoringPage from "@/pages/orders/OrdersMonitoringPage";
import SettlementPage from "@/pages/settlement/SettlementPage";
import QuoteListPage from "@/pages/quotes/QuoteListPage";
import QuoteDetailPage from "@/pages/quotes/QuoteDetailPage";
import MatchingListPage from "@/pages/matchings/MatchingListPage";
import MatchingDetailPage from "@/pages/matchings/MatchingDetailPage";

import UserListPage from "@/pages/users/UserListPage";
import ShipperListPage from "@/pages/users/ShipperListPage";
import DriverListPage from "@/pages/users/DriverListPage";
import UserDetailPage from "@/pages/users/UserDetailPage";

import SanctionsLogPage from "@/pages/sanctions/SanctionsLogPage";
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
              { path: "/drivers/approvals", element: <DriverApprovalPage /> },
              { path: "/orders/monitoring", element: <OrdersMonitoringPage /> },
              { path: "/settlement", element: <SettlementPage /> },

              { path: "/quotes", element: <QuoteListPage /> },
              { path: "/quotes/:quoteId", element: <QuoteDetailPage /> },

              { path: "/matchings", element: <MatchingListPage /> },
              { path: "/matchings/:matchingId", element: <MatchingDetailPage /> },

              { path: "/users", element: <UserListPage /> },
              { path: "/users/shippers", element: <ShipperListPage /> },
              { path: "/users/drivers", element: <DriverListPage /> },

              // 수정: 상세는 리스트들보다 아래에 둬도 되는데,
              // "/users/shippers" "/users/drivers"가 먼저 정의되어 있어서 충돌 없음
              { path: "/users/:userId", element: <UserDetailPage /> },

              // 수정: 운영 > 제재 내역 로그 경로를 AdminLayout과 동일하게 맞춤
              { path: "/ops/sanctions/logs", element: <SanctionsLogPage /> },
            ],
          },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
