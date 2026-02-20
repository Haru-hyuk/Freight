import React from "react";
import { StyleSheet, View } from "react-native";

import { safeNumber, safeString, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

const MOCK_ORDERS = [
  { id: "D-240201", from: "서울 강서", to: "인천 연수", status: "배정 대기", eta: "09:40" },
  { id: "D-240202", from: "화성 향남", to: "대전 유성", status: "상차 완료", eta: "11:10" },
  { id: "D-240203", from: "청주 흥덕", to: "부산 강서", status: "결제 대기", eta: "14:30" },
];

const useStyles = createThemedStyles((theme) => {
  const spacing = safeNumber(theme?.layout?.spacing?.base, 4);
  const cBorder = safeString(theme?.colors?.borderDefault, "#E2E8F0");
  const cSurface = safeString(theme?.colors?.bgSurface, "#FFFFFF");
  const cMuted = safeString(theme?.colors?.textMuted, "#64748B");
  const cPrimary = safeString(theme?.colors?.brandPrimary, "#FF6A00");

  return StyleSheet.create({
    content: {
      paddingTop: spacing * 3,
      paddingBottom: spacing * 20,
      gap: spacing * 3,
    },
    summaryCard: {
      padding: spacing * 4,
      borderRadius: safeNumber(theme?.components?.card?.radius, 16),
      gap: spacing * 2,
    },
    orderCard: {
      padding: spacing * 4,
      borderRadius: safeNumber(theme?.components?.card?.radius, 16),
      gap: spacing * 2,
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing * 2,
    },
    routeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing * 2,
    },
    statusChip: {
      paddingHorizontal: spacing * 2,
      paddingVertical: spacing,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: tint(cPrimary, 0.3, cBorder),
      backgroundColor: tint(cPrimary, 0.08, cSurface),
    },
    divider: {
      height: 1,
      backgroundColor: tint(cBorder, 0.75, cBorder),
    },
    muted: {
      color: cMuted,
    },
  });
});

export function DriverQuoteBrowsePage() {
  const theme = useAppTheme();
  const styles = useStyles();

  const cBg = safeString(theme?.colors?.bgSurfaceAlt, "#F8FAFC");
  const cText = safeString(theme?.colors?.textMain, "#111827");
  const cSub = safeString(theme?.colors?.textSub, "#334155");
  const cPrimary = safeString(theme?.colors?.brandPrimary, "#FF6A00");

  return (
    <PageScaffold title="오더" backgroundColor={cBg} contentStyle={styles.content}>
      <AppCard outlined style={styles.summaryCard}>
        <AppText variant="heading" weight="800" color={cText}>
          오늘 오더 현황
        </AppText>
        <AppText variant="detail" color={cSub}>
          대기 1건, 진행 1건, 결제 대기 1건
        </AppText>
      </AppCard>

      {MOCK_ORDERS.map((order) => (
        <AppCard key={order.id} outlined style={styles.orderCard}>
          <View style={styles.topRow}>
            <AppText variant="detail" weight="700" color={cText}>
              {order.id}
            </AppText>
            <View style={styles.statusChip}>
              <AppText variant="caption" weight="700" color={cPrimary}>
                {order.status}
              </AppText>
            </View>
          </View>

          <View style={styles.routeRow}>
            <AppText variant="body" weight="700" color={cText}>
              {order.from}
            </AppText>
            <AppText variant="caption" style={styles.muted}>
              →
            </AppText>
            <AppText variant="body" weight="700" color={cText}>
              {order.to}
            </AppText>
          </View>

          <View style={styles.divider} />
          <AppText variant="caption" style={styles.muted}>
            예상 도착 {order.eta}
          </AppText>
        </AppCard>
      ))}
    </PageScaffold>
  );
}

export default DriverQuoteBrowsePage;
