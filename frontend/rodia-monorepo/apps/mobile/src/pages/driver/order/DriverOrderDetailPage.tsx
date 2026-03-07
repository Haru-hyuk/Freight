import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Platform } from "react-native";
import { DriverOrderDetailView } from "@/features/driver-orders/ui/detail/DriverOrderDetailView";
import { getDriverRunPhotos } from "@/features/driver-run/api/driver-run-api";
import {
  acceptDriverMatch,
  DRIVER_ORDER_SCOPE_ALIAS,
  DRIVER_ORDER_SCOPE_LEGACY,
  postCounterOffer,
  toLegacyDriverOrderScope,
  uploadImage,
  type DriverPhotoUploadType,
} from "@/features/matching/api";
import type { ParsedMatchResponseItem } from "@/features/matching/api/shipper-match-parser";
import { useMatchDetail } from "@/features/matching/model/useMatchDetail";
import {
  isCounterOfferPending,
  listDriverCounterOffersByQuote,
  type CounterOfferItem,
} from "@/features/counter-offer/api";
import {
  DRIVER_RUN_SYNC_EVENT,
  publishDriverRunSyncEvent,
} from "@/features/matching/model/driverRunSyncEvents";
import { DRIVER_ROUTE_PATH } from "@/features/matching/model/driverRunUiApiGrounding";
import type { CounterOfferSubmitPayload } from "@/features/matching/ui/CounterOfferModal";
import type { QuoteDetailResponse } from "@/entities/quote/model/quote.types";
import { previewDriverLoadPlan, type LoadPlanResponse, type Placement, type TruckSpecReferenceResponse } from "@/features/matching/api";
import { confirmLoading, confirmUnloading, startDriving } from "@/shared/lib/mock-flow";
import { readApiErrorMessage } from "@/shared/lib/api/readApiErrorMessage";
import {
  API_ERROR_CODE,
  DRIVER_UI_STATE,
  getApiErrorCode,
  getDriverCta,
  getDriverUiStateFromStatusPayload,
  type DriverUiState,
} from "@/shared/lib/policy";

const PHOTO_UPLOAD_PICKER_QUALITY = 0.2;

export type DriverOrderRouteParams = {
  id?: string | string[];
  source?: string | string[];
  recommendKey?: string | string[];
};

type MatchWithWorkflowPayload = ParsedMatchResponseItem & {
  loadingPhotos?: string[];
  unloadingPhotos?: string[];
};
type LoadPlanDataSource = "match" | "preview" | "quote_fallback" | "none";

function parsePositiveRouteId(rawId: string | string[] | undefined): number {
  const candidate = Array.isArray(rawId) ? rawId[0] : rawId;
  const parsed = Number(candidate);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function parseRouteSource(rawSource: string | string[] | undefined): string {
  const candidate = Array.isArray(rawSource) ? rawSource[0] : rawSource;
  const token = String(candidate ?? "").trim().toLowerCase();
  if (token === "run") return "run";
  if (
    token === DRIVER_ORDER_SCOPE_LEGACY.OPEN ||
    token === DRIVER_ORDER_SCOPE_LEGACY.ASSIGNED ||
    token === DRIVER_ORDER_SCOPE_ALIAS.OPEN ||
    token === DRIVER_ORDER_SCOPE_ALIAS.ASSIGNED
  ) {
    return toLegacyDriverOrderScope(token);
  }
  return token;
}

function toStatusToken(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
}

function resolveWorkflowStepIndex(uiState: DriverUiState): number {
  if (uiState === DRIVER_UI_STATE.PICKUP_IN_PROGRESS) return 1;
  if (uiState === DRIVER_UI_STATE.TRANSIT_IN_PROGRESS) return 2;
  if (uiState === DRIVER_UI_STATE.COMPLETED) return 3;
  return 0;
}

function toPositiveInt(value: unknown): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function toPhotoTypeToken(value: unknown): "PICKUP" | "DELIVERY" | "" {
  const token = String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
  if (token === "PICKUP") return "PICKUP";
  if (token === "DELIVERY") return "DELIVERY";
  return "";
}

type AnyObject = Record<string, unknown>;
type ResolvedLoadPlanPreview = {
  loadPlan: LoadPlanResponse | null;
  truckSpec: TruckSpecReferenceResponse | null;
};

function asObject(value: unknown): AnyObject {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as AnyObject) : {};
}

function toOptionalText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  return text || undefined;
}

function toOptionalBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1 ? true : value === 0 ? false : undefined;
  if (typeof value !== "string") return undefined;
  const text = value.trim().toLowerCase();
  if (text === "true" || text === "1" || text === "yes" || text === "y") return true;
  if (text === "false" || text === "0" || text === "no" || text === "n") return false;
  return undefined;
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toPositiveNumber(value: unknown, fallback = 0): number {
  const parsed = toFiniteNumber(value, fallback);
  return parsed > 0 ? parsed : fallback;
}

function normalizePlacementItem(value: unknown, fallbackOrder: number): Placement | null {
  const source = asObject(value);
  const width = toPositiveNumber(source.width ?? source.w ?? source.cargoWidthCm, 0);
  const length = toPositiveNumber(source.length ?? source.l ?? source.depth ?? source.cargoLengthCm, 0);
  const height = toPositiveNumber(source.height ?? source.h ?? source.cargoHeightCm, 0);
  if (width <= 0 && length <= 0 && height <= 0) return null;

  const orientationRaw = Array.isArray(source.orientation) ? source.orientation : undefined;
  const orientation = orientationRaw
    ? orientationRaw.map((entry) => Number(entry)).filter((entry) => Number.isFinite(entry))
    : undefined;

  const stopOrder = toPositiveInt(source.stopOrder ?? source.seq ?? source.sortOrder) || fallbackOrder;

  return {
    id: toOptionalText(source.id) ?? `cargo-${fallbackOrder}`,
    x: Math.max(0, toFiniteNumber(source.x, 0)),
    y: Math.max(0, toFiniteNumber(source.y, 0)),
    z: Math.max(0, toFiniteNumber(source.z, 0)),
    length: Math.max(20, length || 100),
    width: Math.max(20, width || 100),
    height: Math.max(20, height || 100),
    weight: Math.max(0, toFiniteNumber(source.weight ?? source.unitWeightKg, 0)),
    stopOrder,
    stackable: toOptionalBoolean(source.stackable),
    fragile: toOptionalBoolean(source.fragile),
    noStack: toOptionalBoolean(source.noStack),
    bottomOnly: toOptionalBoolean(source.bottomOnly),
    maxStackWeight: Math.max(0, toFiniteNumber(source.maxStackWeight ?? source.maxStackWeightKg, 0)),
    orientation: orientation && orientation.length > 0 ? orientation : undefined,
  };
}

function normalizePlacementList(value: unknown): Placement[] {
  if (!Array.isArray(value)) return [];

  const normalized = value
    .map((item, index) => normalizePlacementItem(item, index + 1))
    .filter((item): item is Placement => item !== null);

  return normalized.sort((a, b) => {
    const byStopOrder = toPositiveInt(a.stopOrder) - toPositiveInt(b.stopOrder);
    if (byStopOrder !== 0) return byStopOrder;
    const aId = toOptionalText(a.id) ?? "";
    const bId = toOptionalText(b.id) ?? "";
    return aId.localeCompare(bId);
  });
}

function normalizeTruckSpec(value: unknown): TruckSpecReferenceResponse | null {
  const source = asObject(value);
  if (Object.keys(source).length <= 0) return null;

  const vehicleType = toOptionalText(source.vehicleType ?? source.type);
  const vehicleBodyType = toOptionalText(source.vehicleBodyType ?? source.bodyType ?? source.category);
  const cargoLengthCm = toPositiveNumber(source.cargoLengthCm ?? source.cargoLength ?? source.lengthCm, 0);
  const cargoWidthCm = toPositiveNumber(source.cargoWidthCm ?? source.cargoWidth ?? source.widthCm, 0);
  const cargoHeightCm = toPositiveNumber(source.cargoHeightCm ?? source.cargoHeight ?? source.heightCm, 0);
  const maxWeight = toPositiveNumber(source.maxWeight ?? source.weightLimit ?? source.max_weight, 0);
  const tonnage = toPositiveNumber(source.tonnage, 0);

  if (!vehicleType && !vehicleBodyType && cargoLengthCm <= 0 && cargoWidthCm <= 0 && cargoHeightCm <= 0 && maxWeight <= 0) {
    return null;
  }

  return {
    vehicleType: vehicleType || undefined,
    vehicleTypeKr: toOptionalText(source.vehicleTypeKr ?? source.vehicleTypeName ?? source.tonName),
    vehicleBodyType: vehicleBodyType || undefined,
    categoryKr: toOptionalText(source.categoryKr ?? source.categoryName),
    tonnage: tonnage > 0 ? tonnage : undefined,
    maxWeight: maxWeight > 0 ? maxWeight : undefined,
    cargoLengthCm: cargoLengthCm > 0 ? cargoLengthCm : undefined,
    cargoWidthCm: cargoWidthCm > 0 ? cargoWidthCm : undefined,
    cargoHeightCm: cargoHeightCm > 0 ? cargoHeightCm : undefined,
    maxVolume: toPositiveNumber(source.maxVolume, 0) || undefined,
    palletCount: toPositiveInt(source.palletCount) || undefined,
    doorPosition: toOptionalText(source.doorPosition),
    sourceName: toOptionalText(source.sourceName),
  };
}

function resolveLoadPlanPreview(payload: unknown): ResolvedLoadPlanPreview {
  const queue: unknown[] = [payload];
  const visited = new Set<AnyObject>();

  let resolvedLoadPlan: LoadPlanResponse | null = null;
  let resolvedTruckSpec: TruckSpecReferenceResponse | null = null;

  while (queue.length > 0) {
    const current = queue.shift();
    if (Array.isArray(current)) {
      current.forEach((item) => queue.push(item));
      continue;
    }

    const source = asObject(current);
    if (Object.keys(source).length <= 0) continue;
    if (visited.has(source)) continue;
    visited.add(source);

    if (!resolvedLoadPlan) {
      const placements = normalizePlacementList(source.placements);
      if (Array.isArray(source.placements) || placements.length > 0) {
        const statsSource = asObject(source.stats);
        const utilization = toFiniteNumber(statsSource.utilization, NaN);
        const totalWeight = toFiniteNumber(statsSource.totalWeight, NaN);
        const placedCount = toFiniteNumber(statsSource.placedCount, NaN);
        const unplacedCount = toFiniteNumber(statsSource.unplacedCount, NaN);

        resolvedLoadPlan = {
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

    if (!resolvedTruckSpec) {
      resolvedTruckSpec =
        normalizeTruckSpec(source.truckSpec) ??
        normalizeTruckSpec(source.truck) ??
        normalizeTruckSpec(source.spec) ??
        null;
    }

    const nestedKeys = [
      "data",
      "result",
      "payload",
      "response",
      "content",
      "item",
      "summary",
      "loadPlan",
      "plan",
      "preview",
      "truckSpec",
      "truck",
      "spec",
    ];
    nestedKeys.forEach((key) => {
      const nested = source[key];
      if (typeof nested !== "undefined" && nested !== null) {
        queue.push(nested);
      }
    });
  }

  return {
    loadPlan: resolvedLoadPlan,
    truckSpec: resolvedTruckSpec,
  };
}

function inferTruckSpecFromQuote(quote: QuoteDetailResponse | null | undefined): TruckSpecReferenceResponse | null {
  if (!quote) return null;
  const vehicleType = String(quote.vehicleType ?? "").trim().toUpperCase();
  const vehicleBodyType = String(quote.vehicleBodyType ?? "").trim().toUpperCase();
  const presets: Record<string, { lengthCm: number; widthCm: number; heightCm: number; maxWeight: number }> = {
    DAMAS: { lengthCm: 160, widthCm: 130, heightCm: 120, maxWeight: 300 },
    LABO: { lengthCm: 220, widthCm: 140, heightCm: 140, maxWeight: 500 },
    TON_1: { lengthCm: 320, widthCm: 170, heightCm: 170, maxWeight: 1000 },
    TON_1_4: { lengthCm: 360, widthCm: 180, heightCm: 180, maxWeight: 1400 },
    TON_2_5: { lengthCm: 430, widthCm: 210, heightCm: 210, maxWeight: 2500 },
    TON_3_5: { lengthCm: 490, widthCm: 220, heightCm: 220, maxWeight: 3500 },
    TON_5: { lengthCm: 620, widthCm: 230, heightCm: 240, maxWeight: 5000 },
    TON_5_AXLE: { lengthCm: 740, widthCm: 230, heightCm: 240, maxWeight: 5500 },
    TON_8: { lengthCm: 780, widthCm: 240, heightCm: 250, maxWeight: 8000 },
    TON_11: { lengthCm: 900, widthCm: 245, heightCm: 260, maxWeight: 11000 },
    TON_14: { lengthCm: 980, widthCm: 245, heightCm: 260, maxWeight: 14000 },
    TON_15: { lengthCm: 1020, widthCm: 245, heightCm: 260, maxWeight: 15000 },
    TON_18: { lengthCm: 1080, widthCm: 250, heightCm: 265, maxWeight: 18000 },
    TON_25: { lengthCm: 1160, widthCm: 250, heightCm: 270, maxWeight: 25000 },
  };
  const preset = presets[vehicleType] ?? presets.TON_5;

  return {
    vehicleType: vehicleType || undefined,
    vehicleBodyType: vehicleBodyType || undefined,
    cargoLengthCm: preset.lengthCm,
    cargoWidthCm: preset.widthCm,
    cargoHeightCm: preset.heightCm,
    maxWeight: Math.max(preset.maxWeight, toPositiveNumber(quote.weightKg, 0)),
    tonnage: toPositiveNumber((quote.weightKg ?? 0) / 1000, 0) || undefined,
    sourceName: "QUOTE_FALLBACK",
  };
}

function buildSyntheticLoadPlanFromQuote(
  quote: QuoteDetailResponse | null | undefined,
  truckSpec: TruckSpecReferenceResponse | null | undefined
): LoadPlanResponse | null {
  if (!quote) return null;
  const items = Array.isArray(quote.quoteItems) ? quote.quoteItems : [];
  const hasTotals = toPositiveNumber(quote.weightKg, 0) > 0 || toPositiveNumber(quote.volumeCbm, 0) > 0;
  if (items.length <= 0 && !hasTotals) return null;

  const dimensions = resolveTruckDimensions(truckSpec);
  const safeTruckLength = Math.max(200, toPositiveNumber(dimensions.lengthCm, 450));
  const safeTruckWidth = Math.max(120, toPositiveNumber(dimensions.widthCm, 230));
  const safeTruckHeight = Math.max(120, toPositiveNumber(dimensions.heightCm, 240));
  const gap = 6;

  const sortedItems = [...items].sort((a, b) => toPositiveInt(a.sortOrder) - toPositiveInt(b.sortOrder));
  const expanded: Array<{
    id: string;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
    weightKg: number;
    stopOrder: number;
    stackable: boolean;
    fragile: boolean;
    noStack: boolean;
    bottomOnly: boolean;
    maxStackWeight: number;
  }> = [];

  sortedItems.forEach((item, itemIndex) => {
    const quantity = Math.max(1, Math.min(20, toPositiveInt(item.quantity) || 1));
    const unitLength = Math.max(30, toPositiveNumber(item.lengthCm, 100));
    const unitWidth = Math.max(30, toPositiveNumber(item.widthCm, 100));
    const unitHeight = Math.max(30, toPositiveNumber(item.heightCm, 100));
    const unitWeightKg = Math.max(0, toPositiveNumber(item.unitWeightKg, 0));
    const stopOrder = toPositiveInt(item.sortOrder) || itemIndex + 1;

    for (let i = 0; i < quantity; i += 1) {
      expanded.push({
        id: `q-${toPositiveInt(item.quoteItemId) || itemIndex + 1}-${i + 1}`,
        lengthCm: Math.min(unitLength, safeTruckLength),
        widthCm: Math.min(unitWidth, safeTruckWidth),
        heightCm: Math.min(unitHeight, safeTruckHeight),
        weightKg: unitWeightKg,
        stopOrder,
        stackable: item.stackable !== false,
        fragile: item.fragile === true,
        noStack: item.noStack === true,
        bottomOnly: item.bottomOnly === true,
        maxStackWeight: Math.max(0, toPositiveNumber(item.maxStackWeightKg, 0)),
      });
    }
  });

  if (expanded.length <= 0) {
    const totalWeight = Math.max(0, toPositiveNumber(quote.weightKg, 0));
    const totalVolume = Math.max(0, toPositiveNumber(quote.volumeCbm, 0));
    const estimatedEdge = totalVolume > 0 ? Math.max(30, Math.round(Math.cbrt(totalVolume) * 100)) : 120;
    expanded.push({
      id: `q-${toPositiveInt(quote.quoteId) || 1}-1`,
      lengthCm: Math.min(estimatedEdge, safeTruckLength),
      widthCm: Math.min(estimatedEdge, safeTruckWidth),
      heightCm: Math.min(estimatedEdge, safeTruckHeight),
      weightKg: totalWeight,
      stopOrder: 1,
      stackable: true,
      fragile: false,
      noStack: false,
      bottomOnly: false,
      maxStackWeight: 0,
    });
  }

  const placements: Placement[] = [];
  let cursorX = 0;
  let cursorZ = 0;
  let currentRowDepth = 0;

  expanded.slice(0, 120).forEach((item, index) => {
    const nextWidth = item.widthCm;
    const nextLength = item.lengthCm;

    if (cursorX + nextWidth > safeTruckWidth) {
      cursorX = 0;
      cursorZ += currentRowDepth + gap;
      currentRowDepth = 0;
    }
    if (cursorZ + nextLength > safeTruckLength) {
      cursorZ = 0;
    }

    placements.push({
      id: item.id,
      x: cursorX,
      y: 0,
      z: cursorZ,
      width: nextWidth,
      length: nextLength,
      height: item.heightCm,
      weight: item.weightKg,
      stopOrder: item.stopOrder || index + 1,
      stackable: item.stackable,
      fragile: item.fragile,
      noStack: item.noStack,
      bottomOnly: item.bottomOnly,
      maxStackWeight: item.maxStackWeight,
    });

    cursorX += nextWidth + gap;
    currentRowDepth = Math.max(currentRowDepth, nextLength);
  });

  if (placements.length <= 0) return null;

  const totalCargoVolume = placements.reduce(
    (sum, placement) =>
      sum +
      Math.max(0, toPositiveNumber(placement.width, 0)) *
        Math.max(0, toPositiveNumber(placement.length, 0)) *
        Math.max(0, toPositiveNumber(placement.height, 0)),
    0
  );
  const truckVolume = safeTruckWidth * safeTruckLength * safeTruckHeight;
  const totalWeight = placements.reduce((sum, placement) => sum + Math.max(0, toPositiveNumber(placement.weight, 0)), 0);

  return {
    placements,
    stats: {
      placedCount: placements.length,
      unplacedCount: 0,
      totalWeight,
      utilization: truckVolume > 0 ? Math.max(0, Math.min(1, totalCargoVolume / truckVolume)) : 0,
    },
  };
}

function resolveTruckDimensions(spec: TruckSpecReferenceResponse | null | undefined) {
  return {
    lengthCm: spec?.cargoLengthCm ?? 450,
    widthCm: spec?.cargoWidthCm ?? 230,
    heightCm: spec?.cargoHeightCm ?? 240,
  };
}

type DriverOrderDetailPageProps = {
  params: DriverOrderRouteParams;
};

export default function DriverOrderDetailPage({ params }: DriverOrderDetailPageProps) {
  const router = useRouter();

  const matchId = parsePositiveRouteId(params.id);
  const viewModel = useMatchDetail(matchId);

  const [loadingPhotos, setLoadingPhotos] = useState<string[]>([]);
  const [unloadingPhotos, setUnloadingPhotos] = useState<string[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const [offerErrorMessage, setOfferErrorMessage] = useState<string | null>(null);
  const [previewPlan, setPreviewPlan] = useState<LoadPlanResponse | null>(null);
  const [previewTruckSpec, setPreviewTruckSpec] = useState<TruckSpecReferenceResponse | null>(null);
  const [latestPendingOffer, setLatestPendingOffer] = useState<CounterOfferItem | null>(null);
  const [runNegotiationProbeMatchId, setRunNegotiationProbeMatchId] = useState(0);
  const [isNavigatingSettlement, setIsNavigatingSettlement] = useState(false);

  const syncDriverPhotos = useCallback(async () => {
    if (matchId <= 0) return;
    try {
      const photos = await getDriverRunPhotos(matchId);
      const nextLoading: string[] = [];
      const nextUnloading: string[] = [];
      photos.forEach((photo) => {
        const uri = typeof photo?.fileUrl === "string" ? photo.fileUrl.trim() : "";
        if (!uri) return;
        const type = toPhotoTypeToken(photo?.type);
        if (type === "PICKUP") {
          nextLoading.push(uri);
          return;
        }
        if (type === "DELIVERY") {
          nextUnloading.push(uri);
        }
      });
      if (nextLoading.length > 0 || nextUnloading.length > 0) {
        setLoadingPhotos(nextLoading);
        setUnloadingPhotos(nextUnloading);
      }
    } catch {
      // Keep legacy photo fields when photo API fails.
    }
  }, [matchId]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const refetchOnFocus = async () => {
        if (cancelled) return;
        await viewModel.refetch();
      };
      void refetchOnFocus();
      return () => {
        cancelled = true;
      };
    }, [viewModel.refetch])
  );

  const runAndRefetch = useCallback(
    async (runner: () => void) => {
      setIsBusy(true);
      try {
        runner();
        await viewModel.refetch();
      } finally {
        setIsBusy(false);
      }
    },
    [viewModel.refetch]
  );

  const handleAddPhoto = useCallback(async (
    photoType: DriverPhotoUploadType,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (matchId <= 0) {
      Alert.alert("업로드 불가", "유효한 오더를 확인한 뒤 다시 시도해 주세요.");
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("권한 필요", "사진 보관함 접근 권한을 허용해 주세요.");
      return;
    }

    const pickerOptions: Record<string, unknown> = {
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      allowsEditing: false,
      quality: PHOTO_UPLOAD_PICKER_QUALITY,
    };
    if (Platform.OS === "ios") {
      // HEIC 원본 대신 호환 포맷(JPEG)으로 전달해 대용량/포맷 이슈를 줄인다.
      pickerOptions.preferredAssetRepresentationMode = "compatible";
    }
    const result = await ImagePicker.launchImageLibraryAsync(pickerOptions as ImagePicker.ImagePickerOptions);

    if (!result.canceled && result.assets) {
      setIsUploadingPhoto(true);
      try {
        const uploadedUrls: string[] = [];
        for (const asset of result.assets) {
          const localUri = typeof asset?.uri === "string" ? asset.uri.trim() : "";
          if (!localUri) continue;
          const remoteUrl = await uploadImage(matchId, localUri, photoType);
          uploadedUrls.push(remoteUrl);
        }
        if (uploadedUrls.length > 0) {
          setter((prev) => [...prev, ...uploadedUrls]);
          // Background sync so the server reflects the new photos
          void viewModel.refetch();
          void syncDriverPhotos();
        }
      } catch {
        Alert.alert("업로드 실패", "이미지 업로드에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      } finally {
        setIsUploadingPhoto(false);
      }
    }
  }, [matchId, syncDriverPhotos, viewModel.refetch]);

  useEffect(() => {
    const match = (viewModel.match as MatchWithWorkflowPayload | null) ?? null;
    if (!match) return;
    setLoadingPhotos(Array.isArray(match.loadingPhotos) ? [...match.loadingPhotos] : []);
    setUnloadingPhotos(Array.isArray(match.unloadingPhotos) ? [...match.unloadingPhotos] : []);
    void syncDriverPhotos();
  }, [
    syncDriverPhotos,
    viewModel.match ? (viewModel.match as MatchWithWorkflowPayload).matchId : 0,
    viewModel.match ? (viewModel.match as MatchWithWorkflowPayload).updatedAt : "",
  ]);

  const routeSource = parseRouteSource(params.source);
  const parsedMatch = (viewModel.match as MatchWithWorkflowPayload | null) ?? null;
  const quoteWithPlan = (viewModel.quote as (QuoteDetailResponse & {
    loadPlan?: LoadPlanResponse;
    truckSpec?: TruckSpecReferenceResponse;
  }) | null) ?? null;
  const scope =
    routeSource === DRIVER_ORDER_SCOPE_LEGACY.OPEN
      ? DRIVER_ORDER_SCOPE_LEGACY.OPEN
      : routeSource === "run"
        ? "run"
        : routeSource === DRIVER_ORDER_SCOPE_LEGACY.ASSIGNED
          ? DRIVER_ORDER_SCOPE_LEGACY.ASSIGNED
          : "unknown";
  const uiState = getDriverUiStateFromStatusPayload({
    scope,
    accepted: parsedMatch?.accepted,
    matchStatus: parsedMatch?.status,
    quoteStatus: viewModel.quote?.status,
  });
  const cta = getDriverCta(uiState, true);
  const hasRunPendingCounterOffer = latestPendingOffer !== null;
  const isRunNegotiatingDetail =
    routeSource === "run" &&
    (
      uiState === DRIVER_UI_STATE.NEGOTIATING ||
      toStatusToken(parsedMatch?.status) === "NEGOTIATING" ||
      toStatusToken(viewModel.quote?.status) === "NEGOTIATING" ||
      hasRunPendingCounterOffer
    );
  const isQuoteMode =
    routeSource === DRIVER_ORDER_SCOPE_LEGACY.OPEN ||
    uiState === DRIVER_UI_STATE.READY_TO_ACCEPT ||
    uiState === DRIVER_UI_STATE.NEGOTIATING;
  const pageTitle = "오더 상세";
  const isRunNegotiationProbeLoading =
    routeSource === "run" && matchId > 0 && runNegotiationProbeMatchId !== matchId;
  const negotiatingQuoteId = toPositiveInt(viewModel.quote?.quoteId ?? parsedMatch?.quoteId ?? viewModel.quoteId);

  useEffect(() => {
    let cancelled = false;

    if (routeSource !== "run") {
      setLatestPendingOffer(null);
      setRunNegotiationProbeMatchId(matchId);
      return () => {
        cancelled = true;
      };
    }

    if (negotiatingQuoteId <= 0) {
      setLatestPendingOffer(null);
      setRunNegotiationProbeMatchId(matchId);
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        const offers = await listDriverCounterOffersByQuote(negotiatingQuoteId);
        if (cancelled) return;
        const pendingOffer = offers.find((offer) => isCounterOfferPending(offer.status)) ?? null;
        setLatestPendingOffer(pendingOffer);
        setRunNegotiationProbeMatchId(matchId);
      } catch {
        if (cancelled) return;
        setLatestPendingOffer(null);
        setRunNegotiationProbeMatchId(matchId);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [matchId, negotiatingQuoteId, routeSource, viewModel.quote?.updatedAt]);

  const directPlan: LoadPlanResponse | undefined = parsedMatch?.loadPlan ?? quoteWithPlan?.loadPlan;
  const directPlacements = useMemo(() => normalizePlacementList(directPlan?.placements), [directPlan?.placements]);
  const hasDirectPlacements = directPlacements.length > 0;

  useEffect(() => {
    let cancelled = false;

    if (hasDirectPlacements) {
      setPreviewPlan(null);
      setPreviewTruckSpec(null);
      return () => {
        cancelled = true;
      };
    }

    const safeQuoteId = toPositiveInt(viewModel.quote?.quoteId ?? parsedMatch?.quoteId ?? viewModel.quoteId);
    if (safeQuoteId <= 0) {
      setPreviewPlan(null);
      setPreviewTruckSpec(null);
      return () => {
        cancelled = true;
      };
    }

    const safeTruckId = toPositiveInt(viewModel.quote?.truckId);
    (async () => {
      try {
        const payload = await previewDriverLoadPlan({
          quoteIds: [safeQuoteId],
          ...(safeTruckId > 0 ? { truckId: safeTruckId } : {}),
        });
        if (cancelled) return;

        const resolved = resolveLoadPlanPreview(payload);
        setPreviewPlan(resolved.loadPlan);
        setPreviewTruckSpec(resolved.truckSpec);
      } catch {
        if (cancelled) return;
        setPreviewPlan(null);
        setPreviewTruckSpec(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    hasDirectPlacements,
    parsedMatch?.quoteId,
    viewModel.quote?.quoteId,
    viewModel.quote?.truckId,
    viewModel.quote?.updatedAt,
    viewModel.quoteId,
  ]);

  const inferredTruckSpec = useMemo(() => inferTruckSpecFromQuote(viewModel.quote), [viewModel.quote]);
  const syntheticPlan = useMemo(
    () => buildSyntheticLoadPlanFromQuote(viewModel.quote, inferredTruckSpec),
    [inferredTruckSpec, viewModel.quote]
  );
  const previewPlacements = useMemo(() => normalizePlacementList(previewPlan?.placements), [previewPlan?.placements]);
  const syntheticPlacements = useMemo(
    () => normalizePlacementList(syntheticPlan?.placements),
    [syntheticPlan?.placements]
  );

  const resolvedPlan = useMemo(() => {
    if (directPlacements.length > 0) {
      return { source: "match" as LoadPlanDataSource, placements: directPlacements };
    }
    if (previewPlacements.length > 0) {
      return { source: "preview" as LoadPlanDataSource, placements: previewPlacements };
    }
    if (syntheticPlacements.length > 0) {
      return { source: "quote_fallback" as LoadPlanDataSource, placements: syntheticPlacements };
    }
    return { source: "none" as LoadPlanDataSource, placements: [] as Placement[] };
  }, [directPlacements, previewPlacements, syntheticPlacements]);

  const placements: Placement[] = resolvedPlan.placements;
  const hasPlacementPayload = placements.length > 0;
  const orderedPlacements = useMemo(
    () =>
      [...placements].sort(
        (a, b) => (toPositiveInt(a.stopOrder) || 9999) - (toPositiveInt(b.stopOrder) || 9999)
      ),
    [placements]
  );
  const truckSpec: TruckSpecReferenceResponse | undefined =
    parsedMatch?.truckSpec ?? quoteWithPlan?.truckSpec ?? previewTruckSpec ?? inferredTruckSpec ?? undefined;
  const currentStep = resolveWorkflowStepIndex(uiState);

  const handleAcceptMatch = useCallback(() => {
    if (isBusy || isSubmittingOffer) return;
    Alert.alert("배차 수락", "이 배차를 수락하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "수락",
        onPress: async () => {
          setIsBusy(true);
          try {
            const result = await acceptDriverMatch(matchId);
            if (!result) {
              Alert.alert("배차 수락 실패", "잠시 후 다시 시도해 주세요.", [
                { text: "취소", style: "cancel" },
                { text: "다시 시도", onPress: handleAcceptMatch },
              ]);
              return;
            }

            const safeQuoteId = toPositiveInt(viewModel.quoteId ?? result.quoteId);
            publishDriverRunSyncEvent({
              type: DRIVER_RUN_SYNC_EVENT.MATCH_ACCEPTED,
              matchIds: [matchId],
              quoteIds: safeQuoteId > 0 ? [safeQuoteId] : [],
              source: "order_detail",
            });

            await viewModel.refetch();
            if (routeSource === DRIVER_ORDER_SCOPE_LEGACY.OPEN || isQuoteMode) {
              router.replace(DRIVER_ROUTE_PATH.RUN_TAB);
              return;
            }
          } catch (error) {
            const code = getApiErrorCode(error);
            if (code === API_ERROR_CODE.CONFLICT) {
              Alert.alert("배차 수락 실패", "이미 다른 기사에게 배차된 오더입니다.");
              return;
            }
            const message = readApiErrorMessage(error, "잠시 후 다시 시도해 주세요.");
            Alert.alert("배차 수락 실패", message, [
              { text: "취소", style: "cancel" },
              { text: "다시 시도", onPress: handleAcceptMatch },
            ]);
          } finally {
            setIsBusy(false);
          }
        },
      },
    ]);
  }, [isBusy, isQuoteMode, isSubmittingOffer, matchId, routeSource, router, viewModel.quoteId, viewModel.refetch]);

  const handleNegotiate = useCallback(() => {
    setOfferErrorMessage(null);
    setIsOfferModalOpen(true);
  }, []);

  const handleOfferSubmit = useCallback(
    async (payload: CounterOfferSubmitPayload) => {
      if (isSubmittingOffer) return;
      setIsSubmittingOffer(true);
      setOfferErrorMessage(null);
      try {
        const safeQuoteId = toPositiveInt(viewModel.quoteId);
        const result = await postCounterOffer(
          matchId,
          { proposedPrice: payload.amount, message: payload.message },
          safeQuoteId > 0 ? safeQuoteId : undefined
        );
        if (!result) {
          setOfferErrorMessage("운임 제안에 실패했습니다. 잠시 후 다시 시도해 주세요.");
          return;
        }
        publishDriverRunSyncEvent({
          type: DRIVER_RUN_SYNC_EVENT.COUNTER_OFFER_SUBMITTED,
          matchIds: [matchId],
          quoteIds: safeQuoteId > 0 ? [safeQuoteId] : [],
          source: "order_detail",
        });
        setLatestPendingOffer(result);
        setIsOfferModalOpen(false);
        await viewModel.refetch();
      } catch (error) {
        setOfferErrorMessage(readApiErrorMessage(error, "운임 제안에 실패했습니다. 잠시 후 다시 시도해 주세요."));
      } finally {
        setIsSubmittingOffer(false);
      }
    },
    [isSubmittingOffer, matchId, viewModel.quoteId, viewModel.refetch]
  );

  const handleStartDriving = useCallback(() => {
    Alert.alert("운행 시작", "운행을 시작하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "운행 시작",
        onPress: () => {
          void runAndRefetch(() => {
            startDriving(matchId);
          });
        },
      },
    ]);
  }, [matchId, runAndRefetch]);

  const handleConfirmLoading = useCallback(() => {
    if (loadingPhotos.length <= 0) {
      Alert.alert("사진 필요", "상차 사진을 최소 1장 추가해 주세요.");
      return;
    }
    Alert.alert("상차 완료", "상차 완료 처리 후 운송 중으로 전환합니다.", [
      { text: "취소", style: "cancel" },
      {
        text: "완료",
        onPress: () => {
          const payload = [...loadingPhotos];
          void runAndRefetch(() => {
            confirmLoading(matchId, payload);
          });
        },
      },
    ]);
  }, [loadingPhotos, matchId, runAndRefetch]);

  const handleConfirmUnloading = useCallback(() => {
    if (unloadingPhotos.length <= 0) {
      Alert.alert("사진 필요", "하차 사진을 최소 1장 추가해 주세요.");
      return;
    }
    Alert.alert("하차 완료", "하차 완료 처리 후 오더를 종료합니다.", [
      { text: "취소", style: "cancel" },
      {
        text: "완료",
        onPress: () => {
          const payload = [...unloadingPhotos];
          void runAndRefetch(() => {
            confirmUnloading(matchId, payload);
          });
        },
      },
    ]);
  }, [matchId, runAndRefetch, unloadingPhotos]);

  const handleOpenSettlement = useCallback(() => {
    if (matchId <= 0 || isNavigatingSettlement) return;
    setIsNavigatingSettlement(true);
    router.push({
      pathname: "/(driver)/settlement/[matchId]",
      params: { matchId: String(matchId) },
    });
    setTimeout(() => {
      setIsNavigatingSettlement(false);
    }, 600);
  }, [isNavigatingSettlement, matchId, router]);

  return (
    <DriverOrderDetailView
      pageTitle={pageTitle}
      matchId={matchId}
      isInvalidMatchId={matchId <= 0}
      isLoading={viewModel.isLoading || (!viewModel.match && !viewModel.errorMessage)}
      errorMessage={viewModel.errorMessage}
      isRunNegotiationProbeLoading={isRunNegotiationProbeLoading}
      match={parsedMatch}
      quote={viewModel.quote}
      uiState={uiState}
      ctaId={cta.id}
      isQuoteMode={isQuoteMode}
      isRunNegotiatingDetail={isRunNegotiatingDetail}
      currentStep={currentStep}
      orderedPlacements={orderedPlacements}
      hasPlacementPayload={hasPlacementPayload}
      truckSpec={truckSpec}
      loadPlanSource={resolvedPlan.source}
      loadingPhotos={loadingPhotos}
      unloadingPhotos={unloadingPhotos}
      isBusy={isBusy}
      isUploadingPhoto={isUploadingPhoto}
      isOfferModalOpen={isOfferModalOpen}
      isSubmittingOffer={isSubmittingOffer}
      offerErrorMessage={offerErrorMessage}
      latestPendingOffer={latestPendingOffer}
      isNavigatingSettlement={isNavigatingSettlement}
      onBack={() => router.back()}
      onRefresh={() => void viewModel.refetch()}
      onRetryFetch={() => void viewModel.refetch()}
      onAcceptMatch={handleAcceptMatch}
      onNegotiate={handleNegotiate}
      onOfferModalClose={() => {
        if (isSubmittingOffer) return;
        setIsOfferModalOpen(false);
        setOfferErrorMessage(null);
      }}
      onOfferSubmit={handleOfferSubmit}
      onStartDriving={handleStartDriving}
      onConfirmLoading={handleConfirmLoading}
      onConfirmUnloading={handleConfirmUnloading}
      onOpenSettlement={handleOpenSettlement}
      onAddPickupPhoto={() => {
        void handleAddPhoto("PICKUP", setLoadingPhotos);
      }}
      onAddDeliveryPhoto={() => {
        void handleAddPhoto("DELIVERY", setUnloadingPhotos);
      }}
    />
  );
}
