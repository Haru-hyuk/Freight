import { Navigate, Outlet } from "react-router-dom";

type Role = "super" | "admin" | "viewer";

function getRole(): Role {
  const raw = localStorage.getItem("rodia_admin_role");
  if (raw === "admin" || raw === "viewer" || raw === "super") return raw;
  return "super";
}

export default function RoleRoute({ allow }: { allow: Role[] }) {
  const role = getRole();

  if (!allow.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
