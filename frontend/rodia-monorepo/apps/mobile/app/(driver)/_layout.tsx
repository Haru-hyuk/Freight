import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Redirect, Stack, useRouter, useSegments } from "expo-router";
import { ActivityIndicator, StyleSheet, View, type ViewStyle } from "react-native";

import { useAuth } from "@/features/auth/model/useAuth";
import { safeString } from "@/shared/theme/colorUtils";
import { useAppTheme } from "@/shared/theme/useAppTheme";
import { BottomTabBar } from "@/widgets/layout/BottomTabBar";

type BottomTabKey = "home" | "quotes" | "run" | "settlement" | "profile";

function shouldHideBottomBar(segments: readonly string[] | undefined | null): boolean {
  const segs = Array.isArray(segments) ? segments : [];
  return segs.includes("verification");
}

function pickActiveKey(segments: readonly string[] | undefined | null): BottomTabKey {
  const topLevelSegment = segments?.[1];

  switch (topLevelSegment) {
    case "quotes":
      return "quotes";
    case "run":
      return "run";
    case "settlement":
      return "settlement";
    case "profile":
      return "profile";
    case "home":
      return "home";
    default:
      // Fallback for routes that don't match a main tab, like 'verification'.
      // It's better to return a sensible default like 'home' or the previous key.
      return "home";
  }
}

function hrefForKey(key: BottomTabKey): `/(driver)/${string}` {
  if (key === "home") return "/(driver)/home";
  if (key === "quotes") return "/(driver)/quotes";
  if (key === "run") return "/(driver)/run";
  if (key === "settlement") return "/(driver)/settlement";
  return "/(driver)/profile";
}

export default function DriverLayout() {
  const theme = useAppTheme();
  const router = useRouter();
  const auth = useAuth();
  const segments = useSegments();
  const tabNavLockedRef = useRef(false);
  const tabNavUnlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cBgBase = safeString(theme?.colors?.bgSurfaceAlt, "#F3F4F6");
  const cCard = safeString(theme?.colors?.bgMain, "#FFFFFF");
  const cBorder = safeString(theme?.colors?.borderDefault, "#E5E7EB");
  const cText = safeString(theme?.colors?.textMain, "#111827");

  const styles = useMemo(
    () =>
      StyleSheet.create({
        center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: cBgBase },
        root: { flex: 1, backgroundColor: cBgBase },
        stackWrap: { flex: 1, backgroundColor: cBgBase },
        bottomWrap: {
          backgroundColor: cCard,
          borderTopWidth: 1,
          borderTopColor: cBorder,
        } as ViewStyle,
      }),
    [cBgBase, cBorder, cCard]
  );

  const activeKey = useMemo(() => pickActiveKey(segments), [segments]);
  const requiresVerification = auth.pendingVerificationRole === "driver";
  const hideBottomBar = useMemo(
    () => shouldHideBottomBar(segments) || requiresVerification,
    [requiresVerification, segments]
  );

  useEffect(() => {
    return () => {
      if (tabNavUnlockTimerRef.current) {
        clearTimeout(tabNavUnlockTimerRef.current);
      }
    };
  }, []);

  const onChangeTab = useCallback(
    (key: BottomTabKey) => {
      if (key === activeKey) return;
      if (tabNavLockedRef.current) return;

      tabNavLockedRef.current = true;
      router.replace(hrefForKey(key));

      if (tabNavUnlockTimerRef.current) {
        clearTimeout(tabNavUnlockTimerRef.current);
      }
      tabNavUnlockTimerRef.current = setTimeout(() => {
        tabNavLockedRef.current = false;
        tabNavUnlockTimerRef.current = null;
      }, 550);
    },
    [activeKey, router]
  );

  if (auth.status === "checking") {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={cText} />
      </View>
    );
  }

  if (auth.status !== "authenticated") {
    return <Redirect href="/(auth)/login" />;
  }

  if (!auth.user?.role) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (auth.user.role !== "driver") {
    return <Redirect href="/(shipper)/home" />;
  }

  const isVerificationRoute = segments.includes("verification");
  const isHomeRoute = segments.includes("home");
  if (requiresVerification && !isVerificationRoute && !isHomeRoute) {
    return <Redirect href="/(driver)/verification" />;
  }

  return (
    <View style={styles.root}>
      <View style={styles.stackWrap}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: cBgBase },
          }}
        />
      </View>

      {!hideBottomBar ? (
        <View style={styles.bottomWrap}>
          <BottomTabBar
            activeKey={activeKey}
            onChange={onChangeTab}
            items={[
              { key: "home", label: "홈", iconActive: "home", iconInactive: "home-outline" },
              { key: "quotes", label: "오더", iconActive: "list", iconInactive: "list-outline" },
              { key: "run", label: "운행", iconActive: "car", iconInactive: "car-outline" },
              { key: "settlement", label: "정산", iconActive: "wallet", iconInactive: "wallet-outline" },
              { key: "profile", label: "내 정보", iconActive: "person", iconInactive: "person-outline" },
            ]}
          />
        </View>
      ) : null}
    </View>
  );
}
