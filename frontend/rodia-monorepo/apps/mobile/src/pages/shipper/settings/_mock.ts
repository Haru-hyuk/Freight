export type VerificationStatus = "VERIFIED" | "PENDING" | "REJECTED";
export type DocumentStatus = "APPROVED" | "PENDING" | "REJECTED";
export type PaymentMethodType = "CARD" | "BANK" | "POSTPAID";
export type TaxInvoiceStatus = "ISSUED" | "PENDING" | "FAILED";

export type BusinessDocumentMock = {
  id: string;
  fileName: string;
  submittedAt: string;
  status: DocumentStatus;
};

export type BusinessInfoMock = {
  companyName: string;
  representativeName: string;
  businessNumber: string;
  businessType: string;
  businessItem: string;
  officeAddress: string;
  officeAddressDetail: string;
  managerName: string;
  managerPhone: string;
  managerEmail: string;
  verificationStatus: VerificationStatus;
  documents: BusinessDocumentMock[];
};

export type VerificationManageMock = {
  phoneVerified: boolean;
  phoneVerifiedAt: string;
  businessVerified: boolean;
  businessReviewedAt: string;
  paymentMethodRegistered: boolean;
  recentRequestAt: string;
};

export type AccountEditMock = {
  name: string;
  phone: string;
  email: string;
  agreePush: boolean;
  agreeSms: boolean;
  agreeEmail: boolean;
};

export type AddressItemMock = {
  id: string;
  label: string;
  isDefault: boolean;
  address: string;
  addressDetail: string;
  memo: string;
};

export type PaymentMethodMock = {
  id: string;
  type: PaymentMethodType;
  provider: string;
  holderName: string;
  last4: string;
  registeredAt: string;
  isDefault: boolean;
};

export type TaxInvoiceItemMock = {
  id: string;
  invoiceNumber: string;
  issuedAt: string;
  supplyAmount: number;
  vatAmount: number;
  totalAmount: number;
  status: TaxInvoiceStatus;
};

export const shipperSettingsMock = {
  businessInfo: {
    companyName: "로드리아 물류",
    representativeName: "김민수",
    businessNumber: "123-45-67890",
    businessType: "운수 및 물류",
    businessItem: "화물 운송 주선",
    officeAddress: "서울특별시 강서구 마곡중앙로 59",
    officeAddressDetail: "A동 1205호",
    managerName: "박지원",
    managerPhone: "010-3124-8890",
    managerEmail: "biz@rodia.co.kr",
    verificationStatus: "VERIFIED" as VerificationStatus,
    documents: [
      {
        id: "doc-1",
        fileName: "사업자등록증_2026.pdf",
        submittedAt: "2026-01-12T09:15:00+09:00",
        status: "APPROVED" as DocumentStatus,
      },
      {
        id: "doc-2",
        fileName: "통장사본_법인계좌.png",
        submittedAt: "2026-01-12T09:18:00+09:00",
        status: "APPROVED" as DocumentStatus,
      },
      {
        id: "doc-3",
        fileName: "사업장사진_정면.jpg",
        submittedAt: "2026-02-01T14:05:00+09:00",
        status: "PENDING" as DocumentStatus,
      },
    ],
  } as BusinessInfoMock,
  verification: {
    phoneVerified: true,
    phoneVerifiedAt: "2026-01-09T11:02:00+09:00",
    businessVerified: true,
    businessReviewedAt: "2026-01-13T16:30:00+09:00",
    paymentMethodRegistered: true,
    recentRequestAt: "2026-02-03T10:20:00+09:00",
  } as VerificationManageMock,
  account: {
    name: "김민수",
    phone: "010-9876-1234",
    email: "shipper.manager@rodia.co.kr",
    agreePush: true,
    agreeSms: false,
    agreeEmail: true,
  } as AccountEditMock,
  addresses: {
    primary: [
      {
        id: "addr-1",
        label: "상차지",
        isDefault: true,
        address: "인천광역시 연수구 송도과학로 85",
        addressDetail: "물류센터 2층 4번 도크",
        memo: "평일 오전 9시 이후 진입 가능",
      },
      {
        id: "addr-2",
        label: "하차지",
        isDefault: true,
        address: "경기도 용인시 기흥구 흥덕중앙로 120",
        addressDetail: "B동 1층 후문",
        memo: "지게차 사전 요청 필요",
      },
      {
        id: "addr-3",
        label: "즐겨찾기",
        isDefault: false,
        address: "충청남도 아산시 둔포면 아산밸리남로 101",
        addressDetail: "3공장 출고장",
        memo: "점심시간 12:00~13:00 상차 불가",
      },
    ] as AddressItemMock[],
    empty: [] as AddressItemMock[],
  },
  paymentMethods: [
    {
      id: "pm-1",
      type: "CARD" as PaymentMethodType,
      provider: "KB국민카드",
      holderName: "로드리아 물류",
      last4: "8821",
      registeredAt: "2025-12-20T09:10:00+09:00",
      isDefault: true,
    },
    {
      id: "pm-2",
      type: "BANK" as PaymentMethodType,
      provider: "신한은행",
      holderName: "로드리아 물류",
      last4: "1024",
      registeredAt: "2025-11-11T13:40:00+09:00",
      isDefault: false,
    },
    {
      id: "pm-3",
      type: "POSTPAID" as PaymentMethodType,
      provider: "월말 후불 정산",
      holderName: "로드리아 물류",
      last4: "0000",
      registeredAt: "2026-01-05T15:30:00+09:00",
      isDefault: false,
    },
  ] as PaymentMethodMock[],
  taxInvoices: [
    {
      id: "tax-1",
      invoiceNumber: "INV-2026-0204-11",
      issuedAt: "2026-02-04T10:05:00+09:00",
      supplyAmount: 140000,
      vatAmount: 14000,
      totalAmount: 154000,
      status: "ISSUED" as TaxInvoiceStatus,
    },
    {
      id: "tax-2",
      invoiceNumber: "INV-2026-0118-07",
      issuedAt: "2026-01-18T17:30:00+09:00",
      supplyAmount: 220000,
      vatAmount: 22000,
      totalAmount: 242000,
      status: "ISSUED" as TaxInvoiceStatus,
    },
    {
      id: "tax-3",
      invoiceNumber: "INV-2025-1212-03",
      issuedAt: "2025-12-12T09:20:00+09:00",
      supplyAmount: 315000,
      vatAmount: 31500,
      totalAmount: 346500,
      status: "PENDING" as TaxInvoiceStatus,
    },
    {
      id: "tax-4",
      invoiceNumber: "INV-2025-1102-04",
      issuedAt: "2025-11-02T13:11:00+09:00",
      supplyAmount: 98000,
      vatAmount: 9800,
      totalAmount: 107800,
      status: "FAILED" as TaxInvoiceStatus,
    },
    {
      id: "tax-5",
      invoiceNumber: "INV-2025-0914-15",
      issuedAt: "2025-09-14T14:40:00+09:00",
      supplyAmount: 430000,
      vatAmount: 43000,
      totalAmount: 473000,
      status: "ISSUED" as TaxInvoiceStatus,
    },
  ] as TaxInvoiceItemMock[],
};

