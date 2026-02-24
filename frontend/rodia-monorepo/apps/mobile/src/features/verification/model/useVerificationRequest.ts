import { useCallback, useMemo, useState } from "react";
import type {
  VerificationRequestPayload,
  VerificationRequestResponse,
  VerificationStatus,
} from "@/entities/verification/types";
import { requestVerification } from "@/features/verification/api/verification-api";

function readErrorMessage(error: unknown) {
  if (!error || typeof error !== "object") {
    return "Verification request failed. Please try again.";
  }

  const message = (error as { message?: unknown })?.message;
  if (typeof message === "string" && message.trim()) {
    return message.trim();
  }

  return "Verification request failed. Please try again.";
}

export type UseVerificationRequestResult = {
  status: VerificationStatus;
  isLoading: boolean;
  errorMessage: string | null;
  response: VerificationRequestResponse | null;
  submitRequest: (payload: VerificationRequestPayload) => Promise<VerificationRequestResponse | null>;
  reset: () => void;
};

export function useVerificationRequest(): UseVerificationRequestResult {
  const [status, setStatus] = useState<VerificationStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [response, setResponse] = useState<VerificationRequestResponse | null>(null);

  const submitRequest = useCallback(async (payload: VerificationRequestPayload) => {
    setStatus("submitting");
    setErrorMessage(null);
    setResponse(null);

    try {
      const result = await requestVerification(payload);
      setStatus("approved");
      setResponse(result);
      return result;
    } catch (error) {
      setStatus("rejected");
      setErrorMessage(readErrorMessage(error));
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setErrorMessage(null);
    setResponse(null);
  }, []);

  const isLoading = useMemo(() => status === "submitting", [status]);

  return {
    status,
    isLoading,
    errorMessage,
    response,
    submitRequest,
    reset,
  };
}

export default useVerificationRequest;
