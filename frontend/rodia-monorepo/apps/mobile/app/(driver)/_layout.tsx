import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Redirect, Stack, useRouter, useSegments } from "expo-router";
import { View, ActivityIndicator, StyleSheet, type ViewStyle } from "react-native";
import { useAuth } from "@/features/auth/model/useAuth";
import { safeString } from "@/shared/theme/colorUtils";
import { useAppTheme } from "@/shared/theme/useAppTheme";
import { BottomTabBar } from "@/widgets/layout/BottomTabBar";

type BottomTabKey = "home" | "order" | "drive" | "settlement" | "profile";

function shouldHideBottomBar(segments: readonly string[] | undefined | null): boolean {
  const segs = Array.isArray(segments) ? segments : [];
  const isVerification = segs.includes("verification");
  return isVerification;
}

function pickActiveKey(segments: readonly string[] | undefined | null): BottomTabKey {
  const segs = Array.isArray(segments) ? segments : [];

  if (segs.includes("order")) return "order";
  if (segs.includes("drive")) return "drive";
  if (segs.includes("settlement")) return "settlement";
  if (segs.includes("profile")) return "profile";
  if (segs.includes("home")) return "home";

  const last = segs
    .filter((s) => safeString(s).trim() && !safeString(s).startsWith("("))
    .slice(-1)[0];

  if (last === "order") return "order";
  if (last === "drive") return "drive";
  if (last === "settlement") return "settlement";
  if (last === "profile") return "profile";
  return "home";
}

function hrefForKey(key: BottomTabKey): `/(driver)/${string}` {
  if (key === "home") return "/(driver)/home";
  if (key === "order") return "/(driver)/order";
  if (key === "drive") return "/(driver)/drive";
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
  const hideBottomBar = useMemo(() => shouldHideBottomBar(segments) || requiresVerification, [requiresVerification, segments]);

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
      const next = hrefForKey(key);
      router?.replace?.(next);

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
            { key: "order", label: "오더", iconActive: "list", iconInactive: "list-outline" },
            { key: "drive", label: "운행", iconActive: "car", iconInactive: "car-outline" },
            { key: "settlement", label: "정산", iconActive: "wallet", iconInactive: "wallet-outline" },
            { key: "profile", label: "내정보", iconActive: "person", iconInactive: "person-outline" },
          ]}
        />
      </View>
      ) : null}
    </View>
  );
}
