// rodia-monorepo/apps/mobile/src/features/quote/model/useQuoteDetail.ts
import { useCallback, useEffect, useMemo, useState } from "react";

import type { QuoteDetailResponse, QuoteId } from "@/entities/quote/model/quote.types";
import { getShipperQuoteDetailByIdentifier } from "@/features/quote/api";
import { isSessionExpiredApiError, SESSION_EXPIRED_MESSAGE } from "@/shared/lib/api/apiClient";
import {
  getQuoteActionPolicy,
  getQuoteStatusLabel,
  type BottomActionId,
  type QuoteActionPolicy,
  type QuoteHighlightType,
} from "@/features/quote/model/quoteActionMatrix";
import { isMockQuoteEnabled } from "@/shared/lib/config/env";

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

export type QuoteDetailRuntimeOverride = {
  status?: QuoteDetailResponse["status"];
  cancelReason?: string;
  canceledAt?: string;
};

export type QuoteDetailViewModel = {
  quote: QuoteDetailResponse;
  policy: QuoteActionPolicy;
  isLoading: boolean;
  errorMessage: string | null;
  isSessionExpired: boolean;
  refetch: () => void;
  commandCenter: {
    statusLabel: string;
    metaText: string;
    cancelReasonText?: string;
    canceledAtText?: string;
  };
  highlight: QuoteHighlight;
  coreSummary: {
    originAddress: string;
    destinationAddress: string;
    waypointAddresses: string[];
    distanceText: string;
    totalPriceText: string;
    totalPriceNote: string;
    completedAtText?: string;
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

const MOCK_WAYPOINTS_FALLBACK: string[] = ["인천광역시 연수구 (목업 경유지)"];

const QUOTE_STATUS_GUARD: Record<QuoteDetailResponse["status"], true> = {
  OPEN: true,
  NEGOTIATING: true,
  ASSIGNED: true,
  PICKUP: true,
  TRANSIT: true,
  DROPOFF: true,
  CANCELED: true,
};

function toSafeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toSafeInteger(value: unknown, fallback = 0): number {
  const parsed = toSafeNumber(value);
  return Number.isInteger(parsed) ? parsed : fallback;
}

function toSafeStatus(value: unknown): QuoteDetailResponse["status"] {
  const candidate = String(value ?? "OPEN") as QuoteDetailResponse["status"];
  return QUOTE_STATUS_GUARD[candidate] ? candidate : "OPEN";
}

function formatKrw(value: unknown): string {
  const safeValue = Math.max(0, Math.round(toSafeNumber(value)));
  return `${KRW_FORMAT.format(safeValue)}원`;
}

function mapEnumLabel<T extends string>(value: unknown, mapping: Record<string, string>, fallback = "-"): string {
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;
  const normalized = raw.toUpperCase();
  return mapping[normalized] ?? raw;
}

function toVehicleTypeLabel(value: unknown): string {
  return mapEnumLabel(value, {
    TON_1: "1톤",
    TON_2_5: "2.5톤",
    TON_5: "5톤",
  });
}

function toVehicleBodyTypeLabel(value: unknown): string {
  return mapEnumLabel(value, {
    CARGO: "카고",
    WING_BODY: "윙바디",
    TOP_CAR: "탑차",
  });
}

function toCargoTypeLabel(value: unknown): string {
  return mapEnumLabel(value, {
    GENERAL: "일반",
    FROZEN: "냉장/냉동",
  });
}

function toWorkMethodLabel(value: unknown): string {
  return mapEnumLabel(value, {
    SHIPPER: "화주",
    DRIVER: "기사",
  });
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

function toDisplayText(value: unknown, fallback = "-"): string {
  const text = String(value ?? "").trim();
  return text || fallback;
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

function toSafeStops(rawStops: unknown): QuoteDetailResponse["stops"] {
  if (!Array.isArray(rawStops)) return [];

  const mapped = rawStops.slice(0, 100).map((item, index) => {
    const src = (item ?? {}) as Partial<QuoteDetailResponse["stops"][number]>;
    const quoteStopId = Math.max(0, toSafeInteger(src?.quoteStopId, 0));
    const seq = Math.max(1, toSafeInteger(src?.seq, index + 1));

    return {
      quoteStopId,
      seq,
      address: String(src?.address ?? ""),
      lat: toSafeNumber(src?.lat),
      lng: toSafeNumber(src?.lng),
      contactName: String(src?.contactName ?? ""),
      contactPhone: String(src?.contactPhone ?? ""),
      deptName: String(src?.deptName ?? ""),
      managerName: String(src?.managerName ?? ""),
    };
  });

  return mapped
    .filter((stop) => Boolean(stop.address.trim()))
    .sort((a, b) => {
      const bySeq = a.seq - b.seq;
      if (bySeq !== 0) return bySeq;
      return a.quoteStopId - b.quoteStopId;
    });
}

function normalizeQuoteIdentifier(input: QuoteId | string): string {
  if (typeof input === "string") return input.trim();
  if (Number.isInteger(input) && input > 0) return String(input);
  return "";
}

function fallbackQuoteIdFromIdentifier(input: string): number {
  const parsed = Number(input);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function toSafeQuote(quoteId: QuoteId, source?: QuoteDetailResponse | null): QuoteDetailResponse {
  const safeQuoteId = Number.isInteger(quoteId) && quoteId > 0 ? quoteId : 0;
  const nowIso = new Date().toISOString();
  const raw = source ?? ({} as Partial<QuoteDetailResponse>);

  const rawQuoteId = toSafeInteger(raw.quoteId, safeQuoteId);
  const normalizedQuoteId = rawQuoteId > 0 ? rawQuoteId : safeQuoteId;

  const checklistItems = Array.isArray(raw.checklistItems)
    ? raw.checklistItems.map((item) => ({
        checklistItemId: toSafeInteger(item?.checklistItemId),
        extraInput: String(item?.extraInput ?? ""),
        extraFee: toSafeNumber(item?.extraFee),
      }))
    : [];

  return {
    quoteId: normalizedQuoteId,
    quotePublicId: String(raw.quotePublicId ?? "").trim() || undefined,
    shipperId: toSafeInteger(raw.shipperId),
    truckId: toSafeInteger(raw.truckId),
    originAddress: String(raw.originAddress ?? ""),
    originAddressDetail: String(raw.originAddressDetail ?? "").trim() || undefined,
    destinationAddress: String(raw.destinationAddress ?? ""),
    destinationAddressDetail: String(raw.destinationAddressDetail ?? "").trim() || undefined,
    originLat: toSafeNumber(raw.originLat),
    originLng: toSafeNumber(raw.originLng),
    destinationLat: toSafeNumber(raw.destinationLat),
    destinationLng: toSafeNumber(raw.destinationLng),
    distanceKm: toSafeNumber(raw.distanceKm),
    weightKg: toSafeNumber(raw.weightKg),
    volumeCbm: toSafeNumber(raw.volumeCbm),
    vehicleType: String(raw.vehicleType ?? ""),
    vehicleBodyType: String(raw.vehicleBodyType ?? ""),
    cargoName: String(raw.cargoName ?? ""),
    cargoType: String(raw.cargoType ?? ""),
    cargoDesc: String(raw.cargoDesc ?? ""),
    basePrice: toSafeNumber(raw.basePrice),
    distancePrice: toSafeNumber(raw.distancePrice),
    extraPrice: toSafeNumber(raw.extraPrice),
    desiredPrice: toSafeNumber(raw.desiredPrice),
    finalPrice: toSafeNumber(raw.finalPrice),
    allowCombine: typeof raw.allowCombine === "boolean" ? raw.allowCombine : false,
    loadMethod: String(raw.loadMethod ?? ""),
    unloadMethod: String(raw.unloadMethod ?? ""),
    status: toSafeStatus(raw.status),
    createdAt: String(raw.createdAt ?? nowIso),
    updatedAt: String(raw.updatedAt ?? nowIso),
    senderName: String(raw.senderName ?? "").trim() || undefined,
    senderPhone: String(raw.senderPhone ?? "").trim() || undefined,
    receiverName: String(raw.receiverName ?? "").trim() || undefined,
    receiverPhone: String(raw.receiverPhone ?? "").trim() || undefined,
    checklistItems,
    stops: toSafeStops((raw as unknown as { stops?: unknown })?.stops),
  };
}

function applyRuntimeOverride(quote: QuoteDetailResponse, override?: QuoteDetailRuntimeOverride): QuoteDetailResponse {
  if (!override) return quote;

  const nextStatus = override.status ?? quote.status;
  const nextUpdatedAt = override.canceledAt ?? quote.updatedAt;

  return {
    ...quote,
    status: nextStatus,
    updatedAt: nextUpdatedAt,
  };
}

function buildHighlight(
  quote: QuoteDetailResponse,
  policy: QuoteActionPolicy,
  _override?: QuoteDetailRuntimeOverride
): QuoteHighlight {
  const quickActions = policy.highlightCard?.quickActions ?? [];
  const highlightType = policy.highlightCard?.type;
  const status = quote?.status ?? "";

  if (status === "CANCELED") {
    return {
      type: "none",
      eyebrow: "취소 상태",
      title: "",
      lines: [],
      quickActions: [],
    };
  }

  if (highlightType === "priceCompare") {
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

  if (highlightType === "driverProfile") {
    return {
      type: "driverProfile",
      eyebrow: "배차 정보",
      title: "결제 후 운송이 시작됩니다",
      lines: [`차량 번호 ${String(quote?.truckId ?? "-")}`, "결제 완료 후 기사님 연락이 가능합니다."],
      footnote: "필요 시 취소 요청도 가능합니다.",
      quickActions,
    };
  }

  if (highlightType === "miniMap") {
    const updated = formatDateTime(quote?.updatedAt);
    const helper =
      status === "TRANSIT"
        ? "실시간 위치를 확인할 수 있습니다."
        : status === "PICKUP"
          ? "상차 사진을 확인할 수 있습니다."
          : "진행 상황을 확인할 수 있습니다.";

    return {
      type: "miniMap",
      eyebrow: "운송 추적",
      title: "현재 진행 상황입니다",
      lines: [`최근 갱신 ${updated}`, helper],
      quickActions,
    };
  }

  if (highlightType === "progressInfo") {
    return {
      type: "progressInfo",
      eyebrow: "배차 진행",
      title: "배차 가능한 기사님을 확인 중입니다",
      lines: [`접수 ${formatDateTime(quote?.createdAt)}`, `최근 갱신 ${formatDateTime(quote?.updatedAt)}`],
      quickActions,
    };
  }

  if (highlightType === "proof") {
    return {
      type: "proof",
      eyebrow: "정산 정보",
      title: "",
      lines: ["인수증을 확인할 수 있습니다."],
      quickActions,
    };
  }

  return { type: "none", eyebrow: "운송 요약", title: "", lines: [], quickActions: [] };
}

function formatStopValue(stop: QuoteDetailResponse["stops"][number]): string {
  const address = String(stop?.address ?? "").trim();
  const contactName = String(stop?.contactName ?? "").trim();
  const contactPhone = String(stop?.contactPhone ?? "").trim();
  const deptName = String(stop?.deptName ?? "").trim();
  const managerName = String(stop?.managerName ?? "").trim();

  const metaParts = [
    deptName ? `부서 ${deptName}` : "",
    managerName ? `담당 ${managerName}` : "",
    contactName ? `연락처 ${contactName}` : "",
    contactPhone ? contactPhone : "",
  ].filter(Boolean);

  if (!metaParts.length) return address || "정보 없음";
  return `${address || "정보 없음"} (${metaParts.join(" · ")})`;
}

function buildDropOffSummary(quote: QuoteDetailResponse): string {
  const stops = Array.isArray(quote?.stops) ? quote.stops : [];
  const stopTexts = stops
    .slice()
    .sort((a, b) => toSafeInteger(a?.seq, 0) - toSafeInteger(b?.seq, 0))
    .map((stop, index) => {
      const seq = Math.max(1, toSafeInteger(stop?.seq, index + 1));
      const address = String(stop?.address ?? "").trim();
      if (!address) return "";
      return `경유지 ${seq} (${address})`;
    })
    .filter(Boolean);

  const destinationAddress = String(quote?.destinationAddress ?? "").trim();
  const destinationText = destinationAddress ? `도착지 (${destinationAddress})` : "";
  const parts = destinationText ? [...stopTexts, destinationText] : stopTexts;

  return parts.length ? parts.join(" / ") : "-";
}

function buildSpecificationArchive(quote: QuoteDetailResponse): QuoteSection[] {
  const vehicleType = toVehicleTypeLabel(quote?.vehicleType);
  const vehicleBodyType = toVehicleBodyTypeLabel(quote?.vehicleBodyType);
  const vehicleText = [vehicleType, vehicleBodyType].filter(Boolean).join(" ").trim();

  const stops = Array.isArray(quote?.stops) ? quote.stops : [];
  const stopRows: QuoteSectionRow[] = stops.length
    ? stops.map((stop) => ({
        label: `경유지 ${Math.max(1, toSafeInteger(stop?.seq, 1))}`,
        value: formatStopValue(stop),
      }))
    : [{ label: "경유지", value: "-" }];

  return [
    {
      title: "출발지 정보",
      rows: [
        { label: "주소", value: toDisplayText(quote?.originAddress) },
        { label: "상세주소", value: toDisplayText(quote?.originAddressDetail) },
        { label: "발송인", value: toDisplayText(quote?.senderName) },
        { label: "연락처", value: toDisplayText(quote?.senderPhone) },
      ],
    },
    {
      title: "도착지 정보",
      rows: [
        { label: "주소", value: toDisplayText(quote?.destinationAddress) },
        { label: "상세주소", value: toDisplayText(quote?.destinationAddressDetail) },
        { label: "수취인", value: toDisplayText(quote?.receiverName) },
        { label: "연락처", value: toDisplayText(quote?.receiverPhone) },
      ],
    },
    {
      title: "경유지",
      rows: stopRows,
    },
    {
      title: "차량/화물",
      rows: [
        { label: "차량", value: toDisplayText(vehicleText) },
        { label: "화물명", value: toDisplayText(quote?.cargoName) },
        { label: "화물 구분", value: toDisplayText(toCargoTypeLabel(quote?.cargoType)) },
        { label: "화물 설명", value: toDisplayText(quote?.cargoDesc) },
        { label: "중량", value: `${toSafeNumber(quote?.weightKg).toLocaleString("ko-KR")}kg` },
        { label: "부피", value: `${toSafeNumber(quote?.volumeCbm).toFixed(1)}cbm` },
        { label: "하차 위치", value: buildDropOffSummary(quote) },
      ],
    },
    {
      title: "상차/하차",
      rows: [
        { label: "상차 방식", value: toDisplayText(toWorkMethodLabel(quote?.loadMethod)) },
        { label: "하차 방식", value: toDisplayText(toWorkMethodLabel(quote?.unloadMethod)) },
        { label: "합짐 여부", value: quote?.allowCombine ? "허용" : "단독 운송" },
        { label: "추가 요청", value: formatChecklistItems(quote?.checklistItems) },
      ],
    },
    {
      title: "요금 내역",
      rows: [
        { label: "제안 금액", value: formatKrw(quote?.desiredPrice) },
        { label: "최종 금액", value: formatKrw(quote?.finalPrice) },
        { label: "기본 요금", value: formatKrw(quote?.basePrice) },
        { label: "거리 요금", value: formatKrw(quote?.distancePrice) },
        { label: "추가 요금", value: formatKrw(quote?.extraPrice) },
        { label: "운송 거리", value: `${toSafeNumber(quote?.distanceKm).toFixed(1)}km` },
      ],
    },
  ];
}

function buildWaypointAddresses(resolvedQuote: QuoteDetailResponse): string[] {
  const fromStops = Array.isArray(resolvedQuote?.stops)
    ? resolvedQuote.stops
        .slice()
        .sort((a, b) => toSafeInteger(a?.seq, 0) - toSafeInteger(b?.seq, 0))
        .map((stop) => String(stop?.address ?? "").trim())
        .filter(Boolean)
    : [];

  if (fromStops.length) return fromStops;

  if (!isMockQuoteEnabled()) return [];
  return MOCK_WAYPOINTS_FALLBACK.filter(Boolean);
}

export function useQuoteDetail(quoteIdentifier: QuoteId | string, runtimeOverride?: QuoteDetailRuntimeOverride): QuoteDetailViewModel {
  const normalizedIdentifier = normalizeQuoteIdentifier(quoteIdentifier);
  const fallbackQuoteId = fallbackQuoteIdFromIdentifier(normalizedIdentifier);
  const [quote, setQuote] = useState<QuoteDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSessionExpired, setIsSessionExpired] = useState<boolean>(false);
  const [reloadTick, setReloadTick] = useState(0);
  const overrideStatus = runtimeOverride?.status;
  const overrideCancelReason = runtimeOverride?.cancelReason;
  const overrideCanceledAt = runtimeOverride?.canceledAt;

  const refetch = useCallback(() => {
    setReloadTick((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (!normalizedIdentifier) {
      setQuote(null);
      setIsLoading(false);
      setErrorMessage("유효하지 않은 견적 식별자입니다.");
      setIsSessionExpired(false);
      return () => {
        isMounted = false;
      };
    }

    setIsLoading(true);
    setErrorMessage(null);
    setIsSessionExpired(false);
    setQuote(null);

    getShipperQuoteDetailByIdentifier(normalizedIdentifier)
      .then((response) => {
        if (!isMounted) return;
        setQuote(response ?? null);
        setIsSessionExpired(false);
      })
      .catch((error: unknown) => {
        if (!isMounted) return;
        const status = Number((error as { response?: { status?: unknown } } | undefined)?.response?.status ?? 0);
        const sessionExpired = isSessionExpiredApiError(error) || status === 401;
        const message =
          sessionExpired
            ? SESSION_EXPIRED_MESSAGE
            : error instanceof Error && error.message.trim().length > 0
            ? error.message.trim()
            : "견적 상세를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
        setQuote(null);
        setIsSessionExpired(sessionExpired);
        setErrorMessage(message);
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [normalizedIdentifier, reloadTick]);

  return useMemo(() => {
    const safeQuote = toSafeQuote(fallbackQuoteId, quote);

    const normalizedOverride =
      overrideStatus !== undefined || overrideCancelReason !== undefined || overrideCanceledAt !== undefined
        ? {
            status: overrideStatus,
            cancelReason: overrideCancelReason,
            canceledAt: overrideCanceledAt,
          }
        : undefined;

    const resolvedQuote = applyRuntimeOverride(safeQuote, normalizedOverride);
    const policy = getQuoteActionPolicy(resolvedQuote?.status ?? "");
    const waypointAddresses = buildWaypointAddresses(resolvedQuote);

    const statusLabel = policy?.badgeLabel || getQuoteStatusLabel(resolvedQuote?.status ?? "");
    const originAddress = String(resolvedQuote?.originAddress ?? "");
    const destinationAddress = String(resolvedQuote?.destinationAddress ?? "");
    const finalPrice = toSafeNumber(resolvedQuote?.finalPrice);

    const isCanceled = (resolvedQuote?.status ?? "") === "CANCELED";
    const isCompleted = (resolvedQuote?.status ?? "") === "DROPOFF";
    const updatedAtText = formatDateTime(resolvedQuote?.updatedAt);
    const metaText =
      isCanceled
        ? `#${resolvedQuote?.quoteId ?? fallbackQuoteId}`
        : `#${resolvedQuote?.quoteId ?? fallbackQuoteId} · ${updatedAtText}`;

    const cancelReasonText = isCanceled
      ? String(overrideCancelReason ?? "").trim() || "취소 사유가 입력되지 않았습니다."
      : "";

    const canceledAtText = isCanceled ? formatDateTime(overrideCanceledAt ?? resolvedQuote?.updatedAt) : "";

    const totalPriceText = isCanceled ? "" : formatKrw(finalPrice);
    const totalPriceNote = isCanceled ? "" : isCompleted ? "최종 정산 금액입니다." : "세부 요금은 아래에서 확인할 수 있습니다.";
    const completedAtText = (resolvedQuote?.status ?? "") === "DROPOFF" ? formatDateTime(resolvedQuote?.updatedAt) : "";

    return {
      quote: resolvedQuote,
      policy,
      isLoading,
      errorMessage,
      isSessionExpired,
      refetch,
      commandCenter: { statusLabel, metaText, cancelReasonText, canceledAtText },
      highlight: buildHighlight(resolvedQuote, policy, normalizedOverride),
      coreSummary: {
        originAddress,
        destinationAddress,
        waypointAddresses,
        distanceText: `${toSafeNumber(resolvedQuote?.distanceKm).toFixed(1)}km`,
        totalPriceText,
        totalPriceNote,
        completedAtText,
      },
      specificationArchive: buildSpecificationArchive(resolvedQuote),
      actionsContext: {
        quoteId: resolvedQuote?.quoteId ?? Number(fallbackQuoteId),
        status: resolvedQuote?.status,
        cargoName: String(resolvedQuote?.cargoName ?? ""),
        finalPrice,
        originAddress,
        destinationAddress,
      },
    };
  }, [quote, fallbackQuoteId, overrideStatus, overrideCancelReason, overrideCanceledAt, isLoading, errorMessage, isSessionExpired, refetch]);
}
