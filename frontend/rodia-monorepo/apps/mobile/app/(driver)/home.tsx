// apps/mobile/app/(driver)/index.tsx
import React from "react";
import { StyleSheet, View } from "react-native";
import { createThemedStyles } from "@/shared/theme/useAppTheme";
import { AppContainer } from "@/shared/ui/kit/AppContainer";
import { AppText } from "@/shared/ui/kit/AppText";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { useAuth } from "@/features/auth/model/useAuth";

const useStyles = createThemedStyles((t) =>
  StyleSheet.create({
    root: { gap: 12 },
    card: {
      gap: 8,
      padding: 16,
      borderRadius: t.layout.radii.card,
      borderWidth: 1,
      borderColor: t.colors.borderDefault,
      backgroundColor: t.colors.bgSurfaceAlt,
    },
  })
);

export default function DriverIndex() {
  const s = useStyles();
  const auth = useAuth();

  return (
    <AppContainer scroll padding={16} backgroundColor="bgMain">
      <View style={s.root}>
        <View style={s.card}>
          <AppText variant="heading">Driver Home</AppText>
          <AppText variant="caption" color="borderDefault">
            role: {auth.user?.role ?? "unknown"} / userId: {auth.user?.id ?? "unknown"}
          </AppText>

          <AppButton title="로그아웃" variant="secondary" onPress={() => auth.logout()} />
        </View>
      </View>
    </AppContainer>
  );
}

/**
 * 1) 분기 테스트용 임시 홈: Gatekeeper가 올바르게 driver로 보냈는지 확인합니다.
 * 2) 실제 구현은 src/pages/driver/*로 옮기고, 이 파일은 라우트로만 남깁니다.
 * 3) 로그아웃으로 (auth)로 되돌아가는지 확인합니다.
 */