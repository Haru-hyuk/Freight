import React from "react";
import { Alert, StyleSheet, Switch, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useActiveOrder } from "@/entities/order/model/active-order.store";
import type { ActiveRun } from "@/entities/order/model/types";
import { completeDriverTransit, submitDriverRunGps, updateDriverRunTrackingSharing } from "@/features/driver-run/api/driver-run-api";
import { readApiErrorMessage } from "@/shared/lib/api/readApiErrorMessage";
import { BADGE_TONE, DRIVER_UI_STATE, type BadgeTone, type DriverCtaConfig, type DriverUiState } from "@/shared/lib/policy";
import { safeNumber, safeString, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

type Props = {
  activeRun: ActiveRun;
  uiState: DriverUiState;
  driverBadgeLabel: string;
  driverBadgeTone: BadgeTone;
  driverStatusTitle: string;
  driverCta?: DriverCtaConfig;
  isSyncing?: boolean;
  onRefetchRun?: () => Promise<void> | void;
};

const GPS_PROVIDER_MISSING_MESSAGE = "현재 위치 연동 모듈이 없어 위치 업데이트를 사용할 수 없습니다.";

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
      flex: 1,
      paddingHorizontal: spacing * 5,
      paddingTop: spacing * 4,
      gap: spacing * 4,
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
  });
});

function parsePositiveInt(value: unknown): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
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

export function RunActiveDetails({
  activeRun,
  uiState,
  driverBadgeLabel,
  driverBadgeTone,
  driverStatusTitle,
  driverCta,
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

  const safeMatchId = parsePositiveInt(activeRun.match.matchId);
  const quoteId = parsePositiveInt(activeRun.summary?.quoteId ?? activeRun.match.quoteId);
  const originAddress = activeRun.summary?.originAddress || "-";
  const destinationAddress = activeRun.summary?.destinationAddress || "-";
  const trackingSharingEnabled = activeRun.match.locationSharingEnabled === true;
  const canCompleteTransit =
    safeMatchId > 0 &&
    (uiState === DRIVER_UI_STATE.PICKUP_IN_PROGRESS || uiState === DRIVER_UI_STATE.TRANSIT_IN_PROGRESS);
  const isBusy = isSyncing || isCompleting || isTrackingSharingSubmitting || isGpsSubmitting;
  const hasLocationProvider = false;

  const handleViewRunList = () => {
    if (isBusy) return;
    clearActiveRun();
  };

  const handleRefetch = async () => {
    if (typeof onRefetchRun !== "function" || isBusy) return;
    await onRefetchRun();
  };

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
      Alert.alert("운행 완료", "하차 완료 처리가 반영되었습니다.");
    } catch (error) {
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
      Alert.alert("위치 공유", enabled ? "위치 공유를 켰습니다." : "위치 공유를 껐습니다.");
    } catch (error) {
      Alert.alert("위치 공유 변경 실패", readApiErrorMessage(error), [
        { text: "취소", style: "cancel" },
        { text: "다시 시도", onPress: () => void handleToggleTrackingSharing(enabled) },
      ]);
    } finally {
      setIsTrackingSharingSubmitting(false);
    }
  };

  const handleSubmitGps = async () => {
    if (!hasLocationProvider) {
      Alert.alert("위치 업데이트", GPS_PROVIDER_MISSING_MESSAGE);
      return;
    }
    if (safeMatchId <= 0 || isGpsSubmitting) return;

    try {
      setIsGpsSubmitting(true);
      // TODO: 공용 위치 Provider(useLocation/hook) 연결 후 실제 현재 좌표를 주입한다.
      const currentPosition: { lat: number; lng: number; speedKmh?: number; bearing?: number } | null = null;
      if (!currentPosition) {
        throw new Error("현재 위치를 읽을 수 없습니다.");
      }

      const result = await submitDriverRunGps(safeMatchId, currentPosition);
      if (!result) {
        throw new Error("위치 업데이트 응답이 비어 있습니다.");
      }
      if (typeof onRefetchRun === "function") {
        await onRefetchRun();
      }
      Alert.alert("위치 업데이트", "현재 위치를 전송했습니다.");
    } catch (error) {
      Alert.alert("위치 업데이트 실패", readApiErrorMessage(error), [
        { text: "취소", style: "cancel" },
        { text: "다시 시도", onPress: () => void handleSubmitGps() },
      ]);
    } finally {
      setIsGpsSubmitting(false);
    }
  };

  return (
    <PageScaffold title="운행정보" scroll={false} padding={0}>
      <View style={styles.root}>
        <View style={styles.content}>
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
              <AppText style={styles.infoLabel}>위치 업데이트</AppText>
              <AppButton
                title="위치 업데이트"
                variant="secondary"
                onPress={() => void handleSubmitGps()}
                disabled={!hasLocationProvider || isBusy || safeMatchId <= 0}
                loading={isGpsSubmitting}
                style={styles.gpsButton}
              />
            </View>
            {!hasLocationProvider ? (
              <AppText style={styles.helperText}>{GPS_PROVIDER_MISSING_MESSAGE}</AppText>
            ) : null}
            <View style={styles.infoRow}>
              <AppText style={styles.infoLabel}>추천 액션</AppText>
              <AppText style={styles.infoValue}>{driverCta?.label ?? "-"}</AppText>
            </View>
          </AppCard>
        </View>

        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
          <AppButton
            title={driverCta?.label ?? "하차 완료"}
            onPress={() => void handleCompleteTransit()}
            loading={isCompleting}
            disabled={!canCompleteTransit || isSyncing}
            style={styles.completeButton}
          />
          <AppButton
            title="상태 새로고침"
            onPress={() => void handleRefetch()}
            variant="secondary"
            disabled={typeof onRefetchRun !== "function" || isBusy}
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
    </PageScaffold>
  );
}
