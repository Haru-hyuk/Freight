import { Outlet } from "react-router-dom";
import AppProviders from "@/app/providers/AppProviders";

export default function App() {
  return (
    <AppProviders>
      <Outlet />
    </AppProviders>
  );
}
