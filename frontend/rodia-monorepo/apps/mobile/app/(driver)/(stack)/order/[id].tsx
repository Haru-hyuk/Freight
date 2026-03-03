import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Canvas } from "@react-three/fiber/native";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as THREE from "three";

import type { LoadPlanResponse, Placement, TruckSpecReferenceResponse } from "@/shared/api/generated/schemas";
import type { ParsedMatchResponseItem } from "@/features/matching/api/shipper-match-parser";
import { useMatchDetail } from "@/features/matching/model/useMatchDetail";
import {
  DRIVER_CTA_ID,
  DRIVER_UI_STATE,
  getDriverCta,
  getDriverUiStateFromRawStatus,
  type DriverUiState,
} from "@/shared/lib/policy";
import { confirmLoading, confirmUnloading, startDriving } from "@/shared/lib/mock-flow";
import { safeNumber, safeString, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppErrorState } from "@/shared/ui/kit/AppErrorState";
import { AppSpinner } from "@/shared/ui/kit/AppSpinner";
import { AppText } from "@/shared/ui/kit/AppText";
import { DriverOrderDetailHeader } from "@/features/driver-orders/ui/detail/DriverOrderDetailHeader";
import { DriverOrderNegotiatingCard } from "@/features/driver-orders/ui/detail/DriverOrderNegotiatingCard";
import { DriverOrderPaymentPendingCard } from "@/features/driver-orders/ui/detail/DriverOrderPaymentPendingCard";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

const SCALE = 0.01;

type DriverOrderRouteParams = {
  id?: string | string[];
};

type MatchWithWorkflowPayload = ParsedMatchResponseItem & {
  loadingPhotos?: string[];
  unloadingPhotos?: string[];
};

type WorkflowStep = { key: string; label: string };

const WORKFLOW_STEPS: readonly WorkflowStep[] = [
  { key: "READY", label: "운행 전" },
  { key: "PICKUP", label: "상차 중" },
  { key: "TRANSIT", label: "운행 중" },
  { key: "DROPOFF", label: "하차 완료" },
];

function parsePositiveRouteId(rawId: string | string[] | undefined): number {
  const candidate = Array.isArray(rawId) ? rawId[0] : rawId;
  const parsed = Number(candidate);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
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
}: {
  placements: Placement[];
  truckSpec: TruckSpecReferenceResponse | null | undefined;
}) => {
  const theme = useAppTheme();
  const { lengthCm, widthCm, heightCm } = resolveTruckDimensions(truckSpec);
  const truckPos: [number, number, number] = [(widthCm / 2) * SCALE, (heightCm / 2) * SCALE, (lengthCm / 2) * SCALE];
  const truckArgs: [number, number, number] = [widthCm * SCALE, heightCm * SCALE, lengthCm * SCALE];

  return (
    <AppCard style={simStyles.card}>
      <View style={simStyles.header}>
        <View>
          <AppText variant="heading" weight="bold">
            3D 적재 시뮬레이션
          </AppText>
          <AppText variant="caption" color={theme.colors.textMuted}>
            적재 계획 기준 실시간 검토 뷰
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

const PhotoGrid = ({
  photos,
  onAdd,
  readOnly = false,
}: {
  photos: string[];
  onAdd?: () => void;
  readOnly?: boolean;
}) => {
  const theme = useAppTheme();
  return (
    <View style={wfStyles.photoRow}>
      {photos.map((_, idx) => (
        <View key={idx} style={wfStyles.photoThumb}>
          <Ionicons name="image-outline" size={20} color={theme.colors.brandPrimary} />
          <AppText variant="caption" color={theme.colors.textMuted}>
            #{idx + 1}
          </AppText>
        </View>
      ))}
      {!readOnly ? (
        <Pressable style={wfStyles.photoAddBtn} onPress={onAdd}>
          <Ionicons name="add" size={22} color={theme.colors.brandPrimary} />
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
} as const;

const useStyles = createThemedStyles((theme) => {
  const spacing = safeNumber(theme?.layout?.spacing?.base, 4);
  const cBorder = safeString(theme?.colors?.borderDefault, "#E2E8F0");
  return StyleSheet.create({
    stateWrap: { paddingTop: spacing * 12 },
    content: { gap: spacing * 3, paddingBottom: spacing * 26 },
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
    workflowCard: { padding: 16, gap: 8 },
    workflowTitle: { marginBottom: 2 },
    workflowBodyText: {
      color: theme.colors.textSub,
      fontSize: 13,
      fontWeight: "700",
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

export default function DriverOrderDetailRoute() {
  const params = useLocalSearchParams<DriverOrderRouteParams>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const themedStyles = useStyles();
  const theme = useAppTheme();

  const matchId = parsePositiveRouteId(params.id);
  const viewModel = useMatchDetail(matchId);

  const [loadingPhotos, setLoadingPhotos] = useState<string[]>([]);
  const [unloadingPhotos, setUnloadingPhotos] = useState<string[]>([]);
  const [isBusy, setIsBusy] = useState(false);

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

  const handleAddPhoto = useCallback(async (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      const uris = result.assets.map((asset: { uri: string }) => asset.uri);
      setter((prev) => [...prev, ...uris]);
    }
  }, []);

  useEffect(() => {
    const match = (viewModel.match as MatchWithWorkflowPayload | null) ?? null;
    if (!match) return;
    setLoadingPhotos(Array.isArray(match.loadingPhotos) ? [...match.loadingPhotos] : []);
    setUnloadingPhotos(Array.isArray(match.unloadingPhotos) ? [...match.unloadingPhotos] : []);
  }, [
    viewModel.match ? (viewModel.match as MatchWithWorkflowPayload).matchId : 0,
    viewModel.match ? (viewModel.match as MatchWithWorkflowPayload).updatedAt : "",
  ]);

  const cTextMuted = safeString(theme?.colors?.textMuted, "#64748B");
  const headerRight = (
    <Pressable style={themedStyles.refreshBtn} onPress={() => void viewModel.refetch()}>
      <Ionicons name="refresh" size={22} color={cTextMuted} />
    </Pressable>
  );

  const parsedMatch = (viewModel.match as MatchWithWorkflowPayload | null) ?? null;
  const rawStatus = String(viewModel.quote?.status ?? parsedMatch?.status ?? "");
  const uiState = getDriverUiStateFromRawStatus(rawStatus);
  const cta = getDriverCta(uiState, true);
  const isQuoteState =
    uiState === DRIVER_UI_STATE.READY_TO_ACCEPT || uiState === DRIVER_UI_STATE.NEGOTIATING;
  const pageTitle = isQuoteState ? "견적 상세" : "오더 상세";

  const loadPlan: LoadPlanResponse | undefined = parsedMatch?.loadPlan;
  const placements: Placement[] = Array.isArray(loadPlan?.placements) ? loadPlan.placements : [];
  const hasPlacementPayload = Array.isArray(loadPlan?.placements);
  const truckSpec: TruckSpecReferenceResponse | undefined = parsedMatch?.truckSpec;
  const currentStep = resolveWorkflowStepIndex(uiState);

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

  const workflowPanel = useMemo(() => {
    if (uiState === DRIVER_UI_STATE.ASSIGNED) {
      return (
        <AppCard style={themedStyles.workflowCard}>
          <AppText variant="heading" weight="bold" style={themedStyles.workflowTitle}>
            운행 준비 완료
          </AppText>
          <AppText style={themedStyles.workflowBodyText}>
            운행 시작 버튼을 누르면 상차 단계로 이동합니다.
          </AppText>
        </AppCard>
      );
    }

    if (uiState === DRIVER_UI_STATE.PICKUP_IN_PROGRESS) {
      return (
        <AppCard style={themedStyles.workflowCard}>
          <AppText variant="heading" weight="bold" style={themedStyles.workflowTitle}>
            상차 사진 등록
          </AppText>
          <AppText style={themedStyles.workflowBodyText}>
            상차 사진을 등록한 뒤 하단의 상차 완료 버튼으로 다음 단계를 진행해 주세요.
          </AppText>
          <PhotoGrid photos={loadingPhotos} onAdd={() => void handleAddPhoto(setLoadingPhotos)} />
        </AppCard>
      );
    }

    if (uiState === DRIVER_UI_STATE.TRANSIT_IN_PROGRESS) {
      return (
        <AppCard style={themedStyles.workflowCard}>
          <AppText variant="heading" weight="bold" style={themedStyles.workflowTitle}>
            하차 사진 등록
          </AppText>
          <AppText style={themedStyles.workflowBodyText}>
            하차 사진을 등록한 뒤 하단의 하차 완료 버튼으로 오더를 종료해 주세요.
          </AppText>
          <PhotoGrid
            photos={unloadingPhotos}
            onAdd={() => void handleAddPhoto(setUnloadingPhotos)}
          />
        </AppCard>
      );
    }

    if (uiState === DRIVER_UI_STATE.COMPLETED) {
      return (
        <AppCard style={themedStyles.workflowCard}>
          <AppText variant="heading" weight="bold" style={themedStyles.workflowTitle}>
            운송 완료
          </AppText>
          <AppText style={themedStyles.workflowBodyText}>상차/하차 사진 기록이 아래와 같이 저장되었습니다.</AppText>
          <AppText variant="body" weight="bold">
            상차 사진
          </AppText>
          {loadingPhotos.length > 0 ? <PhotoGrid photos={loadingPhotos} readOnly /> : <AppText style={themedStyles.workflowBodyText}>사진 대기 중</AppText>}
          <AppText variant="body" weight="bold">
            하차 사진
          </AppText>
          {unloadingPhotos.length > 0 ? <PhotoGrid photos={unloadingPhotos} readOnly /> : <AppText style={themedStyles.workflowBodyText}>사진 대기 중</AppText>}
        </AppCard>
      );
    }

    return null;
  }, [
    handleAddPhoto,
    loadingPhotos,
    themedStyles.workflowBodyText,
    themedStyles.workflowCard,
    themedStyles.workflowTitle,
    uiState,
    unloadingPhotos,
  ]);

  if (matchId <= 0) {
    return (
      <PageScaffold
        title={pageTitle}
        subtitle="오더 정보 확인"
        scroll={false}
        padding={20}
        onPressBack={() => router.back()}
      >
        <View style={themedStyles.stateWrap}>
          <AppErrorState
            title="유효한 오더 ID가 아닙니다."
            description="목록에서 오더를 다시 선택해 주세요."
            retryLabel="뒤로 가기"
            onRetry={() => router.back()}
            fullScreen={false}
          />
        </View>
      </PageScaffold>
    );
  }

  if (viewModel.isLoading || (!viewModel.match && !viewModel.errorMessage)) {
    return (
      <PageScaffold
        title={pageTitle}
        subtitle="오더 정보 확인"
        scroll={false}
        padding={20}
        onPressBack={() => router.back()}
        headerRight={headerRight}
      >
        <View style={themedStyles.stateWrap}>
          <AppSpinner label="오더 상세를 불러오는 중입니다." />
        </View>
      </PageScaffold>
    );
  }

  if (viewModel.errorMessage) {
    return (
      <PageScaffold
        title={pageTitle}
        subtitle="오더 정보 확인"
        scroll={false}
        padding={20}
        onPressBack={() => router.back()}
        headerRight={headerRight}
      >
        <View style={themedStyles.stateWrap}>
          <AppErrorState
            title="오더 상세를 불러오지 못했습니다."
            description={viewModel.errorMessage}
            retryLabel="다시 시도"
            onRetry={() => void viewModel.refetch()}
            fullScreen={false}
          />
        </View>
      </PageScaffold>
    );
  }

  const staticStatusCard =
    cta.id === DRIVER_CTA_ID.PAYMENT_PENDING ? (
      <DriverOrderPaymentPendingCard />
    ) : uiState === DRIVER_UI_STATE.NEGOTIATING ? (
      <DriverOrderNegotiatingCard quote={viewModel.quote} />
    ) : (
      <DriverOrderDetailHeader match={viewModel.match!} quote={viewModel.quote} uiState={uiState} />
    );

  const renderBottomBar = () => {
    if (uiState !== DRIVER_UI_STATE.ASSIGNED && uiState !== DRIVER_UI_STATE.PICKUP_IN_PROGRESS && uiState !== DRIVER_UI_STATE.TRANSIT_IN_PROGRESS) {
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
            onPress={handleStartDriving}
            textStyle={{ fontSize: 16, fontWeight: "900" }}
          />
        ) : null}

        {uiState === DRIVER_UI_STATE.PICKUP_IN_PROGRESS ? (
          <View style={themedStyles.actionRow}>
            <AppButton
              title="상차 사진 등록"
              variant="secondary"
              style={themedStyles.actionBtn}
              disabled={isBusy}
              onPress={() => void handleAddPhoto(setLoadingPhotos)}
              textStyle={{ fontSize: 16, fontWeight: "900" }}
            />
            <AppButton
              title="상차 완료"
              variant="primary"
              style={themedStyles.actionBtn}
              loading={isBusy}
              disabled={isBusy || toPositiveInt(loadingPhotos.length) <= 0}
              onPress={handleConfirmLoading}
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
              disabled={isBusy}
              onPress={() => void handleAddPhoto(setUnloadingPhotos)}
              textStyle={{ fontSize: 16, fontWeight: "900" }}
            />
            <AppButton
              title="하차 완료"
              variant="primary"
              style={themedStyles.actionBtn}
              loading={isBusy}
              disabled={isBusy || toPositiveInt(unloadingPhotos.length) <= 0}
              onPress={handleConfirmUnloading}
              textStyle={{ fontSize: 16, fontWeight: "900" }}
            />
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <PageScaffold
      title={pageTitle}
      subtitle={`오더 #${matchId}`}
      scroll
      padding={20}
      onPressBack={() => router.back()}
      headerRight={headerRight}
      bottomBar={renderBottomBar()}
    >
      <View style={themedStyles.content}>
        <WorkflowStepper currentStep={currentStep} />

        {hasPlacementPayload ? <DriverOrderLoadSimulation placements={placements} truckSpec={truckSpec} /> : null}

        {hasPlacementPayload ? (
          <AppCard style={{ padding: 16 }}>
            <View style={themedStyles.listHeader}>
              <AppText variant="heading" weight="bold">
                Loading Order List
              </AppText>
              <AppText variant="caption" color={theme.colors.textMuted}>
                상차 후 하차 순서 기준으로 적재물을 확인하세요.
              </AppText>
            </View>

            {placements.length > 0 ? (
              placements.map((p, idx) => (
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

        {workflowPanel}
        {staticStatusCard}
      </View>
    </PageScaffold>
  );
}
