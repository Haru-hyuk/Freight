// features/quote/model/useQuoteDetail.ts
import { useMemo } from "react";

import type { QuoteDetailResponse, QuoteId } from "@/entities/quote/model/quote.types";
import { getQuoteActionPolicy, getQuoteStatusLabel, type BottomActionId, type QuoteActionPolicy, type QuoteHighlightType } from "@/features/quote/model/quoteActionMatrix";

export type QuoteSectionRow = {
  label: string;
  value: string;
};

export type QuoteSection = {
  title: string;
  rows: QuoteSectionRow[];
};

export type QuoteHighlight = {
  type: QuoteHighlightType;
  eyebrow: string;
  title: string;
  lines: string[];
  footnote?: string;
  quickActions: BottomActionId[];
};

export type QuoteActionsContext = {
  quoteId: number;
  status: QuoteDetailResponse["status"];
  cargoName: string;
  finalPrice: number;
  originAddress: string;
  destinationAddress: string;
};

export type QuoteDetailViewModel = {
  quote: QuoteDetailResponse;
  policy: QuoteActionPolicy;
  commandCenter: {
    statusLabel: string;
    metaText: string;
  };
  highlight: QuoteHighlight;
  coreSummary: {
    originAddress: string;
    destinationAddress: string;
    waypointAddresses: string[];
    distanceText: string;
    totalPriceText: string;
    totalPriceNote: string;
  };
  specificationArchive: QuoteSection[];
  actionsContext: QuoteActionsContext;
};

const KRW_FORMAT = (() => {
  try {
    // RN Hermes/JS runtime may vary; keep safe fallback.
    if (typeof Intl !== "undefined" && typeof Intl.NumberFormat === "function") return new Intl.NumberFormat("ko-KR");
  } catch {
    // ignore
  }
  return { format: (v: number) => String(v) } as Pick<Intl.NumberFormat, "format">;
})();

const MOCK_WAYPOINTS_BY_QUOTE_ID: Record<number, string[]> = {
  304: ["부산광역시 강서구 대저동 33-5"],
  305: ["대전광역시 대덕구 문평동 211", "경상북도 칠곡군 지천면 92"],
};

const MOCK_DETAILS: Record<number, QuoteDetailResponse> = {
  301: {
    quoteId: 301,
    shipperId: 1001,
    truckId: 12,
    originAddress: "서울특별시 금천구 가산동 123-4",
    destinationAddress: "경기도 성남시 분당구 정자동 12-9",
    originLat: 37.4765,
    originLng: 126.8823,
    destinationLat: 37.3695,
    destinationLng: 127.1089,
    distanceKm: 32.4,
    weightKg: 1850,
    volumeCbm: 9.2,
    vehicleType: "5톤",
    vehicleBodyType: "윙바디",
    cargoName: "전자부품",
    cargoType: "일반",
    cargoDesc: "파손 주의 라벨이 부착된 정밀 부품 박스 48개",
    basePrice: 150000,
    distancePrice: 30000,
    extraPrice: 15000,
    desiredPrice: 180000,
    finalPrice: 195000,
    allowCombine: false,
    loadMethod: "지게차 상차",
    unloadMethod: "수작업 하차",
    status: "NEGOTIATING",
    createdAt: "2026-02-20T08:20:00Z",
    updatedAt: "2026-02-20T08:42:00Z",
    checklistItems: [
      { checklistItemId: 1, extraInput: "파손 주의 스티커", extraFee: 5000 },
      { checklistItemId: 4, extraInput: "방수 포장", extraFee: 10000 },
    ],
  },
  302: {
    quoteId: 302,
    shipperId: 1001,
    truckId: 4,
    originAddress: "인천광역시 남동구 고잔동 511",
    destinationAddress: "대전광역시 유성구 관평동 901",
    originLat: 37.4032,
    originLng: 126.7004,
    destinationLat: 36.4231,
    destinationLng: 127.3938,
    distanceKm: 153.8,
    weightKg: 3960,
    volumeCbm: 21.7,
    vehicleType: "11톤",
    vehicleBodyType: "탑차",
    cargoName: "냉장식품",
    cargoType: "냉장",
    cargoDesc: "냉장 온도 4도 유지가 필요한 식품 박스 120개",
    basePrice: 330000,
    distancePrice: 70000,
    extraPrice: 30000,
    desiredPrice: 420000,
    finalPrice: 430000,
    allowCombine: false,
    loadMethod: "파렛트 상차",
    unloadMethod: "파렛트 하차",
    status: "ASSIGNED",
    createdAt: "2026-02-20T06:45:00Z",
    updatedAt: "2026-02-20T07:15:00Z",
    checklistItems: [
      { checklistItemId: 2, extraInput: "냉장 유지", extraFee: 20000 },
      { checklistItemId: 5, extraInput: "시간 지정", extraFee: 10000 },
    ],
  },
  303: {
    quoteId: 303,
    shipperId: 1001,
    truckId: 9,
    originAddress: "경기도 하남시 미사강변동로 85",
    destinationAddress: "충청남도 천안시 서북구 성거읍 331",
    originLat: 37.5601,
    originLng: 127.1779,
    destinationLat: 36.8969,
    destinationLng: 127.1733,
    distanceKm: 95.3,
    weightKg: 2410,
    volumeCbm: 13.2,
    vehicleType: "2.5톤",
    vehicleBodyType: "카고",
    cargoName: "생활용품",
    cargoType: "일반",
    cargoDesc: "박스 및 비닐 포장 생활용품 85건",
    basePrice: 150000,
    distancePrice: 50000,
    extraPrice: 10000,
    desiredPrice: 210000,
    finalPrice: 210000,
    allowCombine: true,
    loadMethod: "수작업 상차",
    unloadMethod: "수작업 하차",
    status: "OPEN",
    createdAt: "2026-02-20T05:55:00Z",
    updatedAt: "2026-02-20T06:05:00Z",
    checklistItems: [
      { checklistItemId: 3, extraInput: "도착 전 연락", extraFee: 0 },
      { checklistItemId: 6, extraInput: "상차 위치 사진", extraFee: 0 },
    ],
  },
  304: {
    quoteId: 304,
    shipperId: 1001,
    truckId: 15,
    originAddress: "부산광역시 사하구 장림동 220",
    destinationAddress: "경상남도 창원시 의창구 팔용동 88",
    originLat: 35.0803,
    originLng: 128.9668,
    destinationLat: 35.2598,
    destinationLng: 128.6158,
    distanceKm: 46.2,
    weightKg: 3180,
    volumeCbm: 17.1,
    vehicleType: "5톤",
    vehicleBodyType: "카고",
    cargoName: "건축 자재",
    cargoType: "일반",
    cargoDesc: "타일, 몰탈 등 건축 자재 62건",
    basePrice: 130000,
    distancePrice: 25000,
    extraPrice: 15000,
    desiredPrice: 170000,
    finalPrice: 170000,
    allowCombine: false,
    loadMethod: "지게차 상차",
    unloadMethod: "지게차 하차",
    status: "PICKUP",
    createdAt: "2026-02-20T04:20:00Z",
    updatedAt: "2026-02-20T04:52:00Z",
    checklistItems: [
      { checklistItemId: 1, extraInput: "파손 주의", extraFee: 5000 },
      { checklistItemId: 7, extraInput: "현장 안전모 착용", extraFee: 10000 },
    ],
  },
  305: {
    quoteId: 305,
    shipperId: 1001,
    truckId: 6,
    originAddress: "서울특별시 강남구 역삼동 721",
    destinationAddress: "부산광역시 해운대구 우동 1408",
    originLat: 37.5008,
    originLng: 127.0368,
    destinationLat: 35.1631,
    destinationLng: 129.1636,
    distanceKm: 402.6,
    weightKg: 5220,
    volumeCbm: 28.5,
    vehicleType: "11톤",
    vehicleBodyType: "윙바디",
    cargoName: "사무기기",
    cargoType: "일반",
    cargoDesc: "컴퓨터, 모니터, 사무기기 팔레트 22개",
    basePrice: 520000,
    distancePrice: 140000,
    extraPrice: 50000,
    desiredPrice: 690000,
    finalPrice: 710000,
    allowCombine: false,
    loadMethod: "리프트 상차",
    unloadMethod: "리프트 하차",
    status: "TRANSIT",
    createdAt: "2026-02-20T03:10:00Z",
    updatedAt: "2026-02-20T05:35:00Z",
    checklistItems: [
      { checklistItemId: 8, extraInput: "습기 주의", extraFee: 30000 },
      { checklistItemId: 3, extraInput: "도착 전 연락", extraFee: 0 },
    ],
  },
  306: {
    quoteId: 306,
    shipperId: 1001,
    truckId: 3,
    originAddress: "강원특별자치도 원주시 지정면 72",
    destinationAddress: "서울특별시 송파구 문정동 640",
    originLat: 37.3674,
    originLng: 127.8679,
    destinationLat: 37.4844,
    destinationLng: 127.1197,
    distanceKm: 114.5,
    weightKg: 2740,
    volumeCbm: 14.9,
    vehicleType: "5톤",
    vehicleBodyType: "윙바디",
    cargoName: "공산품",
    cargoType: "일반",
    cargoDesc: "생활 공산품 박스 110건",
    basePrice: 180000,
    distancePrice: 30000,
    extraPrice: 10000,
    desiredPrice: 230000,
    finalPrice: 220000,
    allowCombine: true,
    loadMethod: "지게차 상차",
    unloadMethod: "수작업 하차",
    status: "DROPOFF",
    createdAt: "2026-02-18T09:40:00Z",
    updatedAt: "2026-02-18T13:10:00Z",
    checklistItems: [
      { checklistItemId: 2, extraInput: "냉장 불필요", extraFee: 0 },
      { checklistItemId: 9, extraInput: "도착 확인 서명", extraFee: 0 },
    ],
  },
  307: {
    quoteId: 307,
    shipperId: 1001,
    truckId: 17,
    originAddress: "경기도 평택시 포승읍 만호리 12",
    destinationAddress: "전라남도 여수시 중흥동 44",
    originLat: 36.9984,
    originLng: 126.846,
    destinationLat: 34.7602,
    destinationLng: 127.6622,
    distanceKm: 268.9,
    weightKg: 7900,
    volumeCbm: 41.1,
    vehicleType: "25톤",
    vehicleBodyType: "컨테이너",
    cargoName: "수출 화물",
    cargoType: "일반",
    cargoDesc: "수출용 포장 화물 40피트 컨테이너 1개",
    basePrice: 760000,
    distancePrice: 170000,
    extraPrice: 50000,
    desiredPrice: 980000,
    finalPrice: 0,
    allowCombine: false,
    loadMethod: "컨테이너 상차",
    unloadMethod: "컨테이너 하차",
    status: "CANCELED",
    createdAt: "2026-02-17T14:15:00Z",
    updatedAt: "2026-02-17T14:40:00Z",
    checklistItems: [
      { checklistItemId: 10, extraInput: "보안 봉인", extraFee: 50000 },
      { checklistItemId: 3, extraInput: "도착 전 연락", extraFee: 0 },
    ],
  },
};

function toSafeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function formatKrw(value: unknown): string {
  const safeValue = Math.max(0, Math.round(toSafeNumber(value)));
  return `${KRW_FORMAT.format(safeValue)}원`;
}

function formatDateTime(iso: unknown): string {
  const raw = typeof iso === "string" ? iso : "";
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) return "시간 정보 없음";

  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${month}월 ${day}일 ${hour}:${minute}`;
}

function formatChecklistItems(items: QuoteDetailResponse["checklistItems"] | undefined): string {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return "추가 요청 없음";

  const lines = list
    .map((item) => {
      const text = String(item?.extraInput ?? "").trim();
      const fee = toSafeNumber(item?.extraFee);
      if (!text) return "";
      if (fee <= 0) return text;
      return `${text} (+${formatKrw(fee)})`;
    })
    .filter(Boolean);

  return lines.length ? lines.join(" / ") : "추가 요청 없음";
}

function buildHighlight(quote: QuoteDetailResponse, policy: QuoteActionPolicy): QuoteHighlight {
  const quickActions = policy.highlightCard?.quickActions ?? [];
  const status = quote?.status ?? "";

  if (policy.highlightCard.type === "priceCompare") {
    const desired = toSafeNumber(quote?.desiredPrice);
    const final = toSafeNumber(quote?.finalPrice);
    const diff = final - desired;
    const diffText = diff > 0 ? `+${formatKrw(diff)}` : diff < 0 ? `-${formatKrw(Math.abs(diff))}` : "동일";

    return {
      type: "priceCompare",
      eyebrow: "운임 비교",
      title: "제안 금액을 확인해주세요",
      lines: [`희망 운임 ${formatKrw(desired)}`, `제안 운임 ${formatKrw(final)}`, `차액 ${diffText}`],
      footnote: "수락 또는 거절을 선택할 수 있습니다.",
      quickActions,
    };
  }

  if (policy.highlightCard.type === "driverProfile") {
    return {
      type: "driverProfile",
      eyebrow: "배차 정보",
      title: "결제 후 운송이 시작됩니다",
      lines: [`차량 번호 ${String(quote?.truckId ?? "-")}`, "결제 완료 후 기사님 연락이 가능합니다."],
      footnote: "필요 시 취소 요청도 가능합니다.",
      quickActions,
    };
  }

  if (policy.highlightCard.type === "miniMap") {
    const updated = formatDateTime(quote?.updatedAt);
    const helper =
      status === "TRANSIT" ? "실시간 위치를 확인할 수 있습니다." : status === "PICKUP" ? "상차 사진을 확인할 수 있습니다." : "진행 상황을 확인할 수 있습니다.";

    return {
      type: "miniMap",
      eyebrow: "운송 추적",
      title: "현재 진행 상황입니다",
      lines: [`최근 갱신 ${updated}`, helper],
      quickActions,
    };
  }

  if (policy.highlightCard.type === "progressInfo") {
    return {
      type: "progressInfo",
      eyebrow: "배차 진행",
      title: "배차 가능한 기사님을 확인 중입니다",
      lines: [`접수 ${formatDateTime(quote?.createdAt)}`, `최근 갱신 ${formatDateTime(quote?.updatedAt)}`],
      quickActions,
    };
  }

  if (policy.highlightCard.type === "proof") {
    return {
      type: "proof",
      eyebrow: "완료 안내",
      title: "운송이 완료되었습니다",
      lines: [`완료 시간 ${formatDateTime(quote?.updatedAt)}`, "인수증을 확인할 수 있습니다."],
      footnote: "문제가 있으면 고객센터로 문의해주세요.",
      quickActions,
    };
  }

  return { type: "none", eyebrow: "운송 요약", title: "", lines: [], quickActions: [] };
}

function buildSpecificationArchive(quote: QuoteDetailResponse): QuoteSection[] {
  const vehicleType = String(quote?.vehicleType ?? "").trim();
  const vehicleBodyType = String(quote?.vehicleBodyType ?? "").trim();
  const vehicleText = [vehicleType, vehicleBodyType].filter(Boolean).join(" ").trim() || "정보 없음";

  return [
    {
      title: "차량 및 화물",
      rows: [
        { label: "차량", value: vehicleText },
        { label: "화물명", value: String(quote?.cargoName ?? "정보 없음") },
        { label: "화물 구분", value: String(quote?.cargoType ?? "정보 없음") },
        { label: "화물 설명", value: String(quote?.cargoDesc ?? "정보 없음") },
        { label: "중량", value: `${toSafeNumber(quote?.weightKg).toLocaleString("ko-KR")}kg` },
        { label: "부피", value: `${toSafeNumber(quote?.volumeCbm).toFixed(1)}cbm` },
      ],
    },
    {
      title: "상차 및 하차",
      rows: [
        { label: "상차 방식", value: String(quote?.loadMethod ?? "정보 없음") },
        { label: "하차 방식", value: String(quote?.unloadMethod ?? "정보 없음") },
        { label: "합짐 여부", value: quote?.allowCombine ? "허용" : "단독 운송" },
        { label: "추가 요청", value: formatChecklistItems(quote?.checklistItems) },
      ],
    },
    {
      title: "요금 내역",
      rows: [
        { label: "기본 요금", value: formatKrw(quote?.basePrice) },
        { label: "거리 요금", value: formatKrw(quote?.distancePrice) },
        { label: "추가 요금", value: formatKrw(quote?.extraPrice) },
      ],
    },
  ];
}

export function useQuoteDetail(quoteId: QuoteId): QuoteDetailViewModel {
  return useMemo(() => {
    const quote = (MOCK_DETAILS as Record<number, QuoteDetailResponse>)[quoteId] ?? MOCK_DETAILS[301];
    const policy = getQuoteActionPolicy(quote?.status ?? "");
    const waypointAddresses = (MOCK_WAYPOINTS_BY_QUOTE_ID as Record<number, string[]>)[quote?.quoteId ?? 0] ?? [];

    const statusLabel = policy?.badgeLabel || getQuoteStatusLabel(quote?.status ?? "");
    const updatedAtText = formatDateTime(quote?.updatedAt);
    const metaText = `#${quote?.quoteId ?? quoteId} · ${updatedAtText}`;

    const originAddress = String(quote?.originAddress ?? "");
    const destinationAddress = String(quote?.destinationAddress ?? "");
    const finalPrice = toSafeNumber(quote?.finalPrice);

    const isCanceled = (quote?.status ?? "") === "CANCELED";
    const totalPriceText = isCanceled ? "" : formatKrw(finalPrice);
    const totalPriceNote = isCanceled ? "" : "세부 요금은 아래에서 확인할 수 있습니다.";

    return {
      quote,
      policy,
      commandCenter: { statusLabel, metaText },
      highlight: buildHighlight(quote, policy),
      coreSummary: {
        originAddress,
        destinationAddress,
        waypointAddresses,
        distanceText: `${toSafeNumber(quote?.distanceKm).toFixed(1)}km`,
        totalPriceText,
        totalPriceNote,
      },
      specificationArchive: buildSpecificationArchive(quote),
      actionsContext: {
        quoteId: quote?.quoteId ?? Number(quoteId),
        status: quote?.status,
        cargoName: String(quote?.cargoName ?? ""),
        finalPrice,
        originAddress,
        destinationAddress,
      },
    };
  }, [quoteId]);
}