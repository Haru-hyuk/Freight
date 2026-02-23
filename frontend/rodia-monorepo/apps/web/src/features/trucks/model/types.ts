export type TruckApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";
export type TruckApprovalLicenseStatus = "VERIFIED" | "UNVERIFIED";

export type VerificationDocumentType = 
  | "truck_registration"
  | "truck_insurance"
  | "truck_inspection";

export type VerificationDocument = {
  documentType: VerificationDocumentType;
  imageUri: string;
  scannedAt: string;
  confidence: number;
  fields?: Record<string, string>;
};

export type TruckApprovalRow = {
  truckId: string;
  driverId: string;
  driverName: string;
  requestedAt: string;
  plateNumber: string;
  vehicleType: string;
  capacity: number;
  manufacturingYear: number;
  insuranceStatus: TruckApprovalLicenseStatus;
  approvalStatus: TruckApprovalStatus;
  documents?: VerificationDocument[];
  reviewMemo?: string;
};

export type TruckApprovalReviewPayload = {
  truckId: string;
  action: "APPROVE" | "REJECT";
  reason?: string;
};
