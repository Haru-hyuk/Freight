import { Ionicons } from "@expo/vector-icons";
import { Canvas } from "@react-three/fiber/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as THREE from "three";

import type { QuoteDetailResponse } from "@/entities/quote/model/quote.types";
import {
  acceptDriverMatch,
  acceptDriverMatchesBatch,
  getDriverQuoteSummaryDetail,
  postCounterOffer,
  type DriverOrderCard,
} from "@/features/matching/api";
import CounterOfferModal, { type CounterOfferSubmitPayload } from "@/features/matching/ui/CounterOfferModal";
import {
  getDriverMarketRecommendationSelection,
  clearDriverMarketRecommendationSelection,
} from "@/features/driver-orders/model/marketRecommendationSelection";
import { DRIVER_ROUTE_PATH } from "@/features/matching/model/driverRunUiApiGrounding";
import {
  DRIVER_RUN_SYNC_EVENT,
  publishDriverRunSyncEvent,
} from "@/features/matching/model/driverRunSyncEvents";
import { addDriverAcceptedRunGroup } from "@/features/driver-orders/model/acceptedRunGroups";
import { previewLoadPlan as previewLoadPlanGenerated } from "@/shared/api/generated/driver-optimization-controller/driver-optimization-controller";
import type { LoadPlanResponse, Placement, TruckSpecReferenceResponse } from "@/shared/api/generated/schemas";
import { readApiErrorMessage } from "@/shared/lib/api/readApiErrorMessage";
import { formatKrw } from "@/shared/lib/format/display";
import { API_ERROR_CODE, getApiErrorCode } from "@/shared/lib/policy";
import { safeNumber, safeString, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppErrorState } from "@/shared/ui/kit/AppErrorState";
import { AppSpinner } from "@/shared/ui/kit/AppSpinner";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

type RouteParams = {
  key?: string | string[];
};

type DriverMarketRecommendationPageProps = {
  forcedKey?: string;
};

type AnyObject = Record<string, unknown>;
type ParsedRecommendationPlan = {
  loadPlan: LoadPlanResponse | null;
  truckSpec: TruckSpecReferenceResponse | null;
};

const SCALE = 0.01;
const PALETTE = ["#4F46E5", "#0EA5E9", "#22C55E", "#F59E0B", "#EF4444", "#EC4899"];

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toOptionalText(value: unknown): string | undefined {
  const text = toText(value);
  return text || undefined;
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toPositiveNumber(value: unknown, fallback = 0): number {
  const parsed = toFiniteNumber(value, fallback);
  return parsed > 0 ? parsed : fallback;
}

function toPositiveInt(value: unknown): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function toOneDecimalText(value: unknown): string {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "0.0";
  return parsed.toFixed(1);
}

function asObject(value: unknown): AnyObject {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as AnyObject) : {};
}

function normalizePlacementItem(value: unknown, fallbackOrder: number): Placement | null {
  const source = asObject(value);
  const width = toPositiveNumber(source.width ?? source.w, 0);
  const length = toPositiveNumber(source.length ?? source.l, 0);
  const height = toPositiveNumber(source.height ?? source.h, 0);
  if (width <= 0 && length <= 0 && height <= 0) return null;

  const stopOrder = toPositiveInt(source.stopOrder ?? source.seq ?? source.sortOrder) || fallbackOrder;

  return {
    id: toOptionalText(source.id) ?? `cargo-${fallbackOrder}`,
    x: Math.max(0, toFiniteNumber(source.x, 0)),
    y: Math.max(0, toFiniteNumber(source.y, 0)),
    z: Math.max(0, toFiniteNumber(source.z, 0)),
    width: Math.max(20, width || 80),
    length: Math.max(20, length || 80),
    height: Math.max(20, height || 80),
    weight: Math.max(0, toFiniteNumber(source.weight ?? source.unitWeightKg, 0)),
    stopOrder,
    fragile: source.fragile === true,
    noStack: source.noStack === true,
    bottomOnly: source.bottomOnly === true,
    stackable: source.stackable !== false,
    maxStackWeight: Math.max(0, toFiniteNumber(source.maxStackWeight ?? source.maxStackWeightKg, 0)),
  };
}

function normalizePlacementList(value: unknown): Placement[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry, index) => normalizePlacementItem(entry, index + 1))
    .filter((entry): entry is Placement => entry !== null)
    .sort((a, b) => (toPositiveInt(a.stopOrder) || 9999) - (toPositiveInt(b.stopOrder) || 9999));
}

function normalizeTruckSpec(value: unknown): TruckSpecReferenceResponse | null {
  const source = asObject(value);
  if (Object.keys(source).length <= 0) return null;

  const length = toPositiveNumber(source.cargoLengthCm ?? source.cargoLength, 0);
  const width = toPositiveNumber(source.cargoWidthCm ?? source.cargoWidth, 0);
  const height = toPositiveNumber(source.cargoHeightCm ?? source.cargoHeight, 0);
  const maxWeight = toPositiveNumber(source.maxWeight ?? source.weightLimit, 0);
  const vehicleType = toOptionalText(source.vehicleType ?? source.type);
  const vehicleBodyType = toOptionalText(source.vehicleBodyType ?? source.bodyType);

  if (!vehicleType && !vehicleBodyType && length <= 0 && width <= 0 && height <= 0 && maxWeight <= 0) {
    return null;
  }

  return {
    vehicleType: vehicleType || undefined,
    vehicleTypeKr: toOptionalText(source.vehicleTypeKr ?? source.vehicleTypeName),
    vehicleBodyType: vehicleBodyType || undefined,
    categoryKr: toOptionalText(source.categoryKr ?? source.categoryName),
    tonnage: toPositiveNumber(source.tonnage, 0) || undefined,
    maxWeight: maxWeight || undefined,
    cargoLengthCm: length || undefined,
    cargoWidthCm: width || undefined,
    cargoHeightCm: height || undefined,
    sourceName: toOptionalText(source.sourceName),
  };
}

function resolvePreviewPayload(payload: unknown): ParsedRecommendationPlan {
  const queue: unknown[] = [payload];
  const visited = new Set<AnyObject>();
  let loadPlan: LoadPlanResponse | null = null;
  let truckSpec: TruckSpecReferenceResponse | null = null;

  while (queue.length > 0) {
    const current = queue.shift();
    if (Array.isArray(current)) {
      current.forEach((entry) => queue.push(entry));
      continue;
    }

    const source = asObject(current);
    if (Object.keys(source).length <= 0) continue;
    if (visited.has(source)) continue;
    visited.add(source);

    if (!loadPlan) {
      const placements = normalizePlacementList(source.placements);
      if (Array.isArray(source.placements) || placements.length > 0) {
        loadPlan = { placements };
      }
    }

    if (!truckSpec) {
      truckSpec =
        normalizeTruckSpec(source.truckSpec) ??
        normalizeTruckSpec(source.truck) ??
        normalizeTruckSpec(source.spec) ??
        null;
    }

    const nestedKeys = ["data", "result", "payload", "response", "loadPlan", "plan", "truckSpec", "truck", "spec"];
    nestedKeys.forEach((key) => {
      const nested = source[key];
      if (nested !== undefined && nested !== null) queue.push(nested);
    });
  }

  return { loadPlan, truckSpec };
}

function resolveTruckDimensions(spec: TruckSpecReferenceResponse | null | undefined) {
  return {
    lengthCm: Math.max(300, toPositiveNumber(spec?.cargoLengthCm, 450)),
    widthCm: Math.max(160, toPositiveNumber(spec?.cargoWidthCm, 230)),
    heightCm: Math.max(150, toPositiveNumber(spec?.cargoHeightCm, 230)),
  };
}

function inferTruckSpecFromQuotes(quotes: QuoteDetailResponse[]): TruckSpecReferenceResponse | null {
  const first = quotes[0];
  if (!first) return null;
  const presets: Record<string, { length: number; width: number; height: number; maxWeight: number }> = {
    TON_1: { length: 320, width: 170, height: 170, maxWeight: 1000 },
    TON_2_5: { length: 430, width: 210, height: 210, maxWeight: 2500 },
    TON_5: { length: 620, width: 230, height: 240, maxWeight: 5000 },
    TON_8: { length: 780, width: 240, height: 250, maxWeight: 8000 },
    TON_11: { length: 900, width: 245, height: 260, maxWeight: 11000 },
  };
  const key = String(first.vehicleType ?? "").trim().toUpperCase();
  const preset = presets[key] ?? presets.TON_5;
  return {
    vehicleType: first.vehicleType,
    vehicleBodyType: first.vehicleBodyType,
    cargoLengthCm: preset.length,
    cargoWidthCm: preset.width,
    cargoHeightCm: preset.height,
    maxWeight: Math.max(preset.maxWeight, toPositiveNumber(first.weightKg, 0)),
    sourceName: "RECOMMENDATION_FALLBACK",
  };
}

function buildFallbackPlacements(quotes: QuoteDetailResponse[], spec: TruckSpecReferenceResponse | null): Placement[] {
  const dimensions = resolveTruckDimensions(spec);
  const maxLength = dimensions.lengthCm;
  const maxWidth = dimensions.widthCm;
  const gap = 8;

  const placements: Placement[] = [];
  let cursorX = 0;
  let cursorZ = 0;
  let currentRowDepth = 0;
  let stopOrder = 1;

  quotes.forEach((quote) => {
    const items = Array.isArray(quote.quoteItems) ? quote.quoteItems : [];
    const safeItems =
      items.length > 0
        ? items
        : [
            {
              quoteItemId: quote.quoteId,
              itemName: quote.cargoName || "화물",
              itemType: quote.cargoType || "GENERAL",
              itemDescription: quote.cargoDesc || "",
              quantity: 1,
              lengthCm: 120,
              widthCm: 100,
              heightCm: 100,
              unitWeightKg: quote.weightKg || 0,
              unitVolumeCbm: quote.volumeCbm || 0,
              fragile: false,
              upright: false,
              noStack: false,
              bottomOnly: false,
              rotatable: true,
              stackable: true,
              maxStackWeightKg: 0,
              handlingTags: "",
              sortOrder: 1,
            },
          ];

    safeItems.forEach((item, itemIndex) => {
      const quantity = Math.max(1, Math.min(5, toPositiveInt(item.quantity) || 1));
      for (let i = 0; i < quantity; i += 1) {
        const width = Math.max(30, Math.min(maxWidth, toPositiveNumber(item.widthCm, 100)));
        const length = Math.max(30, Math.min(maxLength, toPositiveNumber(item.lengthCm, 100)));
        const height = Math.max(30, toPositiveNumber(item.heightCm, 100));

        if (cursorX + width > maxWidth) {
          cursorX = 0;
          cursorZ += currentRowDepth + gap;
          currentRowDepth = 0;
        }
        if (cursorZ + length > maxLength) {
          cursorX = 0;
          cursorZ = 0;
          currentRowDepth = 0;
        }

        placements.push({
          id: `q${quote.quoteId}-i${itemIndex + 1}-${i + 1}`,
          x: cursorX,
          y: 0,
          z: cursorZ,
          width,
          length,
          height,
          weight: Math.max(0, toPositiveNumber(item.unitWeightKg, 0)),
          stopOrder,
          fragile: item.fragile === true,
          noStack: item.noStack === true,
          bottomOnly: item.bottomOnly === true,
          stackable: item.stackable !== false,
          maxStackWeight: Math.max(0, toPositiveNumber(item.maxStackWeightKg, 0)),
        });

        cursorX += width + gap;
        currentRowDepth = Math.max(currentRowDepth, length);
      }
    });

    stopOrder += 1;
  });

  return placements;
}

const CargoMesh = ({ placement, color }: { placement: Placement; color: string }) => {
  const x = toFiniteNumber(placement.x, 0);
  const y = toFiniteNumber(placement.y, 0);
  const z = toFiniteNumber(placement.z, 0);
  const w = Math.max(20, toFiniteNumber(placement.width, 80));
  const h = Math.max(20, toFiniteNumber(placement.height, 80));
  const l = Math.max(20, toFiniteNumber(placement.length, 80));
  const position: [number, number, number] = [(x + w / 2) * SCALE, (y + h / 2) * SCALE, (z + l / 2) * SCALE];
  const boxArgs: [number, number, number] = [w * SCALE, h * SCALE, l * SCALE];

  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={boxArgs} />
        <meshStandardMaterial color={color} transparent opacity={0.72} />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(...boxArgs)]} />
        <lineBasicMaterial color="#0F172A" />
      </lineSegments>
    </group>
  );
};

const useStyles = createThemedStyles((theme) => {
  const spacing = safeNumber(theme?.layout?.spacing?.base, 4);
  const cBorder = safeString(theme?.colors?.borderDefault, "#E2E8F0");
  return StyleSheet.create({
    content: {
      gap: spacing * 3,
      paddingBottom: spacing * 24,
    },
    summaryCard: {
      padding: spacing * 4,
      gap: spacing * 2,
    },
    badgeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing * 2,
    },
    badge: {
      borderRadius: 999,
      paddingHorizontal: spacing * 2,
      paddingVertical: spacing,
      backgroundColor: tint(theme.colors.brandPrimary, 0.16, theme.colors.bgSurface),
    },
    metricRow: {
      flexDirection: "row",
      gap: spacing * 2,
    },
    metricCell: {
      flex: 1,
      borderRadius: 10,
      paddingHorizontal: spacing * 2,
      paddingVertical: spacing * 1.5,
      backgroundColor: tint(cBorder, 0.4, theme.colors.bgSurfaceAlt),
      gap: spacing * 0.5,
    },
    quotesCard: {
      padding: spacing * 4,
      gap: spacing * 2,
    },
    quoteRow: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: cBorder,
      backgroundColor: theme.colors.bgSurface,
      paddingHorizontal: spacing * 3,
      paddingVertical: spacing * 2.5,
      gap: spacing,
    },
    quoteTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: spacing * 2,
    },
    quoteSeqWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing * 1.5,
      flex: 1,
    },
    quoteSeqBadge: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: tint(theme.colors.brandPrimary, 0.9, theme.colors.brandPrimary),
    },
    quoteRouteWrap: {
      gap: spacing,
    },
    quoteRouteRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing * 1.5,
    },
    quoteRouteIconWrap: {
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: tint(cBorder, 0.3, theme.colors.bgSurfaceAlt),
      marginTop: 1,
    },
    quoteRouteText: {
      flex: 1,
      color: theme.colors.textSub,
    },
    quoteMetaRow: {
      flexDirection: "row",
      gap: spacing * 1.5,
    },
    quoteMetaCell: {
      flex: 1,
      borderRadius: 10,
      backgroundColor: tint(cBorder, 0.38, theme.colors.bgSurfaceAlt),
      paddingHorizontal: spacing * 1.5,
      paddingVertical: spacing * 1.2,
      alignItems: "center",
      gap: spacing * 0.5,
    },
    loadCard: {
      padding: spacing * 4,
      gap: spacing * 2,
    },
    canvasWrap: {
      height: 300,
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: theme.colors.bgSurfaceAlt,
      borderWidth: 1,
      borderColor: cBorder,
    },
    placementRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing * 2,
      paddingVertical: spacing * 1.5,
      borderBottomWidth: 1,
      borderBottomColor: tint(cBorder, 0.6, theme.colors.bgSurfaceAlt),
    },
    placementBadge: {
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
    },
    placementGroupWrap: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: tint(cBorder, 0.8, cBorder),
      overflow: "hidden",
    },
    placementGroupHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing * 2,
      paddingHorizontal: spacing * 2,
      paddingVertical: spacing * 1.5,
      backgroundColor: tint(cBorder, 0.28, theme.colors.bgSurfaceAlt),
    },
    placementGroupTitle: {
      flex: 1,
    },
    placementGroupCount: {
      color: theme.colors.textMuted,
    },
    stateWrap: {
      paddingTop: spacing * 12,
    },
    bottomWrap: {
      borderTopWidth: 1,
      borderTopColor: cBorder,
      backgroundColor: theme.colors.bgSurface,
      paddingHorizontal: spacing * 4,
      paddingTop: spacing * 2,
      flexDirection: "row",
      gap: spacing * 2,
    },
    bottomBtn: {
      flex: 1,
      minHeight: 54,
    },
  });
});

export default function DriverMarketRecommendationPage({
  forcedKey,
}: DriverMarketRecommendationPageProps = {}) {
  const params = useLocalSearchParams<RouteParams>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const styles = useStyles();

  const rawKey =
    typeof forcedKey === "string" && forcedKey.trim().length > 0
      ? forcedKey
      : Array.isArray(params.key)
        ? params.key[0]
        : params.key;
  const key = String(rawKey ?? "").trim();
  const selection = useMemo(() => getDriverMarketRecommendationSelection(key), [key]);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [quotesById, setQuotesById] = useState<Record<number, QuoteDetailResponse>>({});
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [truckSpec, setTruckSpec] = useState<TruckSpecReferenceResponse | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isOfferOpen, setIsOfferOpen] = useState(false);
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const [offerErrorMessage, setOfferErrorMessage] = useState<string | null>(null);

  const orderedOrders = useMemo(() => {
    if (!selection) return [] as DriverOrderCard[];
    const orderMap = new Map<number, DriverOrderCard>();
    selection.orders.forEach((order) => {
      const quoteId = toPositiveInt(order.quoteId);
      if (quoteId > 0) orderMap.set(quoteId, order);
    });

    const ordered = selection.recommendation.quoteIds
      .map((quoteId) => orderMap.get(toPositiveInt(quoteId)))
      .filter((order): order is DriverOrderCard => Boolean(order));
    if (ordered.length > 0) return ordered;
    return [...selection.orders];
  }, [selection]);

  const primaryOrder = orderedOrders[0] ?? null;
  const groupedMatchIds = useMemo(() => {
    const seen = new Set<number>();
    const ids: number[] = [];
    orderedOrders.forEach((order) => {
      const safeMatchId = toPositiveInt(order.matchId);
      if (safeMatchId <= 0) return;
      if (seen.has(safeMatchId)) return;
      seen.add(safeMatchId);
      ids.push(safeMatchId);
    });
    return ids;
  }, [orderedOrders]);
  const isGroupedRecommendation = groupedMatchIds.length > 1;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!selection) {
        setErrorMessage("추천 상세 정보를 찾지 못했습니다. 오더 마켓에서 다시 선택해 주세요.");
        setIsLoading(false);
        return;
      }

      const safeQuoteIds = selection.recommendation.quoteIds
        .map((quoteId) => toPositiveInt(quoteId))
        .filter((quoteId) => quoteId > 0);

      if (safeQuoteIds.length <= 0) {
        setErrorMessage("추천 항목에 유효한 견적 ID가 없습니다.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);
      try {
        const quoteEntries = await Promise.all(
          safeQuoteIds.map(async (quoteId) => {
            const quote = await getDriverQuoteSummaryDetail(quoteId);
            return [quoteId, quote] as const;
          })
        );

        if (cancelled) return;

        const quoteMap: Record<number, QuoteDetailResponse> = {};
        quoteEntries.forEach(([quoteId, quote]) => {
          if (quote) quoteMap[quoteId] = quote;
        });
        setQuotesById(quoteMap);

        const quoteList = safeQuoteIds
          .map((quoteId) => quoteMap[quoteId])
          .filter((quote): quote is QuoteDetailResponse => Boolean(quote));
        const previewTruckId = toPositiveInt(quoteList[0]?.truckId);
        let resolvedSpec: TruckSpecReferenceResponse | null = null;
        let resolvedPlacements: Placement[] = [];

        try {
          const previewPayload = await previewLoadPlanGenerated({
            quoteIds: safeQuoteIds,
            ...(previewTruckId > 0 ? { truckId: previewTruckId } : {}),
          });
          if (cancelled) return;
          const parsed = resolvePreviewPayload(previewPayload);
          resolvedSpec = parsed.truckSpec;
          resolvedPlacements = normalizePlacementList(parsed.loadPlan?.placements);
        } catch {
          resolvedPlacements = [];
        }

        const expectedStopCount = quoteList.length;
        if (expectedStopCount > 1 && resolvedPlacements.length > 0) {
          const distinctStopCount = new Set(
            resolvedPlacements
              .map((placement) => toPositiveInt(placement.stopOrder))
              .filter((stopOrder) => stopOrder > 0)
          ).size;
          const previewLooksPartial =
            distinctStopCount < expectedStopCount || resolvedPlacements.length < expectedStopCount;
          if (previewLooksPartial) {
            resolvedPlacements = [];
          }
        }

        if (!resolvedSpec) {
          resolvedSpec = inferTruckSpecFromQuotes(quoteList);
        }
        if (resolvedPlacements.length <= 0) {
          resolvedPlacements = buildFallbackPlacements(quoteList, resolvedSpec);
        }

        if (cancelled) return;
        setTruckSpec(resolvedSpec);
        setPlacements(resolvedPlacements);
      } catch {
        if (cancelled) return;
        setErrorMessage("추천 상세를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [selection]);

  const quoteCards = useMemo(() => {
    if (!selection) return [];
    return selection.recommendation.quoteIds
      .map((quoteId) => ({
        quoteId: toPositiveInt(quoteId),
        order: orderedOrders.find((order) => toPositiveInt(order.quoteId) === toPositiveInt(quoteId)) ?? null,
        quote: quotesById[toPositiveInt(quoteId)] ?? null,
      }))
      .filter((entry) => entry.quoteId > 0);
  }, [orderedOrders, quotesById, selection]);

  const orderedPlacements = useMemo(
    () => [...placements].sort((a, b) => (toPositiveInt(a.stopOrder) || 9999) - (toPositiveInt(b.stopOrder) || 9999)),
    [placements]
  );
  const quoteStopLabelMap = useMemo(() => {
    const map = new Map<number, string>();
    quoteCards.forEach((_, index) => {
      map.set(index + 1, `추천 오더 #${index + 1}`);
    });
    return map;
  }, [quoteCards]);
  const stopColorMap = useMemo(() => {
    const map = new Map<number, string>();
    let cursor = 0;
    orderedPlacements.forEach((placement) => {
      const stopOrder = toPositiveInt(placement.stopOrder) || 1;
      if (!map.has(stopOrder)) {
        map.set(stopOrder, PALETTE[cursor % PALETTE.length]);
        cursor += 1;
      }
    });
    return map;
  }, [orderedPlacements]);
  const placementGroups = useMemo(() => {
    const byStopOrder = new Map<number, Placement[]>();
    orderedPlacements.forEach((placement) => {
      const stopOrder = toPositiveInt(placement.stopOrder) || 1;
      const bucket = byStopOrder.get(stopOrder) ?? [];
      bucket.push(placement);
      byStopOrder.set(stopOrder, bucket);
    });

    return Array.from(byStopOrder.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([stopOrder, items]) => ({ stopOrder, items }));
  }, [orderedPlacements]);

  const handleAccept = useCallback(async () => {
    if (groupedMatchIds.length <= 0) {
      Alert.alert("안내", "수락 가능한 매칭 정보가 없습니다.");
      return;
    }

    setIsBusy(true);
    try {
      let acceptedMatches: Awaited<ReturnType<typeof acceptDriverMatchesBatch>> = [];
      if (groupedMatchIds.length > 1) {
        acceptedMatches = await acceptDriverMatchesBatch({
          matchIds: groupedMatchIds,
          routeType: selection?.mode,
          orderedQuoteIds: selection?.recommendation.quoteIds,
        });
      } else {
        const singleMatchId = groupedMatchIds[0];
        if (singleMatchId) {
          const single = await acceptDriverMatch(singleMatchId);
          acceptedMatches = single ? [single] : [];
        }
      }

      const successMatchIds = Array.from(
        new Set(
          acceptedMatches
            .map((item) => toPositiveInt(item.matchId))
            .filter((matchId) => matchId > 0)
        )
      );
      const successCount = successMatchIds.length;
      const failureCount = Math.max(0, groupedMatchIds.length - successCount);

      if (successCount <= 0) {
        Alert.alert("오류", "배차 수락에 실패했습니다.");
        return;
      }

      const message =
        failureCount > 0
          ? `${successCount}건 수락, ${failureCount}건 실패했습니다.`
          : `${successCount}건 추천 오더를 수락했습니다.`;
      if (isGroupedRecommendation && successMatchIds.length > 1 && selection) {
        addDriverAcceptedRunGroup({
          key: `${selection.key}-${Date.now()}`,
          mode: selection.mode,
          pathLabel: selection.recommendation.pathLabel,
          matchIds: successMatchIds,
          quoteIds: selection.recommendation.quoteIds,
          totalRevenue: selection.recommendation.totalRevenue,
          estimatedTotalDistanceKm: selection.recommendation.estimatedTotalDistanceKm,
          acceptedAt: Date.now(),
        });
      }
      publishDriverRunSyncEvent({
        type: DRIVER_RUN_SYNC_EVENT.MATCH_ACCEPTED,
        matchIds: successMatchIds,
        quoteIds: selection?.recommendation.quoteIds ?? [],
        source: "market_recommendation",
      });
      const nextMatchId = groupedMatchIds[0];
      Alert.alert("배차 수락 완료", message, [
        {
          text: failureCount > 0 ? "상세 보기" : "운행 탭으로",
          onPress: () => {
            clearDriverMarketRecommendationSelection();
            if (failureCount > 0 && nextMatchId > 0) {
              router.replace({
                pathname: DRIVER_ROUTE_PATH.ORDER_DETAIL,
                params: { id: String(nextMatchId), source: "market" },
              });
              return;
            }
            router.replace(DRIVER_ROUTE_PATH.RUN_TAB);
          },
        },
      ]);
    } catch (error) {
      const code = getApiErrorCode(error);
      if (code === API_ERROR_CODE.CONFLICT) {
        Alert.alert("배차 수락 실패", "이미 배차 처리된 오더가 포함되어 있습니다. 목록을 새로고침해 주세요.");
        return;
      }
      Alert.alert("배차 수락 실패", readApiErrorMessage(error, "잠시 후 다시 시도해 주세요."));
    } finally {
      setIsBusy(false);
    }
  }, [groupedMatchIds, isGroupedRecommendation, router, selection]);

  const handleSubmitOffer = useCallback(
    async (payload: CounterOfferSubmitPayload) => {
      if (!primaryOrder || isSubmittingOffer) return;
      const safeMatchId = toPositiveInt(primaryOrder.matchId);
      const safeQuoteId = toPositiveInt(primaryOrder.quoteId);
      if (safeMatchId <= 0 || safeQuoteId <= 0) {
        setOfferErrorMessage("유효하지 않은 추천 항목입니다.");
        return;
      }

      setIsSubmittingOffer(true);
      setOfferErrorMessage(null);
      try {
        const result = await postCounterOffer(
          safeMatchId,
          { proposedPrice: payload.amount, message: payload.message },
          safeQuoteId
        );
        if (!result) {
          setOfferErrorMessage("운임 제안 처리에 실패했습니다.");
          return;
        }
        publishDriverRunSyncEvent({
          type: DRIVER_RUN_SYNC_EVENT.COUNTER_OFFER_SUBMITTED,
          matchIds: [safeMatchId],
          quoteIds: [safeQuoteId],
          source: "market_recommendation",
        });
        setIsOfferOpen(false);
        Alert.alert("완료", "운임 제안을 전송했습니다.");
      } catch (error) {
        setOfferErrorMessage(readApiErrorMessage(error, "운임 제안 처리에 실패했습니다."));
      } finally {
        setIsSubmittingOffer(false);
      }
    },
    [isSubmittingOffer, primaryOrder]
  );

  const bottomBar = (
    <View style={[styles.bottomWrap, { paddingBottom: (insets.bottom ?? 0) + 10 }]}>
      <AppButton
        title={isGroupedRecommendation ? "운임 제안(대표 1건)" : "운임 제안"}
        variant="secondary"
        style={styles.bottomBtn}
        disabled={!primaryOrder || isBusy || isSubmittingOffer}
        onPress={() => {
          setOfferErrorMessage(null);
          setIsOfferOpen(true);
        }}
      />
      <AppButton
        title={isGroupedRecommendation ? `배차 수락(${groupedMatchIds.length}건)` : "배차 수락"}
        variant="primary"
        style={styles.bottomBtn}
        loading={isBusy}
        disabled={groupedMatchIds.length <= 0 || isBusy}
        onPress={() => void handleAccept()}
      />
    </View>
  );

  if (!selection) {
    return (
      <PageScaffold title="추천 오더 상세" onPressBack={() => router.back()} scroll={false}>
        <View style={styles.stateWrap}>
          <AppErrorState
            title="추천 정보를 찾지 못했습니다."
            description="오더 마켓에서 추천 항목을 다시 선택해 주세요."
            retryLabel="오더 마켓으로"
            onRetry={() => router.replace(DRIVER_ROUTE_PATH.MARKET_TAB)}
            fullScreen={false}
          />
        </View>
      </PageScaffold>
    );
  }

  if (isLoading) {
    return (
      <PageScaffold title="추천 오더 상세" onPressBack={() => router.back()} scroll={false}>
        <View style={styles.stateWrap}>
          <AppSpinner label="추천 상세를 불러오는 중입니다." />
        </View>
      </PageScaffold>
    );
  }

  if (errorMessage) {
    return (
      <PageScaffold title="추천 오더 상세" onPressBack={() => router.back()} scroll={false}>
        <View style={styles.stateWrap}>
          <AppErrorState
            title="추천 상세를 불러오지 못했습니다."
            description={errorMessage}
            retryLabel="뒤로 가기"
            onRetry={() => router.back()}
            fullScreen={false}
          />
        </View>
      </PageScaffold>
    );
  }

  const dims = resolveTruckDimensions(truckSpec);

  return (
    <>
      <PageScaffold
        title="추천 오더 상세"
        subtitle={`추천 #${selection.recommendation.rank}`}
        onPressBack={() => router.back()}
        scroll
        bottomBar={bottomBar}
      >
        <View style={styles.content}>
          <AppCard style={styles.summaryCard}>
            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <AppText variant="caption" weight="900" color="brandPrimary">
                  {selection.mode === "BUNDLED" ? "합짐 노선" : "단건 노선"}
                </AppText>
              </View>
              <AppText variant="detail" weight="700" color="textSub">
                {selection.recommendation.pathLabel}
              </AppText>
            </View>
            <View style={styles.metricRow}>
              <View style={styles.metricCell}>
                <AppText variant="caption" color="textMuted">총 운임</AppText>
                <AppText variant="title" weight="900" color="semanticSuccess">
                  {formatKrw(selection.recommendation.totalRevenue)}
                </AppText>
              </View>
              <View style={styles.metricCell}>
                <AppText variant="caption" color="textMuted">km당 수익</AppText>
                <AppText variant="detail" weight="900" color="brandPrimary">
                  {formatKrw(selection.recommendation.profitPerKm, "0원")}/km
                </AppText>
              </View>
            </View>
            <View style={styles.metricRow}>
              <View style={styles.metricCell}>
                <AppText variant="caption" color="textMuted">총 거리</AppText>
                <AppText variant="detail" weight="900" color="textMain">
                  {selection.recommendation.estimatedTotalDistanceKm.toFixed(1)}km
                </AppText>
              </View>
              <View style={styles.metricCell}>
                <AppText variant="caption" color="textMuted">복귀 거리</AppText>
                <AppText variant="detail" weight="900" color="textMain">
                  {selection.recommendation.emptyRunDistanceKm.toFixed(1)}km
                </AppText>
              </View>
            </View>
          </AppCard>

          <AppCard style={styles.quotesCard}>
            <AppText variant="heading" weight="900" color="textMain">
              추천 오더
            </AppText>
            {quoteCards.map((entry, index) => {
              const priceValue = toPositiveNumber(entry.order?.priceValue ?? entry.quote?.finalPrice, 0);
              const originAddress = entry.order?.originAddress || entry.quote?.originAddress || "-";
              const destinationAddress = entry.order?.destinationAddress || entry.quote?.destinationAddress || "-";
              const distanceText =
                entry.order?.routeDistanceText ||
                (toPositiveNumber(entry.quote?.distanceKm, 0) > 0
                  ? `${toOneDecimalText(entry.quote?.distanceKm)}km`
                  : "-");
              const weightText =
                toPositiveNumber(entry.order?.weightKg ?? entry.quote?.weightKg, 0) > 0
                  ? `${toOneDecimalText(entry.order?.weightKg ?? entry.quote?.weightKg)}kg`
                  : "-";
              const cbmText =
                toPositiveNumber(entry.order?.volumeCbm ?? entry.quote?.volumeCbm, 0) > 0
                  ? toOneDecimalText(entry.order?.volumeCbm ?? entry.quote?.volumeCbm)
                  : "-";
              const cargoText = entry.order?.cargoText || entry.quote?.cargoName || "-";
              const vehicleText = entry.order?.vehicleText || entry.quote?.vehicleType || "-";
              const methodText =
                entry.order?.methodText ||
                `${entry.quote?.loadMethod || "-"} · ${entry.quote?.unloadMethod || "-"}`;

              return (
                <View key={`quote-${entry.quoteId}`} style={styles.quoteRow}>
                  <View style={styles.quoteTop}>
                    <View style={styles.quoteSeqWrap}>
                      <View style={styles.quoteSeqBadge}>
                        <AppText variant="caption" weight="900" color="#FFFFFF">
                          {index + 1}
                        </AppText>
                      </View>
                      <AppText variant="detail" weight="900" color="textMain">
                        추천 오더
                      </AppText>
                    </View>
                    <AppText variant="detail" weight="900" color="brandPrimary">
                      {formatKrw(priceValue)}
                    </AppText>
                  </View>
                  <View style={styles.quoteRouteWrap}>
                    <View style={styles.quoteRouteRow}>
                      <View style={styles.quoteRouteIconWrap}>
                        <Ionicons name="navigate" size={12} color={theme.colors.brandPrimary} />
                      </View>
                      <AppText variant="caption" style={styles.quoteRouteText}>
                        {originAddress}
                      </AppText>
                    </View>
                    <View style={styles.quoteRouteRow}>
                      <View style={styles.quoteRouteIconWrap}>
                        <Ionicons name="flag" size={12} color={theme.colors.semanticSuccess} />
                      </View>
                      <AppText variant="caption" style={styles.quoteRouteText}>
                        {destinationAddress}
                      </AppText>
                    </View>
                  </View>
                  <View style={styles.quoteMetaRow}>
                    <View style={styles.quoteMetaCell}>
                      <AppText variant="caption" color="textMuted">거리</AppText>
                      <AppText variant="detail" weight="900" color="brandPrimary">{distanceText}</AppText>
                    </View>
                    <View style={styles.quoteMetaCell}>
                      <AppText variant="caption" color="textMuted">중량</AppText>
                      <AppText variant="detail" weight="900" color="textMain">{weightText}</AppText>
                    </View>
                    <View style={styles.quoteMetaCell}>
                      <AppText variant="caption" color="textMuted">CBM</AppText>
                      <AppText variant="detail" weight="900" color="textMain">{cbmText}</AppText>
                    </View>
                  </View>
                  <AppText variant="caption" color="textSub">
                    화물: {cargoText}
                  </AppText>
                  <AppText variant="caption" color="textSub">
                    차량/작업: {vehicleText} · {methodText}
                  </AppText>
                </View>
              );
            })}
          </AppCard>

          <AppCard style={styles.loadCard}>
            <AppText variant="heading" weight="900" color="textMain">
              3D 적재 시뮬레이션
            </AppText>
            <AppText variant="caption" color="textMuted">
              적재함 {dims.widthCm} × {dims.lengthCm} × {dims.heightCm} cm 기준 · {isGroupedRecommendation ? "다건 순서 적재" : "단건 적재"}
            </AppText>
            <View style={styles.canvasWrap}>
              <Canvas camera={{ position: [4.2, 4, 4.2], fov: 45 }}>
                <ambientLight intensity={0.7} />
                <directionalLight position={[5, 8, 5]} intensity={1.1} />
                <Suspense fallback={null}>
                  <mesh
                    position={[
                      (dims.widthCm * SCALE) / 2,
                      (dims.heightCm * SCALE) / 2,
                      (dims.lengthCm * SCALE) / 2,
                    ]}
                  >
                    <boxGeometry args={[dims.widthCm * SCALE, dims.heightCm * SCALE, dims.lengthCm * SCALE]} />
                    <meshStandardMaterial color="#E2E8F0" transparent opacity={0.1} />
                  </mesh>
                  {orderedPlacements.map((placement, index) => (
                    <CargoMesh
                      key={placement.id ?? `cargo-${index}`}
                      placement={placement}
                      color={stopColorMap.get(toPositiveInt(placement.stopOrder) || 1) ?? PALETTE[index % PALETTE.length]}
                    />
                  ))}
                </Suspense>
              </Canvas>
              {orderedPlacements.length <= 0 ? (
                <View style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" }}>
                  <ActivityIndicator color={theme.colors.brandPrimary} />
                </View>
              ) : null}
            </View>
            {placementGroups.map((group) => (
              <View key={`group-${group.stopOrder}`} style={styles.placementGroupWrap}>
                <View style={styles.placementGroupHeader}>
                  <View
                    style={[
                      styles.placementBadge,
                      { backgroundColor: stopColorMap.get(group.stopOrder) ?? PALETTE[(group.stopOrder - 1) % PALETTE.length] },
                    ]}
                  >
                    <AppText variant="caption" weight="900" color="#FFFFFF">
                      {group.stopOrder}
                    </AppText>
                  </View>
                  <AppText variant="detail" weight="800" color="textMain" style={styles.placementGroupTitle}>
                    {quoteStopLabelMap.get(group.stopOrder) ?? `적재 순서 ${group.stopOrder}`}
                  </AppText>
                  <AppText variant="caption" style={styles.placementGroupCount}>
                    {group.items.length}개
                  </AppText>
                </View>

                {group.items.map((placement, index) => (
                  <View key={`placement-${group.stopOrder}-${placement.id ?? index}`} style={styles.placementRow}>
                    <View
                      style={[
                        styles.placementBadge,
                        { backgroundColor: stopColorMap.get(group.stopOrder) ?? PALETTE[(group.stopOrder - 1) % PALETTE.length] },
                      ]}
                    >
                      <AppText variant="caption" weight="900" color="#FFFFFF">
                        {index + 1}
                      </AppText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText variant="detail" weight="800" color="textMain">
                        적재물 {index + 1}
                      </AppText>
                      <AppText variant="caption" color="textSub">
                        {toPositiveNumber(placement.width, 0)}×{toPositiveNumber(placement.length, 0)}×{toPositiveNumber(placement.height, 0)}cm · 위치({toFiniteNumber(placement.x, 0)}, {toFiniteNumber(placement.y, 0)}, {toFiniteNumber(placement.z, 0)})
                      </AppText>
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </AppCard>
        </View>
      </PageScaffold>

      <CounterOfferModal
        visible={isOfferOpen}
        isSubmitting={isSubmittingOffer}
        errorMessage={offerErrorMessage}
        onClose={() => {
          if (isSubmittingOffer) return;
          setIsOfferOpen(false);
          setOfferErrorMessage(null);
        }}
        onSubmit={handleSubmitOffer}
      />
    </>
  );
}
