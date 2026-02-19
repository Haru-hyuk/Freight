import React, { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import type { AuthUserRole } from "@/features/auth/model/auth.types";
import { useAuth } from "@/features/auth/model/useAuth";
import { createThemedStyles } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppContainer } from "@/shared/ui/kit/AppContainer";
import { AppText } from "@/shared/ui/kit/AppText";

type Props = {
  role: AuthUserRole;
};

const useStyles = createThemedStyles((t) =>
  StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: t.layout.spacing.base * 5,
      gap: t.layout.spacing.base * 4,
    },
    card: {
      padding: t.components.card.paddingMd,
      borderRadius: t.components.card.radius,
      gap: t.layout.spacing.base * 3,
    },
    title: {
      textAlign: "center",
    },
    desc: {
      textAlign: "center",
      color: t.colors.textSub,
    },
    section: {
      gap: t.layout.spacing.base,
      backgroundColor: t.colors.bgSurfaceAlt,
      borderWidth: 1,
      borderColor: t.colors.borderDefault,
      borderRadius: t.layout.radii.control,
      paddingHorizontal: t.layout.spacing.base * 3,
      paddingVertical: t.layout.spacing.base * 3,
    },
    bullet: {
      color: t.colors.textSub,
    },
    actionRow: {
      gap: t.layout.spacing.base * 2,
    },
  })
);

export default function AccountVerificationPage({ role }: Props) {
  const s = useStyles();
  const router = useRouter();
  const auth = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const roleLabel = role === "driver" ? "기사" : "화주";
  const homePath = role === "driver" ? "/(driver)/home" : "/(shipper)/home";

  const checklist = useMemo(() => {
    if (role === "driver") {
      return ["계좌 정보 확인", "차량 정보 확인", "운송 관련 기본 정보 확인"];
    }
    return ["사업자 정보 확인", "정산 계좌 정보 확인", "담당자 연락처 확인"];
  }, [role]);

  const handleCompleteVerification = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await auth.completeVerification();
      router.replace(homePath);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppContainer backgroundColor="bgSurfaceAlt" padding={0}>
      <View style={s.root}>
        <AppCard outlined style={s.card}>
          <AppText variant="heading" weight="800" style={s.title}>
            {roleLabel} 계정 인증
          </AppText>
          <AppText variant="detail" style={s.desc}>
            가입이 완료되었습니다. 아래 항목을 확인한 뒤 서비스를 시작해 주세요.
          </AppText>

          <View style={s.section}>
            {checklist.map((item) => (
              <AppText key={item} variant="detail" style={s.bullet}>
                • {item}
              </AppText>
            ))}
          </View>

          <View style={s.actionRow}>
            <AppButton
              title={submitting ? "인증 처리 중..." : "인증 완료하고 시작하기"}
              size="lg"
              loading={submitting}
              disabled={submitting}
              onPress={handleCompleteVerification}
            />
            <AppButton title="나중에 하기" variant="secondary" onPress={() => router.replace(homePath)} />
          </View>
        </AppCard>
      </View>
    </AppContainer>
  );
}

