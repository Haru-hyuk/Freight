import { Ionicons } from "@expo/vector-icons";
import { Canvas } from "@react-three/fiber/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as THREE from "three";

import type { QuoteDetailResponse } from "@/entities/quote/model/quote.types";
import {
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

// ── Spatial Awareness v2 상수 ─────────────────────────────────────────────────
/** true: 도어가 z=0 쪽, 캡이 z=truckL 쪽 / false: 반전 */
const DOOR_AT_Z0  = true;
/** 패널·화살표를 컨테이너 경계에서 안쪽으로 띄우는 여유(world unit) */
const EPS_INSIDE  = 0.006;
/** 방향 패널이 EPS_INSIDE 기준 안쪽으로 추가 오프셋(항상 < EPS_INSIDE) */
const PANEL_EPS   = 0.003;

// ── 5×7 픽셀 폰트 (row-major, 1=white, 0=transparent) — 0~9 전체 정의 ─────
const GW = 5, GH = 7, GGAP = 1;
const PIXEL_FONT: Record<string, number[]> = {
  "0": [0,1,1,1,0, 1,0,0,0,1, 1,0,0,1,1, 1,0,1,0,1, 1,1,0,0,1, 1,0,0,0,1, 0,1,1,1,0],
  "1": [0,0,1,0,0, 0,1,1,0,0, 0,0,1,0,0, 0,0,1,0,0, 0,0,1,0,0, 0,0,1,0,0, 0,1,1,1,0],
  "2": [0,1,1,1,0, 1,0,0,0,1, 0,0,0,0,1, 0,0,0,1,0, 0,0,1,0,0, 0,1,0,0,0, 1,1,1,1,1],
  "3": [1,1,1,1,0, 0,0,0,0,1, 0,0,0,0,1, 0,1,1,1,0, 0,0,0,0,1, 0,0,0,0,1, 1,1,1,1,0],
  "4": [0,0,0,1,0, 0,0,1,1,0, 0,1,0,1,0, 1,0,0,1,0, 1,1,1,1,1, 0,0,0,1,0, 0,0,0,1,0],
  "5": [1,1,1,1,1, 1,0,0,0,0, 1,1,1,1,0, 0,0,0,0,1, 0,0,0,0,1, 1,0,0,0,1, 0,1,1,1,0],
  "6": [0,1,1,1,0, 1,0,0,0,0, 1,0,0,0,0, 1,1,1,1,0, 1,0,0,0,1, 1,0,0,0,1, 0,1,1,1,0],
  "7": [1,1,1,1,1, 0,0,0,0,1, 0,0,0,1,0, 0,0,1,0,0, 0,1,0,0,0, 0,1,0,0,0, 0,1,0,0,0],
  "8": [0,1,1,1,0, 1,0,0,0,1, 1,0,0,0,1, 0,1,1,1,0, 1,0,0,0,1, 1,0,0,0,1, 0,1,1,1,0],
  "9": [0,1,1,1,0, 1,0,0,0,1, 1,0,0,0,1, 0,1,1,1,1, 0,0,0,0,1, 1,0,0,0,1, 0,1,1,1,0],
};

/** SDF 라운드렉트 판별 (badge 배경 렌더링용) */
function insideRR(px: number, py: number, x0: number, y0: number, x1: number, y1: number, r: number): boolean {
  const cx = Math.max(x0 + r, Math.min(x1 - r, px));
  const cy = Math.max(y0 + r, Math.min(y1 - r, py));
  return (px - cx) ** 2 + (py - cy) ** 2 <= r * r;
}

/**
 * 문자열(숫자)을 DataTexture에 렌더링한다. DOM canvas 불필요.
 * - 최대 4자리까지: ≤3자 → 32×32, 4자 → 64×32
 * - 라운드렉트 badge 배경 + 흰색 픽셀 폰트, 중앙 정렬
 * - texW/texH 반환으로 Sprite에서 aspect 보정 가능
 */
function renderTextToDataTexture(
  text: string,
  bgR: number,
  bgG: number,
  bgB: number,
): { texture: THREE.DataTexture; texW: number; texH: number } {
  const chars = text.split("").filter((c) => PIXEL_FONT[c] != null);
  const n = Math.max(1, chars.length);
  const textPxW = n * GW + (n - 1) * GGAP;
  // 3px 여백 포함 폭이 26px 이하면 32, 초과면 64
  const texW = textPxW + 6 <= 26 ? 32 : 64;
  const texH = 32;
  const data = new Uint8Array(texW * texH * 4);

  // badge: 2px margin from edges, r=5 corner
  const bx0 = 2, by0 = 2, bx1 = texW - 2, by1 = texH - 2, br = 5;
  for (let py = 0; py < texH; py++) {
    for (let px = 0; px < texW; px++) {
      const i = (py * texW + px) * 4;
      if (insideRR(px, py, bx0, by0, bx1, by1, br)) {
        data[i] = bgR; data[i + 1] = bgG; data[i + 2] = bgB; data[i + 3] = 215;
      } else {
        data[i + 3] = 0;
      }
    }
  }

  // 글리프: badge 내 중앙 배치
  const badgeW = bx1 - bx0;
  const badgeH = by1 - by0;
  const startX = bx0 + Math.floor((badgeW - textPxW) / 2);
  const startY = by0 + Math.floor((badgeH - GH) / 2);

  chars.forEach((ch, ci) => {
    const glyph = PIXEL_FONT[ch]!;
    const charX = startX + ci * (GW + GGAP);
    for (let row = 0; row < GH; row++) {
      for (let col = 0; col < GW; col++) {
        if (glyph[row * GW + col]) {
          const px = charX + col, py = startY + row;
          if (px >= 0 && px < texW && py >= 0 && py < texH) {
            const i = (py * texW + px) * 4;
            data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; data[i + 3] = 255;
          }
        }
      }
    }
  });

  const texture = new THREE.DataTexture(data, texW, texH, THREE.RGBAFormat);
  texture.flipY = true;
  texture.generateMipmaps = false;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  return { texture, texW, texH };
}

type LabelSpriteProps = { text: string; color: string; boxW: number; boxH: number; boxL: number };

/**
 * 박스 중앙 레이블 스프라이트 (항상 카메라를 향함).
 * - 박스 최소 치수에 비례한 scale (0.14~0.55 world unit)
 * - texW:texH 비율로 sprite x-scale 보정 → 비율 왜곡 없음
 */
const LabelSprite = React.memo(({ text, color, boxW, boxH, boxL }: LabelSpriteProps) => {
  const result = useMemo(() => {
    const hex = color.replace(/^#/, "");
    const r = parseInt(hex.slice(0, 2), 16) || 80;
    const g = parseInt(hex.slice(2, 4), 16) || 80;
    const b = parseInt(hex.slice(4, 6), 16) || 200;
    return renderTextToDataTexture(text, r, g, b);
  }, [text, color]);

  useEffect(() => () => { result.texture.dispose(); }, [result.texture]);

  const minDim = Math.min(boxW, boxH, boxL) * SCALE;
  const s = Math.min(0.55, Math.max(0.14, minDim * 0.40));
  const aspect = result.texW / result.texH; // 1.0 또는 2.0

  return (
    <sprite renderOrder={30} scale={[s * aspect, s, s]}>
      <spriteMaterial map={result.texture} transparent depthTest={false} depthWrite={false} toneMapped={false} />
    </sprite>
  );
});

// ── 접촉 그림자 텍스처 (싱글턴) ───────────────────────────────────────────────
let _shadowDiscTex: THREE.DataTexture | null = null;
function getShadowDiscTexture(): THREE.DataTexture {
  if (!_shadowDiscTex) {
    const S = 64; const C = 31.5;
    const data = new Uint8Array(S * S * 4);
    for (let py = 0; py < S; py++) {
      for (let px = 0; px < S; px++) {
        const nx = (px - C) / C, ny = (py - C) / C;
        const dist = Math.sqrt(nx * nx + ny * ny);
        const t = Math.max(0, 1 - dist);
        data[(py * S + px) * 4 + 3] = Math.round(Math.pow(t, 1.8) * 210);
      }
    }
    _shadowDiscTex = new THREE.DataTexture(data, S, S, THREE.RGBAFormat);
    _shadowDiscTex.needsUpdate = true;
  }
  return _shadowDiscTex;
}

type ShadowDiscProps = { boxWW: number; boxLW: number; boxHW: number };
const ShadowDisc = React.memo(({ boxWW, boxLW, boxHW }: ShadowDiscProps) => {
  const tex = useMemo(() => getShadowDiscTexture(), []);
  return (
    <mesh position={[0, -boxHW / 2 + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[boxWW * 0.90, boxLW * 0.90, 1]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} />
    </mesh>
  );
});

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

type CargoMeshProps = {
  placement: Placement;
  color: string;
  stopOrder: number;
  isSelected: boolean;
  isXray: boolean;
  onSelect: () => void;
};

const CargoMesh = ({ placement, color, stopOrder, isSelected, isXray, onSelect }: CargoMeshProps) => {
  const x = toFiniteNumber(placement.x, 0);
  const y = toFiniteNumber(placement.y, 0);
  const z = toFiniteNumber(placement.z, 0);
  const w = Math.max(20, toFiniteNumber(placement.width, 80));
  const h = Math.max(20, toFiniteNumber(placement.height, 80));
  const l = Math.max(20, toFiniteNumber(placement.length, 80));
  const center: [number, number, number] = [(x + w / 2) * SCALE, (y + h / 2) * SCALE, (z + l / 2) * SCALE];
  const boxArgs: [number, number, number] = [w * SCALE, h * SCALE, l * SCALE];

  return (
    <group position={center} onClick={onSelect}>
      <mesh renderOrder={10}>
        <boxGeometry args={boxArgs} />
        <meshStandardMaterial
          color={color}
          transparent={isXray}
          opacity={isXray ? 0.45 : 1}
          depthWrite={!isXray}
          alphaTest={isXray ? 0.02 : 0}
          emissive={isSelected ? color : "#000000"}
          emissiveIntensity={isSelected ? 0.40 : 0}
        />
      </mesh>
      {isSelected && (
        <mesh renderOrder={20} scale={[1.07, 1.07, 1.07]}>
          <boxGeometry args={boxArgs} />
          <meshBasicMaterial color="#FFFFFF" wireframe transparent opacity={0.55} depthWrite={false} />
        </mesh>
      )}
      <lineSegments renderOrder={20}>
        <edgesGeometry args={[new THREE.BoxGeometry(...boxArgs)]} />
        <lineBasicMaterial color={isSelected ? "#FFFFFF" : "#1E293B"} />
      </lineSegments>
      <LabelSprite text={String(stopOrder)} color={color} boxW={w} boxH={h} boxL={l} />
      {/* 래디얼 그라디언트 접촉 그림자 — 바닥에 닿은 박스(y ≤ 1 cm)만 표시 */}
      {y <= 1 && <ShadowDisc boxWW={w * SCALE} boxLW={l * SCALE} boxHW={h * SCALE} />}
    </group>
  );
};

// ─────────────────────────────────────────────────────────────
// TruckSceneBase — 데크·레일·경계·도어프레임·방향마커·격자
// ─────────────────────────────────────────────────────────────
type TruckSceneBaseProps = { truckW: number; truckL: number; truckH: number; truckWCm: number; truckLCm: number };
const TruckSceneBase = React.memo(({ truckW, truckL, truckH, truckWCm, truckLCm }: TruckSceneBaseProps) => {
  const intDirDoor: 1 | -1 = DOOR_AT_Z0 ? 1 : -1;
  const intDirCab:  1 | -1 = DOOR_AT_Z0 ? -1 : 1;
  const doorEps    = DOOR_AT_Z0 ? EPS_INSIDE : truckL - EPS_INSIDE;
  const cabEps     = DOOR_AT_Z0 ? truckL - EPS_INSIDE : EPS_INSIDE;
  const doorPanelZ = doorEps + intDirDoor * PANEL_EPS;
  const cabPanelZ  = cabEps  + intDirCab  * PANEL_EPS;
  // 화살표: 도어는 바깥 방향, 캡은 안쪽 방향
  const doorArrowDirZ = -intDirDoor;
  const cabArrowDirZ  =  intDirCab;
  const doorRotX = doorArrowDirZ > 0 ?  Math.PI / 2 : -Math.PI / 2;
  const cabRotX  = cabArrowDirZ  > 0 ?  Math.PI / 2 : -Math.PI / 2;

  const arrowSize = Math.min(0.28, Math.max(0.10, Math.min(truckW, truckL) * 0.06));
  const markerW   = Math.min(0.70, Math.max(0.25, truckW * 0.18));
  const markerH   = Math.min(0.35, Math.max(0.12, truckH * 0.12));
  const railH  = 8  * SCALE;
  const railD  = 3  * SCALE;
  const bar    = 3  * SCALE;
  const bdrH   = 0.006;
  const bdrD   = 3  * SCALE;
  const arrowY = railH + arrowSize * 0.6;

  const gridGeo = useMemo(() => {
    const spacingCm = truckWCm >= 200 && truckLCm >= 400 ? 100 : 50;
    const step   = spacingCm * SCALE;
    const stepsX = Math.floor(truckWCm / spacingCm);
    const stepsZ = Math.floor(truckLCm / spacingCm);
    const verts: number[] = [];
    const Y = 0.0015;
    for (let i = 1; i < stepsZ; i++) { const z = i * step; verts.push(0, Y, z, truckW, Y, z); }
    for (let i = 1; i < stepsX; i++) { const x = i * step; verts.push(x, Y, 0, x, Y, truckL); }
    const geo = new THREE.BufferGeometry();
    if (verts.length > 0) geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    return geo;
  }, [truckW, truckL, truckWCm, truckLCm]);
  useEffect(() => () => { gridGeo.dispose(); }, [gridGeo]);

  return (
    <>
      {/* 바닥 데크 */}
      <mesh renderOrder={1} position={[truckW / 2, 0, truckL / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[truckW, truckL]} />
        <meshStandardMaterial color="#CBD5E0" transparent opacity={0.90} depthWrite={false} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
      </mesh>
      {/* 좌우 사이드 레일 */}
      <mesh position={[railD / 2, railH / 2, truckL / 2]}>
        <boxGeometry args={[railD, railH, truckL]} />
        <meshStandardMaterial color="#94A3B8" />
      </mesh>
      <mesh position={[truckW - railD / 2, railH / 2, truckL / 2]}>
        <boxGeometry args={[railD, railH, truckL]} />
        <meshStandardMaterial color="#94A3B8" />
      </mesh>
      {/* 데크 경계 스트립 (앞·뒤·좌·우) */}
      <mesh renderOrder={2} position={[truckW / 2, bdrH / 2, bdrD / 2]}>
        <boxGeometry args={[truckW, bdrH, bdrD]} />
        <meshBasicMaterial color="#64748B" transparent opacity={0.6} depthWrite={false} />
      </mesh>
      <mesh renderOrder={2} position={[truckW / 2, bdrH / 2, truckL - bdrD / 2]}>
        <boxGeometry args={[truckW, bdrH, bdrD]} />
        <meshBasicMaterial color="#64748B" transparent opacity={0.6} depthWrite={false} />
      </mesh>
      <mesh renderOrder={2} position={[bdrD / 2, bdrH / 2, truckL / 2]}>
        <boxGeometry args={[bdrD, bdrH, truckL]} />
        <meshBasicMaterial color="#64748B" transparent opacity={0.6} depthWrite={false} />
      </mesh>
      <mesh renderOrder={2} position={[truckW - bdrD / 2, bdrH / 2, truckL / 2]}>
        <boxGeometry args={[bdrD, bdrH, truckL]} />
        <meshBasicMaterial color="#64748B" transparent opacity={0.6} depthWrite={false} />
      </mesh>
      {/* 도어 프레임 (황색) */}
      <mesh position={[truckW / 2, truckH - bar / 2, doorEps]}><boxGeometry args={[truckW, bar, bar]} /><meshBasicMaterial color="#F59E0B" /></mesh>
      <mesh position={[truckW / 2, bar / 2, doorEps]}><boxGeometry args={[truckW, bar, bar]} /><meshBasicMaterial color="#F59E0B" /></mesh>
      <mesh position={[bar / 2, truckH / 2, doorEps]}><boxGeometry args={[bar, truckH, bar]} /><meshBasicMaterial color="#F59E0B" /></mesh>
      <mesh position={[truckW - bar / 2, truckH / 2, doorEps]}><boxGeometry args={[bar, truckH, bar]} /><meshBasicMaterial color="#F59E0B" /></mesh>
      {/* 도어 방향 마커 — 황색 화살표 + 반투명 패널 */}
      <mesh position={[truckW / 2, arrowY, doorEps]} rotation={[doorRotX, 0, 0]}>
        <coneGeometry args={[arrowSize * 0.55, arrowSize, 6]} />
        <meshBasicMaterial color="#F59E0B" />
      </mesh>
      <mesh renderOrder={3} position={[truckW / 2, arrowY, doorPanelZ]}>
        <planeGeometry args={[markerW, markerH]} />
        <meshBasicMaterial color="#0F172A" transparent opacity={0.50} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {/* 캡 방향 마커 — 녹색 화살표 + 반투명 패널 */}
      <mesh position={[truckW / 2, arrowY, cabEps]} rotation={[cabRotX, 0, 0]}>
        <coneGeometry args={[arrowSize * 0.55, arrowSize, 6]} />
        <meshBasicMaterial color="#22C55E" />
      </mesh>
      <mesh renderOrder={3} position={[truckW / 2, arrowY, cabPanelZ]}>
        <planeGeometry args={[markerW, markerH]} />
        <meshBasicMaterial color="#0F172A" transparent opacity={0.50} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {/* 내부 격자선 */}
      {gridGeo.getAttribute("position") != null && (
        <lineSegments geometry={gridGeo}>
          <lineBasicMaterial color="#94A3B8" transparent opacity={0.45} />
        </lineSegments>
      )}
    </>
  );
});

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
    loadHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing * 2,
    },
    xrayToggle: {
      borderRadius: 999,
      paddingHorizontal: spacing * 2,
      paddingVertical: spacing,
      borderWidth: 1,
      borderColor: cBorder,
      backgroundColor: tint(cBorder, 0.24, theme.colors.bgSurfaceAlt),
    },
    xrayToggleText: {
      color: theme.colors.textMain,
    },
    canvasWrap: {
      height: 300,
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: theme.colors.bgSurfaceAlt,
      borderWidth: 1,
      borderColor: cBorder,
    },
    selectedPanel: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: tint(cBorder, 0.8, cBorder),
      backgroundColor: theme.colors.bgSurface,
      paddingHorizontal: spacing * 3,
      paddingVertical: spacing * 2.5,
      gap: spacing * 1.5,
    },
    selectedPanelHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing * 1.5,
    },
    selectedPanelBadge: {
      minWidth: 24,
      height: 24,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing,
    },
    selectedRouteWrap: {
      gap: spacing,
    },
    selectedMetaRow: {
      flexDirection: "row",
      gap: spacing * 1.5,
    },
    selectedMetaCell: {
      flex: 1,
      borderRadius: 10,
      backgroundColor: tint(cBorder, 0.38, theme.colors.bgSurfaceAlt),
      paddingHorizontal: spacing * 1.5,
      paddingVertical: spacing * 1.2,
      alignItems: "center",
      gap: spacing * 0.5,
    },
    selectedItemsWrap: {
      borderRadius: 10,
      backgroundColor: tint(cBorder, 0.22, theme.colors.bgSurfaceAlt),
      paddingHorizontal: spacing * 2,
      paddingVertical: spacing * 1.5,
      gap: spacing,
    },
    selectedItemRow: {
      borderRadius: 8,
      backgroundColor: theme.colors.bgSurface,
      paddingHorizontal: spacing * 1.5,
      paddingVertical: spacing,
      gap: spacing * 0.5,
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
  const [selectedStopOrder, setSelectedStopOrder] = useState<number | null>(null);
  const [isXray, setIsXray] = useState(true);

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
  // Grounding: /api/driver/matches/accept-batch uses BatchAcceptMatchRequest.matchIds:number[].
  // groupedMatchIds is the request source and is explicitly de-duplicated + filtered (>0) here.
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
  const cameraDir = useMemo(() => new THREE.Vector3(1, 0.75, 1).normalize(), []);
  const renderPlacements = useMemo(() => {
    if (!isXray) return orderedPlacements;
    return [...orderedPlacements].sort((a, b) => {
      const ax = (toFiniteNumber(a.x, 0) + Math.max(20, toFiniteNumber(a.width, 80)) / 2) * SCALE;
      const ay = (toFiniteNumber(a.y, 0) + Math.max(20, toFiniteNumber(a.height, 80)) / 2) * SCALE;
      const az = (toFiniteNumber(a.z, 0) + Math.max(20, toFiniteNumber(a.length, 80)) / 2) * SCALE;
      const bx = (toFiniteNumber(b.x, 0) + Math.max(20, toFiniteNumber(b.width, 80)) / 2) * SCALE;
      const by = (toFiniteNumber(b.y, 0) + Math.max(20, toFiniteNumber(b.height, 80)) / 2) * SCALE;
      const bz = (toFiniteNumber(b.z, 0) + Math.max(20, toFiniteNumber(b.length, 80)) / 2) * SCALE;
      const aKey = ax * cameraDir.x + ay * cameraDir.y + az * cameraDir.z;
      const bKey = bx * cameraDir.x + by * cameraDir.y + bz * cameraDir.z;
      return aKey - bKey;
    });
  }, [cameraDir, isXray, orderedPlacements]);
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
  const selectedEntry = selectedStopOrder ? quoteCards[selectedStopOrder - 1] ?? null : null;

  const handleAccept = useCallback(() => {
    if (isBusy || isSubmittingOffer) return;
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
              .map((item) => toPositiveInt(item.matchId))
              .filter((matchId) => matchId > 0)
          )
        );
        const successCount = successMatchIds.length;
        const failureCount = Math.max(0, groupedMatchIds.length - successCount);

        if (successCount <= 0) {
          Alert.alert("배차 수락 실패", "배차 수락에 실패했습니다.", [
            { text: "취소", style: "cancel" },
            { text: "다시 시도", onPress: () => void runAcceptBatch() },
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
          { text: "다시 시도", onPress: () => void runAcceptBatch() },
        ]);
      } finally {
        setIsBusy(false);
      }
    };

    Alert.alert("배차 수락", `총 ${groupedMatchIds.length}건 배차를 수락합니다.`, [
      { text: "취소", style: "cancel", onPress: () => setIsBusy(false) },
      { text: "수락", onPress: () => void runAcceptBatch() },
    ]);
  }, [groupedMatchIds, isBusy, isGroupedRecommendation, isSubmittingOffer, router, selection]);

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
        loading={isSubmittingOffer}
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
        disabled={groupedMatchIds.length <= 0 || isBusy || isSubmittingOffer}
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

          <AppCard style={styles.loadCard}>
            <View style={styles.loadHeader}>
              <AppText variant="heading" weight="900" color="textMain">
                3D 적재 시뮬레이션
              </AppText>
              <Pressable style={styles.xrayToggle} onPress={() => setIsXray((prev) => !prev)}>
                <AppText variant="caption" weight="800" style={styles.xrayToggleText}>
                  {`X-ray ${isXray ? "ON" : "OFF"}`}
                </AppText>
              </Pressable>
            </View>
            <AppText variant="caption" color="textMuted">
              적재함 {dims.widthCm} × {dims.lengthCm} × {dims.heightCm} cm 기준 · {isGroupedRecommendation ? "다건 순서 적재" : "단건 적재"}
            </AppText>
            <View style={styles.canvasWrap}>
              {(() => {
                const sW = dims.widthCm * SCALE;
                const sH = dims.heightCm * SCALE;
                const sL = dims.lengthCm * SCALE;
                return (
                  <Canvas
                    camera={{ position: [5, 4, 5], fov: 50 }}
                    onCreated={({ camera }) => {
                      // 트럭 컨테이너 + 전체 cargo를 포함하는 Box3 계산
                      const box = new THREE.Box3();
                      box.expandByPoint(new THREE.Vector3(0, 0, 0));
                      box.expandByPoint(new THREE.Vector3(sW, sH, sL));
                      orderedPlacements.forEach((p) => {
                        const px = toFiniteNumber(p.x, 0) * SCALE;
                        const py = toFiniteNumber(p.y, 0) * SCALE;
                        const pz = toFiniteNumber(p.z, 0) * SCALE;
                        const pw = Math.max(20, toFiniteNumber(p.width, 80)) * SCALE;
                        const ph = Math.max(20, toFiniteNumber(p.height, 80)) * SCALE;
                        const pl = Math.max(20, toFiniteNumber(p.length, 80)) * SCALE;
                        box.expandByPoint(new THREE.Vector3(px, py, pz));
                        box.expandByPoint(new THREE.Vector3(px + pw, py + ph, pz + pl));
                      });
                      const center = new THREE.Vector3();
                      box.getCenter(center);
                      const sphere = new THREE.Sphere();
                      box.getBoundingSphere(sphere);
                      const fovRad = (50 * Math.PI) / 180;
                      const dist = (sphere.radius / Math.sin(fovRad / 2)) * 1.3;
                      camera.position.copy(center).addScaledVector(cameraDir, dist);
                      camera.lookAt(center);
                      camera.updateProjectionMatrix();
                    }}
                  >
                    <ambientLight intensity={0.85} />
                    <directionalLight position={[5, 8, 5]} intensity={1.0} />
                    <Suspense fallback={null}>
                      {/* 트럭 적재함 베이스 (데크·레일·마커·격자) */}
                      <TruckSceneBase truckW={sW} truckL={sL} truckH={sH} truckWCm={dims.widthCm} truckLCm={dims.lengthCm} />
                      <mesh renderOrder={5} position={[sW / 2, sH / 2, sL / 2]}>
                        <boxGeometry args={[sW, sH, sL]} />
                        <meshStandardMaterial color="#E2E8F0" transparent opacity={0.07} depthWrite={false} />
                      </mesh>
                      {renderPlacements.map((placement) => {
                        const so = toPositiveInt(placement.stopOrder) || 1;
                        return (
                          <CargoMesh
                            key={placement.id ?? `cargo-${so}`}
                            placement={placement}
                            color={stopColorMap.get(so) ?? PALETTE[(so - 1) % PALETTE.length]}
                            stopOrder={so}
                            isSelected={selectedStopOrder === so}
                            isXray={isXray}
                            onSelect={() => setSelectedStopOrder((prev) => (prev === so ? null : so))}
                          />
                        );
                      })}
                    </Suspense>
                  </Canvas>
                );
              })()}
              {orderedPlacements.length <= 0 ? (
                <View style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" }}>
                  <ActivityIndicator color={theme.colors.brandPrimary} />
                </View>
              ) : null}
            </View>
            {selectedEntry ? (
              (() => {
                const stopOrder = selectedStopOrder ?? 1;
                const accentColor = stopColorMap.get(stopOrder) ?? PALETTE[(stopOrder - 1) % PALETTE.length];
                const originAddress = selectedEntry.order?.originAddress || selectedEntry.quote?.originAddress || "-";
                const destinationAddress = selectedEntry.order?.destinationAddress || selectedEntry.quote?.destinationAddress || "-";
                const distanceText =
                  selectedEntry.order?.routeDistanceText ||
                  (toPositiveNumber(selectedEntry.quote?.distanceKm, 0) > 0
                    ? `${toOneDecimalText(selectedEntry.quote?.distanceKm)}km`
                    : "-");
                const weightText =
                  toPositiveNumber(selectedEntry.order?.weightKg ?? selectedEntry.quote?.weightKg, 0) > 0
                    ? `${toOneDecimalText(selectedEntry.order?.weightKg ?? selectedEntry.quote?.weightKg)}kg`
                    : "-";
                const cbmText =
                  toPositiveNumber(selectedEntry.order?.volumeCbm ?? selectedEntry.quote?.volumeCbm, 0) > 0
                    ? toOneDecimalText(selectedEntry.order?.volumeCbm ?? selectedEntry.quote?.volumeCbm)
                    : "-";
                const quoteItems = Array.isArray(selectedEntry.quote?.quoteItems) ? selectedEntry.quote.quoteItems : [];
                const cargoFallback = selectedEntry.order?.cargoText || selectedEntry.quote?.cargoName || "-";

                return (
                  <View style={styles.selectedPanel}>
                    <View style={styles.selectedPanelHeader}>
                      <View style={[styles.selectedPanelBadge, { backgroundColor: accentColor }]}>
                        <AppText variant="caption" weight="900" color="#FFFFFF">
                          {stopOrder}
                        </AppText>
                      </View>
                      <AppText variant="detail" weight="900" color="textMain">
                        선택된 추천 오더
                      </AppText>
                    </View>

                    <View style={styles.selectedRouteWrap}>
                      <AppText variant="caption" color="textSub">
                        출발: {originAddress}
                      </AppText>
                      <AppText variant="caption" color="textSub">
                        도착: {destinationAddress}
                      </AppText>
                    </View>

                    <View style={styles.selectedMetaRow}>
                      <View style={styles.selectedMetaCell}>
                        <AppText variant="caption" color="textMuted">거리</AppText>
                        <AppText variant="detail" weight="900" color="brandPrimary">{distanceText}</AppText>
                      </View>
                      <View style={styles.selectedMetaCell}>
                        <AppText variant="caption" color="textMuted">중량</AppText>
                        <AppText variant="detail" weight="900" color="textMain">{weightText}</AppText>
                      </View>
                      <View style={styles.selectedMetaCell}>
                        <AppText variant="caption" color="textMuted">CBM</AppText>
                        <AppText variant="detail" weight="900" color="textMain">{cbmText}</AppText>
                      </View>
                    </View>

                    <View style={styles.selectedItemsWrap}>
                      <AppText variant="caption" weight="800" color="textMuted">
                        화물 품목
                      </AppText>
                      {quoteItems.length > 0 ? (
                        quoteItems.map((item, itemIndex) => (
                          <View key={`${item.quoteItemId}-${itemIndex}`} style={styles.selectedItemRow}>
                            <AppText variant="caption" weight="800" color="textMain">
                              {item.itemName || `화물 ${itemIndex + 1}`} · {Math.max(1, toPositiveInt(item.quantity) || 1)}개
                            </AppText>
                            <AppText variant="caption" color="textSub">
                              {toPositiveNumber(item.widthCm, 0)}×{toPositiveNumber(item.lengthCm, 0)}×{toPositiveNumber(item.heightCm, 0)}cm · {toOneDecimalText(item.unitWeightKg)}kg
                            </AppText>
                          </View>
                        ))
                      ) : (
                        <View style={styles.selectedItemRow}>
                          <AppText variant="caption" color="textSub">
                            {cargoFallback}
                          </AppText>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })()
            ) : null}
          </AppCard>

          <AppCard style={styles.quotesCard}>
            <AppText variant="heading" weight="900" color="textMain">
              추천 오더
            </AppText>
            {quoteCards.map((entry, index) => {
              const stopOrder = index + 1;
              const accentColor = stopColorMap.get(stopOrder) ?? PALETTE[(stopOrder - 1) % PALETTE.length];
              const isCardSelected = selectedStopOrder === stopOrder;
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
                <Pressable
                  key={`quote-${entry.quoteId}`}
                  onPress={() => setSelectedStopOrder((prev) => (prev === stopOrder ? null : stopOrder))}
                  style={[
                    styles.quoteRow,
                    isCardSelected
                      ? {
                          borderColor: accentColor,
                          borderWidth: 2,
                          backgroundColor: tint(accentColor, 0.08, theme.colors.bgSurface),
                        }
                      : null,
                  ]}
                >
                  <View style={styles.quoteTop}>
                    <View style={styles.quoteSeqWrap}>
                      <View style={[styles.quoteSeqBadge, isCardSelected ? { backgroundColor: accentColor } : null]}>
                        <AppText variant="caption" weight="900" color="#FFFFFF">
                          {stopOrder}
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
                </Pressable>
              );
            })}
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
