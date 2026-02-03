import { createBrowserRouter } from "react-router-dom";
import UiPlaygroundPage from "@/pages/temp/UiPlaygroundPage";

// 나중에 Layout이나 Page들이 만들어지면 여기서 import 합니다.
// import DashboardLayout from "@/app/layouts/DashboardLayout";
// import LoginPage from "@/pages/auth/LoginPage";

export const router = createBrowserRouter([
  {
    path: "/",
    // 지금은 임시 UI 테스트 페이지를 보여줍니다.
    // UiPlaygroundPage 내부에서 자체적으로 HashRouting을 하고 있으므로,
    // React Router는 단순히 이 컴포넌트를 마운트하는 역할만 합니다.
    element: <UiPlaygroundPage />,
  },
  {
    // 테스트 페이지 내부 링크(/ui)가 동작하도록 경로 추가
    path: "/ui",
    element: <UiPlaygroundPage />,
  },
  
  // ▼▼▼ 향후 앱 개발 시 아래 주석을 풀고 사용하게 됩니다 ▼▼▼
  /*
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/admin",
    element: <DashboardLayout />, // Sidebar가 포함된 레이아웃
    children: [
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },
      { path: "dashboard", element: <div>대시보드 페이지</div> },
      { path: "freight", element: <div>화물 관리 페이지</div> },
    ]
  },
  */
  
  // 404 처리 (매칭되는 경로가 없을 때)
  {
    path: "*",
    element: <div className="p-10">404 Not Found</div>,
  },
]);