import React from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/features/auth/model/useAuth";
import { safeNumber, safeString, tint } from "@/shared/theme/colorUtils";
import { createThemedStyles, useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

const useStyles = createThemedStyles((theme) => {
  const spacing = safeNumber(theme?.layout?.spacing?.base, 4);
  const cBorder = safeString(theme?.colors?.borderDefault, "#E2E8F0");
  const cSurface = safeString(theme?.colors?.bgSurface, "#FFFFFF");
  const cPrimary = safeString(theme?.colors?.brandPrimary, "#FF6A00");
  const cText = safeString(theme?.colors?.textMain, "#111827");

  return StyleSheet.create({
    content: {
      paddingTop: spacing * 3,
      paddingBottom: spacing * 20,
      gap: spacing * 3,
    },
    profileCard: {
      padding: spacing * 4,
      borderRadius: safeNumber(theme?.components?.card?.radius, 16),
      gap: spacing * 2,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing * 2,
    },
    badge: {
      alignSelf: "flex-start",
      paddingHorizontal: spacing * 2,
      paddingVertical: spacing,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: tint(cPrimary, 0.3, cBorder),
      backgroundColor: tint(cPrimary, 0.08, cSurface),
    },
    menuCard: {
      padding: spacing * 4,
      borderRadius: safeNumber(theme?.components?.card?.radius, 16),
      gap: spacing * 3,
    },
    logoutBtn: {
      marginTop: spacing,
    },
    muted: {
      color: safeString(theme?.colors?.textSub, cText),
    },
  });
});

export function DriverProfilePage() {
  const theme = useAppTheme();
  const styles = useStyles();
  const auth = useAuth();

  const cBg = safeString(theme?.colors?.bgSurfaceAlt, "#F8FAFC");
  const cText = safeString(theme?.colors?.textMain, "#111827");
  const cSub = safeString(theme?.colors?.textSub, "#334155");
  const cPrimary = safeString(theme?.colors?.brandPrimary, "#FF6A00");

  const profileName = safeString(auth.user?.name, "기사 사용자");
  const profileEmail = safeString(auth.user?.email, "driver@rodia.co.kr");

  const onLogout = async () => {
    try {
      await auth.logout();
      Alert.alert("로그아웃", "로그아웃되었습니다.");
    } catch (error) {
      console.error(error);
      Alert.alert("오류", "로그아웃 중 문제가 발생했습니다.");
    }
  };

  return (
    <PageScaffold title="내 정보" backgroundColor={cBg} contentStyle={styles.content}>
      <AppCard outlined style={styles.profileCard}>
        <View style={styles.row}>
          <Ionicons name="person-circle-outline" size={22} color={cPrimary} />
          <AppText variant="heading" weight="800" color={cText}>
            {profileName}
          </AppText>
        </View>
        <AppText variant="detail" color={cSub}>
          {profileEmail}
        </AppText>
        <View style={styles.badge}>
          <AppText variant="caption" weight="700" color={cPrimary}>
            DRIVER
          </AppText>
        </View>
      </AppCard>

      <AppCard outlined style={styles.menuCard}>
        <AppText variant="heading" weight="800" color={cText}>
          계정
        </AppText>
        <AppText variant="detail" style={styles.muted}>
          기사 계정 설정과 인증 상태를 확인할 수 있습니다.
        </AppText>

        <AppButton
          title={auth.isBusy ? "로그아웃 중..." : "로그아웃"}
          variant="destructive"
          size="lg"
          disabled={auth.isBusy}
          onPress={onLogout}
          style={styles.logoutBtn}
        />
      </AppCard>
    </PageScaffold>
  );
}

export default DriverProfilePage;
