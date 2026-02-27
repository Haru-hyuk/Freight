import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { safeNumber, safeString, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppText } from "@/shared/ui/kit/AppText";

const useStyles = createThemedStyles((theme) => {
  const spacing = safeNumber(theme?.layout?.spacing?.base, 4);
  const cSurfaceAlt = safeString(theme?.colors?.bgSurfaceAlt, "#F8FAFC");
  const cSurface = safeString(theme?.colors?.bgSurface, "#FFFFFF");
  const cTextMain = safeString(theme?.colors?.textMain, "#111827");
  const cTextMuted = safeString(theme?.colors?.textMuted, "#64748B");
  const cPrimary = safeString(theme?.colors?.brandPrimary, "#FF6A00");

  return StyleSheet.create({
    wrap: {
      flex: 1,
      backgroundColor: cSurfaceAlt,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing * 8,
      gap: spacing * 5,
    },
    iconWrap: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: tint(cPrimary, 0.1, cSurface),
      borderWidth: 1,
      borderColor: tint(cPrimary, 0.22, cSurface),
      alignItems: "center",
      justifyContent: "center",
    },
    textGroup: {
      alignItems: "center",
      gap: spacing * 2,
    },
    title: {
      color: cTextMain,
      fontSize: safeNumber(theme?.typography?.scale?.heading?.size, 18),
      lineHeight: safeNumber(theme?.typography?.scale?.heading?.lineHeight, 26),
      fontWeight: "900",
      textAlign: "center",
    },
    desc: {
      color: cTextMuted,
      fontSize: safeNumber(theme?.typography?.scale?.body?.size, 15),
      lineHeight: safeNumber(theme?.typography?.scale?.body?.lineHeight, 22),
      fontWeight: "500",
      textAlign: "center",
    },
    button: {
      minWidth: 180,
      minHeight: 52,
    },
  });
});

export function RunEmptyState() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useStyles();

  const goToOrders = () => {
    router.push("/(driver)/quotes");
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Ionicons name="car-outline" size={36} color={theme.colors.brandPrimary} />
      </View>
      <View style={styles.textGroup}>
        <AppText style={styles.title}>운행 중인 오더 없음</AppText>
        <AppText style={styles.desc}>
          {"현재 배차된 오더가 없습니다.\n오더 목록에서 원하는 오더를 선택해 보세요."}
        </AppText>
      </View>
      <AppButton title="오더 보러가기" onPress={goToOrders} style={styles.button} />
    </View>
  );
}
