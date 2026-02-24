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
    documents: [
      {
        documentType: "driver_cargo_license",
        imageUri: "https://via.placeholder.com/400x600?text=Cargo+License",
        scannedAt: "2026-02-12 09:15",
        confidence: 0.98,
        fields: {
          licenseNo: "20220000001",
          name: "김민수",
          issueDate: "2022-01-15",
          expiryDate: "2027-01-15",
        },
      },
      {
        documentType: "driver_vehicle_registration",
        imageUri: "https://via.placeholder.com/400x600?text=Vehicle+Registration",
        scannedAt: "2026-02-12 09:16",
        confidence: 0.96,
        fields: {
          plateNumber: "89버1234",
          vehicleType: "11톤 윙바디",
          owner: "김민수",
          registerDate: "2021-06-01",
        },
      },
    ],
  },
  {
    driverId: "D-1202",
    requestedAt: "2026-02-12 10:05",
    name: "박지훈",
    phone: "010-3333-4444",
    vehicleSummary: "5톤 냉장탑차 (12가 9876)",
    licenseStatus: "UNVERIFIED",
    approvalStatus: "PENDING",
    documents: [
      {
        documentType: "driver_cargo_license",
        imageUri: "https://via.placeholder.com/400x600?text=License+Blurry",
        scannedAt: "2026-02-12 10:00",
        confidence: 0.72,
        fields: {
          licenseNo: "20230000005",
          name: "박지훈",
          issueDate: "2023-03-10",
          expiryDate: "2028-03-10",
        },
      },
      {
        documentType: "driver_vehicle_registration",
        imageUri: "https://via.placeholder.com/400x600?text=Vehicle+Reg",
        scannedAt: "2026-02-12 10:01",
        confidence: 0.88,
        fields: {
          plateNumber: "12가9876",
          vehicleType: "5톤 냉장탑차",
          owner: "박지훈",
          registerDate: "2023-05-15",
        },
      },
    ],
  },
  {
    driverId: "D-1190",
    requestedAt: "2026-02-10 16:40",
    name: "이태경",
    phone: "010-5555-6666",
    vehicleSummary: "25톤 카고 (71나 1020)",
    licenseStatus: "VERIFIED",
    approvalStatus: "APPROVED",
    documents: [
      {
        documentType: "driver_cargo_license",
        imageUri: "https://via.placeholder.com/400x600?text=License+Clear",
        scannedAt: "2026-02-10 16:35",
        confidence: 0.99,
        fields: {
          licenseNo: "20200000010",
          name: "이태경",
          issueDate: "2020-01-20",
          expiryDate: "2025-01-20",
        },
      },
      {
        documentType: "driver_vehicle_registration",
        imageUri: "https://via.placeholder.com/400x600?text=Vehicle+Approved",
        scannedAt: "2026-02-10 16:36",
        confidence: 0.97,
        fields: {
          plateNumber: "71나1020",
          vehicleType: "25톤 카고",
          owner: "이태경",
          registerDate: "2019-08-01",
        },
      },
    ],
    reviewMemo: "서류 검증 완료",
  },
];
