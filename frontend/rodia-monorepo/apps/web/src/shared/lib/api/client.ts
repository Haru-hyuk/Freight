// src/shared/lib/api/client.ts
import axios from "axios";
import { clearSession, getSession } from "@/shared/lib/auth/session";

function resolveApiBaseUrl(): string {
  const fromEnv = String(import.meta.env.VITE_API_BASE_URL ?? "").trim();
  if (fromEnv.length > 0) return fromEnv;

  if (typeof window !== "undefined") {
    const host = window.location.hostname || "localhost";
    return `http://${host}:8080`;
  }

  return "http://localhost:8080";
}

export const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = getSession()?.accessToken || localStorage.getItem("rodia_admin_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401 && typeof window !== "undefined") {
      clearSession();
      localStorage.removeItem("rodia_admin_token");
      localStorage.removeItem("rodia_admin_role");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);
