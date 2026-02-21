import type { AxiosRequestConfig } from "axios";

import { apiClient } from "@/shared/lib/api/apiClient";

export async function customInstance<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.request<T>(config);
  return response.data;
}
