// rodia-monorepo/apps/mobile/src/features/quote/model/useQuoteDetail.ts
import { useCallback, useEffect, useMemo, useState } from "react";

import type { QuoteDetailResponse, QuoteId } from "@/entities/quote/model/quote.types";
import { getShipperQuoteDetail } from "@/features/quote/api";
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
    destinationAddress: String(raw.destinationAddress ?? ""),
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

function buildSpecificationArchive(quote: QuoteDetailResponse): QuoteSection[] {
  const vehicleType = String(quote?.vehicleType ?? "").trim();
  const vehicleBodyType = String(quote?.vehicleBodyType ?? "").trim();
  const vehicleText = [vehicleType, vehicleBodyType].filter(Boolean).join(" ").trim() || "정보 없음";

  const stops = Array.isArray(quote?.stops) ? quote.stops : [];
  const stopRows: QuoteSectionRow[] = stops.length
    ? stops.map((stop) => ({
        label: `경유지 ${Math.max(1, toSafeInteger(stop?.seq, 1))}`,
        value: formatStopValue(stop),
      }))
    : [];

  const stopSection: QuoteSection[] = stopRows.length
    ? [
        {
          title: "경유지",
          rows: stopRows,
        },
      ]
    : [];

  return [
    ...stopSection,
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

export function useQuoteDetail(quoteId: QuoteId, runtimeOverride?: QuoteDetailRuntimeOverride): QuoteDetailViewModel {
  const [quote, setQuote] = useState<QuoteDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const overrideStatus = runtimeOverride?.status;
  const overrideCancelReason = runtimeOverride?.cancelReason;
  const overrideCanceledAt = runtimeOverride?.canceledAt;

  const refetch = useCallback(() => {
    setReloadTick((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (!Number.isInteger(quoteId) || quoteId <= 0) {
      setQuote(null);
      setIsLoading(false);
      setErrorMessage("유효하지 않은 견적 ID입니다.");
      return () => {
        isMounted = false;
      };
    }

    setIsLoading(true);
    setErrorMessage(null);
    setQuote(null);

    getShipperQuoteDetail(quoteId)
      .then((response) => {
        if (!isMounted) return;
        setQuote(response ?? null);
      })
      .catch((error: unknown) => {
        if (!isMounted) return;
        const message =
          error instanceof Error && error.message.trim().length > 0
            ? error.message.trim()
            : "견적 상세를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
        setQuote(null);
        setErrorMessage(message);
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [quoteId, reloadTick]);

  return useMemo(() => {
    const safeQuote = toSafeQuote(quoteId, quote);

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
    const metaText = isCanceled ? `#${resolvedQuote?.quoteId ?? quoteId}` : `#${resolvedQuote?.quoteId ?? quoteId} · ${updatedAtText}`;

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
        quoteId: resolvedQuote?.quoteId ?? Number(quoteId),
        status: resolvedQuote?.status,
        cargoName: String(resolvedQuote?.cargoName ?? ""),
        finalPrice,
        originAddress,
        destinationAddress,
      },
    };
  }, [quote, quoteId, overrideStatus, overrideCancelReason, overrideCanceledAt, isLoading, errorMessage, refetch]);
}
