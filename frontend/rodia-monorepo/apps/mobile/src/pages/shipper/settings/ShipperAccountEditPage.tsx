import React, { useMemo, useState } from "react";
import { Alert, StyleSheet, Switch, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import type { AppTheme } from "@/shared/theme/types";
import { useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";
import { shipperSettingsMock } from "@/features/shipper-settings/api/shipper-settings-mock";

import Divider from "./ui/Divider";
import SettingSection from "./ui/SettingSection";

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
    fieldGroup: {
      gap: 6,
    },
    fieldLabel: {
      color: theme.colors.textMuted,
    },
    input: {
      minHeight: 44,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.borderDefault,
      backgroundColor: theme.colors.bgSurface,
      color: theme.colors.textMain,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
    },
    switchRow: {
      minHeight: 40,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    switchLabelWrap: {
      flex: 1,
      gap: 2,
    },
    switchTitle: {
      color: theme.colors.textMain,
    },
    switchSub: {
      color: theme.colors.textMuted,
    },
  });
}

export default function ShipperAccountEditPage() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const account = shipperSettingsMock.account;

  const [name, setName] = useState(account.name);
  const [phone, setPhone] = useState(account.phone);
  const [email, setEmail] = useState(account.email);
  const [agreePush, setAgreePush] = useState(account.agreePush);
  const [agreeSms, setAgreeSms] = useState(account.agreeSms);
  const [agreeEmail, setAgreeEmail] = useState(account.agreeEmail);

  return (
    <PageScaffold
      title="회원정보 수정"
      backgroundColor={theme.colors.bgMain}
      contentStyle={styles.content}
      onPressBack={() => router.back()}
      backLabel="설정"
    >
      <AppText variant="detail" style={styles.helperText}>
        입력값은 화면 확인용이며 저장 시 서버 반영 없이 안내 메시지만 표시됩니다.
      </AppText>

      <SettingSection title="기본 정보">
        <View style={styles.fieldGroup}>
          <AppText variant="caption" weight="700" style={styles.fieldLabel}>
            이름
          </AppText>
          <TextInput value={name} onChangeText={setName} style={styles.input} placeholder="이름" />
        </View>
        <View style={styles.fieldGroup}>
          <AppText variant="caption" weight="700" style={styles.fieldLabel}>
            연락처
          </AppText>
          <TextInput value={phone} onChangeText={setPhone} style={styles.input} keyboardType="phone-pad" placeholder="연락처" />
        </View>
        <View style={styles.fieldGroup}>
          <AppText variant="caption" weight="700" style={styles.fieldLabel}>
            이메일
          </AppText>
          <TextInput value={email} onChangeText={setEmail} style={styles.input} keyboardType="email-address" placeholder="이메일" />
        </View>
      </SettingSection>

      <SettingSection title="알림 수신 동의">
        <View style={styles.switchRow}>
          <View style={styles.switchLabelWrap}>
            <AppText variant="detail" weight="700" style={styles.switchTitle}>
              앱 Push 알림
            </AppText>
            <AppText variant="caption" style={styles.switchSub}>
              배차/정산 상태 알림
            </AppText>
          </View>
          <Switch value={agreePush} onValueChange={setAgreePush} />
        </View>
        <Divider />
        <View style={styles.switchRow}>
          <View style={styles.switchLabelWrap}>
            <AppText variant="detail" weight="700" style={styles.switchTitle}>
              SMS 알림
            </AppText>
            <AppText variant="caption" style={styles.switchSub}>
              주요 변경사항 문자 수신
            </AppText>
          </View>
          <Switch value={agreeSms} onValueChange={setAgreeSms} />
        </View>
        <Divider />
        <View style={styles.switchRow}>
          <View style={styles.switchLabelWrap}>
            <AppText variant="detail" weight="700" style={styles.switchTitle}>
              이메일 알림
            </AppText>
            <AppText variant="caption" style={styles.switchSub}>
              세금계산서/공지 메일 수신
            </AppText>
          </View>
          <Switch value={agreeEmail} onValueChange={setAgreeEmail} />
        </View>
      </SettingSection>

      <AppButton
        title="수정 저장"
        onPress={() =>
          Alert.alert(
            "회원정보 저장",
            `이름: ${name || "-"}\n연락처: ${phone || "-"}\n이메일: ${email || "-"}\nPush: ${
              agreePush ? "동의" : "미동의"
            }`
          )
        }
      />
    </PageScaffold>
  );
}
