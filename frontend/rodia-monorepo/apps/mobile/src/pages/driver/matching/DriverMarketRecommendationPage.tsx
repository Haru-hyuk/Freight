import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { QuoteDetailResponse } from "@/entities/quote/model/quote.types";
import { addDriverAcceptedRunGroup } from "@/features/driver-orders/model/acceptedRunGroups";
import {
  clearDriverMarketRecommendationSelection,
  getDriverMarketRecommendationSelection,
} from "@/features/driver-orders/model/marketRecommendationSelection";
import {
  buildEmptyRouteSummary,
  fetchRouteSummary,
  normalizeRouteSummary,
  type NormalizedRouteSummary,
} from "@/features/driver-reco/model/routeSummary";
import RecoLoadSimulationCard, {
  type RecoRecommendedOrderSummary,
  type RecoSelectedOrderDetail,
  type RecoVisitStep,
} from "@/features/driver-reco/ui/RecoLoadSimulationCard";
import RecoRouteMapCard from "@/features/driver-reco/ui/RecoRouteMapCard";
import {
  acceptDriverMatchesBatch,
  getDriverQuoteSummaryDetail,
  postCounterOffer,
  type DriverOrderCard,
} from "@/features/matching/api";
import {
  DRIVER_RUN_SYNC_EVENT,
  publishDriverRunSyncEvent,
} from "@/features/matching/model/driverRunSyncEvents";
import { DRIVER_ROUTE_PATH } from "@/features/matching/model/driverRunUiApiGrounding";
import CounterOfferModal, { type CounterOfferSubmitPayload } from "@/features/matching/ui/CounterOfferModal";
import { previewDriverLoadPlan, type LoadPlanResponse, type Placement, type TruckSpecReferenceResponse } from "@/features/matching/api";
import { previewRouteSelection } from "@/shared/api/generated/driver-optimization/driver-optimization";
import type { CargoVisit } from "@/shared/api/generated/schemas/cargoVisit";
import { readApiErrorMessage } from "@/shared/lib/api/readApiErrorMessage";
import { formatKrw } from "@/shared/lib/format/display";
import { API_ERROR_CODE, getApiErrorCode } from "@/shared/lib/policy";
import { safeNumber, safeString, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles } from "@/shared/theme/useAppTheme";
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
type RecommendationVisitStep = RecoVisitStep & {
  visitType?: "START" | "PICKUP" | "DELIVERY" | "WAYPOINT" | "MOVE";
};
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

  const length = toPositiveNumber(source.cargoLengthCm ?? source.cargoLength ?? source.length, 0);
  const width = toPositiveNumber(source.cargoWidthCm ?? source.cargoWidth ?? source.width, 0);
  const height = toPositiveNumber(source.cargoHeightCm ?? source.cargoHeight ?? source.height, 0);
  const maxWeight = toPositiveNumber(source.maxWeight ?? source.maxWeightKg ?? source.weightLimit, 0);
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
        const statsSource = asObject(source.stats);
        const utilization = toFiniteNumber(statsSource.utilization, NaN);
        const totalWeight = toFiniteNumber(statsSource.totalWeight, NaN);
        const placedCount = toFiniteNumber(statsSource.placedCount, NaN);
        const unplacedCount = toFiniteNumber(statsSource.unplacedCount, NaN);

        loadPlan = {
          placements,
          stats:
            Object.keys(statsSource).length > 0
              ? {
                  ...(Number.isFinite(utilization) ? { utilization } : {}),
                  ...(Number.isFinite(totalWeight) ? { totalWeight } : {}),
                  ...(Number.isFinite(placedCount) ? { placedCount: Math.max(0, Math.trunc(placedCount)) } : {}),
                  ...(Number.isFinite(unplacedCount) ? { unplacedCount: Math.max(0, Math.trunc(unplacedCount)) } : {}),
                }
              : undefined,
          unplaced: Array.isArray(source.unplaced) ? source.unplaced : undefined,
        };
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

function hasUnplacedLoadPlan(plan: LoadPlanResponse | null | undefined): boolean {
  if (!plan) return false;
  const unplacedCount = toPositiveInt(plan.stats?.unplacedCount);
  if (unplacedCount > 0) return true;
  return Array.isArray(plan.unplaced) && plan.unplaced.length > 0;
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

function buildDeliveryStopOrderMap(visitOrder: CargoVisit[] | undefined, fallbackQuoteIds: number[]): Map<number, number> {
  const map = new Map<number, number>();
  const source = Array.isArray(visitOrder) ? visitOrder : [];

  source.forEach((visit) => {
    const quoteId = toPositiveInt(visit?.quoteId);
    const type = toOptionalText(visit?.type)?.toUpperCase();
    if (quoteId <= 0 || type !== "DELIVERY" || map.has(quoteId)) return;
    map.set(quoteId, map.size + 1);
  });

  fallbackQuoteIds.forEach((quoteId) => {
    if (quoteId <= 0 || map.has(quoteId)) return;
    map.set(quoteId, map.size + 1);
  });

  return map;
}

function normalizeVisitSteps(
  visitOrder: CargoVisit[] | undefined,
  deliveryStopOrderByQuoteId: Map<number, number>
): RecommendationVisitStep[] {
  if (!Array.isArray(visitOrder)) return [];

  const steps = visitOrder
    .map((visit, index) => {
      const quoteId = toPositiveInt(visit?.quoteId) || 0;
      const type = toOptionalText(visit?.type)?.toUpperCase();
      const location = asObject(visit?.location);
      const address = toOptionalText(location.address ?? visit?.address) ?? "-";
      const title =
        toOptionalText(location.name ?? location.address ?? visit?.address) ??
        (quoteId > 0 ? `오더 ${quoteId}` : `단계 ${index + 1}`);
      const typeLabel =
        type === "PICKUP" ? "상차" : type === "DELIVERY" ? "하차" : type === "WAYPOINT" ? "경유" : "이동";
      return {
        key: `${quoteId || "x"}-${type || "unknown"}-${index + 1}`,
        sequence: toPositiveInt(visit?.sequence) || index + 1,
        stopOrder: deliveryStopOrderByQuoteId.get(quoteId) ?? null,
        quoteId: quoteId > 0 ? quoteId : undefined,
        visitType:
          type === "PICKUP"
            ? ("PICKUP" as const)
            : type === "DELIVERY"
              ? ("DELIVERY" as const)
              : type === "WAYPOINT"
                ? ("WAYPOINT" as const)
                : ("MOVE" as const),
        typeLabel,
        title,
        subtitle: address,
      };
    })
    .filter((step) => typeof step.quoteId === "number" || step.typeLabel === "경유");

  if (steps.length <= 0) return [];
  return [
    {
      key: "start-empty",
      sequence: 0,
      stopOrder: null,
      visitType: "START" as const,
      typeLabel: "시작",
      title: "빈차 출발",
      subtitle: "아직 적재된 화물이 없습니다.",
    },
    ...steps,
  ];
}

function buildSyntheticVisitSteps(
  quoteCards: Array<{
    quoteId: number;
    stopOrder: number;
    order: DriverOrderCard | null;
    quote: QuoteDetailResponse | null;
  }>
): RecommendationVisitStep[] {
  if (quoteCards.length <= 0) return [];

  const pickups = quoteCards.map((entry, index) => ({
    key: `pickup-${entry.quoteId}-${index + 1}`,
    sequence: index + 1,
    stopOrder: entry.stopOrder,
    quoteId: entry.quoteId,
    visitType: "PICKUP" as const,
    typeLabel: "상차",
    title: entry.order?.originAddress ?? entry.quote?.originAddress ?? `오더 ${entry.quoteId}`,
    subtitle: entry.quote?.cargoName ?? entry.order?.cargoText ?? "상차",
  }));

  const deliveries = [...quoteCards].sort((a, b) => a.stopOrder - b.stopOrder).map((entry, index) => ({
    key: `delivery-${entry.quoteId}-${index + 1}`,
    sequence: pickups.length + index + 1,
    stopOrder: entry.stopOrder,
    quoteId: entry.quoteId,
    visitType: "DELIVERY" as const,
    typeLabel: "하차",
    title: entry.order?.destinationAddress ?? entry.quote?.destinationAddress ?? `오더 ${entry.quoteId}`,
    subtitle: entry.quote?.cargoName ?? entry.order?.cargoText ?? "하차",
  }));

  return [
    {
      key: "start-empty",
      sequence: 0,
      stopOrder: null,
      visitType: "START" as const,
      typeLabel: "시작",
      title: "빈차 출발",
      subtitle: "아직 적재된 화물이 없습니다.",
    },
    ...pickups,
    ...deliveries,
  ];
}

function findLoadedStartStepIndex(steps: RecommendationVisitStep[]): number {
  if (steps.length <= 0) return 0;
  let lastPickupIndex = -1;
  steps.forEach((step, index) => {
    if (step.visitType === "PICKUP") {
      lastPickupIndex = index;
    }
  });
  if (lastPickupIndex >= 0) return lastPickupIndex;
  return Math.min(1, steps.length - 1);
}

function buildActiveLoadPlanQuoteIds(
  steps: RecommendationVisitStep[],
  selectedStepIndex: number,
  fallbackQuoteIds: number[]
): number[] {
  if (steps.length <= 0) return fallbackQuoteIds;

  const activeQuoteIds = new Set<number>();
  const deliveredQuoteIds = new Set<number>();
  const lastIndex = Math.min(selectedStepIndex, steps.length - 1);

  for (let index = 0; index <= lastIndex; index += 1) {
    const step = steps[index];
    const quoteId = toPositiveInt(step?.quoteId);
    if (quoteId <= 0) continue;
    if (step.visitType === "PICKUP") {
      activeQuoteIds.add(quoteId);
      continue;
    }
    if (step.visitType === "DELIVERY") {
      activeQuoteIds.delete(quoteId);
      deliveredQuoteIds.add(quoteId);
    }
  }

  const orderedActiveQuoteIds = steps
    .filter((step) => step.visitType === "DELIVERY")
    .map((step) => toPositiveInt(step.quoteId))
    .filter((quoteId) => quoteId > 0 && activeQuoteIds.has(quoteId) && !deliveredQuoteIds.has(quoteId))
    .filter((quoteId, index, list) => list.indexOf(quoteId) === index);

  if (orderedActiveQuoteIds.length > 0) {
    return orderedActiveQuoteIds;
  }

  return fallbackQuoteIds.filter((quoteId) => activeQuoteIds.has(quoteId));
}

function remapPlacementStopOrders(
  placements: Placement[],
  orderedQuoteIds: number[],
  stopOrderByQuoteId: Map<number, number>
): Placement[] {
  if (placements.length <= 0 || orderedQuoteIds.length <= 0) return placements;

  const localToGlobalStopOrder = new Map<number, number>();
  orderedQuoteIds.forEach((quoteId, index) => {
    const globalStopOrder = stopOrderByQuoteId.get(quoteId);
    if (globalStopOrder && globalStopOrder > 0) {
      localToGlobalStopOrder.set(index + 1, globalStopOrder);
    }
  });

  return placements.map((placement) => {
    const localStopOrder = toPositiveInt(placement.stopOrder);
    const globalStopOrder = localToGlobalStopOrder.get(localStopOrder);
    if (!globalStopOrder) return placement;
    return { ...placement, stopOrder: globalStopOrder };
  });
}

function filterPlacementsByStopOrders(placements: Placement[], stopOrders: Set<number>): Placement[] {
  if (placements.length <= 0 || stopOrders.size <= 0) return [];
  return placements.filter((placement) => {
    const stopOrder = toPositiveInt(placement.stopOrder);
    return stopOrder > 0 && stopOrders.has(stopOrder);
  });
}

function resolveOrderQuoteId(order: DriverOrderCard | null | undefined): number {
  return toPositiveInt(order?.quoteId);
}

async function loadQuoteEntriesSequentially(quoteIds: number[]): Promise<Array<readonly [number, QuoteDetailResponse | null]>> {
  const entries: Array<readonly [number, QuoteDetailResponse | null]> = [];
  for (const quoteId of quoteIds) {
    try {
      const quote = await getDriverQuoteSummaryDetail(quoteId);
      entries.push([quoteId, quote] as const);
    } catch {
      entries.push([quoteId, null] as const);
    }
  }
  return entries;
}

function mergePlacementsByStopOrder(placements: Placement[]): Placement[] {
  if (placements.length <= 1) return placements;

  const grouped = new Map<number, Placement[]>();
  placements.forEach((placement) => {
    const stopOrder = toPositiveInt(placement.stopOrder);
    const key = stopOrder > 0 ? stopOrder : 0;
    const bucket = grouped.get(key);
    if (bucket) {
      bucket.push(placement);
      return;
    }
    grouped.set(key, [placement]);
  });

  return Array.from(grouped.entries())
    .map(([stopOrder, bucket]) => {
      if (bucket.length <= 1) {
        return bucket[0];
      }

      let minX = Number.POSITIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let minZ = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;
      let maxZ = Number.NEGATIVE_INFINITY;
      let totalWeight = 0;

      bucket.forEach((placement) => {
        const x = toFiniteNumber(placement.x, 0);
        const y = toFiniteNumber(placement.y, 0);
        const z = toFiniteNumber(placement.z, 0);
        const width = Math.max(20, toFiniteNumber(placement.width, 80));
        const height = Math.max(20, toFiniteNumber(placement.height, 80));
        const length = Math.max(20, toFiniteNumber(placement.length, 80));
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        minZ = Math.min(minZ, z);
        maxX = Math.max(maxX, x + width);
        maxY = Math.max(maxY, y + height);
        maxZ = Math.max(maxZ, z + length);
        totalWeight += Math.max(0, toFiniteNumber(placement.weight, 0));
      });

      const base = bucket[0];
      return {
        ...base,
        id: `stop-${stopOrder || base.id}`,
        x: minX,
        y: minY,
        z: minZ,
        width: Math.max(20, maxX - minX),
        height: Math.max(20, maxY - minY),
        length: Math.max(20, maxZ - minZ),
        weight: totalWeight > 0 ? totalWeight : base.weight,
        stopOrder: stopOrder > 0 ? stopOrder : base.stopOrder,
      };
    })
    .sort((a, b) => {
      const firstStop = toPositiveInt(a.stopOrder) || 9999;
      const secondStop = toPositiveInt(b.stopOrder) || 9999;
      return firstStop - secondStop;
    });
}

function reconcilePlacementDimensionsWithQuotes(
  placements: Placement[],
  stopOrderToQuote: Map<number, QuoteDetailResponse>
): Placement[] {
  if (placements.length <= 0 || stopOrderToQuote.size <= 0) return placements;

  return placements.map((placement) => {
    const stopOrder = toPositiveInt(placement.stopOrder);
    if (stopOrder <= 0) return placement;

    const quote = stopOrderToQuote.get(stopOrder);
    const items = Array.isArray(quote?.quoteItems) ? quote.quoteItems : [];
    if (items.length !== 1) return placement;

    const item = items[0];
    const quantity = Math.max(1, toPositiveInt(item?.quantity) || 1);
    if (quantity !== 1) return placement;

    const width = Math.max(20, toPositiveNumber(item?.widthCm, 0));
    const length = Math.max(20, toPositiveNumber(item?.lengthCm, 0));
    const height = Math.max(20, toPositiveNumber(item?.heightCm, 0));
    if (width <= 0 || length <= 0 || height <= 0) return placement;

    return {
      ...placement,
      width,
      length,
      height,
      weight: Math.max(0, toPositiveNumber(item?.unitWeightKg, placement.weight ?? 0)),
    };
  });
}

function buildFallbackPlacements(
  quotes: QuoteDetailResponse[],
  spec: TruckSpecReferenceResponse | null,
  stopOrderByQuoteId: Map<number, number>
): Placement[] {
  const dimensions = resolveTruckDimensions(spec);
  const maxLength = dimensions.lengthCm;
  const maxWidth = dimensions.widthCm;
  const gap = 8;

  const placements: Placement[] = [];
  let cursorX = 0;
  let cursorZ = 0;
  let cursorY = 0;
  let currentRowDepth = 0;
  let currentLayerHeight = 0;
  quotes.forEach((quote, quoteIndex) => {
    const stopOrder = stopOrderByQuoteId.get(toPositiveInt(quote.quoteId)) ?? quoteIndex + 1;
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
          cursorY += currentLayerHeight + gap;
          currentRowDepth = 0;
          currentLayerHeight = 0;
        }
        if (cursorY + height > dimensions.heightCm) {
          continue;
        }

        placements.push({
          id: `q${quote.quoteId}-i${itemIndex + 1}-${i + 1}`,
          x: cursorX,
          y: cursorY,
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
        currentLayerHeight = Math.max(currentLayerHeight, height);
      }
    });
  });

  return placements;
}

function buildRouteSelectionPreviewRequest(
  selection: NonNullable<ReturnType<typeof getDriverMarketRecommendationSelection>>,
  quotes: QuoteDetailResponse[]
) {
  const firstPickup = quotes.find(
    (quote) => Number.isFinite(quote.originLat) && Number.isFinite(quote.originLng) && Number(quote.originLat) !== 0 && Number(quote.originLng) !== 0
  );
  const firstDropoff = quotes.find(
    (quote) =>
      Number.isFinite(quote.destinationLat) &&
      Number.isFinite(quote.destinationLng) &&
      Number(quote.destinationLat) !== 0 &&
      Number(quote.destinationLng) !== 0
  );

  return {
    currentLat: Number(firstPickup?.originLat ?? 37.5665),
    currentLng: Number(firstPickup?.originLng ?? 126.978),
    ...(Number.isFinite(firstDropoff?.destinationLat) ? { endLat: Number(firstDropoff?.destinationLat) } : {}),
    ...(Number.isFinite(firstDropoff?.destinationLng) ? { endLng: Number(firstDropoff?.destinationLng) } : {}),
    combinePreference: selection.mode,
    mode: selection.mode,
    loadedWeightKg: Number(quotes.reduce((sum, quote) => sum + Math.max(0, toPositiveNumber(quote.weightKg, 0)), 0).toFixed(2)),
    loadedVolumeCbm: Number(quotes.reduce((sum, quote) => sum + Math.max(0, toPositiveNumber(quote.volumeCbm, 0)), 0).toFixed(2)),
    maxPickupDistanceKm: 60,
    quoteIds: selection.recommendation.quoteIds,
    selectedRouteRank: selection.recommendation.rank,
    ...(toPositiveInt(selection.selectedTruckId) > 0 ? { truckId: toPositiveInt(selection.selectedTruckId) } : {}),
  };
}

function shouldUseBundledFallbackStops(summary: NormalizedRouteSummary, quoteCount: number): boolean {
  if (quoteCount <= 1) return false;
  // Bundled recommendation should normally contain multiple pickup/dropoff points.
  // If server returns only 2 points, keep map useful by switching to client fallback stops.
  return summary.stops.length <= 2;
}

const useStyles = createThemedStyles((theme) => {
  const spacing = safeNumber(theme?.layout?.spacing?.base, 4);
  const cBorder = safeString(theme?.colors?.borderDefault, "#E2E8F0");
  return StyleSheet.create({
    content: {
      gap: spacing * 3,
      paddingTop: spacing * 4,
      paddingBottom: spacing * 30,
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
  const styles = useStyles();

  const rawKey =
    typeof forcedKey === "string" && forcedKey.trim().length > 0
      ? forcedKey
      : Array.isArray(params.key)
        ? params.key[0]
        : params.key;
  const key = String(rawKey ?? "").trim();
  // OpenAPI grounding (route pipeline):
  // - /api/driver/optimization/load-plan-preview(PreviewLoadPlan200)는 이 페이지에서 placements/truckSpec만 사용한다.
  // - selection.recommendation 타입(DriverRouteRecommendation)은 quoteIds/routeType/지표/pathLabel만 보존하고
  //   visitOrder/stops/polyline 좌표 필드를 담지 않는다.
  // - 좌표 기반 경유지는 /api/route-assembly/recommend(route-assembly-controller.recommend)의
  //   RouteAssemblyResponse.recommendations[].visitOrder[].location{latitude,longitude}에 정의돼 있다.
  // - 본 페이지는 quoteIds로 route-assembly recommend를 호출해 텍스트 경로 요약(stops/summary)을 구성한다.
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
  const [selectedStopOrder, setSelectedStopOrder] = useState<number | null>(null);
  const [isXray, setIsXray] = useState(true);
  const [routeSummary, setRouteSummary] = useState<NormalizedRouteSummary>(buildEmptyRouteSummary);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [visitSteps, setVisitSteps] = useState<RecommendationVisitStep[]>([]);
  const [selectedStepIndex, setSelectedStepIndex] = useState(0);
  const [hasInitializedStep, setHasInitializedStep] = useState(false);
  const [stepPlacements, setStepPlacements] = useState<Placement[] | null>(null);
  const [stepTruckSpec, setStepTruckSpec] = useState<TruckSpecReferenceResponse | null>(null);

  const safeQuoteIds = useMemo(() => {
    if (!selection) return [] as number[];
    return selection.recommendation.quoteIds.filter((quoteId) => quoteId > 0);
  }, [selection]);

  const orderedOrders = useMemo(() => {
    if (!selection) return [] as DriverOrderCard[];
    const orderMap = new Map<number, DriverOrderCard>();
    selection.orders.forEach((order) => {
      const quoteId = resolveOrderQuoteId(order);
      if (quoteId > 0) orderMap.set(quoteId, order);
    });

    const ordered = selection.recommendation.quoteIds
      .map((quoteId) => orderMap.get(quoteId))
      .filter((order): order is DriverOrderCard => Boolean(order));
    if (ordered.length > 0) return ordered;
    return [...selection.orders];
  }, [selection]);

  const primaryOrder = orderedOrders[0] ?? null;
  // Grounding: /api/driver/matches/accept-batch uses BatchAcceptMatchRequest.matchIds:number[].
  // groupedMatchIds is the request source and is explicitly de-duplicated + filtered (>0) here.
  const groupedMatchIds = useMemo(() => {
    const seen = new Set<number>();
    const ids: number[] = [];
    orderedOrders.forEach((order) => {
      if (order.matchId <= 0) return;
      if (seen.has(order.matchId)) return;
      seen.add(order.matchId);
      ids.push(order.matchId);
    });
    return ids;
  }, [orderedOrders]);
  const isGroupedRecommendation = groupedMatchIds.length > 1;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!selection) {
        setErrorMessage("추천 상세 정보를 찾지 못했습니다. 오더 마켓에서 다시 선택해 주세요.");
        setRouteSummary(buildEmptyRouteSummary());
        setVisitSteps([]);
        setIsLoading(false);
        return;
      }

      if (safeQuoteIds.length <= 0) {
        setErrorMessage("추천 항목에 유효한 견적 ID가 없습니다.");
        setRouteSummary(buildEmptyRouteSummary());
        setVisitSteps([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);
      setRouteSummary(buildEmptyRouteSummary());
      setVisitSteps([]);
      setSelectedStepIndex(0);
      setHasInitializedStep(false);
      setStepPlacements(null);
      setStepTruckSpec(null);
      try {
        const quoteEntries = await loadQuoteEntriesSequentially(safeQuoteIds);
        if (cancelled) return;
        const quoteMap: Record<number, QuoteDetailResponse> = {};
        quoteEntries.forEach(([quoteId, quote]) => {
          if (quote) quoteMap[quoteId] = quote;
        });
        setQuotesById(quoteMap);

        const quoteList = safeQuoteIds
          .map((quoteId) => quoteMap[quoteId])
          .filter((quote): quote is QuoteDetailResponse => Boolean(quote));

        // fetchRouteSummary: passes candidateQuotes so server can resolve route geometry
        setRouteLoading(true);
        let resolvedRouteSummary: NormalizedRouteSummary = buildEmptyRouteSummary();
        let resolvedVisitOrder = Array.isArray(selection.recommendation.visitOrder)
          ? selection.recommendation.visitOrder
          : [];
        try {
          const previewPayload = await previewRouteSelection(buildRouteSelectionPreviewRequest(selection, quoteList));
          const previewSource = asObject(previewPayload);
          const selectedRouteSource = asObject(previewSource.selectedRoute);
          resolvedVisitOrder = Array.isArray(selectedRouteSource.visitOrder)
            ? (selectedRouteSource.visitOrder as CargoVisit[])
            : resolvedVisitOrder;
          resolvedRouteSummary = normalizeRouteSummary(previewSource.routeSummary ?? previewSource, safeQuoteIds);
        } catch {
          try {
            resolvedRouteSummary = await fetchRouteSummary({ selectedQuoteIds: safeQuoteIds, quotes: quoteList });
          } catch {
            resolvedRouteSummary = {
              ...buildEmptyRouteSummary("route summary failed"),
              isError: true,
            };
          }
        }
        if (cancelled) return;
        setRouteLoading(false);
        const normalizedRouteSummary = shouldUseBundledFallbackStops(resolvedRouteSummary, quoteList.length)
          ? buildEmptyRouteSummary("bundled route fallback")
          : resolvedRouteSummary;
        if (normalizedRouteSummary.isError) setRouteError(normalizedRouteSummary.reason ?? "경로 계산 실패");
        const previewTruckId =
          toPositiveInt(selection?.selectedTruckId) || toPositiveInt(quoteList[0]?.truckId);
        let resolvedSpec: TruckSpecReferenceResponse | null = null;
        let resolvedPlacements: Placement[] = [];

        try {
          const previewPayload = await previewRouteSelection(buildRouteSelectionPreviewRequest(selection, quoteList));
          if (cancelled) return;
          const previewSource = asObject(previewPayload);
          const selectedRouteSource = asObject(previewSource.selectedRoute);
          resolvedVisitOrder = Array.isArray(selectedRouteSource.visitOrder)
            ? (selectedRouteSource.visitOrder as CargoVisit[])
            : resolvedVisitOrder;
          const parsed = resolvePreviewPayload(previewSource.loadPlan ?? previewPayload);
          resolvedSpec = parsed.truckSpec;
          resolvedPlacements = hasUnplacedLoadPlan(parsed.loadPlan)
            ? []
            : normalizePlacementList(parsed.loadPlan?.placements);
        } catch {
          try {
            const previewPayload = await previewDriverLoadPlan({
              quoteIds: safeQuoteIds,
              ...(previewTruckId > 0 ? { truckId: previewTruckId } : {}),
            });
            if (cancelled) return;
            const parsed = resolvePreviewPayload(previewPayload);
            resolvedSpec = parsed.truckSpec;
            resolvedPlacements = hasUnplacedLoadPlan(parsed.loadPlan)
              ? []
              : normalizePlacementList(parsed.loadPlan?.placements);
          } catch {
            resolvedPlacements = [];
          }
        }

        const deliveryStopOrderByQuoteId = buildDeliveryStopOrderMap(resolvedVisitOrder, safeQuoteIds);
        const normalizedVisitSteps = normalizeVisitSteps(resolvedVisitOrder, deliveryStopOrderByQuoteId);

        const expectedStopCount = quoteList.length;
        if (expectedStopCount > 1 && resolvedPlacements.length > 0) {
          const distinctStopCount = new Set(
            resolvedPlacements
              .map((placement) =>
                typeof placement.stopOrder === "number" && placement.stopOrder > 0 ? placement.stopOrder : 0
              )
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
        if (resolvedPlacements.length <= 0 && normalizedVisitSteps.length > 0 && quoteList.length > 1) {
          throw new Error("invalid_recommendation_load_plan");
        }
        if (resolvedPlacements.length <= 0) {
          resolvedPlacements = buildFallbackPlacements(quoteList, resolvedSpec, deliveryStopOrderByQuoteId);
        }

        if (cancelled) return;
        setTruckSpec(resolvedSpec);
        setPlacements(resolvedPlacements);
        setRouteSummary(normalizedRouteSummary);
        setVisitSteps(normalizedVisitSteps);
        setSelectedStepIndex(findLoadedStartStepIndex(normalizedVisitSteps));
        setHasInitializedStep(true);
      } catch {
        if (cancelled) return;
        setErrorMessage("추천 상세를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
        setRouteSummary(buildEmptyRouteSummary());
        setVisitSteps([]);
        setHasInitializedStep(false);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setRouteLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [safeQuoteIds, selection]);

  const refetchRoute = useCallback(async () => {
    if (routeLoading || safeQuoteIds.length === 0) return;
    setRouteLoading(true);
    setRouteError(null);
    try {
      const quotes = safeQuoteIds
        .map((id) => quotesById[id])
        .filter((q): q is QuoteDetailResponse => Boolean(q));
      const summary = await fetchRouteSummary({ selectedQuoteIds: safeQuoteIds, quotes });
      const normalizedSummary = shouldUseBundledFallbackStops(summary, quotes.length)
        ? buildEmptyRouteSummary("bundled route fallback")
        : summary;
      setRouteSummary(normalizedSummary);
      if (normalizedSummary.isError) setRouteError(normalizedSummary.reason ?? "경로 계산 실패");
    } catch {
      setRouteSummary({
        ...buildEmptyRouteSummary("경로 계산 실패"),
        isError: true,
      });
      setRouteError("경로 계산 실패");
    }
    setRouteLoading(false);
  }, [routeLoading, safeQuoteIds, quotesById]);

  const deliveryStopOrderByQuoteId = useMemo(
    () => buildDeliveryStopOrderMap(selection?.recommendation.visitOrder, safeQuoteIds),
    [safeQuoteIds, selection?.recommendation.visitOrder]
  );

  const quoteCards = useMemo(() => {
    if (!selection) return [];
    return selection.recommendation.quoteIds
      .map((quoteId, index) => {
        const normalizedQuoteId = toPositiveInt(quoteId);
        const matchedOrder =
          orderedOrders.find((order) => resolveOrderQuoteId(order) === normalizedQuoteId) ??
          orderedOrders[index] ??
          null;
        return {
          quoteId: normalizedQuoteId,
        stopOrder: deliveryStopOrderByQuoteId.get(quoteId) ?? index + 1,
          order: matchedOrder,
          quote: quotesById[normalizedQuoteId] ?? null,
        };
      })
      .filter((entry) => entry.quoteId > 0)
      .sort((a, b) => a.stopOrder - b.stopOrder);
  }, [deliveryStopOrderByQuoteId, orderedOrders, quotesById, selection]);
  const quoteByStopOrder = useMemo(() => {
    const map = new Map<number, QuoteDetailResponse>();
    quoteCards.forEach((entry) => {
      if (entry.stopOrder > 0 && entry.quote) {
        map.set(entry.stopOrder, entry.quote);
      }
    });
    return map;
  }, [quoteCards]);

  // Fallback stops built from quote origin/destination coordinates.
  // Used when routeSummary.stops is empty (route-assembly unavailable).
  // For bundled routes, preserve all pickup/dropoff points to avoid collapsing to 2 points.
  const directRouteStops = useMemo(() => {
    if (routeSummary.stops.length >= 2) return [];
    const quoteList = safeQuoteIds
      .map((id) => quotesById[id])
      .filter((q): q is QuoteDetailResponse => Boolean(q));
    if (quoteList.length === 0) return [];
    const pickups = quoteList.map((quote) => ({
      name: toOptionalText(quote.originAddress),
      lat: quote.originLat,
      lng: quote.originLng,
      type: "pickup" as const,
    }));
    const dropoffs = quoteList.map((quote) => ({
      name: toOptionalText(quote.destinationAddress),
      lat: quote.destinationLat,
      lng: quote.destinationLng,
      type: "dropoff" as const,
    }));
    const candidates = [...pickups, ...dropoffs].filter(
      (stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lng)
    );
    return candidates.length >= 2 ? candidates : [];
  }, [routeSummary.stops, safeQuoteIds, quotesById]);

  const effectiveTruckSpec = stepTruckSpec ?? truckSpec;
  const effectivePlacements = stepPlacements ?? placements;

  const orderedPlacements = useMemo(
    () =>
      reconcilePlacementDimensionsWithQuotes(
        mergePlacementsByStopOrder(effectivePlacements),
        quoteByStopOrder
      ).sort((a, b) => {
        const firstStop = typeof a.stopOrder === "number" && a.stopOrder > 0 ? a.stopOrder : 9999;
        const secondStop = typeof b.stopOrder === "number" && b.stopOrder > 0 ? b.stopOrder : 9999;
        return firstStop - secondStop;
      }),
    [effectivePlacements, quoteByStopOrder]
  );
  const stopColorMap = useMemo(() => {
    const map = new Map<number, string>();
    let cursor = 0;
    orderedPlacements.forEach((placement) => {
      const stopOrder = typeof placement.stopOrder === "number" && placement.stopOrder > 0 ? placement.stopOrder : 1;
      if (!map.has(stopOrder)) {
        map.set(stopOrder, PALETTE[cursor % PALETTE.length]);
        cursor += 1;
      }
    });
    return map;
  }, [orderedPlacements]);
  const selectedEntry = selectedStopOrder ? quoteCards.find((entry) => entry.stopOrder === selectedStopOrder) ?? null : null;
  const selectedOrderDetail = useMemo<RecoSelectedOrderDetail | null>(() => {
    if (!selectedEntry) return null;
    const selectedQuote = selectedEntry.quote;
    const selectedOrder = selectedEntry.order;
    const stopOrder = selectedStopOrder ?? 1;
    const accentColor = stopColorMap.get(stopOrder) ?? PALETTE[(stopOrder - 1) % PALETTE.length];
    const originAddress = selectedOrder?.originAddress || selectedQuote?.originAddress || "-";
    const destinationAddress = selectedOrder?.destinationAddress || selectedQuote?.destinationAddress || "-";
    const distanceText = selectedOrder?.routeDistanceText || (selectedQuote ? `${selectedQuote.distanceKm.toFixed(1)}km` : "-");
    const weightValue = selectedOrder?.weightKg ?? selectedQuote?.weightKg ?? 0;
    const weightText = weightValue > 0 ? `${weightValue.toFixed(1)}kg` : "-";
    const cbmValue = selectedOrder?.volumeCbm ?? selectedQuote?.volumeCbm ?? 0;
    const cbmText = cbmValue > 0 ? cbmValue.toFixed(1) : "-";
    const quoteItems = selectedQuote?.quoteItems ?? [];
    const cargoFallback = selectedOrder?.cargoText || selectedQuote?.cargoName || "-";
    const items =
      quoteItems.length > 0
        ? quoteItems.map((item, itemIndex) => ({
            key: `${item.quoteItemId ?? "item"}-${itemIndex}`,
            title: `${item.itemName || `화물 ${itemIndex + 1}`} · ${Math.max(1, item.quantity ?? 1)}개`,
            subtitle: `${item.widthCm ?? 0}×${item.lengthCm ?? 0}×${item.heightCm ?? 0}cm · ${(item.unitWeightKg ?? 0).toFixed(1)}kg`,
          }))
        : [{ key: "fallback", title: cargoFallback }];

    return {
      stopOrder,
      accentColor,
      originAddress,
      destinationAddress,
      distanceText,
      weightText,
      cbmText,
      items,
    };
  }, [selectedEntry, selectedStopOrder, stopColorMap]);
  const recommendedOrders = useMemo<RecoRecommendedOrderSummary[]>(
    () =>
      quoteCards.map((entry) => {
        const stopOrder = entry.stopOrder;
        const accentColor = stopColorMap.get(stopOrder) ?? PALETTE[(stopOrder - 1) % PALETTE.length];
        const priceValue = entry.order?.priceValue ?? entry.quote?.finalPrice ?? 0;
        return {
          stopOrder,
          quoteId: entry.quoteId,
          accentColor,
          priceText: formatKrw(priceValue),
          originAddress: entry.order?.originAddress ?? entry.quote?.originAddress ?? "-",
          destinationAddress: entry.order?.destinationAddress ?? entry.quote?.destinationAddress ?? "-",
        };
      }),
    [quoteCards, stopColorMap]
  );

  const displayVisitSteps = useMemo(
    () => (visitSteps.length > 0 ? visitSteps : buildSyntheticVisitSteps(quoteCards)),
    [quoteCards, visitSteps]
  );

  useEffect(() => {
    if (hasInitializedStep) return;
    if (displayVisitSteps.length <= 0) return;
    setSelectedStepIndex(findLoadedStartStepIndex(displayVisitSteps));
    setHasInitializedStep(true);
  }, [displayVisitSteps, hasInitializedStep]);

  const activeLoadPlanQuoteIds = useMemo(
    () => buildActiveLoadPlanQuoteIds(displayVisitSteps, selectedStepIndex, safeQuoteIds),
    [displayVisitSteps, safeQuoteIds, selectedStepIndex]
  );
  const activeStepStopOrders = useMemo(() => {
    const stopOrders = new Set<number>();
    activeLoadPlanQuoteIds.forEach((quoteId) => {
      const stopOrder = deliveryStopOrderByQuoteId.get(quoteId);
      if (stopOrder && stopOrder > 0) {
        stopOrders.add(stopOrder);
      }
    });
    return stopOrders;
  }, [activeLoadPlanQuoteIds, deliveryStopOrderByQuoteId]);

  useEffect(() => {
    let cancelled = false;

    const loadStepPreview = async () => {
      if (!selection || safeQuoteIds.length <= 0) {
        setStepPlacements(null);
        setStepTruckSpec(null);
        return;
      }

      if (activeLoadPlanQuoteIds.length <= 0) {
        setStepPlacements([]);
        setStepTruckSpec(null);
        return;
      }

      const previewTruckId =
        toPositiveInt(selection.selectedTruckId) ||
        toPositiveInt(quotesById[safeQuoteIds[0] ?? 0]?.truckId);

      try {
        const previewPayload = await previewDriverLoadPlan({
          quoteIds: activeLoadPlanQuoteIds,
          ...(previewTruckId > 0 ? { truckId: previewTruckId } : {}),
        });
        if (cancelled) return;
        const parsed = resolvePreviewPayload(previewPayload);
        const remappedPlacements = remapPlacementStopOrders(
          normalizePlacementList(parsed.loadPlan?.placements),
          activeLoadPlanQuoteIds,
          deliveryStopOrderByQuoteId
        );
        const nextPlacements =
          hasUnplacedLoadPlan(parsed.loadPlan) || remappedPlacements.length <= 0
            ? filterPlacementsByStopOrders(placements, activeStepStopOrders)
            : remappedPlacements;
        setStepPlacements(nextPlacements);
        setStepTruckSpec(parsed.truckSpec);
      } catch {
        if (cancelled) return;
        const activeQuotes = activeLoadPlanQuoteIds
          .map((quoteId) => quotesById[quoteId])
          .filter((quote): quote is QuoteDetailResponse => Boolean(quote));
        setStepPlacements(buildFallbackPlacements(activeQuotes, truckSpec, deliveryStopOrderByQuoteId));
        setStepTruckSpec(null);
      }
    };

    void loadStepPreview();
    return () => {
      cancelled = true;
    };
  }, [activeLoadPlanQuoteIds, activeStepStopOrders, deliveryStopOrderByQuoteId, placements, quotesById, safeQuoteIds, selection, truckSpec]);

  const visibleStopOrders = useMemo(() => {
    if (displayVisitSteps.length <= 0) {
      return new Set<number>(recommendedOrders.map((entry) => entry.stopOrder));
    }
    const loaded = new Set<number>();
    const lastIndex = Math.min(selectedStepIndex, displayVisitSteps.length - 1);
    for (let index = 0; index <= lastIndex; index += 1) {
      const step = displayVisitSteps[index];
      const stopOrder = step?.stopOrder ?? null;
      if (!stopOrder || stopOrder <= 0) continue;
      if (step.visitType === "PICKUP") {
        loaded.add(stopOrder);
      } else if (step.visitType === "DELIVERY") {
        loaded.delete(stopOrder);
      }
    }
    return loaded;
  }, [displayVisitSteps, recommendedOrders, selectedStepIndex]);

  useEffect(() => {
    if (displayVisitSteps.length > 0) return;
    if (selectedStopOrder) return;
    const fallbackStopOrder = recommendedOrders[0]?.stopOrder ?? null;
    if (fallbackStopOrder) setSelectedStopOrder(fallbackStopOrder);
  }, [displayVisitSteps.length, recommendedOrders, selectedStopOrder]);

  useEffect(() => {
    if (displayVisitSteps.length <= 0) return;
    const nextStep = displayVisitSteps[Math.min(selectedStepIndex, displayVisitSteps.length - 1)];
    if (!nextStep) return;
    if (nextStep.stopOrder && nextStep.stopOrder > 0) {
      setSelectedStopOrder(nextStep.stopOrder);
      return;
    }
    const fallbackStopOrder = recommendedOrders[0]?.stopOrder ?? null;
    if (fallbackStopOrder) setSelectedStopOrder(fallbackStopOrder);
  }, [displayVisitSteps, recommendedOrders, selectedStepIndex]);

  const handleSelectRecommendedStop = useCallback(
    (nextStopOrder: number | null) => {
      setSelectedStopOrder(nextStopOrder);
      if (!nextStopOrder) return;
      const nextStepIndex = displayVisitSteps.findIndex((step) => step.stopOrder === nextStopOrder);
      if (nextStepIndex >= 0) {
        setSelectedStepIndex(nextStepIndex);
      }
    },
    [displayVisitSteps]
  );

  const handlePrevStep = useCallback(() => {
    setSelectedStepIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNextStep = useCallback(() => {
    setSelectedStepIndex((prev) => Math.min(Math.max(displayVisitSteps.length - 1, 0), prev + 1));
  }, [displayVisitSteps.length]);

  const handleAccept = useCallback(() => {
    if (routeLoading || isBusy || isSubmittingOffer) return;
    if (groupedMatchIds.length <= 0) {
      Alert.alert("안내", "수락 가능한 매칭 정보가 없습니다.");
      return;
    }

    const runAcceptBatch = async () => {
      setIsBusy(true);
      try {
        // OpenAPI grounding:
        // - POST /api/driver/matches/accept-batch (operationId: acceptMatches)
        // - request schema: BatchAcceptMatchRequest { matchIds, routeType?, orderedQuoteIds? }
        // - generated client: driver-match-controller.acceptMatches (wrapped by acceptDriverMatchesBatch)
        const acceptedMatches = await acceptDriverMatchesBatch({
          matchIds: groupedMatchIds,
          routeType: selection?.mode,
          orderedQuoteIds: selection?.recommendation.quoteIds,
        });

        const successMatchIds = Array.from(
          new Set(
            acceptedMatches
              .map((item) => item.matchId)
              .filter((matchId) => matchId > 0)
          )
        );
        const successCount = successMatchIds.length;
        const failureCount = Math.max(0, groupedMatchIds.length - successCount);

        if (successCount <= 0) {
          Alert.alert("배차 수락 실패", "배차 수락에 실패했습니다.", [
            { text: "취소", style: "cancel" },
            {
              text: "다시 시도",
              onPress: () => {
                setErrorMessage(null);
                void runAcceptBatch();
              },
            },
          ]);
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
        const message = readApiErrorMessage(error, "잠시 후 다시 시도해 주세요.");
        Alert.alert("배차 수락 실패", message, [
          { text: "취소", style: "cancel" },
          {
            text: "다시 시도",
            onPress: () => {
              setErrorMessage(null);
              void runAcceptBatch();
            },
          },
        ]);
      } finally {
        setIsBusy(false);
      }
    };

    Alert.alert("배차 수락", `총 ${groupedMatchIds.length}건 배차를 수락합니다.`, [
      { text: "취소", style: "cancel", onPress: () => setIsBusy(false) },
      { text: "수락", onPress: () => void runAcceptBatch() },
    ]);
  }, [groupedMatchIds, isBusy, isGroupedRecommendation, isSubmittingOffer, routeLoading, router, selection]);

  const handleSubmitOffer = useCallback(
    async (payload: CounterOfferSubmitPayload) => {
      if (!primaryOrder || routeLoading || isBusy || isSubmittingOffer) return;
      const safeMatchId = primaryOrder.matchId;
      const safeQuoteId = primaryOrder.quoteId ?? 0;
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
    [isBusy, isSubmittingOffer, primaryOrder, routeLoading]
  );
  const isActionLocked = isBusy || isSubmittingOffer || routeLoading;

  const bottomBar = (
    <View style={[styles.bottomWrap, { paddingBottom: (insets.bottom ?? 0) + 10 }]}>
      <AppButton
        title={isGroupedRecommendation ? "운임 제안(대표 1건)" : "운임 제안"}
        variant="secondary"
        style={styles.bottomBtn}
        loading={isSubmittingOffer}
        disabled={!primaryOrder || isActionLocked}
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
        disabled={groupedMatchIds.length <= 0 || isActionLocked}
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

  const dims = resolveTruckDimensions(effectiveTruckSpec);

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

          <RecoRouteMapCard
            summaryText={routeSummary.summary}
            stops={routeSummary.stops}
            fallbackStops={directRouteStops}
            isError={routeSummary.isError}
            routeLoading={routeLoading}
            selectedStopOrder={selectedStopOrder}
            onRetry={() => void refetchRoute()}
          />

          <RecoLoadSimulationCard
            dims={dims}
            isGroupedRecommendation={isGroupedRecommendation}
            isXray={isXray}
            onToggleXray={() => setIsXray((prev) => !prev)}
            routeLoading={routeLoading}
            orderedPlacements={orderedPlacements}
            visibleStopOrders={visibleStopOrders}
            stopColorMap={stopColorMap}
            selectedStopOrder={selectedStopOrder}
            onSelectStopOrder={handleSelectRecommendedStop}
            recommendedOrders={recommendedOrders}
            selectedOrderDetail={selectedOrderDetail}
            visitSteps={displayVisitSteps}
            selectedStepIndex={selectedStepIndex}
            onPrevStep={handlePrevStep}
            onNextStep={handleNextStep}
          />
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
