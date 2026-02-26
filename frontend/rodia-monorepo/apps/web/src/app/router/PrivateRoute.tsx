import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getSession } from "@/shared/lib/auth/session";

function isAuthed(): boolean {
  return Boolean(getSession()?.accessToken || localStorage.getItem("rodia_admin_token"));
}

export default function PrivateRoute() {
  const location = useLocation();

  if (!isAuthed()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
