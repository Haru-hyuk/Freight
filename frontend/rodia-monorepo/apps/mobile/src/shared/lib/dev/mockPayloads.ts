// apps/mobile/src/shared/lib/dev/mockPayloads.ts
import type { AuthLoginRequestDTO } from "@/entities/user/dto";
import type { QuoteCreateDraft } from "@/features/quote/model/quoteCreateDraft";

export type LoginMockPayload = Readonly<AuthLoginRequestDTO>;

export type SignUpDriverMockPayload = Readonly<{
  role: "driver";
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
}>;

export type SignUpShipperMockPayload = Readonly<{
  role: "shipper";
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  companyName: string;
  ownerName: string;
  bizRegNo: string;
  bizPhone: string;
  openDate: string;
}>;

type QuoteCreateStepMockPayload = Readonly<Partial<QuoteCreateDraft>>;

const MOCK_DATE = new Date(2026, 1, 24, 0, 0, 0, 0);
const MOCK_TIME = new Date(2026, 1, 24, 10, 30, 0, 0);

export const LOGIN_DRIVER = {
  email: "driver.mock@rodia.dev",
  password: "12345678",
} satisfies LoginMockPayload;

export const LOGIN_SHIPPER = {
  email: "shipper.mock@rodia.dev",
  password: "12345678",
} satisfies LoginMockPayload;

export const SIGNUP_DRIVER = {
  role: "driver",
  name: "Mock Driver",
  email: "driver.mock@rodia.dev",
  password: "12345678",
  confirmPassword: "12345678",
  phone: "010-1234-5678",
} satisfies SignUpDriverMockPayload;

export const SIGNUP_SHIPPER = {
  role: "shipper",
  name: "Mock Shipper",
  email: "shipper.mock@rodia.dev",
  password: "12345678",
  confirmPassword: "12345678",
  phone: "010-9876-5432",
  companyName: "Rodia Logistics",
  ownerName: "Mock Shipper",
  bizRegNo: "123-45-67890",
  bizPhone: "02-1234-5678",
  openDate: "2020-01-01",
} satisfies SignUpShipperMockPayload;

export const QUOTE_CREATE_STEP1 = {
  senderName: "Mock Sender",
  senderPhone: "010-1234-5678",
  receiverName: "Mock Receiver",
  receiverPhone: "010-8765-4321",
  startAddr: "서울 강남구 테헤란로 427",
  startAddrDetail: "15층 물류팀",
  endAddr: "경기 성남시 분당구 판교역로 166",
  endAddrDetail: "1층 하차장",
  waypoints: [
    {
      id: 1,
      name: "경유 담당자",
      phone: "010-1111-2222",
      addr: "서울 송파구 올림픽로 300",
      detail: "B1 집하장",
    },
  ],
  loadMethod: "SHIPPER:MANUAL",
  unloadMethod: "DRIVER:FORKLIFT",
  date: MOCK_DATE,
  time: MOCK_TIME,
  originLat: 37.5066,
  originLng: 127.0543,
  destinationLat: 37.3944,
  destinationLng: 127.1112,
  distanceKm: 23,
} satisfies QuoteCreateStepMockPayload;

export const QUOTE_CREATE_STEP2 = {
  senderName: "Mock Sender",
  senderPhone: "010-1234-5678",
  receiverName: "Mock Receiver",
  receiverPhone: "010-8765-4321",
  startAddr: "서울 강남구 테헤란로 427",
  endAddr: "경기 성남시 분당구 판교역로 166",
  waypoints: [
    {
      id: 1,
      name: "경유 담당자1",
      phone: "010-5555-6666",
      addr: "서울 송파구 올림픽로 300",
      detail: "B1 집하장",
    },
    {
      id: 2,
      name: "경유 담당자2",
      phone: "010-3333-9999",
      addr: "경기 하남시 미사강변대로 100",
      detail: "2층 출고장",
    },
  ],
  cargoList: [
    {
      id: 1,
      itemCategory: "BOX",
      type: "전자부품 박스",
      quantity: "12",
      lengthCm: "48",
      widthCm: "38",
      heightCm: "34",
      weight: "180",
      dropOffKey: "WP:1",
    },
    {
      id: 2,
      itemCategory: "PALLET",
      type: "파렛트 자재",
      quantity: "2",
      lengthCm: "110",
      widthCm: "110",
      heightCm: "120",
      weight: "420",
      dropOffKey: "END",
    },
    {
      id: 3,
      itemCategory: "FURNITURE",
      type: "3인소파",
      quantity: "1",
      lengthCm: "200",
      widthCm: "90",
      heightCm: "90",
      weight: "80",
      dropOffKey: "WP:2",
    },
  ],
} satisfies QuoteCreateStepMockPayload;

export const QUOTE_CREATE_STEP3 = {
  tonIdx: 1,
  typeIdx: 1,
  isFrozen: true,
  isPool: false,
  selectedOpts: ["caution", "waterproof"],
  budget: "220000",
  noteToDriver: "Mock step3 payload",
  cargoList: [
    {
      id: 1,
      itemCategory: "PALLET",
      type: "냉장 식자재",
      quantity: "4",
      lengthCm: "110",
      widthCm: "110",
      heightCm: "120",
      weight: "900",
      dropOffKey: "END",
    },
  ],
} satisfies QuoteCreateStepMockPayload;

export const QUOTE_CREATE = {
  STEP1: QUOTE_CREATE_STEP1,
  STEP2: QUOTE_CREATE_STEP2,
  STEP3: QUOTE_CREATE_STEP3,
} as const;
