import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, ActivityIndicator, StyleSheet, Switch, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import type { AppTheme } from "@/shared/theme/types";
import { useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";
import { getMeProfile, updateMeProfile } from "@/features/auth/api/auth-api";

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
    loadingWrap: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 40,
    },
  });
}

export default function ShipperAccountEditPage() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [agreePush, setAgreePush] = useState(false);
  const [agreeSms, setAgreeSms] = useState(false);
  const [agreeEmail, setAgreeEmail] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile = await getMeProfile();
        if (cancelled) return;
        if (profile?.name) setName(profile.name);
        if (profile?.email) setEmail(profile.email);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const result = await updateMeProfile({
        name: name.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      if (result.ok) {
        Alert.alert("저장 완료", "회원정보가 수정되었습니다.");
      } else {
        Alert.alert("저장 실패", result.message ?? "저장에 실패했습니다. 다시 시도해 주세요.");
      }
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, name, email, phone]);

  return (
    <PageScaffold
      title="회원정보 수정"
      backgroundColor={theme.colors.bgMain}
      contentStyle={styles.content}
      onPressBack={() => router.back()}
      backLabel="설정"
    >
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.colors.brandPrimary} />
        </View>
      ) : (
        <>
          <SettingSection title="기본 정보">
            <View style={styles.fieldGroup}>
              <AppText variant="caption" weight="700" style={styles.fieldLabel}>
                이름
              </AppText>
              <TextInput
                value={name}
                onChangeText={setName}
                style={styles.input}
                placeholder="이름"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
            <View style={styles.fieldGroup}>
              <AppText variant="caption" weight="700" style={styles.fieldLabel}>
                연락처
              </AppText>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                style={styles.input}
                keyboardType="phone-pad"
                placeholder="연락처"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
            <View style={styles.fieldGroup}>
              <AppText variant="caption" weight="700" style={styles.fieldLabel}>
                이메일
              </AppText>
              <TextInput
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="이메일"
                placeholderTextColor={theme.colors.textMuted}
              />
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
            title={isSaving ? "저장 중..." : "수정 저장"}
            onPress={handleSave}
            disabled={isSaving}
          />
        </>
      )}
    </PageScaffold>
  );
}
