// apps/mobile/src/features/auth/ui/forms/LoginForm.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, type TextInput, View } from "react-native";
import { createThemedStyles } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppInput } from "@/shared/ui/kit/AppInput";
import { AppText } from "@/shared/ui/kit/AppText";
import { useAuth } from "@/features/auth/model/useAuth";
import type { AuthUserRole } from "@/features/auth/model/auth.types";
import { AuthRoleTabs } from "@/features/auth/ui/AuthRoleTabs";
import { LOGIN_DRIVER, LOGIN_SHIPPER } from "@/shared/lib/dev/mockPayloads";
import { MockAutofillButton } from "@/shared/ui/dev/MockAutofillButton";

type Props = {
  role: AuthUserRole;
  onRoleChange: (role: AuthUserRole) => void;
  onSuccess?: () => void;
  onFocusInput?: (input: TextInput | null) => void;
  onSubmitError?: (message: string) => void;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const useStyles = createThemedStyles((t) =>
  StyleSheet.create({
    root: {
      gap: t.layout.spacing.base * 5,
    },
    headerContainer: {
      gap: t.layout.spacing.base * 2,
    },
    title: {
      fontSize: t.typography.scale.display.size,
      lineHeight: t.typography.scale.display.lineHeight,
      fontWeight: "700",
      letterSpacing: t.typography.scale.display.letterSpacing,
      color: t.colors.textMain,
    },
    subtitle: {
      fontSize: t.typography.scale.body.size,
      lineHeight: t.typography.scale.body.lineHeight,
      color: t.colors.textMuted,
    },
    formContainer: {
      gap: t.layout.spacing.base * 4,
    },
    inputs: {
      gap: t.layout.spacing.base * 4,
    },
    inputShell: {
      backgroundColor: t.colors.bgSurfaceAlt,
    },
    forgotBtn: {
      alignSelf: "flex-end",
      borderWidth: 0,
      minHeight: 0,
      paddingHorizontal: 0,
      paddingVertical: t.layout.spacing.base,
    },
    forgotText: {
      fontSize: t.typography.scale.detail.size,
      lineHeight: t.typography.scale.detail.lineHeight,
      color: t.colors.textSub,
      textDecorationLine: "underline",
    },
    actionContainer: {
      gap: t.layout.spacing.base * 3,
    },
    submitError: {
      textAlign: "center",
    },
    mockBadge: {
      alignSelf: "center",
      backgroundColor: t.colors.bgSurfaceAlt,
      paddingHorizontal: t.layout.spacing.base * 3,
      paddingVertical: t.layout.spacing.base * 1.5,
      borderRadius: t.layout.radii.pill,
    },
  })
);

function normalizeEmail(value?: string | null) {
  return (value ?? "").trim();
}

function isEmailValid(value: string) {
  return EMAIL_REGEX.test(value);
}

function readErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "string" && error.trim()) return error.trim();
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message.trim();
  }
  return fallback;
}

export function LoginForm({ role, onRoleChange, onSuccess, onFocusInput, onSubmitError }: Props) {
  const s = useStyles();
  const auth = useAuth();

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const submitInFlightRef = useRef(false);
  const enter = useRef(new Animated.Value(0)).current;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enter]);

  useEffect(() => {
    if (!auth.isMockAuth) return;
    const payload = role === "driver" ? LOGIN_DRIVER : LOGIN_SHIPPER;
    setEmail(payload.email);
    setPassword(payload.password);
  }, [auth.isMockAuth, role]);

  const scrollIntoView = useCallback(
    (input: TextInput | null) => {
      if (!input) return;
      requestAnimationFrame(() => onFocusInput?.(input));
    },
    [onFocusInput]
  );

  const focusInput = useCallback(
    (input: TextInput | null) => {
      input?.focus?.();
      scrollIntoView(input ?? null);
    },
    [scrollIntoView]
  );

  const clearLocalError = useCallback(() => {
    setSubmitError(null);
    onSubmitError?.("");
  }, [onSubmitError]);

  const reportError = useCallback(
    (message: string) => {
      const safeMessage = (message ?? "").trim() || "로그인 처리 중 오류가 발생했습니다.";
      setSubmitError(safeMessage);
      onSubmitError?.(safeMessage);
    },
    [onSubmitError]
  );

  const handleSubmit = useCallback(async () => {
    if (auth.isBusy || submitInFlightRef.current) return;

    clearLocalError();

    const safeEmail = normalizeEmail(email);
    const safePassword = password ?? "";

    if (!isEmailValid(safeEmail)) {
      reportError("유효한 이메일 형식을 입력해 주세요.");
      return;
    }

    if (safePassword.length < 6) {
      reportError("비밀번호는 6자 이상 입력해 주세요.");
      return;
    }

    submitInFlightRef.current = true;

    try {
      const ok = await auth.login({ email: safeEmail, password: safePassword, role });
      if (!ok) {
        reportError(auth.errorMessage ?? "로그인에 실패했습니다. 입력한 정보를 확인해 주세요.");
        return;
      }
      onSuccess?.();
    } catch (error) {
      reportError(readErrorMessage(error, auth.errorMessage ?? "로그인 처리 중 오류가 발생했습니다."));
    } finally {
      submitInFlightRef.current = false;
    }
  }, [auth, clearLocalError, email, onSuccess, password, reportError, role]);

  const handleEmailChange = useCallback(
    (value: string) => {
      clearLocalError();
      setEmail(value ?? "");
    },
    [clearLocalError]
  );

  const handlePasswordChange = useCallback(
    (value: string) => {
      clearLocalError();
      setPassword(value ?? "");
    },
    [clearLocalError]
  );

  const handleMockAutofill = useCallback(() => {
    clearLocalError();
    const payload = role === "driver" ? LOGIN_DRIVER : LOGIN_SHIPPER;
    setEmail(payload.email);
    setPassword(payload.password);
  }, [clearLocalError, role]);

  const isValid = useMemo(() => {
    return isEmailValid(normalizeEmail(email)) && (password?.length ?? 0) >= 6;
  }, [email, password]);

  const animatedStyle = useMemo(() => {
    const translateX = enter.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] });
    return { opacity: enter, transform: [{ translateX }] };
  }, [enter]);

  return (
    <Animated.View style={animatedStyle}>
      <View style={s.root}>
        <View style={s.headerContainer}>
          <AppText style={s.title}>
            배송을{"\n"}시작해보세요
          </AppText>
          <AppText style={s.subtitle}>서비스 이용을 위해 로그인해 주세요</AppText>
        </View>

        <View style={s.formContainer}>
          <AuthRoleTabs role={role} onChange={onRoleChange} onBeforeChange={clearLocalError} disabled={auth.isBusy} />
          <MockAutofillButton onFill={handleMockAutofill} label={role === "driver" ? "Fill Driver Login" : "Fill Shipper Login"} />

          <View style={s.inputs}>
            <AppInput
              ref={emailRef}
              label="이메일"
              placeholder="example@rodia.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              shellStyle={s.inputShell}
              onChangeText={handleEmailChange}
              returnKeyType="next"
              blurOnSubmit={false}
              onFocus={() => scrollIntoView(emailRef.current ?? null)}
              onSubmitEditing={() => focusInput(passwordRef.current ?? null)}
            />

            <AppInput
              ref={passwordRef}
              label="비밀번호"
              placeholder="비밀번호를 입력해 주세요"
              secureTextEntry
              value={password}
              shellStyle={s.inputShell}
              onChangeText={handlePasswordChange}
              returnKeyType="done"
              onFocus={() => scrollIntoView(passwordRef.current ?? null)}
              onSubmitEditing={handleSubmit}
            />
          </View>

          <AppButton
            title="비밀번호를 잊으셨나요?"
            variant="secondary"
            size="sm"
            style={s.forgotBtn}
            textStyle={s.forgotText}
            onPress={() => {}}
            disabled={auth.isBusy}
          />
        </View>

        <View style={s.actionContainer}>
          {submitError ? (
            <AppText variant="detail" color="semanticDanger" style={s.submitError}>
              {submitError}
            </AppText>
          ) : null}

          <AppButton
            title={auth.isBusy ? "로그인 중..." : "로그인"}
            variant="primary"
            size="lg"
            loading={auth.isBusy}
            disabled={!isValid || auth.isBusy}
            onPress={handleSubmit}
          />

          {auth.isMockAuth ? (
            <View style={s.mockBadge}>
              <AppText variant="caption" color="semanticInfo" weight="700">
                Rodia Dev Mode
              </AppText>
            </View>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}
