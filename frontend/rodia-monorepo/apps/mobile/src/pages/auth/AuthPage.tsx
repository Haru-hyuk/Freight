// apps/mobile/src/pages/auth/AuthPage.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  UIManager,
  View,
  findNodeHandle,
  useWindowDimensions,
  type EmitterSubscription,
  type TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createThemedStyles } from "@/shared/theme/useAppTheme";
import { AppContainer } from "@/shared/ui/kit/AppContainer";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppSpinner } from "@/shared/ui/kit/AppSpinner";
import { AppText } from "@/shared/ui/kit/AppText";
import type { AuthUserRole } from "@/features/auth/model/auth.types";
import { useAuth } from "@/features/auth/model/useAuth";
import { LoginForm } from "@/features/auth/ui/forms/LoginForm";
import { SignUpForm, type RequirePostSuccessPayload, type SignedUpPayload } from "@/features/auth/ui/forms/SignUpForm";

type KeyboardAwareScrollView = ScrollView & {
  scrollResponderScrollNativeHandleToKeyboard?: (
    nodeHandle: number,
    additionalOffset?: number,
    preventNegativeScrollOffset?: boolean
  ) => void;
};

const useStyles = createThemedStyles((t) =>
  StyleSheet.create({
    keyboard: { flex: 1 },
    scroll: {
      backgroundColor: t.colors.bgSurfaceAlt,
    },
    root: {
      flex: 1,
      paddingHorizontal: t.layout.spacing.base * 5,
    },
    content: {
      width: "100%",
      maxWidth: 560,
      alignSelf: "center",
      gap: t.layout.spacing.base * 4,
    },
    brandHeader: {
      alignItems: "center",
      justifyContent: "center",
    },
    formCard: {
      padding: t.components.card.paddingMd,
      borderRadius: t.components.card.radius,
    },
    authRoot: {
      gap: t.layout.spacing.base * 4,
    },
    errorContent: {
      padding: t.layout.spacing.base * 3,
    },
    toggleRow: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: t.layout.spacing.base,
      paddingTop: t.layout.spacing.base,
    },
    toggleLinkHit: {
      borderRadius: t.layout.radii.control,
      paddingHorizontal: t.layout.spacing.base,
      paddingVertical: t.layout.spacing.base / 2,
    },
    toggleLinkPressed: {
      backgroundColor: t.colors.stateOverlayPressed,
    },
    toggleLinkText: {
      color: t.colors.brandPrimary,
      fontWeight: "800",
    },
    toggleLinkDisabled: {
      color: t.colors.stateDisabledText,
    },
    loadingOverlayRoot: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "center",
      alignItems: "center",
      zIndex: 50,
      elevation: 50,
    },
    loadingDim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: t.colors.bgSurfaceAlt,
      opacity: 0.72,
    },
    loadingContent: {
      paddingHorizontal: t.layout.spacing.base * 4,
      paddingVertical: t.layout.spacing.base * 3,
      borderRadius: t.layout.radii.control,
      backgroundColor: t.colors.bgSurface,
      borderWidth: 1,
      borderColor: t.colors.borderDefault,
      gap: t.layout.spacing.base * 2,
      alignItems: "center",
      justifyContent: "center",
      ...t.elevation.iosCardRaised,
      ...t.elevation.androidCardRaised,
    },
    loadingText: {
      textAlign: "center",
      color: t.colors.textSub,
    },
  })
);

function getDoneMessage(role: AuthUserRole, email: string, isMockAuth: boolean) {
  const roleLabel = role === "driver" ? "기사" : "화주";
  const safeEmail = (email ?? "").trim();
  const modeHint = isMockAuth
    ? "목업 모드에서는 인증 절차가 시뮬레이션됩니다."
    : "실서버 모드에서는 필수 인증 정보를 제출해 주세요.";

  if (safeEmail) {
    return `${roleLabel} 가입이 완료되었습니다.\n${safeEmail} 계정으로 인증을 진행해 주세요.\n${modeHint}`;
  }

  return `${roleLabel} 가입이 완료되었습니다.\n추가 인증은 다음 화면에서 진행됩니다.\n${modeHint}`;
}

function readKeyboardHeight(e: unknown) {
  const h = (e as { endCoordinates?: { height?: number } } | null)?.endCoordinates?.height;
  return typeof h === "number" && Number.isFinite(h) ? Math.max(0, h) : 0;
}

type AuthMode = "login" | "signup";

type AuthPageFormProps = {
  onSuccess?: () => void;
  onFocusInput?: (input: TextInput | null) => void;
  onSignedUp?: (payload: SignedUpPayload) => void;
  onRequirePostSuccess?: (payload: RequirePostSuccessPayload) => void;
};

function AuthPageForm({ onSuccess, onFocusInput, onSignedUp, onRequirePostSuccess }: AuthPageFormProps) {
  const s = useStyles();
  const auth = useAuth();

  const [mode, setMode] = useState<AuthMode>("login");
  const [role, setRole] = useState<AuthUserRole>("shipper");
  const [localErrorMessage, setLocalErrorMessage] = useState<string | null>(null);

  const animateLayout = useCallback(() => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(220, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity)
    );
  }, []);

  const clearErrors = useCallback(() => {
    auth.clearError();
    setLocalErrorMessage(null);
  }, [auth]);

  const handleRoleChange = useCallback(
    (nextRole: AuthUserRole) => {
      if (nextRole === role) return;
      Keyboard.dismiss();
      animateLayout();
      clearErrors();
      setRole(nextRole);
    },
    [animateLayout, clearErrors, role]
  );

  const toggleMode = useCallback(() => {
    Keyboard.dismiss();
    animateLayout();
    clearErrors();
    setMode((prev) => (prev === "login" ? "signup" : "login"));
  }, [animateLayout, clearErrors]);

  const handleSuccess = useCallback(() => {
    clearErrors();
    onSuccess?.();
  }, [clearErrors, onSuccess]);

  const handleSubmitError = useCallback(
    (message: string) => {
      const safeMessage = (message ?? "").trim();
      if (!safeMessage) {
        clearErrors();
        return;
      }

      auth.clearError();
      setLocalErrorMessage(safeMessage);
      animateLayout();
    },
    [animateLayout, auth, clearErrors]
  );

  const visibleError = (localErrorMessage ?? auth.errorMessage ?? "").trim() || null;
  const isBusy = !!auth.isBusy;

  return (
    <View style={s.authRoot}>
      {visibleError ? (
        <AppCard tone="actionRequired" outlined>
          <View style={s.errorContent}>
            <AppText variant="detail" color="semanticDanger">
              {visibleError}
            </AppText>
          </View>
        </AppCard>
      ) : null}

      {mode === "login" ? (
        <LoginForm
          role={role}
          onRoleChange={handleRoleChange}
          onSuccess={handleSuccess}
          onFocusInput={onFocusInput}
          onSubmitError={handleSubmitError}
        />
      ) : (
        <SignUpForm
          role={role}
          onRoleChange={handleRoleChange}
          onSuccess={handleSuccess}
          onFocusInput={onFocusInput}
          onSignedUp={onSignedUp}
          onRequirePostSuccess={onRequirePostSuccess}
          onSubmitError={handleSubmitError}
        />
      )}

      <View style={s.toggleRow}>
        <AppText variant="detail" color="textSub">
          {mode === "login" ? "계정이 없으신가요?" : "이미 계정이 있으신가요?"}
        </AppText>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isBusy }}
          disabled={isBusy}
          hitSlop={8}
          onPress={toggleMode}
          style={({ pressed }) => [s.toggleLinkHit, pressed && !isBusy ? s.toggleLinkPressed : undefined]}
        >
          <AppText variant="detail" style={[s.toggleLinkText, isBusy ? s.toggleLinkDisabled : undefined]}>
            {mode === "login" ? "회원가입" : "로그인"}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

export default function AuthPage() {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const { height: windowHeight } = useWindowDimensions();

  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const keyboardHeightRef = useRef(0);

  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const subs: EmitterSubscription[] = [];

    subs.push(
      Keyboard.addListener(showEvent as any, (e) => {
        const h = readKeyboardHeight(e);
        keyboardHeightRef.current = h;
        setKeyboardHeight(h);
      })
    );

    subs.push(
      Keyboard.addListener(hideEvent as any, () => {
        keyboardHeightRef.current = 0;
        setKeyboardHeight(0);
      })
    );

    return () => subs.forEach((sub) => sub?.remove?.());
  }, []);

  const onSuccess = useCallback(() => {
    // auth layout gatekeeper handles post-login routing.
  }, []);

  const handleSignedUp = useCallback(({ role, email }: SignedUpPayload) => {
    setTimeout(() => {
      // on Android, immediate Alert after form submit can get swallowed behind layout transitions.
      // A short defer keeps the completion 안내 visible in both mock/real modes.
      Alert.alert("가입 완료", getDoneMessage(role, email, auth.isMockAuth), [{ text: "확인" }]);
    }, 0);
  }, [auth.isMockAuth]);

  const scrollToMakeVisible = useCallback(
    (input: TextInput) => {
      const node = findNodeHandle(input);
      if (!node) return;

      UIManager.measureInWindow(node, (_x, y, _w, h) => {
        const safeY = typeof y === "number" ? y : 0;
        const safeH = typeof h === "number" ? h : 0;
        const keyboardTop = Math.max(0, windowHeight - (keyboardHeightRef.current ?? 0));
        const desiredBottom = Math.max(0, keyboardTop - 96);
        const inputBottom = safeY + safeH;

        if (inputBottom <= desiredBottom) return;

        const delta = inputBottom - desiredBottom;
        const nextY = Math.max(0, (scrollYRef.current ?? 0) + delta);
        (scrollRef.current as KeyboardAwareScrollView | null)?.scrollTo?.({ y: nextY, animated: true });
      });
    },
    [windowHeight]
  );

  const handleFocusInput = useCallback(
    (input: TextInput | null) => {
      if (!input) return;

      requestAnimationFrame(() => {
        const scrollView = scrollRef.current as KeyboardAwareScrollView | null;
        if (!scrollView) return;

        const fallbackScroll = () => {
          scrollView.scrollTo?.({ y: Math.max(0, (scrollYRef.current ?? 0) + 120), animated: true });
        };

        try {
          const node = findNodeHandle(input);
          const nativeFn = scrollView.scrollResponderScrollNativeHandleToKeyboard;
          if (node && typeof nativeFn === "function") {
            nativeFn.call(scrollView, node, 96, true);
            return;
          }

          scrollToMakeVisible(input);
        } catch {
          try {
            scrollToMakeVisible(input);
          } catch {
            fallbackScroll();
          }
        }
      });
    },
    [scrollToMakeVisible]
  );

  const isKeyboardOpen = keyboardHeight > 0;
  const keyboardOffset = Platform.OS === "ios" ? insets.top : 0;
  const behavior = Platform.OS === "ios" ? "padding" : "height";

  const contentContainerStyle = useMemo(() => {
    const topPad = insets.top + (isKeyboardOpen ? 16 : 48);
    const bottomPad = insets.bottom + 48;

    return {
      paddingTop: topPad,
      paddingBottom: bottomPad,
      minHeight: Math.max(0, windowHeight - insets.top - insets.bottom),
      justifyContent: isKeyboardOpen ? "flex-start" : "center",
    } as const;
  }, [insets.bottom, insets.top, isKeyboardOpen, windowHeight]);

  return (
    <AppContainer backgroundColor="bgSurfaceAlt" padding={0}>
      <KeyboardAvoidingView behavior={behavior} keyboardVerticalOffset={keyboardOffset} style={s.keyboard}>
        <ScrollView
          ref={scrollRef}
          style={s.scroll}
          contentContainerStyle={contentContainerStyle}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(e) => {
            scrollYRef.current = e?.nativeEvent?.contentOffset?.y ?? 0;
          }}
        >
          <View style={s.root}>
            <View style={s.content}>
              <View style={[s.brandHeader, { paddingVertical: isKeyboardOpen ? 8 : 16 }]}>
                <AppText variant="display" weight="800" color="brandPrimary" align="center">
                  Rodia
                </AppText>
              </View>

              <AppCard outlined style={s.formCard}>
                <AuthPageForm
                  onSuccess={onSuccess}
                  onFocusInput={handleFocusInput}
                  onSignedUp={handleSignedUp}
                />
              </AppCard>
            </View>
          </View>
        </ScrollView>

        {auth.isBusy ? (
          <View style={s.loadingOverlayRoot} pointerEvents="auto">
            <View style={s.loadingDim} />
            <View style={s.loadingContent}>
              <AppSpinner />
              <AppText variant="detail" style={s.loadingText}>
                처리 중입니다...
              </AppText>
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </AppContainer>
  );
}
