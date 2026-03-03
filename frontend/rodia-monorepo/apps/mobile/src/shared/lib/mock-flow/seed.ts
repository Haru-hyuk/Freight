import type {
  CounterOfferResponse,
  MatchResponse,
  QuoteChecklistItemResponse,
  QuoteDetailResponse,
  QuoteStopResponse,
} from "@/shared/api/generated/schemas";
import type { LoadPlanResponse } from "@/shared/api/generated/schemas/loadPlanResponse";
import type { TruckSpecReferenceResponse } from "@/shared/api/generated/schemas/truckSpecReferenceResponse";

import type { MockFlowMatchStatus, MockFlowQuoteStatus, MockFlowSeed } from "./types";

type SeedQuoteInput = {
  quoteId: number;
  shipperId?: number;
  truckId: number;
  originAddress: string;
  destinationAddress: string;
  distanceKm: number;
  weightKg?: number;
  volumeCbm?: number;
  vehicleType: string;
  vehicleBodyType: string;
  cargoName: string;
  cargoType?: string;
  cargoDesc?: string;
  basePrice: number;
  distancePrice: number;
  extraPrice?: number;
  desiredPrice?: number;
  finalPrice?: number;
  allowCombine?: boolean;
  loadMethod?: string;
  unloadMethod?: string;
  status: MockFlowQuoteStatus;
  createdAt: string;
  updatedAt: string;
  checklistItems?: QuoteChecklistItemResponse[];
  stops?: QuoteStopResponse[];
};

type SeedMatchInput = {
  matchId: number;
  quoteId: number;
  driverId?: number;
  accepted?: boolean;
  status: MockFlowMatchStatus;
  acceptedAt?: string;
  createdAt: string;
  updatedAt: string;
};

type SeedCounterOfferInput = {
  counterOfferId: number;
  quoteId: number;
  driverId: number;
  proposedPrice?: number;
  message?: string;
  status: string;
  createdAt: string;
  respondedAt?: string;
};

type MatchWithLoadData = MatchResponse & {
  loadPlan?: LoadPlanResponse;
  truckSpec?: TruckSpecReferenceResponse;
};

function toPositiveInt(value: unknown): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function toNonNegativeInt(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.trunc(parsed));
}

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cloneChecklistItems(items: QuoteChecklistItemResponse[] | undefined): QuoteChecklistItemResponse[] {
  if (!Array.isArray(items)) return [];
  return items.map((item, index) => ({
    checklistItemId: toPositiveInt(item?.checklistItemId) || index + 1,
    extraInput: toText(item?.extraInput) || undefined,
    extraFee: toNonNegativeInt(item?.extraFee),
  }));
}

function cloneStops(stops: QuoteStopResponse[] | undefined): QuoteStopResponse[] {
  if (!Array.isArray(stops)) return [];
  return stops
    .map((stop, index) => ({
      quoteStopId: toPositiveInt(stop?.quoteStopId) || index + 1,
      seq: toPositiveInt(stop?.seq) || index + 1,
      address: toText(stop?.address) || undefined,
      lat: Number.isFinite(Number(stop?.lat)) ? Number(stop?.lat) : undefined,
      lng: Number.isFinite(Number(stop?.lng)) ? Number(stop?.lng) : undefined,
      contactName: toText(stop?.contactName) || undefined,
      contactPhone: toText(stop?.contactPhone) || undefined,
      deptName: toText(stop?.deptName) || undefined,
      managerName: toText(stop?.managerName) || undefined,
    }))
    .filter((stop) => Boolean(stop.address));
}

function buildSeedQuote(input: SeedQuoteInput): QuoteDetailResponse {
  const quoteId = toPositiveInt(input.quoteId);
  const latSeed = 35 + (quoteId % 90) / 100;
  const lngSeed = 126 + (quoteId % 70) / 100;

  return {
    quoteId,
    quotePublicId: `mock-quote-${quoteId}`,
    shipperId: toPositiveInt(input.shipperId) || 101,
    truckId: toPositiveInt(input.truckId) || 1,
    originAddress: toText(input.originAddress) || undefined,
    destinationAddress: toText(input.destinationAddress) || undefined,
    originLat: latSeed,
    originLng: lngSeed,
    destinationLat: latSeed + 0.15,
    destinationLng: lngSeed + 0.2,
    distanceKm: Number(input.distanceKm) > 0 ? Number(input.distanceKm) : undefined,
    weightKg: Number(input.weightKg) > 0 ? Number(input.weightKg) : undefined,
    volumeCbm: Number(input.volumeCbm) > 0 ? Number(input.volumeCbm) : undefined,
    vehicleType: toText(input.vehicleType) || undefined,
    vehicleBodyType: toText(input.vehicleBodyType) || undefined,
    cargoName: toText(input.cargoName) || undefined,
    cargoType: toText(input.cargoType || "GENERAL") || undefined,
    cargoDesc: toText(input.cargoDesc) || undefined,
    basePrice: toNonNegativeInt(input.basePrice),
    distancePrice: toNonNegativeInt(input.distancePrice),
    extraPrice: toNonNegativeInt(input.extraPrice),
    desiredPrice: toNonNegativeInt(input.desiredPrice),
    finalPrice: toNonNegativeInt(input.finalPrice),
    allowCombine: Boolean(input.allowCombine),
    loadMethod: toText(input.loadMethod || "SHIPPER") || undefined,
    unloadMethod: toText(input.unloadMethod || "DRIVER") || undefined,
    status: input.status,
    createdAt: toText(input.createdAt) || undefined,
    updatedAt: toText(input.updatedAt) || undefined,
    checklistItems: cloneChecklistItems(input.checklistItems),
    stops: cloneStops(input.stops),
  };
}

function buildSeedMatch(input: SeedMatchInput): MatchResponse {
  return {
    matchId: toPositiveInt(input.matchId),
    quoteId: toPositiveInt(input.quoteId) || undefined,
    driverId: toPositiveInt(input.driverId) || undefined,
    accepted: typeof input.accepted === "boolean" ? input.accepted : undefined,
    status: input.status,
    acceptedAt: toText(input.acceptedAt) || undefined,
    createdAt: toText(input.createdAt) || undefined,
    updatedAt: toText(input.updatedAt) || undefined,
  };
}

function buildSeedCounterOffer(input: SeedCounterOfferInput): CounterOfferResponse {
  return {
    counterOfferId: toPositiveInt(input.counterOfferId),
    quoteId: toPositiveInt(input.quoteId) || undefined,
    driverId: toPositiveInt(input.driverId) || undefined,
    proposedPrice: toNonNegativeInt(input.proposedPrice) || undefined,
    message: toText(input.message) || undefined,
    status: toText(input.status) || undefined,
    createdAt: toText(input.createdAt) || undefined,
    respondedAt: toText(input.respondedAt) || undefined,
  };
}

const QUOTE_SEED_INPUTS: SeedQuoteInput[] = [
  {
    quoteId: 5101,
    truckId: 1,
    originAddress: "서울특별시 금천구 가산동",
    destinationAddress: "경기도 성남시 분당구 정자동",
    distanceKm: 29.4,
    weightKg: 1200,
    volumeCbm: 6.4,
    vehicleType: "TON_1",
    vehicleBodyType: "CARGO",
    cargoName: "전자부품",
    cargoDesc: "파렛트 4개",
    basePrice: 92000,
    distancePrice: 41000,
    extraPrice: 7000,
    desiredPrice: 148000,
    finalPrice: 0,
    allowCombine: false,
    loadMethod: "SHIPPER",
    unloadMethod: "DRIVER",
    status: "OPEN",
    createdAt: "2026-02-22T10:20:00.000Z",
    updatedAt: "2026-02-22T10:25:00.000Z",
    checklistItems: [{ checklistItemId: 1, extraInput: "상차지 도착 전 연락", extraFee: 0 }],
    stops: [
      {
        quoteStopId: 1,
        seq: 1,
        address: "서울특별시 서초구 양재동",
        lat: 37.4671,
        lng: 127.0404,
      },
    ],
  },
  {
    quoteId: 5102,
    truckId: 2,
    originAddress: "인천광역시 연수구 송도동",
    destinationAddress: "경기도 화성시 동탄면",
    distanceKm: 54.1,
    weightKg: 1500,
    volumeCbm: 9.1,
    vehicleType: "TON_2_5",
    vehicleBodyType: "WING_BODY",
    cargoName: "패키지 박스",
    cargoDesc: "분류 완료 박스",
    basePrice: 118000,
    distancePrice: 46000,
    extraPrice: 12000,
    desiredPrice: 0,
    finalPrice: 0,
    allowCombine: true,
    loadMethod: "DRIVER",
    unloadMethod: "DRIVER",
    status: "OPEN",
    createdAt: "2026-02-21T06:35:00.000Z",
    updatedAt: "2026-02-21T07:10:00.000Z",
  },
  {
    quoteId: 5103,
    truckId: 3,
    originAddress: "부산광역시 강서구 명지동",
    destinationAddress: "울산광역시 남구 삼산동",
    distanceKm: 41.3,
    weightKg: 2100,
    volumeCbm: 11.5,
    vehicleType: "TON_3_5",
    vehicleBodyType: "WING_BODY",
    cargoName: "의류 박스",
    cargoDesc: "행거박스 포함",
    basePrice: 157000,
    distancePrice: 59000,
    extraPrice: 14000,
    desiredPrice: 235000,
    finalPrice: 0,
    allowCombine: false,
    loadMethod: "SHIPPER",
    unloadMethod: "SHIPPER",
    status: "NEGOTIATING",
    createdAt: "2026-02-20T03:45:00.000Z",
    updatedAt: "2026-02-20T05:20:00.000Z",
  },
  {
    quoteId: 5104,
    truckId: 4,
    originAddress: "대구광역시 북구 검단동",
    destinationAddress: "경상북도 구미시 공단동",
    distanceKm: 33.2,
    weightKg: 1700,
    volumeCbm: 8.7,
    vehicleType: "TON_5",
    vehicleBodyType: "CARGO",
    cargoName: "산업 자재",
    cargoDesc: "롤 형태 자재",
    basePrice: 121000,
    distancePrice: 37000,
    extraPrice: 9000,
    desiredPrice: 179000,
    finalPrice: 179000,
    allowCombine: false,
    loadMethod: "DRIVER",
    unloadMethod: "DRIVER",
    status: "ASSIGNED",
    createdAt: "2026-02-19T07:15:00.000Z",
    updatedAt: "2026-02-19T07:40:00.000Z",
  },
  {
    quoteId: 5105,
    truckId: 5,
    originAddress: "광주광역시 광산구 하남동",
    destinationAddress: "전라북도 전주시 덕진구",
    distanceKm: 88.6,
    weightKg: 1900,
    volumeCbm: 10.1,
    vehicleType: "TON_5",
    vehicleBodyType: "WING_BODY",
    cargoName: "가공 식품",
    cargoDesc: "상온 박스",
    basePrice: 168000,
    distancePrice: 72000,
    extraPrice: 0,
    desiredPrice: 312000,
    finalPrice: 312000,
    allowCombine: false,
    loadMethod: "SHIPPER",
    unloadMethod: "DRIVER",
    status: "PICKUP",
    createdAt: "2026-02-18T09:30:00.000Z",
    updatedAt: "2026-02-18T10:55:00.000Z",
  },
  {
    quoteId: 5106,
    truckId: 6,
    originAddress: "대전광역시 유성구 관평동",
    destinationAddress: "충청북도 청주시 흥덕구",
    distanceKm: 42.8,
    weightKg: 1800,
    volumeCbm: 9.9,
    vehicleType: "TON_2_5",
    vehicleBodyType: "CARGO",
    cargoName: "반도체 장비 부품",
    cargoDesc: "진동주의",
    basePrice: 129000,
    distancePrice: 51000,
    extraPrice: 8000,
    desiredPrice: 221000,
    finalPrice: 229000,
    allowCombine: false,
    loadMethod: "SHIPPER",
    unloadMethod: "DRIVER",
    status: "TRANSIT",
    createdAt: "2026-02-17T11:00:00.000Z",
    updatedAt: "2026-02-17T14:20:00.000Z",
  },
  {
    quoteId: 5201,
    truckId: 7,
    originAddress: "경기도 김포시 양촌읍",
    destinationAddress: "서울특별시 송파구 문정동",
    distanceKm: 38.9,
    weightKg: 900,
    volumeCbm: 5.2,
    vehicleType: "TON_1",
    vehicleBodyType: "CARGO",
    cargoName: "생활용품",
    cargoDesc: "박스 20EA",
    basePrice: 87000,
    distancePrice: 36000,
    extraPrice: 6000,
    desiredPrice: 136000,
    finalPrice: 141000,
    allowCombine: true,
    loadMethod: "SHIPPER",
    unloadMethod: "DRIVER",
    status: "DROPOFF",
    createdAt: "2026-02-16T04:55:00.000Z",
    updatedAt: "2026-02-16T08:05:00.000Z",
  },
  {
    quoteId: 5202,
    truckId: 8,
    originAddress: "경상남도 창원시 성산구",
    destinationAddress: "부산광역시 사상구 감전동",
    distanceKm: 47.6,
    weightKg: 2400,
    volumeCbm: 12.2,
    vehicleType: "TON_3_5",
    vehicleBodyType: "WING_BODY",
    cargoName: "기계 부속",
    cargoDesc: "목재 박스 포장",
    basePrice: 162000,
    distancePrice: 62000,
    extraPrice: 13000,
    desiredPrice: 258000,
    finalPrice: 271000,
    allowCombine: false,
    loadMethod: "DRIVER",
    unloadMethod: "SHIPPER",
    status: "DROPOFF",
    createdAt: "2026-02-15T01:40:00.000Z",
    updatedAt: "2026-02-15T06:45:00.000Z",
  },
  {
    quoteId: 5203,
    truckId: 9,
    originAddress: "충청남도 아산시 탕정면",
    destinationAddress: "세종특별자치시 반곡동",
    distanceKm: 31.7,
    weightKg: 700,
    volumeCbm: 3.4,
    vehicleType: "TON_1",
    vehicleBodyType: "CARGO",
    cargoName: "문서/소형박스",
    cargoDesc: "긴급서류 포함",
    basePrice: 69000,
    distancePrice: 28000,
    extraPrice: 4000,
    desiredPrice: 118000,
    finalPrice: 124000,
    allowCombine: true,
    loadMethod: "DRIVER",
    unloadMethod: "DRIVER",
    status: "DROPOFF",
    createdAt: "2026-02-14T05:25:00.000Z",
    updatedAt: "2026-02-14T09:40:00.000Z",
  },
  {
    quoteId: 5301,
    truckId: 10,
    originAddress: "강원특별자치도 원주시 문막읍",
    destinationAddress: "경기도 이천시 부발읍",
    distanceKm: 73.5,
    weightKg: 1900,
    volumeCbm: 8.1,
    vehicleType: "TON_5",
    vehicleBodyType: "CARGO",
    cargoName: "건축 자재",
    cargoDesc: "빔 자재",
    basePrice: 171000,
    distancePrice: 79000,
    extraPrice: 12000,
    desiredPrice: 298000,
    finalPrice: 0,
    allowCombine: false,
    loadMethod: "SHIPPER",
    unloadMethod: "DRIVER",
    status: "CANCELED",
    createdAt: "2026-02-13T08:10:00.000Z",
    updatedAt: "2026-02-13T09:05:00.000Z",
  },
  {
    quoteId: 5302,
    truckId: 11,
    originAddress: "제주특별자치도 제주시 애월읍",
    destinationAddress: "제주특별자치도 서귀포시 대정읍",
    distanceKm: 56.2,
    weightKg: 1100,
    volumeCbm: 5.9,
    vehicleType: "TON_2_5",
    vehicleBodyType: "WING_BODY",
    cargoName: "신선식품",
    cargoDesc: "저온 유지 필요",
    basePrice: 126000,
    distancePrice: 54000,
    extraPrice: 10000,
    desiredPrice: 207000,
    finalPrice: 0,
    allowCombine: false,
    loadMethod: "SHIPPER",
    unloadMethod: "SHIPPER",
    status: "CANCELED",
    createdAt: "2026-02-12T02:05:00.000Z",
    updatedAt: "2026-02-12T02:45:00.000Z",
  },
  {
    quoteId: 5303,
    truckId: 12,
    originAddress: "전라남도 순천시 해룡면",
    destinationAddress: "광주광역시 광산구 월곡동",
    distanceKm: 95.3,
    weightKg: 1400,
    volumeCbm: 6.8,
    vehicleType: "TON_2_5",
    vehicleBodyType: "CARGO",
    cargoName: "생활 잡화",
    cargoDesc: "",
    basePrice: 151000,
    distancePrice: 64000,
    extraPrice: 12000,
    desiredPrice: 214000,
    finalPrice: 0,
    allowCombine: false,
    loadMethod: "SHIPPER",
    unloadMethod: "DRIVER",
    status: "CANCELED",
    createdAt: "2026-02-11T06:05:00.000Z",
    updatedAt: "2026-02-11T08:20:00.000Z",
  },
];

const MATCH_SEED_INPUTS: SeedMatchInput[] = [
  {
    matchId: 7001,
    quoteId: 5102,
    accepted: false,
    status: "READY",
    createdAt: "2026-02-21T06:40:00.000Z",
    updatedAt: "2026-02-21T06:40:00.000Z",
  },
  {
    matchId: 7002,
    quoteId: 5103,
    accepted: false,
    status: "NEGOTIATING",
    createdAt: "2026-02-20T04:20:00.000Z",
    updatedAt: "2026-02-20T05:00:00.000Z",
  },
  {
    matchId: 7003,
    quoteId: 5104,
    driverId: 21,
    accepted: true,
    status: "READY",
    acceptedAt: new Date().toISOString(),
    createdAt: "2026-02-19T07:25:00.000Z",
    updatedAt: new Date().toISOString(),
  },
  {
    matchId: 7004,
    quoteId: 5105,
    driverId: 21,
    accepted: true,
    status: "TRANSIT",
    acceptedAt: "2026-02-18T10:15:00.000Z",
    createdAt: "2026-02-18T09:40:00.000Z",
    updatedAt: "2026-02-18T10:55:00.000Z",
  },
  {
    matchId: 7005,
    quoteId: 5106,
    driverId: 21,
    accepted: true,
    status: "TRANSIT",
    acceptedAt: "2026-02-17T12:10:00.000Z",
    createdAt: "2026-02-17T11:10:00.000Z",
    updatedAt: "2026-02-17T14:20:00.000Z",
  },
  {
    matchId: 7006,
    quoteId: 5201,
    driverId: 21,
    accepted: true,
    status: "DROPOFF",
    acceptedAt: "2026-02-16T05:20:00.000Z",
    createdAt: "2026-02-16T05:10:00.000Z",
    updatedAt: "2026-02-16T08:05:00.000Z",
  },
  {
    matchId: 7007,
    quoteId: 5301,
    accepted: false,
    status: "CANCELED",
    createdAt: "2026-02-13T08:25:00.000Z",
    updatedAt: "2026-02-13T08:55:00.000Z",
  },
];

const COUNTER_OFFER_SEED_INPUTS: SeedCounterOfferInput[] = [
  {
    counterOfferId: 9001,
    quoteId: 5103,
    driverId: 21,
    proposedPrice: 245000,
    message: "거리/대기 고려 운임 제안",
    status: "PENDING",
    createdAt: "2026-02-20T04:45:00.000Z",
  },
  {
    counterOfferId: 9002,
    quoteId: 5104,
    driverId: 21,
    proposedPrice: 186000,
    message: "즉시 배차 가능",
    status: "ACCEPTED",
    createdAt: "2026-02-19T07:30:00.000Z",
    respondedAt: "2026-02-19T07:32:00.000Z",
  },
];

// 3D 적재 시뮬레이션 데모용 적재 계획 (match 7003 / 산업 자재 오더)
const DEMO_TRUCK_SPEC: TruckSpecReferenceResponse = {
  vehicleType: "TON_5",
  vehicleTypeKr: "5톤",
  vehicleBodyType: "CARGO",
  categoryKr: "카고",
  cargoLengthCm: 450,
  cargoWidthCm: 230,
  cargoHeightCm: 240,
  maxWeight: 5000,
};

const DEMO_LOAD_PLAN: LoadPlanResponse = {
  placements: [
    // 박스 1: 좌전방 하단 — (x=0, y=0, z=0), 100×100×100 cm
    {
      id: "cargo-001",
      x: 0,
      y: 0,
      z: 0,
      width: 100,
      height: 100,
      length: 100,
      weight: 120,
      stopOrder: 1,
      stackable: true,
      fragile: false,
    },
    // 박스 2: 박스1 우측 옆 — (x=110, y=0, z=0), 100×100×100 cm
    {
      id: "cargo-002",
      x: 110,
      y: 0,
      z: 0,
      width: 100,
      height: 100,
      length: 100,
      weight: 115,
      stopOrder: 2,
      stackable: true,
      fragile: false,
    },
    // 박스 3: 박스1 뒤쪽 — (x=0, y=0, z=110), 100×100×100 cm
    {
      id: "cargo-003",
      x: 0,
      y: 0,
      z: 110,
      width: 100,
      height: 100,
      length: 100,
      weight: 130,
      stopOrder: 3,
      stackable: false,
      fragile: true,
    },
    // 박스 4: 박스1 위에 2단 적재 — (x=0, y=110, z=0), 100×80×100 cm
    {
      id: "cargo-004",
      x: 0,
      y: 110,
      z: 0,
      width: 100,
      height: 80,
      length: 100,
      weight: 90,
      stopOrder: 1,
      stackable: false,
      fragile: false,
    },
  ],
  stats: {
    placedCount: 4,
    unplacedCount: 0,
    utilization: 0.38,
    totalWeight: 455,
  },
};

export function createMockFlowSeed(): MockFlowSeed {
  const quotes = QUOTE_SEED_INPUTS.map((input) => buildSeedQuote(input));
  const matches = MATCH_SEED_INPUTS.map((input) => buildSeedMatch(input));
  const counterOffers = COUNTER_OFFER_SEED_INPUTS.map((input) => buildSeedCounterOffer(input));

  // matches 배열에 담겨 반환되는 동일 인스턴스에 주입해야 mock store에서도 그대로 참조된다.
  // Market(7001/7002) + Assigned(7003) 모두 3D 시뮬레이션 데이터를 노출한다.
  for (const targetId of [7001, 7002, 7003] as const) {
    const match = matches.find((m) => m.matchId === targetId) as MatchWithLoadData | undefined;
    if (!match) continue;
    match.loadPlan = DEMO_LOAD_PLAN;
    match.truckSpec = DEMO_TRUCK_SPEC;
  }

  return {
    quotes,
    matches,
    counterOffers,
    nextIds: {
      quoteId: 6001,
      matchId: 8001,
      counterOfferId: 9501,
    },
  };
}
