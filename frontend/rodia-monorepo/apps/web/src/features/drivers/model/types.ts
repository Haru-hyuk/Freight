export type DriverApprovalLicenseStatus = "VERIFIED" | "UNVERIFIED";
export type DriverApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export type VerificationDocumentType = 
  | "driver_cargo_license"
  | "driver_vehicle_registration";

export type VerificationDocument = {
  documentType: VerificationDocumentType;
  imageUri: string;
  scannedAt: string;
  confidence: number;
  fields?: Record<string, string>;
};

export type DriverApprovalRow = {
  driverId: string;
  requestedAt: string;
  name: string;
  phone: string;
  vehicleSummary: string;
  licenseStatus: DriverApprovalLicenseStatus;
  approvalStatus: DriverApprovalStatus;
  documents?: VerificationDocument[];
  reviewMemo?: string;
};

export type DriverApprovalReviewPayload = {
  driverId: string;
  action: "APPROVE" | "REJECT";
  reason?: string;
};
