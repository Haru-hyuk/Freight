/// 로그인 폼 구버전
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { createThemedStyles } from "@/shared/theme/useAppTheme";
import { AppText } from "@/shared/ui/kit/AppText";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppInput } from "@/shared/ui/kit/AppInput";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { useAuth } from "@/features/auth/model/useAuth";
import { 
  MOCK_EMAIL_BY_ROLE, 
  MOCK_PASSWORD,
  AUTH_VALIDATION_MESSAGES,
  AUTH_MESSAGES,
  inferMockRoleFromEmail,
} from "@/features/auth/model/auth.consts";

type Props = {
  onSuccess?: () => void;
  layout?: "plain" | "card";
  showHeader?: boolean;
  showDevActions?: boolean;
};

declare const __DEV__: boolean;

const useStyles = createThemedStyles((t) =>
  StyleSheet.create({
    root: { gap: 12 },
    header: { gap: 6 },
    card: {
      gap: 12,
      padding: 16,
      borderRadius: t.layout.radii.card,
      borderWidth: 1,
      borderColor: t.colors.borderDefault,
      backgroundColor: t.colors.bgSurfaceAlt,
    },
    rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    footer: { gap: 8 },
    hint: { color: t.colors.textMain, opacity: 0.75 },
  })
);

export function LoginForm({
  onSuccess,
  layout = "plain",
  showHeader = false,
  showDevActions = true,
}: Props) {
  const s = useStyles();
  const auth = useAuth();

  const isMock = auth?.isMockAuth ?? false;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const didPrefillRef = useRef(false);

  useEffect(() => {
    if (!isMock) {
      didPrefillRef.current = false;
      return;
    }

    if (didPrefillRef.current) return;
    didPrefillRef.current = true;

    setEmail((prev) => (prev.trim() ? prev : MOCK_EMAIL_BY_ROLE.shipper));
    setPassword((prev) => (prev.trim() ? prev : MOCK_PASSWORD));
  }, [isMock]);

  const emailTrimmed = useMemo(() => email.trim(), [email]);
  const passwordTrimmed = useMemo(() => password.trim(), [password]);

  const emailError = useMemo(() => {
    if (!emailTrimmed) return AUTH_VALIDATION_MESSAGES.email.required;
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed);
    return ok ? undefined : AUTH_VALIDATION_MESSAGES.email.invalid;
  }, [emailTrimmed]);

  const passwordError = useMemo(() => {
    if (!passwordTrimmed) return AUTH_VALIDATION_MESSAGES.password.required;
    if (passwordTrimmed.length < 6) return AUTH_VALIDATION_MESSAGES.password.tooShort;
    return undefined;
  }, [passwordTrimmed]);

  const canSubmit = useMemo(() => {
    return !auth.isBusy && !emailError && !passwordError;
  }, [auth.isBusy, emailError, passwordError]);

  const onPressPresetShipper = useCallback(() => {
    if (auth.isBusy) return;
    setEmail(MOCK_EMAIL_BY_ROLE.shipper);
    setPassword(MOCK_PASSWORD);
    auth.clearError();
  }, [auth]);

  const onPressPresetDriver = useCallback(() => {
    if (auth.isBusy) return;
    setEmail(MOCK_EMAIL_BY_ROLE.driver);
    setPassword(MOCK_PASSWORD);
    auth.clearError();
  }, [auth]);

  const onPressLogin = useCallback(async () => {
    auth.clearError();

    if (emailError || passwordError) return;

    const ok = await auth.login({
      email: emailTrimmed,
      password: passwordTrimmed,
    });

    if (ok) onSuccess?.();
  }, [auth, emailError, passwordError, emailTrimmed, passwordTrimmed, onSuccess]);

  const mockHint = useMemo(() => {
    if (!isMock) return AUTH_MESSAGES.roleAutoDetect;
    const role = inferMockRoleFromEmail(emailTrimmed);
    return AUTH_MESSAGES.mockModeHint(role);
  }, [isMock, emailTrimmed]);

  const content = (
    <View style={s.root}>
      {showHeader ? (
        <View style={s.header}>
          <AppText variant="heading">로그인</AppText>
          <AppText variant="caption" style={s.hint}>
            {mockHint}
          </AppText>
        </View>
      ) : null}

      {isMock ? (
        <View style={s.rowWrap}>
          <AppButton title="샘플(화주)" variant="secondary" size="sm" disabled={auth.isBusy} onPress={onPressPresetShipper} />
          <AppButton title="샘플(기사)" variant="secondary" size="sm" disabled={auth.isBusy} onPress={onPressPresetDriver} />
        </View>
      ) : null}

      <AppInput
        label="이메일"
        placeholder={isMock ? MOCK_EMAIL_BY_ROLE.shipper : "name@company.com"}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        error={auth.errorMessage ? undefined : emailError}
        helperText={auth.errorMessage ? undefined : mockHint}
      />

      <AppInput
        label="비밀번호"
        placeholder={isMock ? MOCK_PASSWORD : "비밀번호"}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        error={auth.errorMessage ? undefined : passwordError}
        helperText={auth.errorMessage ? undefined : "최소 6자 이상"}
      />

      {auth.errorMessage ? (
        <AppCard 
          outerStyle={{ borderWidth: 0, marginVertical: 4 }} 
          tone="actionRequired"
        >
          <AppText variant="detail" color="semanticDanger">
            {auth.errorMessage}
          </AppText>
        </AppCard>
      ) : null}

      <View style={s.footer}>
        <AppButton
          title={auth.isBusy ? "로그인 중..." : "로그인"}
          variant="primary"
          loading={auth.isBusy}
          disabled={!canSubmit}
          onPress={onPressLogin}
        />

        {showDevActions && (__DEV__ || isMock) ? (
          <AppButton title="로그아웃(세션 삭제)" variant="secondary" disabled={auth.isBusy} onPress={() => auth.logout()} />
        ) : null}
      </View>
    </View>
  );

  if (layout === "card") return <View style={s.card}>{content}</View>;
  return content;
}

/**
 * 1) Real Mode: 역할 선택 UI 제거, ID/PW만 입력 → 서버(/me)에서 role 확정.
 * 2) Mock Mode: 샘플 버튼 + 자동 입력으로 빠른 분기 테스트(토큰에 role 인코딩).
 * 3) layout/showHeader로 LoginPage/모달 등에서 카드/헤더 중첩 없이 재사용 가능합니다.
 */