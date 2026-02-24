import type { VerificationRequestPayload, VerificationRequestResponse } from "@/entities/verification/types";

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function makeRequestId() {
  const seed = `${Date.now().toString(36)}${Math.floor(Math.random() * 1_000)
    .toString()
    .padStart(3, "0")}`.toUpperCase();
  return `VRF-${seed}`;
}

function hasLowConfidenceDocument(payload: VerificationRequestPayload) {
  const documents = payload?.documents ?? [];
  return documents.some((document) => {
    const confidence = typeof document?.confidence === "number" ? document.confidence : 0;
    return confidence < 0.9;
  });
}

export async function requestVerification(payload: VerificationRequestPayload): Promise<VerificationRequestResponse> {
  const role = payload?.role;
  const documents = payload?.documents ?? [];

  if (role !== "shipper" && role !== "driver") {
    throw new Error("Verification request role is invalid.");
  }

  if (documents.length === 0) {
    throw new Error("Please scan at least one verification document.");
  }

  await wait(700);

  if (hasLowConfidenceDocument(payload)) {
    throw new Error("OCR confidence is too low. Please select a clearer image.");
  }

  return {
    requestId: makeRequestId(),
    status: "approved",
    reviewedAt: new Date().toISOString(),
  };
}
