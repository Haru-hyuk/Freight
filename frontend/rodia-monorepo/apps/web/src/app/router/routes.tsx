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
            ],
          },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
