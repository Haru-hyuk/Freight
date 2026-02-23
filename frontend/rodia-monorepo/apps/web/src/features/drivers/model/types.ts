export type DriverApprovalLicenseStatus = "VERIFIED" | "UNVERIFIED";
export type DriverApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export type DriverApprovalRow = {
  driverId: string;
  requestedAt: string;
  name: string;
  phone: string;
  vehicleSummary: string;
  licenseStatus: DriverApprovalLicenseStatus;
  approvalStatus: DriverApprovalStatus;
  reviewMemo?: string;
};

export type DriverApprovalReviewPayload = {
  driverId: string;
  action: "APPROVE" | "REJECT";
  reason?: string;
};
