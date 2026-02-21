import type { AxiosRequestConfig } from "axios";

import { apiClient } from "@/shared/lib/api/apiClient";

function shouldKeepBlobResponse(url: unknown): boolean {
  const path = typeof url === "string" ? url.trim() : "";
  if (!path) return false;
  return path.includes("/file");
}

export async function customInstance<T>(config: AxiosRequestConfig): Promise<T> {
  const nextConfig: AxiosRequestConfig = { ...config };

  if (nextConfig.responseType === "blob" && !shouldKeepBlobResponse(nextConfig.url)) {
    delete nextConfig.responseType;
  }

  const response = await apiClient.request<T>(nextConfig);
  return response.data;
}
