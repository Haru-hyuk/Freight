import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Alert, Image, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, ToastAndroid, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useActiveOrder } from "@/entities/order/model/active-order.store";
import type { ActiveRun } from "@/entities/order/model/types";
import { buildKakaoDirectionsUrl } from "@/features/driver-reco/model/routeKakaoLink";
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
import { getDriverQuoteSummaryByQuoteId, listMyDriverMatches } from "@/features/matching/api";
import { DRIVER_RUN_SYNC_EVENT, publishDriverRunSyncEvent } from "@/features/matching/model/driverRunSyncEvents";
import { formatDateTime } from "@/shared/lib/format/display";
import { readApiErrorMessage } from "@/shared/lib/api/readApiErrorMessage";
import { useCurrentLocationOnce, type CurrentLocationStatus } from "@/shared/lib/location/useCurrentLocationOnce";
import { BADGE_TONE, DRIVER_CTA_ID, DRIVER_UI_STATE, getDriverCta, getPhotoGateHint, type BadgeTone, type DriverUiState } from "@/shared/lib/policy";
import type { DeliveryPhotoResponse } from "@/shared/api/generated/schemas/deliveryPhotoResponse";
import type { DriverQuoteSummaryResponse } from "@/shared/api/generated/schemas/driverQuoteSummaryResponse";
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
    headerIconButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: cBorder,
      backgroundColor: cSurface,
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

function isNetworkLikeError(error: unknown): boolean {
  const raw = readApiErrorMessage(error, "").toLowerCase();
  return (
    !raw ||
    raw.includes("network") ||
    raw.includes("timeout") ||
    raw.includes("econnrefused") ||
    raw.includes("econnreset") ||
    raw.includes("failed to fetch")
  );
}

function buildUploadErrorMessage(uploadFailed: boolean, getProbeSucceeded: boolean | null): string {
  const baseLines: string[] = ["사진 업로드에 실패했습니다."];

  if (getProbeSucceeded === false) {
    // GET도 실패 → 네트워크/cleartext/ATS 문제
    baseLines.push(
      "네트워크 또는 ATS/Cleartext 차단이 원인일 수 있습니다.",
      "- Dev Client를 재빌드했는지 확인해주세요 (OTA로는 적용 불가).",
      "- Android Emulator라면 EXPO_PUBLIC_API_BASE_URL을 10.0.2.2:{port}로 설정하세요.",
      "- 같은 Wi-Fi 환경인지, 서버가 실행 중인지 확인해주세요."
    );
  } else if (getProbeSucceeded === true) {
    // GET은 성공, 업로드만 실패 → payload/timeout 문제
    baseLines.push(
      "서버는 응답하지만 업로드에 실패했습니다.",
      "- 이미지 파일이 너무 크거나 업로드 시간이 초과되었을 수 있습니다.",
      "- 다른 사진으로 재시도해주세요."
    );
  } else {
    // 진단 미실시
    baseLines.push(
      "- 서버 주소·포트(환경설정)를 확인해주세요.",
      "- Android Emulator라면 EXPO_PUBLIC_API_BASE_URL을 10.0.2.2:{port}로 설정하세요.",
      "- 개발 빌드(Dev Client)인지 확인 후 재시도해주세요."
    );
  }

  return baseLines.join("\n");
}

function resolveUploadErrorMessage(error: unknown): string {
  const raw = readApiErrorMessage(error, "");
  if (raw && !isNetworkLikeError(error)) {
    return raw;
  }
  // 네트워크성 오류는 buildUploadErrorMessage가 진단 결과와 함께 조합하므로 여기선 기본만.
  return buildUploadErrorMessage(true, null);
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
  const [routeSummaries, setRouteSummaries] = React.useState<DriverQuoteSummaryResponse[]>([]);
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

  const loadRouteSummaries = React.useCallback(async () => {
    const groupKey = toText(activeRun.match.matchGroupKey);
    const currentQuoteId = parsePositiveInt(activeRun.summary?.quoteId ?? activeRun.match.quoteId);
    const quoteIds: number[] = [];

    if (groupKey) {
      try {
        const matches = await listMyDriverMatches();
        const grouped = matches
          .filter((match) => toText(match.matchGroupKey) === groupKey)
          .sort((a, b) => {
            const ao = parsePositiveInt(a.matchGroupOrder) || 9999;
            const bo = parsePositiveInt(b.matchGroupOrder) || 9999;
            if (ao !== bo) return ao - bo;
            return parsePositiveInt(a.matchId) - parsePositiveInt(b.matchId);
          });
        grouped.forEach((match) => {
          const qid = parsePositiveInt(match.quoteId);
          if (qid > 0 && !quoteIds.includes(qid)) quoteIds.push(qid);
        });
      } catch {
        // Fallback to current quote only
      }
    }

    if (quoteIds.length <= 0 && currentQuoteId > 0) {
      quoteIds.push(currentQuoteId);
    }

    if (quoteIds.length <= 0) {
      setRouteSummaries([]);
      return;
    }

    const summaries = await Promise.all(
      quoteIds.map(async (quoteId) => {
        const summary = await getDriverQuoteSummaryByQuoteId(quoteId);
        return summary ?? null;
      })
    );

    const safeSummaries = summaries.filter(
      (summary): summary is DriverQuoteSummaryResponse => Boolean(summary)
    );
    setRouteSummaries(safeSummaries);
  }, [activeRun.match.matchGroupKey, activeRun.match.quoteId, activeRun.summary?.quoteId]);

  const routeStops = React.useMemo<NormalizedRouteStop[]>(() => {
    const sourceSummaries =
      routeSummaries.length > 0
        ? routeSummaries
        : activeRun.summary
          ? [activeRun.summary]
          : [];
    if (sourceSummaries.length <= 0) return [];

    const pickups: NormalizedRouteStop[] = [];
    sourceSummaries.forEach((summary) => {
      const lat = toOptionalFiniteNumber(summary.originLat);
      const lng = toOptionalFiniteNumber(summary.originLng);
      if (typeof lat !== "number" || typeof lng !== "number") return;
      pickups.push({
        name: toText(summary.originAddress) || originAddress,
        lat,
        lng,
        type: "pickup",
      });
    });

    const dropoffs: NormalizedRouteStop[] = [];
    sourceSummaries.forEach((summary) => {
      const lat = toOptionalFiniteNumber(summary.destinationLat);
      const lng = toOptionalFiniteNumber(summary.destinationLng);
      if (typeof lat !== "number" || typeof lng !== "number") return;
      dropoffs.push({
        name: toText(summary.destinationAddress) || destinationAddress,
        lat,
        lng,
        type: "dropoff",
      });
    });

    const merged = [...pickups, ...dropoffs];
    return merged.length >= 2 ? merged : [];
  }, [
    activeRun.summary,
    destinationAddress,
    originAddress,
    routeSummaries,
  ]);
  const hasRouteCoordinates = routeStops.length >= 2;
  const kakaoDirectionsLink = React.useMemo(
    () => buildKakaoDirectionsUrl(routeStops).url,
    [routeStops]
  );
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

  React.useEffect(() => {
    if (safeMatchId <= 0) {
      setRouteSummaries([]);
      return;
    }
    void loadRouteSummaries();
  }, [loadRouteSummaries, safeMatchId]);

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
    await loadRouteSummaries();
  };

  const handleStartNavigation = React.useCallback(async () => {
    let targetUrl = kakaoDirectionsLink || KAKAO_MAP_WEB_URL;
    try {
      await location.request();

      const currentLat = toOptionalFiniteNumber(location.coords?.lat);
      const currentLng = toOptionalFiniteNumber(location.coords?.lng);
      if (
        typeof currentLat === "number" &&
        typeof currentLng === "number" &&
        hasRouteCoordinates
      ) {
        const stopsForNavigation: NormalizedRouteStop[] = [
          { name: "현재 위치", lat: currentLat, lng: currentLng, type: "pickup" },
          ...routeStops,
        ];
        const built = buildKakaoDirectionsUrl(stopsForNavigation);
        if (built.url) {
          targetUrl = built.url;
        }
      }

      const supported = await Linking.canOpenURL(targetUrl);
      if (!supported) {
        throw new Error("길안내 URL을 열 수 없습니다.");
      }
      await Linking.openURL(targetUrl);
    } catch (error) {
      Alert.alert("길안내 시작 실패", readApiErrorMessage(error));
    }
  }, [hasRouteCoordinates, kakaoDirectionsLink, location, routeStops]);

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
      const errorReason = readApiErrorMessage(error);
      logDriverRunEvent("uploadPhoto:failed", {
        matchId: safeMatchId,
        quoteId,
        type,
        reason: errorReason,
      });

      let getProbeSucceeded: boolean | null = null;
      if (isNetworkLikeError(error)) {
        // GET 진단: 동일 baseURL로 사진 목록 조회를 시도해 네트워크 자체 문제인지 확인
        try {
          await getDriverRunPhotos(safeMatchId);
          getProbeSucceeded = true;
        } catch {
          getProbeSucceeded = false;
        }
        logDriverRunEvent("uploadPhoto:networkProbe", {
          matchId: safeMatchId,
          getProbeSucceeded,
        });
      }

      const message = isNetworkLikeError(error)
        ? buildUploadErrorMessage(true, getProbeSucceeded)
        : resolveUploadErrorMessage(error);

      Alert.alert("사진 업로드 실패", message, [
        { text: "취소", style: "cancel" },
        { text: "다시 시도", onPress: () => void handleUploadPhoto(type) },
      ]);
    } finally {
      setUploadingPhotoType(null);
    }
  };

  const headerRight = (
    <Pressable
      onPress={() => void handleRefetch()}
      disabled={typeof onRefetchRun !== "function" || isBusy}
      style={({ pressed }) => [
        styles.headerIconButton,
        pressed ? { opacity: 0.75 } : null,
        typeof onRefetchRun !== "function" || isBusy ? { opacity: 0.5 } : null,
      ]}
      accessibilityRole="button"
      accessibilityLabel="새로고침"
    >
      {isSyncing ? (
        <ActivityIndicator size="small" color={theme.colors.textMuted} />
      ) : (
        <Ionicons name="refresh" size={18} color={theme.colors.textMain} />
      )}
    </Pressable>
  );

  return (
    <PageScaffold
      title="운행정보"
      scroll={false}
      padding={0}
      onPressBack={handleViewRunList}
      backLabel="운행 목록"
      headerRight={headerRight}
    >
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
                title="길안내 시작하기"
                variant="secondary"
                onPress={() => void handleStartNavigation()}
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

        {uiState === DRIVER_UI_STATE.TRANSIT_IN_PROGRESS ? (
          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
            <AppButton
              title={driverCta.label}
              onPress={() => void handleCompleteTransit()}
              loading={isCompleting}
              disabled={!canCompleteTransit || isBusy}
              style={styles.completeButton}
            />
          </View>
        ) : null}
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
