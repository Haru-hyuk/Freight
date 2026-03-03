// src/shared/lib/api/client.ts
import axios from "axios";
import { getSession } from "@/shared/lib/auth/session";

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
  const token = getSession()?.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
