// apps/mobile/src/pages/auth/login/LoginPage.tsx
import React, { useCallback, useRef } from "react";
import { findNodeHandle, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createThemedStyles } from "@/shared/theme/useAppTheme";
import { AppContainer } from "@/shared/ui/kit/AppContainer";
import { AppCard } from "@/shared/ui/kit/AppCard";
import { AppText } from "@/shared/ui/kit/AppText";
import { AuthForm } from "@/features/auth/ui/AuthForm";

const useStyles = createThemedStyles((t) =>
  StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: "center",
      paddingVertical: t.layout.spacing.base * 10,
      paddingHorizontal: t.layout.spacing.base * 5,
    },
    content: {
      width: "100%",
      maxWidth: 560,
      alignSelf: "center",
    },
    header: {
      alignItems: "center",
      marginBottom: t.layout.spacing.base * 8,
      gap: t.layout.spacing.base,
    },
    subtitle: {
      textAlign: "center",
      paddingHorizontal: t.layout.spacing.base * 3,
    },
    formCard: {
      padding: t.components.card.paddingMd,
      borderRadius: t.components.card.radius,
    },
    scroll: {
      backgroundColor: t.colors.bgSurfaceAlt,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: "center",
    },
  })
);

export default function LoginPage() {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const onSuccess = useCallback(() => {
    // keep empty: gate logic handles next route
  }, []);

  const handleFocusInput = useCallback((input: TextInput | null) => {
    if (!input) return;
    const target = findNodeHandle(input);
    if (!target) return;

    requestAnimationFrame(() => {
      (scrollRef.current as any)?.scrollResponderScrollNativeHandleToKeyboard?.(target, 96, true);
    });
  }, []);

  const keyboardOffset = Platform.OS === "ios" ? insets.top : insets.bottom;
  const behavior = Platform.OS === "ios" ? "padding" : "height";
  const extraBottomPad = insets.bottom + 48;

  return (
    <AppContainer backgroundColor="bgSurfaceAlt">
      <KeyboardAvoidingView behavior={behavior} keyboardVerticalOffset={keyboardOffset} style={{ flex: 1 }}>
        <ScrollView
          ref={scrollRef}
          style={s.scroll}
          contentContainerStyle={[s.scrollContent, { paddingBottom: extraBottomPad }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={s.root}>
            <View style={s.content}>
              <View style={s.header}>
                <AppText variant="display" weight="800" color="brandPrimary" align="center">
                  Rodia
                </AppText>
                <AppText variant="body" color="textSub" style={s.subtitle}>
                  로디아 운송을 더 빠르게, 더 쉽게 시작해보세요.
                </AppText>
              </View>

              <AppCard outlined style={s.formCard}>
                <AuthForm onSuccess={onSuccess} onFocusInput={handleFocusInput} />
              </AppCard>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppContainer>
  );
}
