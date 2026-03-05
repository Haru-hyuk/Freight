import type { AxiosRequestConfig } from "axios";

import { apiClient } from "@/shared/lib/api/apiClient";

// 파일 업로드 요청에 적용할 별도 타임아웃 (기본 20초보다 넉넉하게 설정)
const UPLOAD_TIMEOUT_MS = 60_000;

function shouldKeepBlobResponse(url: unknown): boolean {
  const path = typeof url === "string" ? url.trim() : "";
  if (!path) return false;
  return path.includes("/file");
}

function isFormDataPayload(value: unknown): boolean {
  if (typeof FormData === "undefined") return false;
  return value instanceof FormData;
}

export async function customInstance<T>(config: AxiosRequestConfig): Promise<T> {
  const nextConfig: AxiosRequestConfig = { ...config };

  if (nextConfig.responseType === "blob" && !shouldKeepBlobResponse(nextConfig.url)) {
    delete nextConfig.responseType;
  }

  // FormData(파일 업로드) 요청은 타임아웃을 60초로 연장한다.
  // 기본 20초는 대용량 이미지 업로드 시 조기 종료될 수 있음.
  if (isFormDataPayload(nextConfig.data)) {
    nextConfig.timeout = UPLOAD_TIMEOUT_MS;
  }

  const response = await apiClient.request<T>(nextConfig);
  return response.data;
}
