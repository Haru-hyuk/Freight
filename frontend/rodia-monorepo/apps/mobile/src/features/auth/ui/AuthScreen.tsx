// apps/mobile/src/features/auth/ui/AuthScreen.tsx
import React, { useCallback, useState } from "react";
import { Keyboard, LayoutAnimation, Pressable, StyleSheet, View, type TextInput } from "react-native";
import { createThemedStyles } from "@/shared/theme/useAppTheme";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppText } from "@/shared/ui/kit/AppText";
import { useAuth } from "@/features/auth/model/useAuth";
import type { AuthUserRole } from "@/features/auth/model/auth.types";
import { LoginForm } from "./forms/LoginForm";
import { SignUpForm, type RequirePostSuccessPayload, type SignedUpPayload } from "./forms/SignUpForm";

type AuthMode = "login" | "signup";

type Props = {
  onSuccess?: () => void;
  onFocusInput?: (input: TextInput | null) => void;
  onSignedUp?: (payload: SignedUpPayload) => void;
  onRequirePostSuccess?: (payload: RequirePostSuccessPayload) => void;
};

const useStyles = createThemedStyles((t) =>
  StyleSheet.create({
    root: {
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
  })
);

export function AuthScreen({ onSuccess, onFocusInput, onSignedUp, onRequirePostSuccess }: Props) {
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
    <View style={s.root}>
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
