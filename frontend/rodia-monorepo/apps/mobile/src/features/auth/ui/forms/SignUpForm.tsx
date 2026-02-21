// apps/mobile/src/features/auth/ui/forms/SignUpForm.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, Easing, StyleSheet, type TextInput, View } from "react-native";
import { createThemedStyles } from "@/shared/theme/useAppTheme";
import { AppButton } from "@/shared/ui/kit/AppButton";
import { AppInput } from "@/shared/ui/kit/AppInput";
import { AppText } from "@/shared/ui/kit/AppText";
import { useAuth } from "@/features/auth/model/useAuth";
import { MOCK_EMAIL_BY_ROLE, MOCK_PASSWORD } from "@/features/auth/model/auth.consts";
import type { AuthUserRole } from "@/features/auth/model/auth.types";
import { AuthRoleTabs } from "@/features/auth/ui/AuthRoleTabs";

type SignUpParams = {
  email: string;
  password: string;
  name: string;
  phone: string;
  role: AuthUserRole;
  companyName?: string;
  ownerName?: string;
  bizRegNo?: string;
  bizPhone?: string;
  openDate?: string;
};

type AuthStoreWithSignUp = ReturnType<typeof useAuth> & {
  signUp: (params: SignUpParams) => Promise<boolean>;
};

export type SignedUpPayload = {
  role: AuthUserRole;
  email: string;
};

export type RequirePostSuccessPayload = {
  role: AuthUserRole;
};

type Props = {
  role: AuthUserRole;
  onRoleChange: (role: AuthUserRole) => void;
  onSuccess?: () => void;
  onFocusInput?: (input: TextInput | null) => void;
  onSignedUp?: (payload: SignedUpPayload) => void;
  onRequirePostSuccess?: (payload: RequirePostSuccessPayload) => void;
  onSubmitError?: (message: string) => void;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OPEN_DATE_DIGITS = 8;
const BIZ_REG_MIN_DIGITS = 10;
const PHONE_MIN_DIGITS = 10;

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
    infoBox: {
      backgroundColor: t.colors.bgSurfaceAlt,
      borderWidth: 1,
      borderColor: t.colors.borderDefault,
      borderRadius: t.layout.radii.control,
      paddingHorizontal: t.layout.spacing.base * 3,
      paddingVertical: t.layout.spacing.base * 3,
      gap: t.layout.spacing.base,
    },
    infoTitle: {
      color: t.colors.textMain,
    },
    infoBody: {
      color: t.colors.textSub,
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

function onlyDigits(value?: string | null): string {
  return (value ?? "").replace(/\D/g, "");
}

const formatPhoneNumber = (value: string) => {
  const cleaned = onlyDigits(value).slice(0, 11);
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 7) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`;
};

const formatBizRegNo = (value: string) => {
  const cleaned = onlyDigits(value).slice(0, 10);
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 5) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5, 10)}`;
};

const formatOpenDate = (value: string) => {
  const cleaned = onlyDigits(value).slice(0, OPEN_DATE_DIGITS);
  if (cleaned.length <= 4) return cleaned;
  if (cleaned.length <= 6) return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
  return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`;
};

function normalizeEmail(value?: string | null) {
  return (value ?? "").trim();
}

function normalizeOpenDate(value?: string | null): string {
  const digits = onlyDigits(value);
  return digits.length >= OPEN_DATE_DIGITS ? digits.slice(0, OPEN_DATE_DIGITS) : digits;
}

function isEmailValid(value: string) {
  return EMAIL_REGEX.test(value);
}

function isPhoneValid(value?: string | null) {
  const digits = onlyDigits(value);
  return digits.length >= PHONE_MIN_DIGITS;
}

function isBizRegNoValid(value?: string | null) {
  return onlyDigits(value).length >= BIZ_REG_MIN_DIGITS;
}

function isOpenDateValid(value?: string | null): boolean {
  const openDate = normalizeOpenDate(value);
  if (!/^\d{8}$/.test(openDate)) return false;
  const y = Number(openDate.slice(0, 4));
  const m = Number(openDate.slice(4, 6));
  const d = Number(openDate.slice(6, 8));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return false;
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

function readErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "string" && error.trim()) return error.trim();
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message.trim();
  }
  return fallback;
}

export function SignUpForm({
  role,
  onRoleChange,
  onSuccess,
  onFocusInput,
  onSignedUp,
  onRequirePostSuccess,
  onSubmitError,
}: Props) {
  const s = useStyles();
  const auth = useAuth() as AuthStoreWithSignUp;

  const nameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const companyNameRef = useRef<TextInput>(null);
  const ownerNameRef = useRef<TextInput>(null);
  const bizRegNoRef = useRef<TextInput>(null);
  const bizPhoneRef = useRef<TextInput>(null);
  const openDateRef = useRef<TextInput>(null);
  const submitInFlightRef = useRef(false);
  const enter = useRef(new Animated.Value(0)).current;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [bizRegNo, setBizRegNo] = useState("");
  const [bizPhone, setBizPhone] = useState("");
  const [openDate, setOpenDate] = useState("");
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
    const mockName = role === "driver" ? "Mock Driver" : "Mock Shipper";
    const mockPhone = role === "driver" ? "010-1234-5678" : "010-9876-5432";
    setName(mockName);
    setEmail(role === "driver" ? (MOCK_EMAIL_BY_ROLE.driver ?? "") : (MOCK_EMAIL_BY_ROLE.shipper ?? ""));
    setPassword(MOCK_PASSWORD ?? "");
    setConfirmPassword(MOCK_PASSWORD ?? "");
    setPhone(mockPhone);
    if (role === "shipper") {
      setCompanyName("로디아 화주");
      setOwnerName(mockName);
      setBizRegNo("123-45-67890");
      setBizPhone(mockPhone);
      setOpenDate("2020-01-01");
    }
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
      const safeMessage = (message ?? "").trim() || "회원가입 처리 중 오류가 발생했습니다.";
      setSubmitError(safeMessage);
      onSubmitError?.(safeMessage);
    },
    [onSubmitError]
  );

  const handlePhoneChange = useCallback(
    (text: string) => {
      clearLocalError();
      setPhone(formatPhoneNumber(text ?? ""));
    },
    [clearLocalError]
  );

  const handleBizPhoneChange = useCallback(
    (text: string) => {
      clearLocalError();
      setBizPhone(formatPhoneNumber(text ?? ""));
    },
    [clearLocalError]
  );

  const handleBizRegNoChange = useCallback(
    (text: string) => {
      clearLocalError();
      setBizRegNo(formatBizRegNo(text ?? ""));
    },
    [clearLocalError]
  );

  const handleOpenDateChange = useCallback(
    (text: string) => {
      clearLocalError();
      setOpenDate(formatOpenDate(text ?? ""));
    },
    [clearLocalError]
  );

  const isValid = useMemo(() => {
    const safeName = name?.trim() ?? "";
    const safeEmail = normalizeEmail(email);
    const safePassword = password ?? "";
    const safeConfirm = confirmPassword ?? "";
    const safePhone = phone ?? "";

    if (!safeName) return false;
    if (!isEmailValid(safeEmail)) return false;
    if (safePassword.length < 6) return false;
    if (safePassword !== safeConfirm) return false;
    if (!isPhoneValid(safePhone)) return false;

    if (role !== "shipper") return true;

    if (!(companyName ?? "").trim()) return false;
    if (!(ownerName ?? "").trim()) return false;
    if (!isBizRegNoValid(bizRegNo)) return false;
    if (!isPhoneValid(bizPhone)) return false;
    if (!isOpenDateValid(openDate)) return false;
    return true;
  }, [bizPhone, bizRegNo, companyName, confirmPassword, email, name, openDate, ownerName, password, phone, role]);

  const phoneError = phone && !isPhoneValid(phone) ? "전화번호는 숫자 10자리 이상 입력해 주세요." : undefined;
  const bizPhoneError =
    role === "shipper" && bizPhone && !isPhoneValid(bizPhone) ? "사업장 연락처는 숫자 10자리 이상 입력해 주세요." : undefined;
  const bizRegNoError =
    role === "shipper" && bizRegNo && !isBizRegNoValid(bizRegNo)
      ? "사업자등록번호는 숫자 10자리로 입력해 주세요."
      : undefined;
  const openDateError =
    role === "shipper" && openDate && !isOpenDateValid(openDate)
      ? "개업일자는 YYYYMMDD 형식(예: 20240131)으로 입력해 주세요."
      : undefined;

  const handleSubmit = useCallback(async () => {
    if (auth.isBusy || submitInFlightRef.current) return;

    clearLocalError();

    const safeName = name?.trim() ?? "";
    const safeEmail = normalizeEmail(email);
    const safePassword = password ?? "";
    const safeConfirm = confirmPassword ?? "";
    const safePhone = formatPhoneNumber(phone ?? "");

    if (!safeName) {
      reportError("이름을 입력해 주세요.");
      return;
    }

    if (!isEmailValid(safeEmail)) {
      reportError("유효한 이메일 형식을 입력해 주세요.");
      return;
    }

    if (safePassword.length < 6) {
      reportError("비밀번호는 6자 이상 입력해 주세요.");
      return;
    }

    if (safePassword !== safeConfirm) {
      reportError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    if (!isPhoneValid(safePhone)) {
      reportError("전화번호는 숫자 10자리 이상 입력해 주세요.");
      return;
    }

    const shipperCompany = (companyName ?? "").trim();
    const shipperOwner = (ownerName ?? "").trim();
    const shipperBizRegNo = onlyDigits(bizRegNo);
    const shipperBizPhone = formatPhoneNumber(bizPhone ?? "");
    const shipperOpenDate = normalizeOpenDate(openDate);

    if (role === "shipper") {
      if (!shipperCompany) {
        reportError("상호명을 입력해 주세요.");
        return;
      }

      if (!shipperOwner) {
        reportError("대표자명을 입력해 주세요.");
        return;
      }

      if (shipperBizRegNo.length < BIZ_REG_MIN_DIGITS) {
        reportError("사업자등록번호는 숫자 10자리로 입력해 주세요.");
        return;
      }

      if (!isPhoneValid(shipperBizPhone)) {
        reportError("사업장 연락처는 숫자 10자리 이상 입력해 주세요.");
        return;
      }

      if (!isOpenDateValid(shipperOpenDate)) {
        reportError("개업일자는 YYYYMMDD 형식(예: 20240131)으로 입력해 주세요.");
        return;
      }
    }

    submitInFlightRef.current = true;

    try {
      const signUpOk = await auth.signUp({
        name: safeName,
        email: safeEmail,
        password: safePassword,
        phone: safePhone,
        role,
        companyName: role === "shipper" ? shipperCompany : undefined,
        ownerName: role === "shipper" ? shipperOwner : undefined,
        bizRegNo: role === "shipper" ? shipperBizRegNo : undefined,
        bizPhone: role === "shipper" ? shipperBizPhone : undefined,
        openDate: role === "shipper" ? shipperOpenDate : undefined,
      });

      if (!signUpOk) {
        const message = auth.errorMessage ?? "회원가입에 실패했습니다. 잠시 후 다시 시도해 주세요.";
        reportError(message);
        Alert.alert("회원가입 실패", message);
        return;
      }

      onRequirePostSuccess?.({ role });
      onSignedUp?.({ role, email: safeEmail });
      onSuccess?.();
    } catch (error) {
      const message = readErrorMessage(error, auth.errorMessage ?? "회원가입 처리 중 오류가 발생했습니다.");
      reportError(message);
      Alert.alert("회원가입 실패", message);
    } finally {
      submitInFlightRef.current = false;
    }
  }, [
    auth,
    bizPhone,
    bizRegNo,
    clearLocalError,
    companyName,
    confirmPassword,
    email,
    name,
    onRequirePostSuccess,
    onSignedUp,
    onSuccess,
    openDate,
    ownerName,
    password,
    phone,
    reportError,
    role,
  ]);

  const animatedStyle = useMemo(() => {
    const translateX = enter.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
    return { opacity: enter, transform: [{ translateX }] };
  }, [enter]);

  return (
    <Animated.View style={animatedStyle}>
      <View style={s.root}>
        <View style={s.headerContainer}>
          <AppText style={s.title}>회원가입</AppText>
          <AppText style={s.subtitle}>계정 유형을 선택하고 기본 정보를 입력해 주세요</AppText>
        </View>

        <View style={s.formContainer}>
          <AuthRoleTabs role={role} onChange={onRoleChange} onBeforeChange={clearLocalError} disabled={auth.isBusy} />

          <View style={s.inputs}>
            <AppInput
              ref={nameRef}
              label="이름"
              placeholder="이름을 입력해 주세요"
              value={name}
              shellStyle={s.inputShell}
              onChangeText={(value) => {
                clearLocalError();
                setName(value ?? "");
              }}
              returnKeyType="next"
              autoComplete="name"
              blurOnSubmit={false}
              onFocus={() => scrollIntoView(nameRef.current ?? null)}
              onSubmitEditing={() => focusInput(emailRef.current ?? null)}
            />

            <AppInput
              ref={emailRef}
              label="이메일"
              placeholder="example@rodia.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              value={email}
              shellStyle={s.inputShell}
              onChangeText={(value) => {
                clearLocalError();
                setEmail(value ?? "");
              }}
              returnKeyType="next"
              blurOnSubmit={false}
              onFocus={() => scrollIntoView(emailRef.current ?? null)}
              onSubmitEditing={() => focusInput(passwordRef.current ?? null)}
            />

            <AppInput
              ref={passwordRef}
              label="비밀번호"
              placeholder="6자 이상 입력"
              secureTextEntry
              value={password}
              shellStyle={s.inputShell}
              onChangeText={(value) => {
                clearLocalError();
                setPassword(value ?? "");
              }}
              returnKeyType="next"
              blurOnSubmit={false}
              onFocus={() => scrollIntoView(passwordRef.current ?? null)}
              onSubmitEditing={() => focusInput(confirmPasswordRef.current ?? null)}
            />

            <AppInput
              ref={confirmPasswordRef}
              label="비밀번호 확인"
              placeholder="비밀번호를 다시 입력해 주세요"
              secureTextEntry
              value={confirmPassword}
              shellStyle={s.inputShell}
              onChangeText={(value) => {
                clearLocalError();
                setConfirmPassword(value ?? "");
              }}
              error={confirmPassword && password !== confirmPassword ? "비밀번호가 일치하지 않습니다." : undefined}
              returnKeyType="next"
              blurOnSubmit={false}
              onFocus={() => scrollIntoView(confirmPasswordRef.current ?? null)}
              onSubmitEditing={() => focusInput(phoneRef.current ?? null)}
            />

            <AppInput
              ref={phoneRef}
              label="전화번호"
              placeholder="010-0000-0000"
              keyboardType="number-pad"
              maxLength={13}
              value={phone}
              shellStyle={s.inputShell}
              onChangeText={handlePhoneChange}
              error={phoneError}
              returnKeyType="next"
              blurOnSubmit={false}
              onFocus={() => scrollIntoView(phoneRef.current ?? null)}
              onSubmitEditing={() => {
                if (role === "shipper") {
                  focusInput(companyNameRef.current ?? null);
                  return;
                }
                handleSubmit();
              }}
            />

            {role === "shipper" ? (
              <>
                <AppInput
                  ref={companyNameRef}
                  label="상호명"
                  placeholder="상호명을 입력해 주세요"
                  value={companyName}
                  shellStyle={s.inputShell}
                  onChangeText={(value) => {
                    clearLocalError();
                    setCompanyName(value ?? "");
                  }}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onFocus={() => scrollIntoView(companyNameRef.current ?? null)}
                  onSubmitEditing={() => focusInput(ownerNameRef.current ?? null)}
                />

                <AppInput
                  ref={ownerNameRef}
                  label="대표자명"
                  placeholder="대표자명을 입력해 주세요"
                  value={ownerName}
                  shellStyle={s.inputShell}
                  onChangeText={(value) => {
                    clearLocalError();
                    setOwnerName(value ?? "");
                  }}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onFocus={() => scrollIntoView(ownerNameRef.current ?? null)}
                  onSubmitEditing={() => focusInput(bizRegNoRef.current ?? null)}
                />

                <AppInput
                  ref={bizRegNoRef}
                  label="사업자등록번호"
                  placeholder="123-45-67890"
                  keyboardType="number-pad"
                  maxLength={12}
                  value={bizRegNo}
                  shellStyle={s.inputShell}
                  onChangeText={handleBizRegNoChange}
                  error={bizRegNoError}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onFocus={() => scrollIntoView(bizRegNoRef.current ?? null)}
                  onSubmitEditing={() => focusInput(bizPhoneRef.current ?? null)}
                />

                <AppInput
                  ref={bizPhoneRef}
                  label="사업장 연락처"
                  placeholder="010-0000-0000"
                  keyboardType="number-pad"
                  maxLength={13}
                  value={bizPhone}
                  shellStyle={s.inputShell}
                  onChangeText={handleBizPhoneChange}
                  error={bizPhoneError}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onFocus={() => scrollIntoView(bizPhoneRef.current ?? null)}
                  onSubmitEditing={() => focusInput(openDateRef.current ?? null)}
                />

                <AppInput
                  ref={openDateRef}
                  label="개업일자"
                  placeholder="YYYY-MM-DD 또는 YYYYMMDD"
                  keyboardType="number-pad"
                  maxLength={10}
                  value={openDate}
                  shellStyle={s.inputShell}
                  onChangeText={handleOpenDateChange}
                  error={openDateError}
                  returnKeyType="done"
                  onFocus={() => scrollIntoView(openDateRef.current ?? null)}
                  onSubmitEditing={handleSubmit}
                />
              </>
            ) : null}
          </View>

          <View style={s.infoBox}>
            <AppText variant="detail" weight="700" style={s.infoTitle}>
              안내
            </AppText>
            {role === "shipper" ? (
              <AppText variant="caption" style={s.infoBody}>
                화주 가입은 사업자 진위확인이 포함됩니다. 사업자번호/개업일자/대표자명을 실정보로 입력해 주세요.
              </AppText>
            ) : (
              <AppText variant="caption" style={s.infoBody}>
                빠른 시작을 위해 필수 정보만 입력받고 있습니다.
              </AppText>
            )}
            <AppText variant="caption" color="textMain" weight="700">
              추가 인증(계좌, 차량 등)은 가입 후 단계에서 진행됩니다.
            </AppText>
          </View>
        </View>

        <View style={s.actionContainer}>
          {submitError ? (
            <AppText variant="detail" color="semanticDanger" style={s.submitError}>
              {submitError}
            </AppText>
          ) : null}

          <AppButton
            title={auth.isBusy ? "가입 처리 중..." : "가입하고 시작하기"}
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
