import { Ionicons } from "@expo/vector-icons";
import React, { memo } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import type { DriverOrderCard, DriverRouteRecommendationMode } from "@/features/matching/api";
import { formatKrw } from "@/shared/lib/format/display";
import { safeNumber, safeString, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles } from "@/shared/theme/useAppTheme";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppText } from "@/shared/ui/kit/AppText";

export type DriverRunGroupCardModel = {
  key: string;
  mode: DriverRouteRecommendationMode;
  pathLabel: string;
  totalRevenue: number;
  estimatedTotalDistanceKm: number;
  acceptedAt: number;
  orders: DriverOrderCard[];
};

type DriverRunGroupCardProps = {
  group: DriverRunGroupCardModel;
  onPress: (group: DriverRunGroupCardModel) => void;
  onPressOrder: (order: DriverOrderCard) => void;
};

function formatDistance(value: number): string {
  const safe = Number(value);
  if (!Number.isFinite(safe) || safe <= 0) return "-";
  return `${safe.toFixed(1)}km`;
}

const useStyles = createThemedStyles((theme) => {
  const spacing = safeNumber(theme?.layout?.spacing?.base, 4);
  const cLine = safeString(theme?.colors?.borderDefault, "#E2E8F0");
  return StyleSheet.create({
    pressable: {},
    pressed: { transform: [{ scale: 0.985 }], opacity: 0.92 },
    wrap: {
      padding: spacing * 4,
      borderRadius: safeNumber(theme?.layout?.radii?.card, spacing * 4),
      borderWidth: 1,
      borderColor: tint(theme.colors.brandPrimary, 0.35, cLine),
      backgroundColor: tint(theme.colors.brandPrimary, 0.05, theme.colors.bgSurface),
      gap: spacing * 2,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing * 2,
    },
    modeBadge: {
      borderRadius: 999,
      paddingHorizontal: spacing * 2,
      paddingVertical: spacing,
      backgroundColor: tint(theme.colors.brandPrimary, 0.2, theme.colors.bgSurface),
    },
    metricRow: {
      flexDirection: "row",
      gap: spacing * 1.5,
    },
    metricCell: {
      flex: 1,
      borderRadius: 10,
      paddingHorizontal: spacing * 1.5,
      paddingVertical: spacing * 1.2,
      backgroundColor: tint(cLine, 0.25, theme.colors.bgSurfaceAlt),
      gap: spacing * 0.5,
    },
    orderRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing * 1.5,
      paddingVertical: spacing * 1.2,
      borderTopWidth: 1,
      borderTopColor: tint(cLine, 0.6, theme.colors.bgSurfaceAlt),
    },
    orderSeq: {
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: tint(theme.colors.brandPrimary, 0.85, theme.colors.brandPrimary),
      marginTop: 1,
    },
    orderBody: {
      flex: 1,
      gap: spacing * 0.5,
    },
    linkRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing,
      alignSelf: "flex-start",
      marginTop: spacing,
      paddingHorizontal: spacing * 1.5,
      paddingVertical: spacing,
      borderRadius: 999,
      backgroundColor: tint(theme.colors.brandPrimary, 0.12, theme.colors.bgSurface),
    },
  });
});

function DriverRunGroupCardBase({ group, onPress, onPressOrder }: DriverRunGroupCardProps) {
  const styles = useStyles();

  return (
    <Pressable onPress={() => onPress(group)} style={({ pressed }) => [styles.pressable, pressed ? styles.pressed : null]}>
      <AppCard style={styles.wrap} outlined={false} elevated>
        <View style={styles.headerRow}>
          <View style={styles.modeBadge}>
            <AppText variant="caption" weight="900" color="brandPrimary">
              {group.mode === "BUNDLED" ? "합짐 그룹" : "추천 그룹"}
            </AppText>
          </View>
          <AppText variant="detail" weight="800" color="textSub">
            {group.orders.length}건
          </AppText>
        </View>

        <AppText variant="detail" weight="900" color="textMain">
          {group.pathLabel}
        </AppText>

        <View style={styles.metricRow}>
          <View style={styles.metricCell}>
            <AppText variant="caption" color="textMuted">
              그룹 운임
            </AppText>
            <AppText variant="detail" weight="900" color="semanticSuccess">
              {formatKrw(group.totalRevenue)}
            </AppText>
          </View>
          <View style={styles.metricCell}>
            <AppText variant="caption" color="textMuted">
              이동 거리
            </AppText>
            <AppText variant="detail" weight="900" color="brandPrimary">
              {formatDistance(group.estimatedTotalDistanceKm)}
            </AppText>
          </View>
        </View>

        {group.orders.map((order, index) => (
          <Pressable key={`${group.key}-${order.matchId}-${index}`} onPress={() => onPressOrder(order)}>
            <View style={styles.orderRow}>
              <View style={styles.orderSeq}>
                <AppText variant="caption" weight="900" color="#FFFFFF">
                  {index + 1}
                </AppText>
              </View>
              <View style={styles.orderBody}>
                <AppText variant="caption" color="textMuted">
                  {order.statusLabel}
                </AppText>
                <AppText variant="detail" weight="800" color="textMain">
                  {order.originAddress || "-"}
                </AppText>
                <AppText variant="detail" weight="800" color="textMain">
                  {order.destinationAddress || "-"}
                </AppText>
              </View>
            </View>
          </Pressable>
        ))}

        <View style={styles.linkRow}>
          <Ionicons name="open-outline" size={14} color="#0F172A" />
          <AppText variant="caption" weight="800" color="textSub">
            그룹 오더 상세 보기
          </AppText>
        </View>
      </AppCard>
    </Pressable>
  );
}

export const DriverRunGroupCard = memo(DriverRunGroupCardBase);

