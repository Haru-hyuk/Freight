// apps/mobile/app/(shipper)/_layout.tsx
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Redirect, Stack, useRouter, useSegments } from "expo-router";
import { ActivityIndicator, StyleSheet, View, type ViewStyle } from "react-native";

import { useAuth } from "@/features/auth/model/useAuth";
import { safeString } from "@/shared/theme/colorUtils";
import { useAppTheme } from "@/shared/theme/useAppTheme";
import { BottomTabBar } from "@/widgets/layout/BottomTabBar";

type BottomTabKey = "home" | "quotes" | "matchings" | "profile";

function shouldHideBottomBar(segments: readonly string[] | undefined | null): boolean {
  const segs = Array.isArray(segments) ? segments : [];
  const isQuotesCreate = segs.includes("quotes") && segs.includes("create");
  const isQuotesDetail = segs.includes("quotes") && (segs.includes("[id]") || segs.includes("detail"));
  return isQuotesCreate || isQuotesDetail;
}

function pickActiveKey(segments: readonly string[] | undefined | null): BottomTabKey {
  const segs = Array.isArray(segments) ? segments : [];

  if (segs.includes("quotes")) return "quotes";
  if (segs.includes("matchings")) return "matchings";
  if (segs.includes("profile")) return "profile";
  if (segs.includes("home")) return "home";

  // create/detail 등 하위 라우트에서도 탭 유지되도록 fallback
  const last = segs
    .filter((s) => safeString(s).trim() && !safeString(s).startsWith("("))
    .slice(-1)[0];

  if (last === "quotes") return "quotes";
  if (last === "matchings") return "matchings";
  if (last === "profile") return "profile";
  return "home";
}

function hrefForKey(key: BottomTabKey): `/(shipper)/${string}` {
  if (key === "home") return "/(shipper)/home";
  if (key === "quotes") return "/(shipper)/quotes";
  if (key === "matchings") return "/(shipper)/matchings";
  return "/(shipper)/profile";
}

export default function ShipperLayout() {
  const theme = useAppTheme();
  const router = useRouter();
  const segments = useSegments();
  const auth = useAuth();
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
  const hideBottomBar = useMemo(() => shouldHideBottomBar(segments), [segments]);

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

  // 로그인은 되었는데 role이 아직 없으면(백엔드 /me 미연동 등) 루프 방지: 여기서는 대기
  if (!auth.user?.role) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={cText} />
      </View>
    );
  }

  if (auth.user.role !== "shipper") {
    return <Redirect href="/(driver)/home" />;
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
            { key: "quotes", label: "이용내역", iconActive: "clipboard", iconInactive: "clipboard-outline" },
            { key: "profile", label: "내 정보", iconActive: "person", iconInactive: "person-outline" },
          ]}
        />
      </View>
      ) : null}
    </View>
  );
}

/*
요약(3줄)
- (shipper) 레이아웃에서 인증/role 가드를 유지하면서 Stack 아래에 BottomTabBar를 고정했습니다.
- 탭 전환은 router.push로 / (shipper)/home|quotes|matchings|profile 라우트로 이동합니다.
- useSegments 기반으로 하위 라우트에서도 활성 탭을 안정적으로 유지합니다.
*/
