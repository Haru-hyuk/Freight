import type { DriverApprovalRow } from "./types";

export const DRIVER_APPROVAL_MOCK_ROWS: DriverApprovalRow[] = [
  {
    driverId: "D-1201",
    requestedAt: "2026-02-12 09:20",
    name: "김민수",
    phone: "010-1111-2222",
    vehicleSummary: "11톤 윙바디 (89버 1234)",
    licenseStatus: "VERIFIED",
    approvalStatus: "PENDING",
  },
  {
    driverId: "D-1202",
    requestedAt: "2026-02-12 10:05",
    name: "박지훈",
    phone: "010-3333-4444",
    vehicleSummary: "5톤 냉장탑차 (12가 9876)",
    licenseStatus: "UNVERIFIED",
    approvalStatus: "PENDING",
  },
  {
    driverId: "D-1190",
    requestedAt: "2026-02-10 16:40",
    name: "이태경",
    phone: "010-5555-6666",
    vehicleSummary: "25톤 카고 (71나 1020)",
    licenseStatus: "VERIFIED",
    approvalStatus: "APPROVED",
    reviewMemo: "서류 검증 완료",
  },
];
