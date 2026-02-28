import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { safeNumber, safeString, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";
import type { ActiveOrder } from "@/entities/order/model/active-order.store";
import { useActiveOrder } from "@/entities/order/model/active-order.store";

type Props = {
  order: ActiveOrder;
};

const useStyles = createThemedStyles((theme) => {
  const spacing = safeNumber(theme?.layout?.spacing?.base, 4);
  const cSurfaceAlt = safeString(theme?.colors?.bgSurfaceAlt, "#F8FAFC");
  const cSurface = safeString(theme?.colors?.bgSurface, "#FFFFFF");
  const cTextMain = safeString(theme?.colors?.textMain, "#111827");
  const cTextSub = safeString(theme?.colors?.textSub, "#334155");
  const cTextMuted = safeString(theme?.colors?.textMuted, "#64748B");
  const cBorder = safeString(theme?.colors?.borderDefault, "#E2E8F0");
  const cSuccess = safeString(theme?.colors?.semanticSuccess, "#10B981");

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
      borderColor: tint(cSuccess, 0.4, cBorder),
      backgroundColor: tint(cSuccess, 0.12, cSurface),
      paddingHorizontal: spacing * 3,
      alignItems: "center",
      justifyContent: "center",
    },
    statusBadgeText: {
      color: cSuccess,
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
    bottomBar: {
      paddingHorizontal: spacing * 5,
      paddingTop: spacing * 3,
      borderTopWidth: 1,
      borderTopColor: cBorder,
      backgroundColor: cSurface,
    },
    listButton: {
      minHeight: 52,
    },
  });
});

const STATUS_LABEL_MAP: Record<string, string> = {
  PREPARING: "운행 준비 중",
  DRIVING: "운행 중",
  COMPLETED: "운행 완료",
  ASSIGNED: "배차 완료",
};

export function RunActiveDetails({ order }: Props) {
  const theme = useAppTheme();
  const styles = useStyles();
  const { clearActiveOrder } = useActiveOrder();
  const insets = useSafeAreaInsets();

  const handleViewRunList = () => {
    clearActiveOrder();
  };

  const statusLabel = STATUS_LABEL_MAP[order.status] ?? order.status;
  const originAddress = order.originAddress || "-";
  const destinationAddress = order.destinationAddress || "-";

  return (
    <PageScaffold title="운행정보" scroll={false} padding={0}>
      <View style={styles.root}>
        <View style={styles.content}>
          <View style={styles.statusBadgeRow}>
            <View style={styles.statusBadge}>
              <AppText style={styles.statusBadgeText}>{statusLabel}</AppText>
            </View>
            <AppText style={styles.idText}>오더 #{order.quoteId}</AppText>
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
            <AppText style={styles.infoCardTitle}>운행 정보</AppText>
            <View style={styles.infoRow}>
              <AppText style={styles.infoLabel}>운행 상태</AppText>
              <AppText style={styles.infoValue}>{statusLabel}</AppText>
            </View>
            <View style={styles.infoRow}>
              <AppText style={styles.infoLabel}>오더 ID</AppText>
              <AppText style={styles.infoValue}>#{order.quoteId}</AppText>
            </View>
          </AppCard>
        </View>

        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
          <AppButton
            title="운행 목록 보기"
            onPress={handleViewRunList}
            variant="secondary"
            style={styles.listButton}
          />
        </View>
      </View>
    </PageScaffold>
  );
}
