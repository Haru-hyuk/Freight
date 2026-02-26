import { TOAST } from "./toastPolicy";
import { API_ERROR_CODE, type ApiErrorCode } from "./types";

type ErrorWithStatus = {
  status?: unknown;
  code?: unknown;
  response?: {
    status?: unknown;
  };
};

function readStatusCode(error: unknown): number {
  const source = (error ?? {}) as ErrorWithStatus;
  const status = Number(source.status ?? source.response?.status ?? 0);
  if (!Number.isFinite(status)) return 0;
  return status;
}

function isNetworkCode(error: unknown): boolean {
  const source = (error ?? {}) as ErrorWithStatus;
  if (source.code === "ERR_NETWORK") return true;
  if (source.code === "ECONNABORTED") return true;
  return false;
}

export function getApiErrorCode(error: unknown): ApiErrorCode {
  if (isNetworkCode(error)) return API_ERROR_CODE.NETWORK;

  const status = readStatusCode(error);
  if (status <= 0) return API_ERROR_CODE.NETWORK;
  if (status === 401) return API_ERROR_CODE.UNAUTHORIZED;
  if (status === 403) return API_ERROR_CODE.FORBIDDEN;
  if (status === 404) return API_ERROR_CODE.NOT_FOUND;
  if (status === 409) return API_ERROR_CODE.CONFLICT;
  if (status === 400 || status === 422) return API_ERROR_CODE.VALIDATION;
  if (status >= 500) return API_ERROR_CODE.SERVER;
  return API_ERROR_CODE.UNKNOWN;
}

const API_ERROR_TOAST_MAP: Readonly<Record<ApiErrorCode, string>> = {
  [API_ERROR_CODE.NETWORK]: TOAST.networkError,
  [API_ERROR_CODE.UNAUTHORIZED]: TOAST.unauthorized,
  [API_ERROR_CODE.FORBIDDEN]: TOAST.forbidden,
  [API_ERROR_CODE.NOT_FOUND]: TOAST.notFound,
  [API_ERROR_CODE.CONFLICT]: TOAST.conflict,
  [API_ERROR_CODE.VALIDATION]: TOAST.validation,
  [API_ERROR_CODE.SERVER]: TOAST.serverError,
  [API_ERROR_CODE.UNKNOWN]: TOAST.unknownError,
};

export function getApiErrorToastMessage(error: unknown): string {
  const code = getApiErrorCode(error);
  return API_ERROR_TOAST_MAP[code] ?? TOAST.unknownError;
}
