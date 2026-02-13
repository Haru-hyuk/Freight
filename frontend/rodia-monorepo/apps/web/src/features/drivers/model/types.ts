export type LicenseStatus = "검증됨" | "재요청";
export type ApprovalStatus = "승인 대기" | "보류" | "승인 완료";

export type DriverApprovalRow = {
  id: string;
  requestedAt: string;
  name: string;
  vehicle: string;
  licenseStatus: LicenseStatus;
  approvalStatus: ApprovalStatus;
  phone: string;
};
