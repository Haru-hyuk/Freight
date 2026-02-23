import type { VerificationDocumentType, VerificationResult } from "@/entities/verification/types";

const DOCUMENT_TYPES: VerificationDocumentType[] = [
  "shipper_business_registration",
  "driver_cargo_license",
  "driver_vehicle_registration",
];

export function isVerificationDocumentType(value: unknown): value is VerificationDocumentType {
  return typeof value === "string" && DOCUMENT_TYPES.includes(value as VerificationDocumentType);
}

export function isVerificationResult(value: unknown): value is VerificationResult {
  if (!value || typeof value !== "object") return false;

  const target = value as Partial<VerificationResult>;
  if (!isVerificationDocumentType(target?.documentType)) return false;
  if (typeof target?.imageUri !== "string" || !target.imageUri.trim()) return false;
  if (typeof target?.scannedAt !== "string" || !target.scannedAt.trim()) return false;
  if (typeof target?.source !== "string" || !target.source.trim()) return false;
  if (typeof target?.confidence !== "number" || !Number.isFinite(target.confidence)) return false;
  if (!Array.isArray(target?.fields)) return false;

  return target.fields.every((field) => {
    if (!field || typeof field !== "object") return false;
    const safeField = field as { label?: unknown; value?: unknown };
    return typeof safeField.label === "string" && typeof safeField.value === "string";
  });
}

