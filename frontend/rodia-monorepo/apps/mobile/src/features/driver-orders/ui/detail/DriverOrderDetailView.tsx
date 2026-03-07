import { Ionicons } from "@expo/vector-icons";
import { Canvas } from "@react-three/fiber/native";
import React, { Suspense, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, View } from "react-native";
import * as THREE from "three";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { QuoteDetailResponse } from "@/entities/quote/model/quote.types";
import type { CounterOfferItem } from "@/features/counter-offer/api";
import { DriverOrderActionBar } from "@/features/driver-orders/ui/detail/DriverOrderActionBar";
import { DriverOrderDetailHeader } from "@/features/driver-orders/ui/detail/DriverOrderDetailHeader";
import { DriverOrderNegotiatingCard } from "@/features/driver-orders/ui/detail/DriverOrderNegotiatingCard";
import { DriverOrderPaymentPendingCard } from "@/features/driver-orders/ui/detail/DriverOrderPaymentPendingCard";
import type { ParsedMatchResponseItem } from "@/features/matching/api/shipper-match-parser";
import CounterOfferModal, { type CounterOfferSubmitPayload } from "@/features/matching/ui/CounterOfferModal";
import type { Placement, TruckSpecReferenceResponse } from "@/shared/api/generated/schemas";
import { getApiBaseUrl } from "@/shared/lib/config/env";
import { DRIVER_CTA_ID, DRIVER_UI_STATE, type DriverUiState } from "@/shared/lib/policy";
import { tokenStorage } from "@/shared/lib/storage/tokenStorage";
import { safeNumber, safeString, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppErrorState } from "@/shared/ui/kit/AppErrorState";
import { AppSpinner } from "@/shared/ui/kit/AppSpinner";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

const SCALE = 0.01;

type MatchWithWorkflowPayload = ParsedMatchResponseItem & {
  loadingPhotos?: string[];
  unloadingPhotos?: string[];
};
type LoadPlanDataSource = "match" | "preview" | "quote_fallback" | "none";

type DriverOrderDetailViewProps = {
  pageTitle: string;
  matchId: number;
  isInvalidMatchId: boolean;
  isLoading: boolean;
  errorMessage: string | null;
  isRunNegotiationProbeLoading: boolean;
  match: MatchWithWorkflowPayload | null;
  quote: QuoteDetailResponse | null;
  uiState: DriverUiState;
  ctaId: string;
  isQuoteMode: boolean;
  isRunNegotiatingDetail: boolean;
  currentStep: number;
  orderedPlacements: Placement[];
  hasPlacementPayload: boolean;
  truckSpec: TruckSpecReferenceResponse | null | undefined;
  loadPlanSource: LoadPlanDataSource;
  loadingPhotos: string[];
  unloadingPhotos: string[];
  isBusy: boolean;
  isUploadingPhoto: boolean;
  isOfferModalOpen: boolean;
  isSubmittingOffer: boolean;
  offerErrorMessage: string | null;
  latestPendingOffer: CounterOfferItem | null;
  isNavigatingSettlement: boolean;
  onBack: () => void;
  onRefresh: () => void;
  onRetryFetch: () => void;
  onAcceptMatch: () => void;
  onNegotiate: () => void;
  onOfferModalClose: () => void;
  onOfferSubmit: (payload: CounterOfferSubmitPayload) => void | Promise<void>;
  onStartDriving: () => void;
  onConfirmLoading: () => void;
  onConfirmUnloading: () => void;
  onOpenSettlement: () => void;
  onAddPickupPhoto: () => void;
  onAddDeliveryPhoto: () => void;
};

type WorkflowStep = { key: string; label: string };

const WORKFLOW_STEPS: readonly WorkflowStep[] = [
  { key: "READY", label: "운행 전" },
  { key: "PICKUP", label: "상차 중" },
  { key: "TRANSIT", label: "운행 중" },
  { key: "DROPOFF", label: "하차 완료" },
];

function toPositiveInt(value: unknown): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function toAbsolutePhotoUri(value: string): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (!raw.startsWith("/")) return raw;
  return `${getApiBaseUrl().replace(/\/+$/, "")}${raw}`;
}

const CargoBox = ({ placement }: { placement: Placement }) => {
  const x = placement.x ?? 0;
  const y = placement.y ?? 0;
  const z = placement.z ?? 0;
  const w = placement.width ?? 10;
  const h = placement.height ?? 10;
  const l = placement.length ?? 10;

  const position: [number, number, number] = [(x + w / 2) * SCALE, (y + h / 2) * SCALE, (z + l / 2) * SCALE];
  const boxArgs: [number, number, number] = [w * SCALE, h * SCALE, l * SCALE];

  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={boxArgs} />
        <meshStandardMaterial color="#3B82F6" opacity={0.72} transparent />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(...boxArgs)]} />
        <lineBasicMaterial color="#1E40AF" />
      </lineSegments>
    </group>
  );
};

function resolveTruckDimensions(spec: TruckSpecReferenceResponse | null | undefined) {
  return {
    lengthCm: spec?.cargoLengthCm ?? 450,
    widthCm: spec?.cargoWidthCm ?? 230,
    heightCm: spec?.cargoHeightCm ?? 240,
  };
}

const DriverOrderLoadSimulation = ({
  placements,
  truckSpec,
  source,
}: {
  placements: Placement[];
  truckSpec: TruckSpecReferenceResponse | null | undefined;
  source: LoadPlanDataSource;
}) => {
  const theme = useAppTheme();
  const { lengthCm, widthCm, heightCm } = resolveTruckDimensions(truckSpec);
  const truckPos: [number, number, number] = [(widthCm / 2) * SCALE, (heightCm / 2) * SCALE, (lengthCm / 2) * SCALE];
  const truckArgs: [number, number, number] = [widthCm * SCALE, heightCm * SCALE, lengthCm * SCALE];
  const subtitle =
    source === "match"
      ? "매칭 응답의 적재 계획 데이터"
      : source === "preview"
      ? "서버 프리뷰 기반 적재 계획"
      : "견적 화물 스키마 기반 자동 배치 (Fallback)";

  return (
    <AppCard style={simStyles.card}>
      <View style={simStyles.header}>
        <View>
          <AppText variant="heading" weight="bold">
            3D 적재 시뮬레이션
          </AppText>
          <AppText variant="caption" color={theme.colors.textMuted}>
            {subtitle}
          </AppText>
        </View>
        <View style={simStyles.specTag}>
          <AppText variant="caption" weight="bold" color="#1E293B">
            {lengthCm}×{widthCm}×{heightCm} cm
          </AppText>
        </View>
      </View>

      <View style={simStyles.canvasContainer}>
        <Suspense fallback={<ActivityIndicator color={theme.colors.brandPrimary} />}>
          <Canvas camera={{ position: [4, 4, 4], fov: 45 }}>
            <ambientLight intensity={0.8} />
            <pointLight position={[10, 10, 10]} intensity={1} />

            <mesh position={truckPos}>
              <boxGeometry args={truckArgs} />
              <meshBasicMaterial color="#94A3B8" wireframe transparent opacity={0.2} />
            </mesh>

            {placements.map((p, idx) => (
              <CargoBox key={p.id ?? idx} placement={p} />
            ))}

            <gridHelper args={[10, 20, "#CBD5E1", "#F1F5F9"]} />
          </Canvas>
        </Suspense>
      </View>
    </AppCard>
  );
};

const WorkflowStepper = ({ currentStep }: { currentStep: number }) => {
  const theme = useAppTheme();
  const styles = useStyles();
  return (
    <AppCard style={styles.stepperCard}>
      <AppText variant="heading" weight="bold">
        운행 진행 단계
      </AppText>
      <View style={styles.stepperRow}>
        {WORKFLOW_STEPS.map((step, index) => {
          const done = index < currentStep;
          const active = index === currentStep;
          return (
            <React.Fragment key={step.key}>
              <View style={styles.stepWrap}>
                <View
                  style={[
                    styles.stepDot,
                    done ? styles.stepDotDone : active ? styles.stepDotActive : styles.stepDotIdle,
                  ]}
                >
                  {done ? (
                    <Ionicons name="checkmark" size={12} color={theme.colors.semanticSuccess} />
                  ) : active ? (
                    <Ionicons name="ellipse" size={8} color={theme.colors.brandPrimary} />
                  ) : null}
                </View>
                <AppText style={[styles.stepLabel, active ? styles.stepLabelActive : null]}>{step.label}</AppText>
              </View>
              {index < WORKFLOW_STEPS.length - 1 ? (
                <View style={[styles.stepConnector, done ? styles.stepConnectorDone : null]} />
              ) : null}
            </React.Fragment>
          );
        })}
      </View>
    </AppCard>
  );
};

const PhotoThumb = ({
  uri,
  index,
  onPress,
}: {
  uri: string;
  index: number;
  onPress?: () => void;
}) => {
  const theme = useAppTheme();
  const [failed, setFailed] = useState(false);
  const [accessToken, setAccessToken] = useState<string>("");
  const [tokenResolved, setTokenResolved] = useState(false);
  const resolvedUri = useMemo(() => toAbsolutePhotoUri(uri), [uri]);
  const requiresAuth = useMemo(
    () => resolvedUri.includes("/api/delivery-photos/"),
    [resolvedUri]
  );

  useEffect(() => {
    let mounted = true;
    void tokenStorage.getAccessToken().then((token) => {
      if (!mounted) return;
      setAccessToken(typeof token === "string" ? token.trim() : "");
      setTokenResolved(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setFailed(false);
  }, [accessToken, resolvedUri]);

  if (requiresAuth && !tokenResolved) {
    return (
      <Pressable style={wfStyles.photoThumb} onPress={onPress} disabled={!onPress}>
        <ActivityIndicator size="small" color={theme.colors.brandPrimary} />
      </Pressable>
    );
  }

  if (!failed && /^https?:\/\//i.test(resolvedUri)) {
    return (
      <Pressable onPress={onPress} disabled={!onPress}>
        <Image
          source={
            accessToken
              ? { uri: resolvedUri, headers: { Authorization: `Bearer ${accessToken}` } }
              : { uri: resolvedUri }
          }
          style={wfStyles.photoThumb}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      </Pressable>
    );
  }
  return (
    <Pressable style={wfStyles.photoThumb} onPress={onPress} disabled={!onPress}>
      <Ionicons name="image-outline" size={20} color={theme.colors.brandPrimary} />
      <AppText variant="caption" color={theme.colors.textMuted}>
        #{index + 1}
      </AppText>
    </Pressable>
  );
};

const PhotoGrid = ({
  photos,
  onAdd,
  onPressPhoto,
  readOnly = false,
  isUploading = false,
}: {
  photos: string[];
  onAdd?: () => void;
  onPressPhoto?: (uri: string) => void;
  readOnly?: boolean;
  isUploading?: boolean;
}) => {
  const theme = useAppTheme();
  return (
    <View style={wfStyles.photoRow}>
      {photos.map((uri, idx) => (
        <PhotoThumb
          key={`${uri}-${idx}`}
          uri={uri}
          index={idx}
          onPress={typeof onPressPhoto === "function" ? () => onPressPhoto(uri) : undefined}
        />
      ))}
      {!readOnly ? (
        <Pressable style={wfStyles.photoAddBtn} onPress={onAdd} disabled={isUploading}>
          {isUploading ? (
            <ActivityIndicator size="small" color={theme.colors.brandPrimary} />
          ) : (
            <Ionicons name="add" size={22} color={theme.colors.brandPrimary} />
          )}
        </Pressable>
      ) : null}
    </View>
  );
};

const simStyles = {
  card: { padding: 16 } as const,
  header: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "flex-start" as const,
    marginBottom: 16,
  },
  specTag: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  canvasContainer: {
    height: 280,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    overflow: "hidden" as const,
  },
} as const;

const wfStyles = {
  photoRow: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 8,
    marginTop: 12,
  },
  photoThumb: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    gap: 2,
    overflow: "hidden" as const,
  },
  photoAddBtn: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderStyle: "dashed" as const,
  },
  photoViewerBackdrop: {
    flex: 1,
    backgroundColor: "#000000D0",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  photoViewerImage: {
    width: "100%" as const,
    height: "82%" as const,
  },
  photoViewerClose: {
    position: "absolute" as const,
    top: 48,
    right: 20,
    padding: 10,
  },
  photoViewerCloseText: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700" as const,
  },
} as const;
type RouteStop = { seq: number; label: string; address: string };

function buildRouteStops(
  originAddress: string | undefined,
  destinationAddress: string | undefined,
  stops: Array<{ seq: number; address: string }> | undefined
): RouteStop[] {
  const result: RouteStop[] = [];
  if (originAddress) result.push({ seq: 0, label: "상차지", address: originAddress });
  const sorted = [...(stops ?? [])].sort((a, b) => a.seq - b.seq);
  sorted.forEach((s, i) => result.push({ seq: s.seq, label: `경유 ${i + 1}`, address: s.address }));
  if (destinationAddress) result.push({ seq: 9999, label: "하차지", address: destinationAddress });
  return result;
}

const qStyles = {
  card: { padding: 16, gap: 12 } as const,
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800" as const,
    letterSpacing: 0.4,
    textTransform: "uppercase" as const,
    color: "#94A3B8",
    marginBottom: 2,
  },
  routeItem: {
    flexDirection: "row" as const,
    alignItems: "stretch" as const,
    gap: 10,
  },
  routeRail: {
    width: 18,
    alignItems: "center" as const,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF6A00",
    marginTop: 5,
    flexShrink: 0,
  },
  routeDotWaypoint: {
    backgroundColor: "#94A3B8",
  },
  routeLine: {
    width: 2,
    flex: 1,
    marginTop: 3,
    backgroundColor: "#E2E8F0",
  },
  routeBody: {
    flex: 1,
    paddingBottom: 10,
    gap: 2,
  },
  routeTypeLabel: {
    fontSize: 11,
    fontWeight: "800" as const,
    color: "#94A3B8",
  },
  routeAddress: {
    fontSize: 14,
    fontWeight: "900" as const,
    color: "#0F172A",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
  },
  lifoBanner: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    backgroundColor: "#FFF7ED",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  lifoBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700" as const,
    color: "#C2410C",
  },
  seqRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  seqBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FF6A00",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    flexShrink: 0,
  },
  seqBadgeText: {
    fontSize: 11,
    fontWeight: "900" as const,
    color: "#FFFFFF",
  },
  seqInfo: {
    flex: 1,
    gap: 1,
  },
  seqCargoLabel: {
    fontSize: 13,
    fontWeight: "800" as const,
    color: "#0F172A",
  },
  seqDimText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: "#64748B",
  },
  seqUnloadTag: {
    borderRadius: 4,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexShrink: 0,
  },
  seqUnloadTagText: {
    fontSize: 10,
    fontWeight: "800" as const,
    color: "#3B82F6",
  },
} as const;

const QuoteModeRouteCard = ({
  quote,
  placements,
}: {
  quote: QuoteDetailResponse | null;
  placements: Placement[];
}) => {
  const theme = useAppTheme();
  const routeStops = buildRouteStops(
    quote?.originAddress,
    quote?.destinationAddress,
    quote?.stops
  );

  const sortedByLoad = [...placements].sort(
    (a, b) => (a.stopOrder ?? 0) - (b.stopOrder ?? 0)
  );
  const totalCount = sortedByLoad.length;

  return (
    <AppCard style={qStyles.card}>
      {routeStops.length > 0 ? (
        <>
          <AppText variant="heading" weight="bold">운송 경로</AppText>
          {routeStops.map((stop, idx) => {
            const isLast = idx === routeStops.length - 1;
            const isWaypoint = stop.label.startsWith("경유");
            return (
              <View key={`stop-${idx}`} style={qStyles.routeItem}>
                <View style={qStyles.routeRail}>
                  <View style={[qStyles.routeDot, isWaypoint ? qStyles.routeDotWaypoint : null]} />
                  {!isLast ? <View style={qStyles.routeLine} /> : null}
                </View>
                <View style={qStyles.routeBody}>
                  <AppText style={qStyles.routeTypeLabel}>{stop.label}</AppText>
                  <AppText style={qStyles.routeAddress}>{stop.address || "-"}</AppText>
                </View>
              </View>
            );
          })}
          {sortedByLoad.length > 0 ? <View style={qStyles.divider} /> : null}
        </>
      ) : null}

      {sortedByLoad.length > 0 ? (
        <>
          <AppText variant="heading" weight="bold">적재 순서 (LIFO)</AppText>
          <View style={qStyles.lifoBanner}>
            <Ionicons name="information-circle-outline" size={15} color="#C2410C" />
            <AppText style={qStyles.lifoBannerText}>
              나중에 적재된 화물이 먼저 하차됩니다 (후입선출)
            </AppText>
          </View>
          {sortedByLoad.map((p, idx) => {
            const unloadRank = totalCount - idx;
            return (
              <View key={p.id ?? idx} style={qStyles.seqRow}>
                <View style={qStyles.seqBadge}>
                  <AppText style={qStyles.seqBadgeText}>{idx + 1}</AppText>
                </View>
                <View style={qStyles.seqInfo}>
                  <AppText style={qStyles.seqCargoLabel}>화물 #{idx + 1}</AppText>
                  <AppText style={qStyles.seqDimText}>
                    {p.width ?? "-"}×{p.length ?? "-"}×{p.height ?? "-"} cm
                    {p.x != null ? ` · (${p.x}, ${p.y ?? 0}, ${p.z ?? 0})` : ""}
                  </AppText>
                </View>
                <View style={qStyles.seqUnloadTag}>
                  <AppText style={qStyles.seqUnloadTagText}>
                    {unloadRank === 1 ? "최초 하차" : `하차 ${unloadRank}번째`}
                  </AppText>
                </View>
              </View>
            );
          })}
        </>
      ) : null}

      {routeStops.length === 0 && sortedByLoad.length === 0 ? (
        <AppText variant="caption" color={theme.colors.textMuted}>
          경로 및 적재 정보를 불러오는 중입니다.
        </AppText>
      ) : null}
    </AppCard>
  );
};

const useStyles = createThemedStyles((theme) => {
  const spacing = safeNumber(theme?.layout?.spacing?.base, 4);
  const cBorder = safeString(theme?.colors?.borderDefault, "#E2E8F0");
  const cWarn = safeString(theme?.colors?.semanticWarning, "#F59E0B");
  return StyleSheet.create({
    stateWrap: { paddingTop: spacing * 12 },
    content: { gap: spacing * 2, paddingBottom: spacing * 24 },
    refreshBtn: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 18,
    },
    stepperCard: { padding: 16, gap: 12 },
    stepperRow: { flexDirection: "row", alignItems: "center" },
    stepWrap: { flex: 1, alignItems: "center" },
    stepDot: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
    },
    stepDotDone: {
      borderColor: theme.colors.semanticSuccess,
      backgroundColor: tint(theme.colors.semanticSuccess, 0.14, theme.colors.bgSurface),
    },
    stepDotActive: {
      borderColor: theme.colors.brandPrimary,
      backgroundColor: tint(theme.colors.brandPrimary, 0.14, theme.colors.bgSurface),
    },
    stepDotIdle: {
      borderColor: cBorder,
      backgroundColor: theme.colors.bgSurface,
    },
    stepLabel: {
      marginTop: 6,
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: "700",
      textAlign: "center",
    },
    stepLabelActive: {
      color: theme.colors.brandPrimary,
      fontWeight: "900",
    },
    stepConnector: {
      flex: 1,
      height: 2,
      backgroundColor: cBorder,
    },
    stepConnectorDone: {
      backgroundColor: theme.colors.semanticSuccess,
    },
    listHeader: { marginBottom: 12 },
    orderItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: "#F1F5F9",
    },
    badge: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.colors.brandPrimary,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    specRow: { flexDirection: "row", gap: 8, marginTop: 4 },
    emptyText: { textAlign: "center", paddingVertical: 20 },
    workflowCard: { padding: 14, gap: 10 },
    workflowHeaderRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    workflowHeaderTextWrap: { flex: 1, gap: 2 },
    workflowIconWrap: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: tint(cBorder, 0.8, cBorder),
      backgroundColor: theme.colors.bgSurfaceAlt,
    },
    workflowIconReady: {
      backgroundColor: tint(theme.colors.brandPrimary, 0.14, theme.colors.bgSurfaceAlt),
      borderColor: tint(theme.colors.brandPrimary, 0.45, cBorder),
    },
    workflowIconPickup: {
      backgroundColor: tint(theme.colors.semanticInfo, 0.14, theme.colors.bgSurfaceAlt),
      borderColor: tint(theme.colors.semanticInfo, 0.45, cBorder),
    },
    workflowIconTransit: {
      backgroundColor: tint(cWarn, 0.14, theme.colors.bgSurfaceAlt),
      borderColor: tint(cWarn, 0.45, cBorder),
    },
    workflowIconCompleted: {
      backgroundColor: tint(theme.colors.semanticSuccess, 0.14, theme.colors.bgSurfaceAlt),
      borderColor: tint(theme.colors.semanticSuccess, 0.45, cBorder),
    },
    workflowBodyText: {
      color: theme.colors.textSub,
      fontSize: 12,
      fontWeight: "700",
      lineHeight: 18,
    },
    workflowChipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    workflowChip: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: tint(cBorder, 0.34, theme.colors.bgSurfaceAlt),
    },
    workflowChipText: {
      fontSize: 12,
      fontWeight: "800",
      color: theme.colors.textSub,
    },
    actionBottomWrap: {
      borderTopWidth: 1,
      borderTopColor: cBorder,
      backgroundColor: theme.colors.bgSurface,
      paddingHorizontal: spacing * 5,
      paddingTop: spacing * 3,
      gap: spacing * 2,
    },
    actionRow: { flexDirection: "row", gap: spacing * 2 },
    actionBtn: { flex: 1, minHeight: 58 },
  });
});
export function DriverOrderDetailView({
  pageTitle,
  matchId,
  isInvalidMatchId,
  isLoading,
  errorMessage,
  isRunNegotiationProbeLoading,
  match,
  quote,
  uiState,
  ctaId,
  isQuoteMode,
  isRunNegotiatingDetail,
  currentStep,
  orderedPlacements,
  hasPlacementPayload,
  truckSpec,
  loadPlanSource,
  loadingPhotos,
  unloadingPhotos,
  isBusy,
  isUploadingPhoto,
  isOfferModalOpen,
  isSubmittingOffer,
  offerErrorMessage,
  latestPendingOffer,
  isNavigatingSettlement,
  onBack,
  onRefresh,
  onRetryFetch,
  onAcceptMatch,
  onNegotiate,
  onOfferModalClose,
  onOfferSubmit,
  onStartDriving,
  onConfirmLoading,
  onConfirmUnloading,
  onOpenSettlement,
  onAddPickupPhoto,
  onAddDeliveryPhoto,
}: DriverOrderDetailViewProps) {
  const insets = useSafeAreaInsets();
  const themedStyles = useStyles();
  const theme = useAppTheme();
  const cTextMuted = safeString(theme?.colors?.textMuted, "#64748B");
  const [selectedPhotoUri, setSelectedPhotoUri] = useState<string | null>(null);
  const [viewerAccessToken, setViewerAccessToken] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    void tokenStorage.getAccessToken().then((token) => {
      if (!mounted) return;
      setViewerAccessToken(typeof token === "string" ? token.trim() : "");
    });
    return () => {
      mounted = false;
    };
  }, []);

  const headerRight = (
    <Pressable style={themedStyles.refreshBtn} onPress={onRefresh}>
      <Ionicons name="refresh" size={22} color={cTextMuted} />
    </Pressable>
  );

  const workflowPanel = useMemo(() => {
    const renderWorkflowCard = (props: {
      title: string;
      description: string;
      iconName: React.ComponentProps<typeof Ionicons>["name"];
      iconColor: string;
      iconToneStyle: object;
      chips?: string[];
      children?: React.ReactNode;
    }) => {
      const chips = props.chips ?? [];
      return (
        <AppCard style={themedStyles.workflowCard}>
          <View style={themedStyles.workflowHeaderRow}>
            <View style={[themedStyles.workflowIconWrap, props.iconToneStyle]}>
              <Ionicons name={props.iconName} size={16} color={props.iconColor} />
            </View>
            <View style={themedStyles.workflowHeaderTextWrap}>
              <AppText variant="heading" weight="bold">
                {props.title}
              </AppText>
              <AppText variant="caption" style={themedStyles.workflowBodyText}>
                {props.description}
              </AppText>
            </View>
          </View>
          {chips.length > 0 ? (
            <View style={themedStyles.workflowChipRow}>
              {chips.map((chip) => (
                <View key={chip} style={themedStyles.workflowChip}>
                  <AppText style={themedStyles.workflowChipText}>{chip}</AppText>
                </View>
              ))}
            </View>
          ) : null}
          {props.children}
        </AppCard>
      );
    };

    if (uiState === DRIVER_UI_STATE.ASSIGNED) {
      return renderWorkflowCard({
        title: "운행 준비 완료",
        description: "운행 시작 버튼을 누르면 상차 단계로 이동합니다.",
        iconName: "play-circle-outline",
        iconColor: theme.colors.brandPrimary,
        iconToneStyle: themedStyles.workflowIconReady,
        chips: ["다음 단계: 상차"],
      });
    }

    if (uiState === DRIVER_UI_STATE.PICKUP_IN_PROGRESS) {
      return renderWorkflowCard({
        title: "상차 사진 등록",
        description: "상차 사진 등록 후 하단의 상차 완료 버튼으로 다음 단계를 진행해 주세요.",
        iconName: "camera-outline",
        iconColor: theme.colors.semanticInfo,
        iconToneStyle: themedStyles.workflowIconPickup,
        chips: [`상차 사진 ${loadingPhotos.length}장`],
        children: (
          <PhotoGrid
            photos={loadingPhotos}
            onAdd={onAddPickupPhoto}
            onPressPhoto={(uri) => setSelectedPhotoUri(uri)}
            isUploading={isUploadingPhoto}
          />
        ),
      });
    }

    if (uiState === DRIVER_UI_STATE.TRANSIT_IN_PROGRESS) {
      return renderWorkflowCard({
        title: "하차 사진 등록",
        description: "하차 사진 등록 후 하단의 하차 완료 버튼으로 운행을 종료해 주세요.",
        iconName: "car-outline",
        iconColor: safeString(theme.colors.semanticWarning, "#F59E0B"),
        iconToneStyle: themedStyles.workflowIconTransit,
        chips: [`하차 사진 ${unloadingPhotos.length}장`],
        children: (
          <PhotoGrid
            photos={unloadingPhotos}
            onAdd={onAddDeliveryPhoto}
            onPressPhoto={(uri) => setSelectedPhotoUri(uri)}
            isUploading={isUploadingPhoto}
          />
        ),
      });
    }

    if (uiState === DRIVER_UI_STATE.COMPLETED) {
      return renderWorkflowCard({
        title: "운송 완료",
        description: "상차/하차 사진 기록이 저장되었습니다.",
        iconName: "checkmark-done-outline",
        iconColor: theme.colors.semanticSuccess,
        iconToneStyle: themedStyles.workflowIconCompleted,
        chips: [`상차 ${loadingPhotos.length}장`, `하차 ${unloadingPhotos.length}장`],
        children: (
          <>
            <AppText variant="body" weight="bold">
              상차 사진
            </AppText>
            {loadingPhotos.length > 0 ? (
              <PhotoGrid photos={loadingPhotos} onPressPhoto={(uri) => setSelectedPhotoUri(uri)} readOnly />
            ) : (
              <AppText style={themedStyles.workflowBodyText}>사진 대기 중</AppText>
            )}
            <AppText variant="body" weight="bold">
              하차 사진
            </AppText>
            {unloadingPhotos.length > 0 ? (
              <PhotoGrid photos={unloadingPhotos} onPressPhoto={(uri) => setSelectedPhotoUri(uri)} readOnly />
            ) : (
              <AppText style={themedStyles.workflowBodyText}>사진 대기 중</AppText>
            )}
          </>
        ),
      });
    }

    return null;
  }, [
    isUploadingPhoto,
    loadingPhotos,
    onAddDeliveryPhoto,
    onAddPickupPhoto,
    theme.colors.brandPrimary,
    theme.colors.semanticInfo,
    theme.colors.semanticSuccess,
    themedStyles.workflowBodyText,
    themedStyles.workflowCard,
    themedStyles.workflowChip,
    themedStyles.workflowChipRow,
    themedStyles.workflowChipText,
    themedStyles.workflowHeaderRow,
    themedStyles.workflowHeaderTextWrap,
    themedStyles.workflowIconCompleted,
    themedStyles.workflowIconPickup,
    themedStyles.workflowIconReady,
    themedStyles.workflowIconTransit,
    themedStyles.workflowIconWrap,
    uiState,
    unloadingPhotos,
  ]);

  if (isInvalidMatchId) {
    return (
      <PageScaffold
        title={pageTitle}
        subtitle="오더 정보 확인"
        scroll={false}
        padding={20}
        onPressBack={onBack}
      >
        <View style={themedStyles.stateWrap}>
          <AppErrorState
            title="유효한 오더 ID가 아닙니다."
            description="목록에서 오더를 다시 선택해 주세요."
            retryLabel="뒤로 가기"
            onRetry={onBack}
            fullScreen={false}
          />
        </View>
      </PageScaffold>
    );
  }

  if (isLoading) {
    return (
      <PageScaffold
        title={pageTitle}
        subtitle="오더 정보 확인"
        scroll={false}
        padding={20}
        onPressBack={onBack}
        headerRight={headerRight}
      >
        <View style={themedStyles.stateWrap}>
          <AppSpinner label="오더 상세를 불러오는 중입니다." />
        </View>
      </PageScaffold>
    );
  }

  if (errorMessage) {
    return (
      <PageScaffold
        title={pageTitle}
        subtitle="오더 정보 확인"
        scroll={false}
        padding={20}
        onPressBack={onBack}
        headerRight={headerRight}
      >
        <View style={themedStyles.stateWrap}>
          <AppErrorState
            title="오더 상세를 불러오지 못했습니다."
            description={errorMessage}
            retryLabel="다시 시도"
            onRetry={onRetryFetch}
            fullScreen={false}
          />
        </View>
      </PageScaffold>
    );
  }

  if (isRunNegotiationProbeLoading) {
    return (
      <PageScaffold
        title={pageTitle}
        subtitle="오더 정보 확인"
        scroll={false}
        padding={20}
        onPressBack={onBack}
        headerRight={headerRight}
      >
        <View style={themedStyles.stateWrap}>
          <AppSpinner label="오더 상태를 확인하는 중입니다." />
        </View>
      </PageScaffold>
    );
  }

  const staticStatusCard =
    isRunNegotiatingDetail ? (
      <DriverOrderPaymentPendingCard
        proposedPrice={latestPendingOffer?.proposedPrice}
        proposedMessage={latestPendingOffer?.message}
      />
    ) : ctaId === DRIVER_CTA_ID.PAYMENT_PENDING ? (
      <DriverOrderPaymentPendingCard />
    ) : uiState === DRIVER_UI_STATE.NEGOTIATING ? (
      <DriverOrderNegotiatingCard
        quote={quote}
        proposedPrice={latestPendingOffer?.proposedPrice}
        proposedMessage={latestPendingOffer?.message}
      />
    ) : (
      <DriverOrderDetailHeader match={match!} quote={quote} uiState={uiState} />
    );

  const renderBottomBar = () => {
    if (
      uiState !== DRIVER_UI_STATE.ASSIGNED &&
      uiState !== DRIVER_UI_STATE.PICKUP_IN_PROGRESS &&
      uiState !== DRIVER_UI_STATE.TRANSIT_IN_PROGRESS &&
      uiState !== DRIVER_UI_STATE.COMPLETED
    ) {
      return null;
    }

    return (
      <View style={[themedStyles.actionBottomWrap, { paddingBottom: insets.bottom + 10 }]}>
        {uiState === DRIVER_UI_STATE.ASSIGNED ? (
          <AppButton
            title="운행 시작"
            variant="primary"
            style={themedStyles.actionBtn}
            loading={isBusy}
            disabled={isBusy}
            onPress={onStartDriving}
            textStyle={{ fontSize: 16, fontWeight: "900" }}
          />
        ) : null}

        {uiState === DRIVER_UI_STATE.PICKUP_IN_PROGRESS ? (
          <View style={themedStyles.actionRow}>
            <AppButton
              title="상차 사진 등록"
              variant="secondary"
              style={themedStyles.actionBtn}
              loading={isUploadingPhoto}
              disabled={isBusy || isUploadingPhoto}
              onPress={onAddPickupPhoto}
              textStyle={{ fontSize: 16, fontWeight: "900" }}
            />
            <AppButton
              title="상차 완료"
              variant="primary"
              style={themedStyles.actionBtn}
              loading={isBusy}
              disabled={isBusy || isUploadingPhoto || toPositiveInt(loadingPhotos.length) <= 0}
              onPress={onConfirmLoading}
              textStyle={{ fontSize: 16, fontWeight: "900" }}
            />
          </View>
        ) : null}

        {uiState === DRIVER_UI_STATE.TRANSIT_IN_PROGRESS ? (
          <View style={themedStyles.actionRow}>
            <AppButton
              title="하차 사진 등록"
              variant="secondary"
              style={themedStyles.actionBtn}
              loading={isUploadingPhoto}
              disabled={isBusy || isUploadingPhoto}
              onPress={onAddDeliveryPhoto}
              textStyle={{ fontSize: 16, fontWeight: "900" }}
            />
            <AppButton
              title="하차 완료"
              variant="primary"
              style={themedStyles.actionBtn}
              loading={isBusy}
              disabled={isBusy || isUploadingPhoto || toPositiveInt(unloadingPhotos.length) <= 0}
              onPress={onConfirmUnloading}
              textStyle={{ fontSize: 16, fontWeight: "900" }}
            />
          </View>
        ) : null}

        {uiState === DRIVER_UI_STATE.COMPLETED ? (
          <AppButton
            title="정산서 보기"
            variant="primary"
            style={themedStyles.actionBtn}
            loading={isNavigatingSettlement}
            disabled={isNavigatingSettlement}
            onPress={onOpenSettlement}
            textStyle={{ fontSize: 16, fontWeight: "900" }}
          />
        ) : null}
      </View>
    );
  };

  const quotePrimaryCta = {
    id: DRIVER_CTA_ID.ACCEPT_MATCH,
    label: "배차 수락",
    variant: "primary",
    enabled: !isBusy && !isSubmittingOffer,
  } as const;
  const negotiateSecondary = {
    label: "운임 제안",
    onPress: onNegotiate,
    disabled: isBusy || isSubmittingOffer,
    loading: isSubmittingOffer,
  };
  const finalBottomBar = isRunNegotiatingDetail
    ? null
    : isQuoteMode
      ? (
        <DriverOrderActionBar
          cta={quotePrimaryCta}
          onPress={onAcceptMatch}
          primaryLoading={isBusy}
          secondaryCta={negotiateSecondary}
        />
      )
      : renderBottomBar();

  return (
    <>
      <PageScaffold
        title={pageTitle}
        subtitle={`오더 #${matchId}`}
        scroll
        padding={20}
        onPressBack={onBack}
        headerRight={headerRight}
        bottomBar={finalBottomBar}
      >
        <View style={themedStyles.content}>
          {isQuoteMode || isRunNegotiatingDetail ? null : <WorkflowStepper currentStep={currentStep} />}

          {isQuoteMode && !isRunNegotiatingDetail ? (
            <QuoteModeRouteCard quote={quote ?? (match as unknown as QuoteDetailResponse)} placements={orderedPlacements} />
          ) : null}

          {hasPlacementPayload && !isRunNegotiatingDetail ? (
            <DriverOrderLoadSimulation placements={orderedPlacements} truckSpec={truckSpec} source={loadPlanSource} />
          ) : null}

          {hasPlacementPayload && !isRunNegotiatingDetail ? (
            <AppCard style={{ padding: 16 }}>
              <View style={themedStyles.listHeader}>
                <AppText variant="heading" weight="bold">
                  Loading Order List
                </AppText>
                <AppText variant="caption" color={theme.colors.textMuted}>
                  상차 후 하차 순서 기준으로 적재물을 확인하세요.
                </AppText>
              </View>

              {orderedPlacements.length > 0 ? (
                orderedPlacements.map((p, idx) => (
                  <View key={p.id ?? idx} style={themedStyles.orderItem}>
                    <View style={themedStyles.badge}>
                      <AppText variant="caption" color="white" weight="bold">
                        {p.stopOrder ?? idx + 1}
                      </AppText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText variant="body" weight="bold">
                        화물 #{idx + 1}
                      </AppText>
                      <View style={themedStyles.specRow}>
                        <AppText variant="caption" color={theme.colors.textMuted}>
                          규격: {p.width ?? "-"}×{p.length ?? "-"}×{p.height ?? "-"} cm
                        </AppText>
                        <AppText variant="caption" color={theme.colors.textMuted}>
                          |
                        </AppText>
                        <AppText variant="caption" color={theme.colors.textMuted}>
                          위치: {p.x ?? 0}, {p.y ?? 0}, {p.z ?? 0}
                        </AppText>
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <AppText variant="caption" color={theme.colors.textMuted} style={themedStyles.emptyText}>
                  적재 데이터가 없습니다.
                </AppText>
              )}
            </AppCard>
          ) : null}

          {isQuoteMode || isRunNegotiatingDetail ? null : workflowPanel}
          {staticStatusCard}
        </View>
      </PageScaffold>

      <CounterOfferModal
        visible={isOfferModalOpen}
        isSubmitting={isSubmittingOffer}
        errorMessage={offerErrorMessage}
        onClose={onOfferModalClose}
        onSubmit={onOfferSubmit}
      />

      <Modal
        visible={selectedPhotoUri !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPhotoUri(null)}
      >
        <Pressable style={wfStyles.photoViewerBackdrop} onPress={() => setSelectedPhotoUri(null)}>
          {selectedPhotoUri ? (() => {
            const resolvedUri = toAbsolutePhotoUri(selectedPhotoUri);
            const source =
              viewerAccessToken && resolvedUri.includes("/api/delivery-photos/")
                ? { uri: resolvedUri, headers: { Authorization: `Bearer ${viewerAccessToken}` } }
                : { uri: resolvedUri };
            return <Image source={source} style={wfStyles.photoViewerImage} resizeMode="contain" />;
          })() : null}
          <Pressable style={wfStyles.photoViewerClose} onPress={() => setSelectedPhotoUri(null)}>
            <AppText style={wfStyles.photoViewerCloseText}>✕</AppText>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export default DriverOrderDetailView;
