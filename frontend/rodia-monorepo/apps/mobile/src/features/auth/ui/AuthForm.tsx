// apps/mobile/src/features/auth/ui/AuthForm.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LayoutAnimation, Platform, StyleSheet, TextInput, TouchableOpacity, UIManager, View } from "react-native";
import { createThemedStyles } from "@/shared/theme/useAppTheme";
import { AppText } from "@/shared/ui/kit/AppText";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppInput } from "@/shared/ui/kit/AppInput";
import { useAuth } from "@/features/auth/model/useAuth";
import { MOCK_EMAIL_BY_ROLE, MOCK_PASSWORD } from "@/features/auth/model/auth.consts";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type AuthMode = "login" | "signup";
type UserRole = "shipper" | "driver";

type Props = {
  onSuccess?: () => void;
  onFocusInput?: (input: TextInput | null) => void;
};

type SignUpParams = {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  carNumber?: string;
};

type AuthStoreWithOptionalSignUp = ReturnType<typeof useAuth> & {
  signUp?: (params: SignUpParams) => Promise<boolean>;
};

const useStyles = createThemedStyles((t) =>
  StyleSheet.create({
    root: { gap: t.layout.spacing.base * 4 },
    tabContainer: {
      flexDirection: "row",
      backgroundColor: t.colors.bgSurfaceAlt,
      borderWidth: 1,
      borderColor: t.colors.borderDefault,
      padding: t.layout.spacing.base,
      borderRadius: t.layout.radii.control,
      gap: t.layout.spacing.base,
    },
    tabBtn: {
      flex: 1,
      minHeight: t.components.button.sizes.md.minHeight,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: t.layout.radii.control,
    },
    tabBtnActive: {
      backgroundColor: t.colors.bgSurface,
      borderWidth: 1,
      borderColor: t.colors.borderStrong,
    },
    fieldsContainer: { gap: t.layout.spacing.base * 3 },
    footer: { marginTop: t.layout.spacing.base * 3, gap: t.layout.spacing.base * 3 },
    toggleBtn: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      minHeight: t.components.button.sizes.sm.minHeight,
    },
    toggleAction: { marginLeft: t.layout.spacing.base },
    hint: { marginTop: t.layout.spacing.base, marginLeft: t.layout.spacing.base },
    errorBox: {
      backgroundColor: t.colors.bgSurface,
      padding: t.layout.spacing.base * 3,
      borderRadius: t.layout.radii.control,
      borderWidth: 1,
      borderColor: t.colors.semanticDanger,
    },
  })
);

export function AuthForm({ onSuccess, onFocusInput }: Props) {
  const s = useStyles();
  const auth = useAuth() as AuthStoreWithOptionalSignUp;

  const nameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);
  const carNumberRef = useRef<TextInput>(null);

  const animateLayout = () =>
    LayoutAnimation.configureNext(
      LayoutAnimation.create(240, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity)
    );

  const [mode, setMode] = useState<AuthMode>("login");
  const [role, setRole] = useState<UserRole>("shipper");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [carNumber, setCarNumber] = useState("");

  const isMock = auth?.isMockAuth ?? false;

  useEffect(() => {
    if (isMock && mode === "login") {
      setEmail(role === "shipper" ? MOCK_EMAIL_BY_ROLE.shipper : MOCK_EMAIL_BY_ROLE.driver);
      setPassword(MOCK_PASSWORD);
    } else if (isMock && mode === "signup") {
      setEmail("");
      setPassword("");
    }
  }, [isMock, role, mode]);

  const scrollIntoView = useCallback(
    (input: TextInput | null) => {
      if (!input) return;
      requestAnimationFrame(() => {
        onFocusInput?.(input);
      });
    },
    [onFocusInput]
  );

  const focusInput = useCallback(
    (input: TextInput | null) => {
      if (!input) return;
      input.focus();
      scrollIntoView(input);
    },
    [scrollIntoView]
  );

  const toggleMode = () => {
    animateLayout();
    setMode((prev) => (prev === "login" ? "signup" : "login"));
    auth.clearError();
  };

  const switchRole = (newRole: UserRole) => {
    if (role === newRole) return;
    animateLayout();
    setRole(newRole);
  };

  const isValid = useMemo(() => {
    if (!email || password.length < 6) return false;
    if (mode === "signup") {
      if (!name) return false;
      if (password !== confirmPassword) return false;
      if (role === "driver" && !carNumber) return false;
    }
    return true;
  }, [mode, role, email, password, name, confirmPassword, carNumber]);

  const handleSubmit = async () => {
    if (!isValid || auth.isBusy) return;

    if (mode === "login") {
      const ok = await auth.login({ email, password });
      if (ok) onSuccess?.();
      return;
    }

    if (!auth.signUp) return;
    const ok = await auth.signUp({
      email,
      password,
      name,
      role,
      carNumber: role === "driver" ? carNumber : undefined,
    });
    if (ok) onSuccess?.();
  };

  return (
    <View style={s.root}>
      <View style={s.tabContainer}>
        <TouchableOpacity
          style={[s.tabBtn, role === "shipper" && s.tabBtnActive]}
          onPress={() => switchRole("shipper")}
          activeOpacity={0.8}
        >
          <AppText
            variant="detail"
            color={role === "shipper" ? "brandPrimary" : "textSub"}
            weight={role === "shipper" ? "700" : "600"}
          >
            고객(화주)
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.tabBtn, role === "driver" && s.tabBtnActive]}
          onPress={() => switchRole("driver")}
          activeOpacity={0.8}
        >
          <AppText
            variant="detail"
            color={role === "driver" ? "brandPrimary" : "textSub"}
            weight={role === "driver" ? "700" : "600"}
          >
            기사님
          </AppText>
        </TouchableOpacity>
      </View>

      <View style={s.fieldsContainer}>
        {mode === "signup" && (
          <AppInput
            ref={nameRef}
            label="이름"
            placeholder="실명을 입력해주세요"
            value={name}
            onChangeText={setName}
            returnKeyType="next"
            blurOnSubmit={false}
            onFocus={() => scrollIntoView(nameRef.current)}
            onSubmitEditing={() => focusInput(emailRef.current)}
          />
        )}

        <AppInput
          ref={emailRef}
          label="이메일"
          placeholder="example@rodia.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
          returnKeyType="next"
          blurOnSubmit={false}
          onFocus={() => scrollIntoView(emailRef.current)}
          onSubmitEditing={() => focusInput(passwordRef.current)}
        />

        <AppInput
          ref={passwordRef}
          label="비밀번호"
          placeholder="6자 이상 입력"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          returnKeyType={mode === "signup" ? "next" : "done"}
          blurOnSubmit={mode !== "signup"}
          onFocus={() => scrollIntoView(passwordRef.current)}
          onSubmitEditing={() => {
            if (mode === "signup") {
              focusInput(confirmPasswordRef.current);
              return;
            }
            handleSubmit();
          }}
        />

        {mode === "signup" && (
          <>
            <AppInput
              ref={confirmPasswordRef}
              label="비밀번호 확인"
              placeholder="비밀번호 다시 입력"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              error={confirmPassword && password !== confirmPassword ? "비밀번호가 일치하지 않습니다." : undefined}
              returnKeyType={role === "driver" ? "next" : "done"}
              blurOnSubmit={role !== "driver"}
              onFocus={() => scrollIntoView(confirmPasswordRef.current)}
              onSubmitEditing={() => {
                if (role === "driver") {
                  focusInput(carNumberRef.current);
                  return;
                }
                handleSubmit();
              }}
            />

            {role === "driver" && (
              <View>
                <AppInput
                  ref={carNumberRef}
                  label="차량 번호"
                  placeholder="예: 12가 3456"
                  value={carNumber}
                  onChangeText={setCarNumber}
                  returnKeyType="done"
                  onFocus={() => scrollIntoView(carNumberRef.current)}
                  onSubmitEditing={handleSubmit}
                />
                <AppText variant="caption" color="textMuted" style={s.hint}>
                  * 정산 및 배차를 위해 필수입니다.
                </AppText>
              </View>
            )}
          </>
        )}
      </View>

      {auth.errorMessage ? (
        <View style={s.errorBox}>
          <AppText variant="detail" color="semanticDanger">
            {auth.errorMessage}
          </AppText>
        </View>
      ) : null}

      <View style={s.footer}>
        <AppButton
          title={auth.isBusy ? "처리 중..." : mode === "login" ? "로그인하기" : "가입하고 시작하기"}
          variant="primary"
          size="lg"
          loading={auth.isBusy}
          disabled={!isValid || auth.isBusy}
          onPress={handleSubmit}
        />

        <TouchableOpacity style={s.toggleBtn} onPress={toggleMode} disabled={auth.isBusy}>
          <AppText variant="detail" color="textSub">
            {mode === "login" ? "계정이 없으신가요?" : "이미 계정이 있으신가요?"}
          </AppText>
          <AppText variant="detail" color="brandPrimary" weight="700" style={s.toggleAction}>
            {mode === "login" ? "회원가입" : "로그인"}
          </AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
}
