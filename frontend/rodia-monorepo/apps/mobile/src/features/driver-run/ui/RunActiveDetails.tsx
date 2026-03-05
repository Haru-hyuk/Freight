import React from "react";
import { ActivityIndicator, Alert, Image, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, ToastAndroid, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useActiveOrder } from "@/entities/order/model/active-order.store";
import type { ActiveRun } from "@/entities/order/model/types";
import type { NormalizedRouteStop } from "@/features/driver-reco/model/routeSummary";
import { RecoRouteWebView } from "@/features/driver-reco/ui/RecoRouteWebView";
import {
  completeDriverTransit,
  getDriverRunPhotos,
  submitDriverRunGps,
  type DriverPhotoType,
  updateDriverRunTrackingSharing,
  uploadDriverRunPhoto,
} from "@/features/driver-run/api/driver-run-api";
import { DRIVER_RUN_SYNC_EVENT, publishDriverRunSyncEvent } from "@/features/matching/model/driverRunSyncEvents";
import { formatDateTime } from "@/shared/lib/format/display";
import { readApiErrorMessage } from "@/shared/lib/api/readApiErrorMessage";
import { useCurrentLocationOnce, type CurrentLocationStatus } from "@/shared/lib/location/useCurrentLocationOnce";
import { BADGE_TONE, DRIVER_CTA_ID, DRIVER_UI_STATE, getDriverCta, getPhotoGateHint, type BadgeTone, type DriverUiState } from "@/shared/lib/policy";
import type { DeliveryPhotoResponse } from "@/shared/api/generated/schemas/deliveryPhotoResponse";
import { safeNumber, safeString, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

declare const require: ((name: string) => unknown) | undefined;

type PickerPermissionResponse = {
  granted?: boolean;
};

type PickerAsset = {
  uri?: string | null;
};

type PickerResult = {
  canceled?: boolean;
  assets?: PickerAsset[];
};

type ImagePickerModule = {
  MediaTypeOptions?: {
    Images?: unknown;
  };
  requestMediaLibraryPermissionsAsync?: () => Promise<PickerPermissionResponse>;
  launchImageLibraryAsync?: (options: Record<string, unknown>) => Promise<PickerResult>;
};

type Props = {
  activeRun: ActiveRun;
  uiState: DriverUiState;
  driverBadgeLabel: string;
  driverBadgeTone: BadgeTone;
  driverStatusTitle: string;
  isSyncing?: boolean;
  onRefetchRun?: () => Promise<void> | void;
};

const KAKAO_MAP_WEB_URL = "https://map.kakao.com/";
const IMAGE_PICKER_MISSING_MESSAGE = "이미지 선택 모듈(expo-image-picker)이 없어 사진 업로드를 사용할 수 없습니다.";

const useStyles = createThemedStyles((theme) => {
  const spacing = safeNumber(theme?.layout?.spacing?.base, 4);
  const cSurfaceAlt = safeString(theme?.colors?.bgSurfaceAlt, "#F8FAFC");
  const cSurface = safeString(theme?.colors?.bgSurface, "#FFFFFF");
  const cTextMain = safeString(theme?.colors?.textMain, "#111827");
  const cTextSub = safeString(theme?.colors?.textSub, "#334155");
  const cTextMuted = safeString(theme?.colors?.textMuted, "#64748B");
  const cBorder = safeString(theme?.colors?.borderDefault, "#E2E8F0");

  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: cSurfaceAlt,
    },
    content: {
      paddingHorizontal: spacing * 5,
      paddingTop: spacing * 4,
      paddingBottom: spacing * 4,
      gap: spacing * 4,
    },
    contentScroll: {
      flex: 1,
    },
    statusBadgeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing * 2,
    },
    statusBadge: {
      minHeight: 28,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: spacing * 3,
      alignItems: "center",
      justifyContent: "center",
    },
    statusBadgeText: {
      fontSize: safeNumber(theme?.typography?.scale?.caption?.size, 12) + 1,
      lineHeight: safeNumber(theme?.typography?.scale?.caption?.lineHeight, 16) + 2,
      fontWeight: "900",
    },
    idText: {
      color: cTextMuted,
      fontSize: safeNumber(theme?.typography?.scale?.caption?.size, 12) + 1,
      lineHeight: safeNumber(theme?.typography?.scale?.caption?.lineHeight, 16) + 2,
      fontWeight: "700",
    },
    routeCard: {
      borderRadius: 16,
      padding: spacing * 4,
      gap: spacing * 4,
    },
    routeCardTitle: {
      color: cTextMain,
      fontSize: safeNumber(theme?.typography?.scale?.detail?.size, 14) + 1,
      lineHeight: safeNumber(theme?.typography?.scale?.detail?.lineHeight, 20) + 2,
      fontWeight: "900",
    },
    routeRow: {
      flexDirection: "row",
      alignItems: "stretch",
      gap: spacing * 2,
    },
    routeRail: {
      width: 18,
      alignItems: "center",
    },
    routeDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginTop: 7,
    },
    routeLine: {
      width: 2,
      flex: 1,
      marginTop: 4,
      backgroundColor: tint(cTextMain, 0.12, cBorder),
    },
    routeBody: {
      flex: 1,
      paddingBottom: spacing * 2,
      gap: spacing,
    },
    routeLabel: {
      color: cTextMuted,
      fontSize: safeNumber(theme?.typography?.scale?.caption?.size, 12) + 1,
      lineHeight: safeNumber(theme?.typography?.scale?.caption?.lineHeight, 16) + 2,
      fontWeight: "800",
    },
    routeAddress: {
      color: cTextMain,
      fontSize: safeNumber(theme?.typography?.scale?.detail?.size, 14) + 1,
      lineHeight: safeNumber(theme?.typography?.scale?.detail?.lineHeight, 20) + 2,
      fontWeight: "900",
    },
    routeMapWrap: {
      gap: spacing * 2,
    },
    routeMapButton: {
      minHeight: 40,
    },
    routeMapHint: {
      color: cTextMuted,
      fontSize: safeNumber(theme?.typography?.scale?.caption?.size, 12),
      lineHeight: safeNumber(theme?.typography?.scale?.caption?.lineHeight, 16),
      fontWeight: "600",
    },
    routeFallbackAddresses: {
      gap: spacing,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: cBorder,
      backgroundColor: cSurface,
      paddingHorizontal: spacing * 3,
      paddingVertical: spacing * 2,
    },
    routeFallbackAddressText: {
      color: cTextSub,
      fontSize: safeNumber(theme?.typography?.scale?.caption?.size, 12) + 1,
      lineHeight: safeNumber(theme?.typography?.scale?.caption?.lineHeight, 16) + 2,
      fontWeight: "700",
    },
    infoCard: {
      borderRadius: 16,
      padding: spacing * 4,
      gap: spacing * 3,
    },
    infoCardTitle: {
      color: cTextMain,
      fontSize: safeNumber(theme?.typography?.scale?.detail?.size, 14) + 1,
      lineHeight: safeNumber(theme?.typography?.scale?.detail?.lineHeight, 20) + 2,
      fontWeight: "900",
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing * 2,
    },
    infoLabel: {
      color: cTextMuted,
      fontSize: safeNumber(theme?.typography?.scale?.detail?.size, 14),
      lineHeight: safeNumber(theme?.typography?.scale?.detail?.lineHeight, 20),
      fontWeight: "700",
    },
    infoValue: {
      color: cTextSub,
      fontSize: safeNumber(theme?.typography?.scale?.detail?.size, 14),
      lineHeight: safeNumber(theme?.typography?.scale?.detail?.lineHeight, 20),
      fontWeight: "800",
    },
    helperText: {
      color: cTextMuted,
      fontSize: safeNumber(theme?.typography?.scale?.caption?.size, 12),
      lineHeight: safeNumber(theme?.typography?.scale?.caption?.lineHeight, 16),
      fontWeight: "600",
    },
    photoCard: {
      borderRadius: 16,
      padding: spacing * 4,
      gap: spacing * 3,
    },
    photoSection: {
      gap: spacing * 2,
    },
    photoHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing * 2,
    },
    photoSectionTitle: {
      color: cTextSub,
      fontSize: safeNumber(theme?.typography?.scale?.detail?.size, 14),
      lineHeight: safeNumber(theme?.typography?.scale?.detail?.lineHeight, 20),
      fontWeight: "800",
    },
    photoUploadButton: {
      minHeight: 34,
      minWidth: 92,
    },
    photoThumbRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing * 2,
    },
    photoThumb: {
      width: 88,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: cBorder,
      backgroundColor: cSurface,
      overflow: "hidden",
    },
    photoThumbImage: {
      width: "100%",
      height: 72,
      backgroundColor: cSurfaceAlt,
    },
    photoThumbMeta: {
      paddingHorizontal: spacing * 1.5,
      paddingVertical: spacing,
      gap: spacing * 0.5,
    },
    photoThumbType: {
      color: cTextSub,
      fontSize: safeNumber(theme?.typography?.scale?.caption?.size, 12),
      lineHeight: safeNumber(theme?.typography?.scale?.caption?.lineHeight, 16),
      fontWeight: "800",
    },
    photoThumbTime: {
      color: cTextMuted,
      fontSize: safeNumber(theme?.typography?.scale?.caption?.size, 12),
      lineHeight: safeNumber(theme?.typography?.scale?.caption?.lineHeight, 16),
      fontWeight: "600",
    },
    photoEmpty: {
      color: cTextMuted,
      fontSize: safeNumber(theme?.typography?.scale?.caption?.size, 12),
      lineHeight: safeNumber(theme?.typography?.scale?.caption?.lineHeight, 16),
      fontWeight: "600",
    },
    bottomBar: {
      paddingHorizontal: spacing * 5,
      paddingTop: spacing * 3,
      gap: spacing * 2,
      borderTopWidth: 1,
      borderTopColor: cBorder,
      backgroundColor: cSurface,
    },
    listButton: {
      minHeight: 48,
    },
    completeButton: {
      minHeight: 52,
    },
    refreshButton: {
      minHeight: 48,
    },
    gpsButton: {
      minHeight: 40,
    },
    syncRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing * 2,
      flexWrap: "wrap",
    },
    syncTimeLabel: {
      color: cTextMuted,
      fontSize: safeNumber(theme?.typography?.scale?.caption?.size, 12),
      lineHeight: safeNumber(theme?.typography?.scale?.caption?.lineHeight, 16),
      fontWeight: "600",
    },
    syncingIndicatorText: {
      color: cTextMuted,
      fontSize: safeNumber(theme?.typography?.scale?.caption?.size, 12),
      lineHeight: safeNumber(theme?.typography?.scale?.caption?.lineHeight, 16),
      fontWeight: "600",
    },
    gpsLastSendText: {
      color: cTextMuted,
      fontSize: safeNumber(theme?.typography?.scale?.caption?.size, 12),
      lineHeight: safeNumber(theme?.typography?.scale?.caption?.lineHeight, 16),
      fontWeight: "600",
    },
    photoViewerBackdrop: {
      flex: 1,
      backgroundColor: "#000000CC",
      alignItems: "center",
      justifyContent: "center",
    },
    photoViewerImage: {
      width: "100%",
      height: "80%",
    },
    photoViewerClose: {
      position: "absolute",
      top: 48,
      right: 20,
      padding: spacing * 3,
    },
    photoViewerCloseText: {
      color: "#FFFFFF",
      fontSize: 28,
      fontWeight: "700",
    },
  });
});

function parsePositiveInt(value: unknown): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function toOptionalFiniteNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function resolvePhotoUri(photo: DeliveryPhotoResponse): string {
  return toText(photo.fileUrl);
}

function resolvePhotoTypeLabel(type: DriverPhotoType): string {
  if (type === "PICKUP") return "상차";
  return "하차";
}

function resolvePhotoGatePassed(
  uiState: DriverUiState,
  pickupPhotos: DeliveryPhotoResponse[],
  deliveryPhotos: DeliveryPhotoResponse[]
): boolean {
  if (uiState === DRIVER_UI_STATE.PICKUP_IN_PROGRESS) {
    return pickupPhotos.length > 0;
  }
  if (uiState === DRIVER_UI_STATE.TRANSIT_IN_PROGRESS) {
    return deliveryPhotos.length > 0;
  }
  return true;
}

function loadImagePickerModule(): ImagePickerModule | null {
  if (typeof require !== "function") return null;

  try {
    return require("expo-image-picker") as ImagePickerModule;
  } catch {
    return null;
  }
}

function resolveStatusPalette(tone: BadgeTone, colors: Record<string, string>) {
  if (tone === BADGE_TONE.ATTENTION) {
    return {
      bg: tint(colors.brandPrimary, 0.1, colors.bgSurface),
      text: colors.brandPrimary,
      border: tint(colors.brandPrimary, 0.25, colors.borderDefault),
    };
  }
  if (tone === BADGE_TONE.PROGRESS) {
    return {
      bg: tint(colors.semanticSuccess, 0.1, colors.bgSurface),
      text: colors.semanticSuccess,
      border: tint(colors.semanticSuccess, 0.25, colors.borderDefault),
    };
  }
  if (tone === BADGE_TONE.CLOSED) {
    return {
      bg: tint(colors.semanticInfo, 0.1, colors.bgSurface),
      text: colors.semanticInfo,
      border: tint(colors.semanticInfo, 0.25, colors.borderDefault),
    };
  }
  return {
    bg: tint(colors.textMuted, 0.1, colors.bgSurface),
    text: colors.textMuted,
    border: tint(colors.textMuted, 0.25, colors.borderDefault),
  };
}

function showTransientMessage(message: string) {
  if (Platform.OS === "android") {
    ToastAndroid.show(message, ToastAndroid.SHORT);
    return;
  }
  Alert.alert("안내", message);
}

function logDriverRunEvent(tag: string, payload: Record<string, unknown>) {
  if (!__DEV__) return;
  console.info(`[driver-run][${tag}]`, payload);
}

function formatHHMM(value: unknown): string {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "-";
  const ts = Date.parse(raw);
  if (!Number.isFinite(ts)) return "-";
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function resolveGpsStatusMessage(status: CurrentLocationStatus): string {
  if (status === "idle") return "현재 위치를 1회 전송합니다.";
  if (status === "requesting") return "위치 권한 확인 중...";
  if (status === "ready") return "좌표 확보됨. 전송 가능";
  if (status === "denied") return "위치 권한이 필요합니다. 설정에서 허용해주세요.";
  return "위치 정보를 가져오지 못했습니다.";
}

export function RunActiveDetails({
  activeRun,
  uiState,
  driverBadgeLabel,
  driverBadgeTone,
  driverStatusTitle,
  isSyncing = false,
  onRefetchRun,
}: Props) {
  const theme = useAppTheme();
  const styles = useStyles();
  const { clearActiveRun } = useActiveOrder();
  const insets = useSafeAreaInsets();
  const colors = theme.colors as Record<string, string>;
  const badgePalette = resolveStatusPalette(driverBadgeTone, colors);
  const [isCompleting, setIsCompleting] = React.useState(false);
  const [isTrackingSharingSubmitting, setIsTrackingSharingSubmitting] = React.useState(false);
  const [isGpsSubmitting, setIsGpsSubmitting] = React.useState(false);
  const [photos, setPhotos] = React.useState<DeliveryPhotoResponse[]>([]);
  const [isPhotoSyncing, setIsPhotoSyncing] = React.useState(false);
  const [uploadingPhotoType, setUploadingPhotoType] = React.useState<DriverPhotoType | null>(null);
  const [isRouteMapVisible, setIsRouteMapVisible] = React.useState(true);
  const [lastGpsSendResult, setLastGpsSendResult] = React.useState<"success" | "failure" | null>(null);
  const [selectedPhotoUri, setSelectedPhotoUri] = React.useState<string | null>(null);
  const location = useCurrentLocationOnce();

  const safeMatchId = parsePositiveInt(activeRun.match.matchId);
  const quoteId = parsePositiveInt(activeRun.summary?.quoteId ?? activeRun.match.quoteId);
  const originAddress = activeRun.summary?.originAddress || "-";
  const destinationAddress = activeRun.summary?.destinationAddress || "-";
  const trackingSharingEnabled = activeRun.match.locationSharingEnabled === true;
  const pickupPhotos = React.useMemo(
    () => photos.filter((photo) => toText(photo.type).toUpperCase() === "PICKUP"),
    [photos]
  );
  const deliveryPhotos = React.useMemo(
    () => photos.filter((photo) => toText(photo.type).toUpperCase() === "DELIVERY"),
    [photos]
  );
  const photoGatePassed = React.useMemo(
    () => resolvePhotoGatePassed(uiState, pickupPhotos, deliveryPhotos),
    [deliveryPhotos, pickupPhotos, uiState]
  );
  const driverCta = React.useMemo(() => getDriverCta(uiState, photoGatePassed), [photoGatePassed, uiState]);
  const photoGateHint = React.useMemo(() => getPhotoGateHint(uiState, photoGatePassed), [photoGatePassed, uiState]);
  const canCompleteTransit =
    safeMatchId > 0 && driverCta.id === DRIVER_CTA_ID.MARK_DROPOFF && driverCta.enabled;
  const locationStatus = location.status;
  const isLocationDenied = locationStatus === "denied";
  const isLocationError = locationStatus === "error";
  const isLocationRequesting = locationStatus === "requesting";
  const isGpsActionDisabled = safeMatchId <= 0 || isLocationDenied || isLocationError;
  const isBusy =
    isSyncing ||
    isCompleting ||
    isTrackingSharingSubmitting ||
    isGpsSubmitting ||
    isLocationRequesting ||
    isPhotoSyncing ||
    uploadingPhotoType !== null;
  const trackingSharingUpdatedAtText = formatDateTime(activeRun.match.locationSharingUpdatedAt, "-");

  const routeStops = React.useMemo<NormalizedRouteStop[]>(() => {
    const originLat = toOptionalFiniteNumber(activeRun.summary?.originLat);
    const originLng = toOptionalFiniteNumber(activeRun.summary?.originLng);
    const destinationLat = toOptionalFiniteNumber(activeRun.summary?.destinationLat);
    const destinationLng = toOptionalFiniteNumber(activeRun.summary?.destinationLng);
    if (
      typeof originLat !== "number" ||
      typeof originLng !== "number" ||
      typeof destinationLat !== "number" ||
      typeof destinationLng !== "number"
    ) {
      return [];
    }

    return [
      {
        name: originAddress,
        lat: originLat,
        lng: originLng,
        type: "pickup",
      },
      {
        name: destinationAddress,
        lat: destinationLat,
        lng: destinationLng,
        type: "dropoff",
      },
    ];
  }, [
    activeRun.summary?.destinationLat,
    activeRun.summary?.destinationLng,
    activeRun.summary?.originLat,
    activeRun.summary?.originLng,
    destinationAddress,
    originAddress,
  ]);
  const hasRouteCoordinates = routeStops.length >= 2;
  const syncTimeText = formatHHMM(activeRun.match.updatedAt ?? activeRun.match.createdAt);
  const gpsStatusMessage = resolveGpsStatusMessage(locationStatus);

  const loadPhotos = React.useCallback(
    async (input?: { showError?: boolean }) => {
      const showError = input?.showError !== false;
      if (safeMatchId <= 0) {
        setPhotos([]);
        return;
      }

      try {
        setIsPhotoSyncing(true);
        const nextPhotos = await getDriverRunPhotos(safeMatchId);
        setPhotos(nextPhotos);
      } catch (error) {
        if (!showError) return;
        Alert.alert("사진 동기화 실패", readApiErrorMessage(error), [
          { text: "취소", style: "cancel" },
          { text: "다시 시도", onPress: () => void loadPhotos() },
        ]);
      } finally {
        setIsPhotoSyncing(false);
      }
    },
    [safeMatchId]
  );

  React.useEffect(() => {
    if (safeMatchId <= 0) {
      setPhotos([]);
      return;
    }
    void loadPhotos({ showError: false });
  }, [loadPhotos, safeMatchId]);

  const handleViewRunList = () => {
    if (isBusy) return;
    clearActiveRun();
  };

  const handleRefetch = async () => {
    if (isBusy) return;
    if (typeof onRefetchRun === "function") {
      await onRefetchRun();
    }
    await loadPhotos({ showError: false });
  };

  const handleOpenKakaoMap = React.useCallback(async () => {
    try {
      const supported = await Linking.canOpenURL(KAKAO_MAP_WEB_URL);
      if (!supported) {
        throw new Error("카카오맵 웹 주소를 열 수 없습니다.");
      }
      await Linking.openURL(KAKAO_MAP_WEB_URL);
    } catch (error) {
      Alert.alert("카카오맵 열기 실패", readApiErrorMessage(error));
    }
  }, []);

  const handleCompleteTransit = async () => {
    if (!canCompleteTransit || isCompleting) return;

    try {
      setIsCompleting(true);
      const result = await completeDriverTransit(safeMatchId);
      if (!result) {
        throw new Error("운행 완료 응답이 비어 있습니다.");
      }
      if (typeof onRefetchRun === "function") {
        await onRefetchRun();
      }
      publishDriverRunSyncEvent({
        type: DRIVER_RUN_SYNC_EVENT.RUN_STATUS_UPDATED,
        matchIds: [safeMatchId],
        quoteIds: [quoteId],
        source: "driver-run:complete",
      });
      logDriverRunEvent("completeTransit:success", {
        matchId: safeMatchId,
        quoteId,
      });
      showTransientMessage("운행을 완료했습니다.");
      clearActiveRun();
    } catch (error) {
      logDriverRunEvent("completeTransit:failed", {
        matchId: safeMatchId,
        quoteId,
        reason: readApiErrorMessage(error),
      });
      Alert.alert("운행 완료 실패", readApiErrorMessage(error), [
        { text: "취소", style: "cancel" },
        { text: "다시 시도", onPress: () => void handleCompleteTransit() },
      ]);
    } finally {
      setIsCompleting(false);
    }
  };

  const handleToggleTrackingSharing = async (enabled: boolean) => {
    if (safeMatchId <= 0 || isTrackingSharingSubmitting) return;

    try {
      setIsTrackingSharingSubmitting(true);
      const result = await updateDriverRunTrackingSharing(safeMatchId, { enabled });
      if (!result) {
        throw new Error("위치 공유 응답이 비어 있습니다.");
      }
      if (typeof onRefetchRun === "function") {
        await onRefetchRun();
      }
      await loadPhotos({ showError: false });
      publishDriverRunSyncEvent({
        type: DRIVER_RUN_SYNC_EVENT.RUN_STATUS_UPDATED,
        matchIds: [safeMatchId],
        quoteIds: [quoteId],
        source: "driver-run:tracking-share",
      });
      logDriverRunEvent("trackingSharing:success", {
        matchId: safeMatchId,
        quoteId,
        enabled,
      });
      Alert.alert("위치 공유", enabled ? "위치 공유를 켰습니다." : "위치 공유를 껐습니다.");
    } catch (error) {
      logDriverRunEvent("trackingSharing:failed", {
        matchId: safeMatchId,
        quoteId,
        enabled,
        reason: readApiErrorMessage(error),
      });
      Alert.alert("위치 공유 변경 실패", readApiErrorMessage(error), [
        { text: "취소", style: "cancel" },
        { text: "다시 시도", onPress: () => void handleToggleTrackingSharing(enabled) },
      ]);
    } finally {
      setIsTrackingSharingSubmitting(false);
    }
  };

  const handleSubmitGps = async () => {
    if (safeMatchId <= 0 || isGpsSubmitting || isLocationDenied || isLocationError) return;

    try {
      setIsGpsSubmitting(true);
      await location.request();
      const currentPosition = location.coords;
      if (
        typeof currentPosition?.lat !== "number" ||
        typeof currentPosition?.lng !== "number"
      ) {
        throw new Error(location.message || "현재 위치를 읽을 수 없습니다.");
      }

      const result = await submitDriverRunGps(safeMatchId, currentPosition);
      if (!result) {
        throw new Error("위치 업데이트 응답이 비어 있습니다.");
      }
      if (typeof onRefetchRun === "function") {
        await onRefetchRun();
      }
      setLastGpsSendResult("success");
      logDriverRunEvent("submitGps:success", {
        matchId: safeMatchId,
        quoteId,
        lat: currentPosition.lat,
        lng: currentPosition.lng,
        loggedAt: result.loggedAt,
      });
      showTransientMessage("현재 위치를 전송했습니다.");
    } catch (error) {
      setLastGpsSendResult("failure");
      logDriverRunEvent("submitGps:failed", {
        matchId: safeMatchId,
        quoteId,
        reason: readApiErrorMessage(error),
      });
      Alert.alert("위치 업데이트 실패", readApiErrorMessage(error), [
        { text: "취소", style: "cancel" },
        { text: "다시 시도", onPress: () => void handleSubmitGps() },
      ]);
    } finally {
      setIsGpsSubmitting(false);
    }
  };

  const handleUploadPhoto = async (type: DriverPhotoType) => {
    if (safeMatchId <= 0 || uploadingPhotoType !== null) return;

    const picker = loadImagePickerModule();
    if (!picker?.launchImageLibraryAsync || !picker?.requestMediaLibraryPermissionsAsync) {
      Alert.alert("사진 업로드", IMAGE_PICKER_MISSING_MESSAGE);
      return;
    }

    try {
      const permission = await picker.requestMediaLibraryPermissionsAsync();
      if (!permission?.granted) {
        Alert.alert("사진 업로드", "갤러리 접근 권한이 필요합니다.");
        return;
      }

      const result = await picker.launchImageLibraryAsync({
        mediaTypes: picker.MediaTypeOptions?.Images,
        allowsEditing: false,
        quality: 0.9,
      });
      if (result?.canceled) return;

      const selectedUri = toText(result?.assets?.[0]?.uri);
      if (!selectedUri) {
        Alert.alert("사진 업로드", "선택한 이미지 정보를 읽을 수 없습니다.");
        return;
      }

      setUploadingPhotoType(type);
      const uploaded = await uploadDriverRunPhoto(safeMatchId, {
        localUri: selectedUri,
        type,
      });
      if (!uploaded) {
        throw new Error("사진 업로드 응답이 비어 있습니다.");
      }

      await loadPhotos({ showError: false });
      publishDriverRunSyncEvent({
        type: DRIVER_RUN_SYNC_EVENT.RUN_STATUS_UPDATED,
        matchIds: [safeMatchId],
        quoteIds: [quoteId],
        source: "driver-run:photo-upload",
      });
      logDriverRunEvent("uploadPhoto:success", {
        matchId: safeMatchId,
        quoteId,
        type,
        photoId: uploaded.photoId,
      });
      Alert.alert("사진 업로드", `${resolvePhotoTypeLabel(type)} 사진이 업로드되었습니다.`);
    } catch (error) {
      logDriverRunEvent("uploadPhoto:failed", {
        matchId: safeMatchId,
        quoteId,
        type,
        reason: readApiErrorMessage(error),
      });
      Alert.alert("사진 업로드 실패", readApiErrorMessage(error), [
        { text: "취소", style: "cancel" },
        { text: "다시 시도", onPress: () => void handleUploadPhoto(type) },
      ]);
    } finally {
      setUploadingPhotoType(null);
    }
  };

  return (
    <PageScaffold title="운행정보" scroll={false} padding={0}>
      <View style={styles.root}>
        <ScrollView style={styles.contentScroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.statusBadgeRow}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: badgePalette.bg, borderColor: badgePalette.border },
              ]}
            >
              <AppText style={[styles.statusBadgeText, { color: badgePalette.text }]}>
                {driverBadgeLabel}
              </AppText>
            </View>
            <AppText style={styles.idText}>{`매칭 #${safeMatchId || "-"}${quoteId > 0 ? ` · 견적 #${quoteId}` : ""}`}</AppText>
          </View>
          <View style={styles.syncRow}>
            <AppText style={styles.syncTimeLabel}>{`마지막 동기화 시각: ${syncTimeText}`}</AppText>
            {isSyncing ? (
              <>
                <ActivityIndicator size="small" color={colors.textMuted} />
                <AppText style={styles.syncingIndicatorText}>동기화 중...</AppText>
              </>
            ) : null}
          </View>

          <AppCard outlined style={styles.routeCard}>
            <AppText style={styles.routeCardTitle}>운송 경로</AppText>

            <View style={styles.routeRow}>
              <View style={styles.routeRail}>
                <View style={[styles.routeDot, { backgroundColor: theme.colors.semanticInfo }]} />
                <View style={styles.routeLine} />
              </View>
              <View style={styles.routeBody}>
                <AppText style={styles.routeLabel}>출발지</AppText>
                <AppText style={styles.routeAddress}>{originAddress}</AppText>
              </View>
            </View>

            <View style={styles.routeRow}>
              <View style={styles.routeRail}>
                <View style={[styles.routeDot, { backgroundColor: theme.colors.brandPrimary }]} />
              </View>
              <View style={styles.routeBody}>
                <AppText style={styles.routeLabel}>도착지</AppText>
                <AppText style={styles.routeAddress}>{destinationAddress}</AppText>
              </View>
            </View>

            <View style={styles.routeMapWrap}>
              {hasRouteCoordinates ? (
                <>
                  <AppButton
                    title={isRouteMapVisible ? "카카오 경로 숨기기" : "카카오 경로 보기"}
                    variant="secondary"
                    onPress={() => setIsRouteMapVisible((prev) => !prev)}
                    style={styles.routeMapButton}
                  />
                  {isRouteMapVisible ? <RecoRouteWebView stops={routeStops} loading={false} /> : null}
                </>
              ) : (
                <>
                  <AppText style={styles.routeMapHint}>
                    좌표 정보가 없어 지도 미리보기를 표시할 수 없습니다.
                  </AppText>
                  <View style={styles.routeFallbackAddresses}>
                    <AppText style={styles.routeFallbackAddressText}>{`출발: ${originAddress}`}</AppText>
                    <AppText style={styles.routeFallbackAddressText}>{`도착: ${destinationAddress}`}</AppText>
                  </View>
                </>
              )}
              <AppButton
                title={hasRouteCoordinates ? "카카오맵 열기 (좌표 기반)" : "카카오맵 열기"}
                variant="secondary"
                onPress={() => void handleOpenKakaoMap()}
                disabled={isBusy}
                style={styles.routeMapButton}
              />
            </View>
          </AppCard>

          <AppCard outlined style={styles.infoCard}>
            <AppText style={styles.infoCardTitle}>운행 상태</AppText>
            <View style={styles.infoRow}>
              <AppText style={styles.infoLabel}>현재 상태</AppText>
              <AppText style={styles.infoValue}>{driverStatusTitle}</AppText>
            </View>
            <View style={styles.infoRow}>
              <AppText style={styles.infoLabel}>실시간 위치 공유</AppText>
              <Switch
                value={trackingSharingEnabled}
                disabled={safeMatchId <= 0 || isTrackingSharingSubmitting || isSyncing}
                onValueChange={(enabled) => {
                  void handleToggleTrackingSharing(enabled);
                }}
                trackColor={{ false: tint(theme.colors.textMuted, 0.25, "#CBD5E1"), true: tint(theme.colors.brandPrimary, 0.45, "#93C5FD") }}
                thumbColor={trackingSharingEnabled ? theme.colors.brandPrimary : theme.colors.bgSurface}
              />
            </View>
            <View style={styles.infoRow}>
              <AppText style={styles.infoLabel}>위치 공유 변경 시각</AppText>
              <AppText style={styles.infoValue}>{trackingSharingUpdatedAtText}</AppText>
            </View>
            <View style={styles.infoRow}>
              <AppText style={styles.infoLabel}>GPS 전송</AppText>
              <AppButton
                title="현재 위치 전송"
                variant="secondary"
                onPress={() => void handleSubmitGps()}
                disabled={isGpsActionDisabled || isBusy}
                loading={isGpsSubmitting || isLocationRequesting}
                style={styles.gpsButton}
              />
            </View>
            <AppText style={styles.helperText}>{gpsStatusMessage}</AppText>
            {lastGpsSendResult !== null ? (
              <AppText style={styles.gpsLastSendText}>
                {lastGpsSendResult === "success" ? "마지막 전송: 성공" : "마지막 전송: 실패"}
              </AppText>
            ) : null}
            {photoGateHint ? <AppText style={styles.helperText}>{photoGateHint}</AppText> : null}
          </AppCard>

          <AppCard outlined style={styles.photoCard}>
            <AppText style={styles.infoCardTitle}>운행 사진</AppText>

            <View style={styles.photoSection}>
              <View style={styles.photoHeaderRow}>
                <AppText style={styles.photoSectionTitle}>상차 사진</AppText>
                <AppButton
                  title="업로드"
                  variant="secondary"
                  onPress={() => void handleUploadPhoto("PICKUP")}
                  disabled={safeMatchId <= 0 || isBusy || uploadingPhotoType !== null}
                  loading={uploadingPhotoType === "PICKUP"}
                  style={styles.photoUploadButton}
                />
              </View>
              {pickupPhotos.length > 0 ? (
                <View style={styles.photoThumbRow}>
                  {pickupPhotos.map((photo, index) => {
                    const uri = resolvePhotoUri(photo);
                    const key = parsePositiveInt(photo.photoId) || index + 1;
                    return (
                      <Pressable
                        key={`pickup-photo-${key}`}
                        style={styles.photoThumb}
                        onPress={() => uri ? setSelectedPhotoUri(uri) : null}
                      >
                        {uri ? <Image source={{ uri }} style={styles.photoThumbImage} resizeMode="cover" /> : null}
                        <View style={styles.photoThumbMeta}>
                          <AppText style={styles.photoThumbType}>상차</AppText>
                          <AppText style={styles.photoThumbTime}>
                            {formatDateTime(photo.takenAt ?? photo.createdAt, "-")}
                          </AppText>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <AppText style={styles.photoEmpty}>등록된 상차 사진이 없습니다.</AppText>
              )}
            </View>

            <View style={styles.photoSection}>
              <View style={styles.photoHeaderRow}>
                <AppText style={styles.photoSectionTitle}>하차 사진</AppText>
                <AppButton
                  title="업로드"
                  variant="secondary"
                  onPress={() => void handleUploadPhoto("DELIVERY")}
                  disabled={safeMatchId <= 0 || isBusy || uploadingPhotoType !== null}
                  loading={uploadingPhotoType === "DELIVERY"}
                  style={styles.photoUploadButton}
                />
              </View>
              {deliveryPhotos.length > 0 ? (
                <View style={styles.photoThumbRow}>
                  {deliveryPhotos.map((photo, index) => {
                    const uri = resolvePhotoUri(photo);
                    const key = parsePositiveInt(photo.photoId) || index + 1;
                    return (
                      <Pressable
                        key={`delivery-photo-${key}`}
                        style={styles.photoThumb}
                        onPress={() => uri ? setSelectedPhotoUri(uri) : null}
                      >
                        {uri ? <Image source={{ uri }} style={styles.photoThumbImage} resizeMode="cover" /> : null}
                        <View style={styles.photoThumbMeta}>
                          <AppText style={styles.photoThumbType}>하차</AppText>
                          <AppText style={styles.photoThumbTime}>
                            {formatDateTime(photo.takenAt ?? photo.createdAt, "-")}
                          </AppText>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <AppText style={styles.photoEmpty}>등록된 하차 사진이 없습니다.</AppText>
              )}
            </View>
          </AppCard>
        </ScrollView>

        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
          {uiState === DRIVER_UI_STATE.TRANSIT_IN_PROGRESS ? (
            <AppButton
              title={driverCta.label}
              onPress={() => void handleCompleteTransit()}
              loading={isCompleting}
              disabled={!canCompleteTransit || isBusy}
              style={styles.completeButton}
            />
          ) : null}
          <AppButton
            title="새로고침"
            onPress={() => void handleRefetch()}
            variant="secondary"
            disabled={typeof onRefetchRun !== "function" || isBusy}
            loading={isSyncing}
            style={styles.refreshButton}
          />
          <AppButton
            title="운행 목록 보기"
            onPress={handleViewRunList}
            variant="secondary"
            disabled={isBusy}
            style={styles.listButton}
          />
        </View>
      </View>

      <Modal
        visible={selectedPhotoUri !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPhotoUri(null)}
      >
        <Pressable style={styles.photoViewerBackdrop} onPress={() => setSelectedPhotoUri(null)}>
          {selectedPhotoUri ? (
            <Image
              source={{ uri: selectedPhotoUri }}
              style={styles.photoViewerImage}
              resizeMode="contain"
            />
          ) : null}
          <Pressable style={styles.photoViewerClose} onPress={() => setSelectedPhotoUri(null)}>
            <AppText style={styles.photoViewerCloseText}>✕</AppText>
          </Pressable>
        </Pressable>
      </Modal>
    </PageScaffold>
  );
}
