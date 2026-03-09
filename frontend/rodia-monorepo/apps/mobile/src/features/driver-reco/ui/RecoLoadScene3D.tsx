import { Canvas } from "@react-three/fiber/native";
import React, { Suspense, useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import * as THREE from "three";

import type { Placement } from "@/shared/api/generated/schemas";
import { safeNumber, safeString } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppText } from "@/shared/ui/kit/AppText";

const SCALE = 0.01;
const PALETTE = ["#4F46E5", "#0EA5E9", "#22C55E", "#F59E0B", "#EF4444", "#EC4899"];

// Spatial awareness constants.
const DOOR_AT_Z0 = true;
const EPS_INSIDE = 0.006;
const PANEL_EPS = 0.003;

const GW = 5;
const GH = 7;
const GGAP = 1;
const PIXEL_FONT: Record<string, number[]> = {
  "0": [0, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1, 1, 1, 0],
  "1": [0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0],
  "2": [0, 1, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1],
  "3": [1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0],
  "4": [0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0],
  "5": [1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1, 1, 1, 0],
  "6": [0, 1, 1, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1, 1, 1, 0],
  "7": [1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0],
  "8": [0, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1, 1, 1, 0],
  "9": [0, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1, 1, 1, 0],
};

function toFiniteNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toPositiveInt(value: unknown): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function normalizedSize(value: unknown, fallback: number): number {
  return Math.max(20, toFiniteNumber(value, fallback));
}

function overlaps1d(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && startB < endA;
}

function groundPlacements(placements: Placement[]): Placement[] {
  if (placements.length <= 1) return placements;

  const grounded: Placement[] = [];
  const sorted = [...placements].sort((a, b) => {
    const ay = toFiniteNumber(a.y, 0);
    const by = toFiniteNumber(b.y, 0);
    if (ay !== by) return ay - by;
    const az = toFiniteNumber(a.z, 0);
    const bz = toFiniteNumber(b.z, 0);
    if (az !== bz) return az - bz;
    return toFiniteNumber(a.x, 0) - toFiniteNumber(b.x, 0);
  });

  for (const placement of sorted) {
    const x = Math.max(0, toFiniteNumber(placement.x, 0));
    const z = Math.max(0, toFiniteNumber(placement.z, 0));
    const originalY = Math.max(0, toFiniteNumber(placement.y, 0));
    const width = normalizedSize(placement.width, 80);
    const length = normalizedSize(placement.length, 80);

    let groundedY = 0;
    for (const candidate of grounded) {
      const candidateX = Math.max(0, toFiniteNumber(candidate.x, 0));
      const candidateY = Math.max(0, toFiniteNumber(candidate.y, 0));
      const candidateZ = Math.max(0, toFiniteNumber(candidate.z, 0));
      const candidateWidth = normalizedSize(candidate.width, 80);
      const candidateLength = normalizedSize(candidate.length, 80);
      const candidateHeight = normalizedSize(candidate.height, 80);

      if (
        overlaps1d(x, x + width, candidateX, candidateX + candidateWidth) &&
        overlaps1d(z, z + length, candidateZ, candidateZ + candidateLength)
      ) {
        const candidateTop = candidateY + candidateHeight;
        if (candidateTop <= originalY + 1 && candidateTop > groundedY) {
          groundedY = candidateTop;
        }
      }
    }

    grounded.push({
      ...placement,
      x,
      y: groundedY,
      z,
      width,
      length,
      height: normalizedSize(placement.height, 80),
    });
  }

  return grounded;
}

function insideRR(px: number, py: number, x0: number, y0: number, x1: number, y1: number, r: number): boolean {
  const cx = Math.max(x0 + r, Math.min(x1 - r, px));
  const cy = Math.max(y0 + r, Math.min(y1 - r, py));
  return (px - cx) ** 2 + (py - cy) ** 2 <= r * r;
}

function renderTextToDataTexture(
  text: string,
  bgR: number,
  bgG: number,
  bgB: number
): { texture: THREE.DataTexture; texW: number; texH: number } {
  const chars = text.split("").filter((c) => PIXEL_FONT[c] != null);
  const n = Math.max(1, chars.length);
  const textPxW = n * GW + (n - 1) * GGAP;
  const texW = textPxW + 6 <= 26 ? 32 : 64;
  const texH = 32;
  const data = new Uint8Array(texW * texH * 4);

  const bx0 = 2;
  const by0 = 2;
  const bx1 = texW - 2;
  const by1 = texH - 2;
  const br = 5;
  for (let py = 0; py < texH; py++) {
    for (let px = 0; px < texW; px++) {
      const i = (py * texW + px) * 4;
      if (insideRR(px, py, bx0, by0, bx1, by1, br)) {
        data[i] = bgR;
        data[i + 1] = bgG;
        data[i + 2] = bgB;
        data[i + 3] = 215;
      } else {
        data[i + 3] = 0;
      }
    }
  }

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
          const px = charX + col;
          const py = startY + row;
          if (px >= 0 && px < texW && py >= 0 && py < texH) {
            const i = (py * texW + px) * 4;
            data[i] = 255;
            data[i + 1] = 255;
            data[i + 2] = 255;
            data[i + 3] = 255;
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

const LabelSprite = React.memo(({ text, color, boxW, boxH, boxL }: LabelSpriteProps) => {
  const result = useMemo(() => {
    const hex = color.replace(/^#/, "");
    const r = parseInt(hex.slice(0, 2), 16) || 80;
    const g = parseInt(hex.slice(2, 4), 16) || 80;
    const b = parseInt(hex.slice(4, 6), 16) || 200;
    return renderTextToDataTexture(text, r, g, b);
  }, [text, color]);

  useEffect(() => () => {
    result.texture.dispose();
  }, [result.texture]);

  const minDim = Math.min(boxW, boxH, boxL) * SCALE;
  const s = Math.min(0.55, Math.max(0.14, minDim * 0.4));
  const aspect = result.texW / result.texH;

  return (
    <sprite renderOrder={30} scale={[s * aspect, s, s]}>
      <spriteMaterial map={result.texture} transparent depthTest={false} depthWrite={false} toneMapped={false} />
    </sprite>
  );
});

let shadowDiscTex: THREE.DataTexture | null = null;
function getShadowDiscTexture(): THREE.DataTexture {
  if (!shadowDiscTex) {
    const S = 64;
    const C = 31.5;
    const data = new Uint8Array(S * S * 4);
    for (let py = 0; py < S; py++) {
      for (let px = 0; px < S; px++) {
        const nx = (px - C) / C;
        const ny = (py - C) / C;
        const dist = Math.sqrt(nx * nx + ny * ny);
        const t = Math.max(0, 1 - dist);
        data[(py * S + px) * 4 + 3] = Math.round(Math.pow(t, 1.8) * 210);
      }
    }
    shadowDiscTex = new THREE.DataTexture(data, S, S, THREE.RGBAFormat);
    shadowDiscTex.needsUpdate = true;
  }
  return shadowDiscTex;
}

type ShadowDiscProps = { boxWW: number; boxLW: number; boxHW: number };
const ShadowDisc = React.memo(({ boxWW, boxLW, boxHW }: ShadowDiscProps) => {
  const tex = useMemo(() => getShadowDiscTexture(), []);
  return (
    <mesh position={[0, -boxHW / 2 + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[boxWW * 0.9, boxLW * 0.9, 1]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} />
    </mesh>
  );
});

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
          opacity={isXray ? 0.32 : 1}
          depthWrite={!isXray}
          alphaTest={isXray ? 0.02 : 0}
          emissive={isSelected ? color : "#000000"}
          emissiveIntensity={isSelected ? 0.4 : 0}
        />
      </mesh>
      {!isXray ? (
        <lineSegments renderOrder={20}>
          <edgesGeometry args={[new THREE.BoxGeometry(...boxArgs)]} />
          <lineBasicMaterial color={isSelected ? "#F8FAFC" : "#1E293B"} linewidth={isSelected ? 2 : 1} />
        </lineSegments>
      ) : null}
      <LabelSprite text={String(stopOrder)} color={color} boxW={w} boxH={h} boxL={l} />
      {y <= 1 ? <ShadowDisc boxWW={w * SCALE} boxLW={l * SCALE} boxHW={h * SCALE} /> : null}
    </group>
  );
};

type TruckSceneBaseProps = { truckW: number; truckL: number; truckH: number; truckWCm: number; truckLCm: number };
const TruckSceneBase = React.memo(({ truckW, truckL, truckH, truckWCm, truckLCm }: TruckSceneBaseProps) => {
  const intDirDoor: 1 | -1 = DOOR_AT_Z0 ? 1 : -1;
  const intDirCab: 1 | -1 = DOOR_AT_Z0 ? -1 : 1;
  const doorEps = DOOR_AT_Z0 ? EPS_INSIDE : truckL - EPS_INSIDE;
  const cabEps = DOOR_AT_Z0 ? truckL - EPS_INSIDE : EPS_INSIDE;
  const doorPanelZ = doorEps + intDirDoor * PANEL_EPS;
  const cabPanelZ = cabEps + intDirCab * PANEL_EPS;
  const doorArrowDirZ = -intDirDoor;
  const cabArrowDirZ = intDirCab;
  const doorRotX = doorArrowDirZ > 0 ? Math.PI / 2 : -Math.PI / 2;
  const cabRotX = cabArrowDirZ > 0 ? Math.PI / 2 : -Math.PI / 2;

  const arrowSize = Math.min(0.28, Math.max(0.1, Math.min(truckW, truckL) * 0.06));
  const markerW = Math.min(0.7, Math.max(0.25, truckW * 0.18));
  const markerH = Math.min(0.35, Math.max(0.12, truckH * 0.12));
  const railH = 8 * SCALE;
  const railD = 3 * SCALE;
  const bar = 3 * SCALE;
  const bdrH = 0.006;
  const bdrD = 3 * SCALE;
  const arrowY = railH + arrowSize * 0.6;

  const gridGeo = useMemo(() => {
    const spacingCm = truckWCm >= 200 && truckLCm >= 400 ? 100 : 50;
    const step = spacingCm * SCALE;
    const stepsX = Math.floor(truckWCm / spacingCm);
    const stepsZ = Math.floor(truckLCm / spacingCm);
    const verts: number[] = [];
    const Y = 0.0015;
    for (let i = 1; i < stepsZ; i += 1) {
      const z = i * step;
      verts.push(0, Y, z, truckW, Y, z);
    }
    for (let i = 1; i < stepsX; i += 1) {
      const x = i * step;
      verts.push(x, Y, 0, x, Y, truckL);
    }
    const geo = new THREE.BufferGeometry();
    if (verts.length > 0) geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    return geo;
  }, [truckW, truckL, truckWCm, truckLCm]);

  useEffect(() => () => {
    gridGeo.dispose();
  }, [gridGeo]);

  return (
    <>
      <mesh renderOrder={1} position={[truckW / 2, 0, truckL / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[truckW, truckL]} />
        <meshStandardMaterial color="#CBD5E0" transparent opacity={0.9} depthWrite={false} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
      </mesh>
      <mesh position={[railD / 2, railH / 2, truckL / 2]}>
        <boxGeometry args={[railD, railH, truckL]} />
        <meshStandardMaterial color="#94A3B8" />
      </mesh>
      <mesh position={[truckW - railD / 2, railH / 2, truckL / 2]}>
        <boxGeometry args={[railD, railH, truckL]} />
        <meshStandardMaterial color="#94A3B8" />
      </mesh>
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
      <mesh position={[truckW / 2, truckH - bar / 2, doorEps]}>
        <boxGeometry args={[truckW, bar, bar]} />
        <meshBasicMaterial color="#F59E0B" />
      </mesh>
      <mesh position={[truckW / 2, bar / 2, doorEps]}>
        <boxGeometry args={[truckW, bar, bar]} />
        <meshBasicMaterial color="#F59E0B" />
      </mesh>
      <mesh position={[bar / 2, truckH / 2, doorEps]}>
        <boxGeometry args={[bar, truckH, bar]} />
        <meshBasicMaterial color="#F59E0B" />
      </mesh>
      <mesh position={[truckW - bar / 2, truckH / 2, doorEps]}>
        <boxGeometry args={[bar, truckH, bar]} />
        <meshBasicMaterial color="#F59E0B" />
      </mesh>
      <mesh position={[truckW / 2, arrowY, doorEps]} rotation={[doorRotX, 0, 0]}>
        <coneGeometry args={[arrowSize * 0.55, arrowSize, 6]} />
        <meshBasicMaterial color="#F59E0B" />
      </mesh>
      <mesh renderOrder={3} position={[truckW / 2, arrowY, doorPanelZ]}>
        <planeGeometry args={[markerW, markerH]} />
        <meshBasicMaterial color="#0F172A" transparent opacity={0.5} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[truckW / 2, arrowY, cabEps]} rotation={[cabRotX, 0, 0]}>
        <coneGeometry args={[arrowSize * 0.55, arrowSize, 6]} />
        <meshBasicMaterial color="#22C55E" />
      </mesh>
      <mesh renderOrder={3} position={[truckW / 2, arrowY, cabPanelZ]}>
        <planeGeometry args={[markerW, markerH]} />
        <meshBasicMaterial color="#0F172A" transparent opacity={0.5} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {gridGeo.getAttribute("position") != null ? (
        <lineSegments geometry={gridGeo}>
          <lineBasicMaterial color="#94A3B8" transparent opacity={0.45} />
        </lineSegments>
      ) : null}
    </>
  );
});

type RecoLoadScene3DProps = {
  dims: {
    widthCm: number;
    lengthCm: number;
    heightCm: number;
  };
  orderedPlacements: Placement[];
  visibleStopOrders: ReadonlySet<number>;
  stopColorMap: Map<number, string>;
  selectedStopOrder: number | null;
  isXray: boolean;
  onSelectStopOrder: (stopOrder: number) => void;
};

const useStyles = createThemedStyles((theme) => {
  const spacing = safeNumber(theme?.layout?.spacing?.base, 4);
  const cBorder = safeString(theme?.colors?.borderDefault, "#E2E8F0");
  return StyleSheet.create({
    canvasWrap: {
      height: 300,
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: theme.colors.bgSurfaceAlt,
      borderWidth: 1,
      borderColor: cBorder,
    },
    loadingWrap: {
      position: "absolute",
      inset: 0,
      alignItems: "center",
      justifyContent: "center",
      padding: spacing * 2,
      gap: spacing,
    },
  });
});

export function RecoLoadScene3D({
  dims,
  orderedPlacements,
  visibleStopOrders,
  stopColorMap,
  selectedStopOrder,
  isXray,
  onSelectStopOrder,
}: RecoLoadScene3DProps) {
  const theme = useAppTheme();
  const styles = useStyles();
  const cameraDir = useMemo(() => new THREE.Vector3(1, 0.75, 1).normalize(), []);

  const activePlacements = useMemo(
    () =>
      groundPlacements(orderedPlacements.filter((placement) => {
        const stopOrder = toPositiveInt(placement.stopOrder);
        return stopOrder > 0 && visibleStopOrders.has(stopOrder);
      })),
    [orderedPlacements, visibleStopOrders]
  );

  const renderPlacements = useMemo(() => {
    if (!isXray) return activePlacements;
    return [...activePlacements].sort((a, b) => {
      const ax = toFiniteNumber(a.x, 0) + Math.max(20, toFiniteNumber(a.width, 80)) / 2;
      const ay = toFiniteNumber(a.y, 0) + Math.max(20, toFiniteNumber(a.height, 80)) / 2;
      const az = toFiniteNumber(a.z, 0) + Math.max(20, toFiniteNumber(a.length, 80)) / 2;
      const bx = toFiniteNumber(b.x, 0) + Math.max(20, toFiniteNumber(b.width, 80)) / 2;
      const by = toFiniteNumber(b.y, 0) + Math.max(20, toFiniteNumber(b.height, 80)) / 2;
      const bz = toFiniteNumber(b.z, 0) + Math.max(20, toFiniteNumber(b.length, 80)) / 2;
      const aKey = ax * cameraDir.x + ay * cameraDir.y + az * cameraDir.z;
      const bKey = bx * cameraDir.x + by * cameraDir.y + bz * cameraDir.z;
      return aKey - bKey;
    });
  }, [activePlacements, cameraDir, isXray]);

  const sW = dims.widthCm * SCALE;
  const sH = dims.heightCm * SCALE;
  const sL = dims.lengthCm * SCALE;

  return (
    <View style={styles.canvasWrap}>
      <Canvas
        camera={{ position: [5, 4, 5], fov: 50 }}
        onCreated={({ camera }) => {
          const box = new THREE.Box3();
          box.expandByPoint(new THREE.Vector3(0, 0, 0));
          box.expandByPoint(new THREE.Vector3(sW, sH, sL));
          activePlacements.forEach((p) => {
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
                onSelect={() => onSelectStopOrder(so)}
              />
            );
          })}
        </Suspense>
      </Canvas>
      {activePlacements.length <= 0 ? (
        <View style={styles.loadingWrap}>
          <AppText variant="caption" color="textMuted">
            현재 단계에는 적재된 화물이 없습니다.
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

export default RecoLoadScene3D;
