type ApiErrorPayload = {
  message?: unknown;
  error?: unknown;
};

type ApiErrorShape = {
  response?: {
    data?: ApiErrorPayload;
  };
  message?: unknown;
};

function toTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function readApiErrorMessage(error: unknown, fallback = "네트워크 또는 요청 값을 확인해주세요."): string {
  if (!error || typeof error !== "object") return fallback;

  const safeFallback = toTrimmedString(fallback) || "요청 처리 중 오류가 발생했습니다.";
  const source = error as ApiErrorShape;

  const serverMessage = toTrimmedString(source?.response?.data?.message) || toTrimmedString(source?.response?.data?.error);
  if (serverMessage) return serverMessage;

  const message = toTrimmedString(source?.message);
  if (message) return message;

  return safeFallback;
}

