import React, { useMemo } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import type { AppTheme } from "@/shared/theme/types";
import { useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";

import { shipperSettingsMock } from "./_mock";
import KeyValueRow from "./ui/KeyValueRow";
import SettingSection from "./ui/SettingSection";

function toDisplayDate(input: string): string {
  const ts = Date.parse(input);
  if (!Number.isFinite(ts)) return "-";
  const d = new Date(ts);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd} ${hh}:${mi}`;
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    content: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 32,
      backgroundColor: theme.colors.bgMain,
    },
    helperText: {
      color: theme.colors.textMuted,
      marginBottom: 14,
      paddingHorizontal: 4,
    },
    buttonRow: {
      flexDirection: "row",
      gap: 8,
    },
    halfButton: {
      flex: 1,
    },
  });
}

export default function ShipperVerificationManagePage() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const data = shipperSettingsMock.verification;

  return (
    <PageScaffold
      title="인증관리"
      backgroundColor={theme.colors.bgMain}
      contentStyle={styles.content}
      onPressBack={() => router.back()}
      backLabel="설정"
    >
      <AppText variant="detail" style={styles.helperText}>
        재인증/재업로드는 데모 동작으로 안내 메시지만 표시됩니다.
      </AppText>

      <SettingSection title="인증 상태">
        <KeyValueRow label="휴대폰 인증" value={data.phoneVerified ? "완료" : "미완료"} />
        <KeyValueRow label="사업자 인증" value={data.businessVerified ? "완료" : "미완료"} />
        <KeyValueRow label="결제수단 등록" value={data.paymentMethodRegistered ? "완료" : "미완료"} />
      </SettingSection>

      <SettingSection title="최근 처리 이력">
        <KeyValueRow label="휴대폰 인증일" value={toDisplayDate(data.phoneVerifiedAt)} />
        <KeyValueRow label="사업자 검토일" value={toDisplayDate(data.businessReviewedAt)} />
        <KeyValueRow label="최근 요청일" value={toDisplayDate(data.recentRequestAt)} />
      </SettingSection>

      <SettingSection title="인증 요청 액션">
        <View style={styles.buttonRow}>
          <AppButton
            title="재인증 요청"
            variant="secondary"
            style={styles.halfButton}
            onPress={() => Alert.alert("재인증 요청", "재인증 요청이 접수되었습니다. (목업)")}
          />
          <AppButton
            title="서류 재업로드"
            style={styles.halfButton}
            onPress={() => Alert.alert("서류 재업로드", "서류 재업로드 화면은 데모 모드입니다.")}
          />
        </View>
      </SettingSection>
    </PageScaffold>
  );
}

