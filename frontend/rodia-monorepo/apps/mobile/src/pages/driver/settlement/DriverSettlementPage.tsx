import React from "react";
import { StyleSheet, View } from "react-native";

import { safeNumber, safeString, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

const useStyles = createThemedStyles((theme) => {
  const spacing = safeNumber(theme?.layout?.spacing?.base, 4);
  const cBorder = safeString(theme?.colors?.borderDefault, "#E2E8F0");

  return StyleSheet.create({
    content: {
      paddingTop: spacing * 3,
      paddingBottom: spacing * 20,
      gap: spacing * 3,
    },
    card: {
      padding: spacing * 4,
      borderRadius: safeNumber(theme?.components?.card?.radius, 16),
      gap: spacing * 3,
    },
    splitRow: {
      flexDirection: "row",
      gap: spacing * 3,
    },
    splitItem: {
      flex: 1,
      borderWidth: 1,
      borderColor: tint(cBorder, 0.8, cBorder),
      borderRadius: 12,
      padding: spacing * 3,
      gap: spacing,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
  });
});

export function DriverSettlementPage() {
  const theme = useAppTheme();
  const styles = useStyles();

  const cBg = safeString(theme?.colors?.bgSurfaceAlt, "#F8FAFC");
  const cText = safeString(theme?.colors?.textMain, "#111827");
  const cSub = safeString(theme?.colors?.textSub, "#334155");
  const cPrimary = safeString(theme?.colors?.brandPrimary, "#FF6A00");

  return (
    <PageScaffold title="정산" backgroundColor={cBg} contentStyle={styles.content}>
      <AppCard outlined style={styles.card}>
        <AppText variant="heading" weight="800" color={cText}>
          이번 주 정산 요약
        </AppText>
        <View style={styles.splitRow}>
          <View style={styles.splitItem}>
            <AppText variant="caption" color={cSub}>
              정산 예정
            </AppText>
            <AppText variant="title" weight="800" color={cText}>
              850,000원
            </AppText>
          </View>
          <View style={styles.splitItem}>
            <AppText variant="caption" color={cSub}>
              지급 완료
            </AppText>
            <AppText variant="title" weight="800" color={cPrimary}>
              1,420,000원
            </AppText>
          </View>
        </View>
      </AppCard>

      <AppCard outlined style={styles.card}>
        <AppText variant="heading" weight="800" color={cText}>
          최근 정산 내역
        </AppText>

        <View style={styles.row}>
          <AppText variant="detail" color={cSub}>
            2월 15일 / 오더 D-240188
          </AppText>
          <AppText variant="detail" weight="700" color={cText}>
            +320,000원
          </AppText>
        </View>
        <View style={styles.row}>
          <AppText variant="detail" color={cSub}>
            2월 13일 / 오더 D-240170
          </AppText>
          <AppText variant="detail" weight="700" color={cText}>
            +210,000원
          </AppText>
        </View>
      </AppCard>
    </PageScaffold>
  );
}

export default DriverSettlementPage;
