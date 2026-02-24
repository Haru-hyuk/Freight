import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { safeNumber, safeString, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

const CHECK_ITEMS = ["차량 점검 완료", "상차지 도착 확인", "운행 경로 확인"];

const useStyles = createThemedStyles((theme) => {
  const spacing = safeNumber(theme?.layout?.spacing?.base, 4);
  const cBorder = safeString(theme?.colors?.borderDefault, "#E2E8F0");
  const cSurface = safeString(theme?.colors?.bgSurface, "#FFFFFF");
  const cPrimary = safeString(theme?.colors?.brandPrimary, "#FF6A00");

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
    routeBadge: {
      alignSelf: "flex-start",
      paddingHorizontal: spacing * 2,
      paddingVertical: spacing,
      borderRadius: 999,
      backgroundColor: tint(cPrimary, 0.08, cSurface),
      borderColor: tint(cPrimary, 0.25, cBorder),
      borderWidth: 1,
    },
    checkRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing * 2,
    },
  });
});

export function DriverDrivePage() {
  const theme = useAppTheme();
  const styles = useStyles();

  const cBg = safeString(theme?.colors?.bgSurfaceAlt, "#F8FAFC");
  const cText = safeString(theme?.colors?.textMain, "#111827");
  const cSub = safeString(theme?.colors?.textSub, "#334155");
  const cPrimary = safeString(theme?.colors?.brandPrimary, "#FF6A00");
  const cSuccess = safeString(theme?.colors?.semanticSuccess, "#059669");

  return (
    <PageScaffold title="운행" backgroundColor={cBg} contentStyle={styles.content}>
      <AppCard outlined style={styles.card}>
        <AppText variant="heading" weight="800" color={cText}>
          현재 운행
        </AppText>
        <View style={styles.routeBadge}>
          <AppText variant="caption" weight="700" color={cPrimary}>
            진행 중
          </AppText>
        </View>
        <AppText variant="body" weight="700" color={cText}>
          화성 향남 → 대전 유성
        </AppText>
        <AppText variant="detail" color={cSub}>
          예상 도착 11:10 / 남은 거리 58km
        </AppText>
      </AppCard>

      <AppCard outlined style={styles.card}>
        <AppText variant="heading" weight="800" color={cText}>
          운행 체크리스트
        </AppText>
        {CHECK_ITEMS.map((item) => (
          <View key={item} style={styles.checkRow}>
            <Ionicons name="checkmark-circle" size={18} color={cSuccess} />
            <AppText variant="detail" color={cSub}>
              {item}
            </AppText>
          </View>
        ))}
      </AppCard>
    </PageScaffold>
  );
}

export default DriverDrivePage;
