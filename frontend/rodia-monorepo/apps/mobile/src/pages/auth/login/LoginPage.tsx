// apps/mobile/src/pages/auth/login/LoginPage.tsx
import React, { useCallback } from "react";
import { StyleSheet, View } from "react-native";
import { createThemedStyles } from "@/shared/theme/useAppTheme";
import { AppContainer } from "@/shared/ui/kit/AppContainer";
import { AppText } from "@/shared/ui/kit/AppText";
import { LoginForm } from "@/features/auth/ui/LoginForm";

const useStyles = createThemedStyles((t) =>
  StyleSheet.create({
    root: { flex: 1, justifyContent: "center", gap: 16 },
    header: { gap: 6, alignItems: "center" },
    subtitle: { textAlign: "center", opacity: 0.75 },
    cardWrap: {
      borderRadius: t.layout.radii.card,
      borderWidth: 1,
      borderColor: t.colors.borderDefault,
      backgroundColor: t.colors.bgSurfaceAlt,
      padding: 16,
    },
  })
);

export default function LoginPage() {
  const s = useStyles();

  const onSuccess = useCallback(() => {
    // Gatekeeper(app/_layout.tsx)가 status/user.role 변경을 감지해 자동 분기합니다.
  }, []);

  return (
    <AppContainer scroll padding={16} backgroundColor="bgMain">
      <View style={s.root}>
        <View style={s.header}>
          <AppText variant="heading">Rodia</AppText>
          <AppText variant="caption" color="borderDefault" style={s.subtitle}>
            로그인 후 역할에 따라 자동으로 화면이 분기됩니다.
          </AppText>
        </View>

        <View style={s.cardWrap}>
          <LoginForm onSuccess={onSuccess} layout="plain" showHeader={false} />
        </View>
      </View>
    </AppContainer>
  );
}

/**
 * 1) 페이지는 레이아웃(센터링/카드)만 담당하고, LoginForm은 폼 로직만 담당합니다.
 * 2) 중첩 카드/헤더 문제를 제거해 모달/바텀시트에서도 LoginForm 재사용이 쉽습니다.
 * 3) 성공 후 이동은 Gatekeeper가 처리하므로 페이지는 onSuccess를 비워도 동작합니다.
 */