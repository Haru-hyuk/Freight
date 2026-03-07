import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { getMeProfile, updateMeProfile } from "@/features/auth/api/auth-api";
import { useAuth } from "@/features/auth/model/useAuth";
import type { AppTheme } from "@/shared/theme/types";
import { useAppTheme } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppText } from "@/shared/ui/kit/AppText";
import { PageScaffold } from "@/widgets/layout/PageScaffold";
import SettingSection from "@/pages/shipper/settings/ui/SettingSection";

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    content: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 32,
      backgroundColor: theme.colors.bgMain,
      gap: 14,
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
    loadingWrap: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 40,
    },
    accountBox: {
      minHeight: 44,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.borderDefault,
      backgroundColor: theme.colors.bgSurfaceAlt,
      paddingHorizontal: 12,
      paddingVertical: 10,
      justifyContent: "center",
      gap: 2,
    },
    accountMain: {
      color: theme.colors.textMain,
      fontSize: 15,
      fontWeight: "800",
    },
    accountSub: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: "600",
    },
  });
}

export default function DriverAccountEditPage() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const auth = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [bankName, setBankName] = useState((auth.user?.bankName ?? "").trim());
  const [bankAccount, setBankAccount] = useState((auth.user?.bankAccount ?? "").trim());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile = await getMeProfile();
        if (cancelled) return;
        if (profile?.name) setName(profile.name);
        if (profile?.email) setEmail(profile.email);
        if (profile?.phone) setPhone(profile.phone);
        if (profile?.bankName) setBankName(profile.bankName);
        if (profile?.bankAccount) setBankAccount(profile.bankAccount);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const settlementAccountText = useMemo(() => {
    const safeBank = bankName.trim();
    const safeAccount = bankAccount.trim();
    if (safeBank && safeAccount) return `${safeBank} ${safeAccount}`;
    if (safeBank) return `${safeBank} (계좌번호 미등록)`;
    if (safeAccount) return safeAccount;
    return "등록된 정산 계좌 정보가 없습니다.";
  }, [bankAccount, bankName]);

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
        if (result.profile?.name != null) setName(result.profile.name);
        if (result.profile?.email != null) setEmail(result.profile.email);
        if (result.profile?.phone != null) setPhone(result.profile.phone);
        if (result.profile?.bankName != null) setBankName(result.profile.bankName);
        if (result.profile?.bankAccount != null) setBankAccount(result.profile.bankAccount);
        Alert.alert("저장 완료", "회원정보가 수정되었습니다.");
      } else {
        Alert.alert("저장 실패", result.message ?? "저장에 실패했습니다. 다시 시도해 주세요.");
      }
    } finally {
      setIsSaving(false);
    }
  }, [email, isSaving, name, phone]);

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

          <SettingSection title="정산 계좌">
            <View style={styles.accountBox}>
              <AppText style={styles.accountMain}>{settlementAccountText}</AppText>
              <AppText style={styles.accountSub}>계좌 정보는 현재 등록된 값을 표시합니다.</AppText>
            </View>
          </SettingSection>

          <AppButton title={isSaving ? "저장 중..." : "수정 저장"} onPress={handleSave} disabled={isSaving} />
        </>
      )}
    </PageScaffold>
  );
}

