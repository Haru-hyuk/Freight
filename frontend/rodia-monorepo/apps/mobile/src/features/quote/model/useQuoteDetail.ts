// rodia-monorepo/apps/mobile/src/features/quote/model/useQuoteDetail.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { QuoteDetailResponse, QuoteId } from "@/entities/quote/model/quote.types";
import { getShipperQuoteDetailByIdentifier } from "@/features/quote/api";
import { isSessionExpiredApiError, SESSION_EXPIRED_MESSAGE } from "@/shared/lib/api/apiClient";
import { formatDateTime, formatKrw } from "@/shared/lib/format/display";
import {
  getQuoteActionPolicy,
  getQuoteStatusLabel,
  type QuoteActionPolicy,
} from "@/features/quote/model/quoteActionMatrix";
import { CUSTOMER_UI_STATE, getCustomerUiStateFromBackendStatus } from "@/shared/lib/policy";
import { formatWorkMethodLabel } from "@/features/quote/model/workMethod";

export type QuoteSectionRow = {
  label: string;
  value: string;
  twoCol?: boolean;
};

export type QuoteSection = {
  title: string;
  rows: QuoteSectionRow[];
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
  refetch: () => Promise<void>;
  commandCenter: {
    statusLabel: string;
    metaText: string;
    cancelReasonText?: string;
    canceledAtText?: string;
  };
  coreSummary: {
    originAddress: string;
    destinationAddress: string;
    waypointAddresses: string[];
    completedAtText?: string;
  };
  specificationArchive: QuoteSection[];
  actionsContext: QuoteActionsContext;
};

function toSafeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toSafeInteger(value: unknown, fallback = 0): number {
  const parsed = toSafeNumber(value);
  return Number.isInteger(parsed) ? parsed : fallback;
}

function toSafeStatus(value: unknown): QuoteDetailResponse["status"] {
  const candidate = String(value ?? "").trim().toUpperCase();
  return (candidate || "UNKNOWN") as QuoteDetailResponse["status"];
}

function mapEnumLabel(value: unknown, mapping: Record<string, string>, fallback = "-"): string {
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

function toCargoTypeIcon(value: unknown): string {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized === "FROZEN") return "❄";
  return "📦";
}

function formatCargoHeadline(cargoName: unknown, cargoType: unknown): string {
  const name = String(cargoName ?? "").trim();
  if (!name) return "-";
  return `${toCargoTypeIcon(cargoType)} ${name}`;
}

function toDisplayText(value: unknown, fallback = "-"): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function formatChecklistItems(items: QuoteDetailResponse["checklistItems"] | undefined): string {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return "-";

  const lines = list
    .map((item) => {
      const text = String(item?.extraInput ?? "").trim();
      const fee = toSafeNumber(item?.extraFee);
      if (!text) return "";
      if (fee <= 0) return text;
      return `${text} (+${formatKrw(fee)})`;
    })
    .filter(Boolean);

  return lines.length ? lines.join(" / ") : "-";
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

  const quoteItems = Array.isArray(raw.quoteItems)
    ? raw.quoteItems.map((item, index) => ({
        quoteItemId: Math.max(0, toSafeInteger(item?.quoteItemId)),
        itemName: String(item?.itemName ?? ""),
        itemType: String(item?.itemType ?? ""),
        itemDescription: String(item?.itemDescription ?? ""),
        quantity: Math.max(1, toSafeInteger(item?.quantity, 1)),
        lengthCm: Math.max(0, toSafeNumber(item?.lengthCm)),
        widthCm: Math.max(0, toSafeNumber(item?.widthCm)),
        heightCm: Math.max(0, toSafeNumber(item?.heightCm)),
        unitWeightKg: Math.max(0, toSafeNumber(item?.unitWeightKg)),
        unitVolumeCbm: Math.max(0, toSafeNumber(item?.unitVolumeCbm)),
        fragile: typeof item?.fragile === "boolean" ? item.fragile : false,
        upright: typeof item?.upright === "boolean" ? item.upright : false,
        noStack: typeof item?.noStack === "boolean" ? item.noStack : false,
        bottomOnly: typeof item?.bottomOnly === "boolean" ? item.bottomOnly : false,
        rotatable: typeof item?.rotatable === "boolean" ? item.rotatable : false,
        stackable: typeof item?.stackable === "boolean" ? item.stackable : false,
        maxStackWeightKg: Math.max(0, toSafeNumber(item?.maxStackWeightKg)),
        handlingTags: String(item?.handlingTags ?? ""),
        sortOrder: Math.max(0, toSafeInteger(item?.sortOrder, index)),
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
    quoteItems,
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

function formatPositiveKrw(value: unknown): string {
  const amount = toSafeNumber(value);
  if (!(amount > 0)) return "-";
  return formatKrw(amount);
}

function formatPositiveWeightKg(value: unknown): string {
  const weight = toSafeNumber(value);
  if (!(weight > 0)) return "-";
  return `${weight.toLocaleString("ko-KR")}kg`;
}

function formatPositiveVolumeCbm(value: unknown): string {
  const volume = toSafeNumber(value);
  if (!(volume > 0)) return "-";
  return `${volume.toFixed(1)}cbm`;
}

function gridPair(
  leftLabel: string,
  leftValue: string,
  rightLabel: string,
  rightValue: string
): QuoteSectionRow[] {
  const leftOk = leftValue !== "-" && leftValue.trim().length > 0;
  const rightOk = rightValue !== "-" && rightValue.trim().length > 0;
  if (!leftOk && !rightOk) return [];
  if (leftOk && rightOk) {
    return [
      { label: leftLabel, value: leftValue, twoCol: true },
      { label: rightLabel, value: rightValue, twoCol: true },
    ];
  }
  return [leftOk ? { label: leftLabel, value: leftValue } : { label: rightLabel, value: rightValue }];
}

function singleRow(label: string, value: string): QuoteSectionRow[] {
  if (value === "-" || !value.trim()) return [];
  return [{ label, value }];
}

function buildSpecificationArchive(quote: QuoteDetailResponse): QuoteSection[] {
  const vehicleTypeLabel = toVehicleTypeLabel(quote?.vehicleType);
  const vehicleBodyTypeLabel = toVehicleBodyTypeLabel(quote?.vehicleBodyType);
  const uiState = getCustomerUiStateFromBackendStatus(quote?.status ?? "");
  const isCompleted = uiState === CUSTOMER_UI_STATE.COMPLETED;
  const finalAmountLabel = isCompleted ? "정산 금액" : "예상 금액";

  const vehicleCargoRows: QuoteSectionRow[] = [
    ...gridPair("톤수", toDisplayText(vehicleTypeLabel), "차종", toDisplayText(vehicleBodyTypeLabel)),
    ...gridPair("중량", formatPositiveWeightKg(quote?.weightKg), "부피", formatPositiveVolumeCbm(quote?.volumeCbm)),
    ...singleRow("화물", formatCargoHeadline(quote?.cargoName, quote?.cargoType)),
    ...singleRow("화물 설명", toDisplayText(quote?.cargoDesc)),
  ];

  const loadUnloadRows: QuoteSectionRow[] = [
    ...gridPair(
      "상차 방식", toDisplayText(formatWorkMethodLabel(quote?.loadMethod)),
      "하차 방식", toDisplayText(formatWorkMethodLabel(quote?.unloadMethod))
    ),
    { label: "합짐", value: quote?.allowCombine ? "허용" : "단독 운송" },
    ...singleRow("추가 요청", formatChecklistItems(quote?.checklistItems)),
  ];

  const senderText = [quote?.senderName, quote?.senderPhone].filter(Boolean).join(" · ") || "-";
  const receiverText = [quote?.receiverName, quote?.receiverPhone].filter(Boolean).join(" · ") || "-";
  const contactRows: QuoteSectionRow[] = [
    ...gridPair("보내는 분", senderText, "받는 분", receiverText),
    ...singleRow("출발지 상세", toDisplayText(quote?.originAddressDetail)),
    ...singleRow("도착지 상세", toDisplayText(quote?.destinationAddressDetail)),
  ];

  const fareRows: QuoteSectionRow[] = [
    ...singleRow("기본 운임", formatPositiveKrw(quote?.basePrice)),
    ...singleRow("거리 요금", formatPositiveKrw(quote?.distancePrice)),
    ...singleRow("추가 요금", formatPositiveKrw(quote?.extraPrice)),
    ...singleRow("희망 운임", formatPositiveKrw(quote?.desiredPrice)),
    ...singleRow(finalAmountLabel, formatPositiveKrw(quote?.finalPrice)),
  ];

  const sections: QuoteSection[] = [];
  if (vehicleCargoRows.length > 0) sections.push({ title: "차량/화물", rows: vehicleCargoRows });
  if (loadUnloadRows.length > 0) sections.push({ title: "상차/하차", rows: loadUnloadRows });
  if (contactRows.length > 0) sections.push({ title: "연락처", rows: contactRows });
  if (fareRows.length > 0) sections.push({ title: "요금 내역", rows: fareRows });

  return sections;
}

function buildWaypointAddresses(resolvedQuote: QuoteDetailResponse): string[] {
  return Array.isArray(resolvedQuote?.stops)
    ? resolvedQuote.stops
        .slice()
        .sort((a, b) => toSafeInteger(a?.seq, 0) - toSafeInteger(b?.seq, 0))
        .map((stop) => String(stop?.address ?? "").trim())
        .filter(Boolean)
    : [];
}

export function useQuoteDetail(quoteIdentifier: QuoteId | string, runtimeOverride?: QuoteDetailRuntimeOverride): QuoteDetailViewModel {
  const normalizedIdentifier = normalizeQuoteIdentifier(quoteIdentifier);
  const fallbackQuoteId = fallbackQuoteIdFromIdentifier(normalizedIdentifier);
  const [quote, setQuote] = useState<QuoteDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSessionExpired, setIsSessionExpired] = useState<boolean>(false);
  const [reloadTick, setReloadTick] = useState(0);
  const pendingRefetchResolversRef = useRef<Array<() => void>>([]);
  const overrideStatus = runtimeOverride?.status;
  const overrideCancelReason = runtimeOverride?.cancelReason;
  const overrideCanceledAt = runtimeOverride?.canceledAt;

  const refetch = useCallback(() => {
    return new Promise<void>((resolve) => {
      pendingRefetchResolversRef.current.push(resolve);
      setReloadTick((prev) => prev + 1);
    });
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

        const resolvers = pendingRefetchResolversRef.current.splice(0);
        resolvers.forEach((resolve) => {
          resolve();
        });
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
    const uiState = getCustomerUiStateFromBackendStatus(resolvedQuote?.status ?? "");
    const waypointAddresses = buildWaypointAddresses(resolvedQuote);

    const statusLabel = policy?.badgeLabel || getQuoteStatusLabel(resolvedQuote?.status ?? "");
    const originAddress = String(resolvedQuote?.originAddress ?? "");
    const destinationAddress = String(resolvedQuote?.destinationAddress ?? "");
    const finalPrice = toSafeNumber(resolvedQuote?.finalPrice);

    const isCanceled = uiState === CUSTOMER_UI_STATE.CANCELED;
    const updatedAtText = formatDateTime(resolvedQuote?.updatedAt);
    const metaText =
      isCanceled
        ? `#${resolvedQuote?.quoteId ?? fallbackQuoteId}`
        : `#${resolvedQuote?.quoteId ?? fallbackQuoteId} · ${updatedAtText}`;

    const cancelReasonText = isCanceled
      ? String(overrideCancelReason ?? "").trim() || "취소 사유가 입력되지 않았습니다."
      : "";

    const canceledAtText = isCanceled ? formatDateTime(overrideCanceledAt ?? resolvedQuote?.updatedAt) : "";

    const completedAtText = uiState === CUSTOMER_UI_STATE.COMPLETED ? formatDateTime(resolvedQuote?.updatedAt) : "";

    return {
      quote: resolvedQuote,
      policy,
      isLoading,
      errorMessage,
      isSessionExpired,
      refetch,
      commandCenter: { statusLabel, metaText, cancelReasonText, canceledAtText },
      coreSummary: {
        originAddress,
        destinationAddress,
        waypointAddresses,
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
