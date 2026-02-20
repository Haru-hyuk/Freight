export type VerificationStatus = "idle" | "submitting" | "approved" | "rejected";

export type VerificationDocumentType =
  | "shipper_business_registration"
  | "driver_cargo_license"
  | "driver_vehicle_registration";

export type VerificationSource = "gallery" | "camera" | "mock";

export type VerificationField = {
  label: string;
  value: string;
};

export type VerificationResult = {
  documentType: VerificationDocumentType;
  imageUri: string;
  scannedAt: string;
  source: VerificationSource;
  confidence: number;
  fields: VerificationField[];
};

export type VerificationRequestPayload = {
  role: "shipper" | "driver";
  documents: VerificationResult[];
};

export type VerificationRequestResponse = {
  requestId: string;
  status: Extract<VerificationStatus, "approved" | "rejected">;
  reviewedAt: string;
};

